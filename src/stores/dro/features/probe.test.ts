import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { probeReducer } from './probe';
import { INITIAL_PROBE_DATA, type DROEventPayload, type ProbeData } from '../droStateMachine';
import type { DROReducerContext, DROStatePayload } from '../types';
import { createTestState, DEFAULT_TEST_CONTEXT } from '../test-utils';
import { createProbeState } from '../../../types/millState';
import { useSettingsStore } from '../../settingsStore';

let context: DROReducerContext;
let state: DROStatePayload;
function send(eventName: DROEventPayload['eventName']) {
  state = probeReducer(state, { eventName } as DROEventPayload, context) ?? state;
}
function contact(position: number, triggered: boolean) {
  context = { ...context, millState: { ...context.millState, position: { x: position, y: 0, z: position }, probe: createProbeState(triggered ? 'P' : '') } };
  send('MILL_STATE_CHANGED');
}
function arm(probeFunction: ProbeData['probeFunction']) {
  state = { ...createTestState('probe-axis-select'), stateData: { ...INITIAL_PROBE_DATA, probeFunction, probeDiameterMm: 6, probeLengthMm: 20 } };
  send('BTN_SELECT_X');
  if (probeFunction === 'edge') send('KEY_ENTER');
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(100_000);
  context = { ...DEFAULT_TEST_CONTEXT, nvMem: { ...DEFAULT_TEST_CONTEXT.nvMem, defaultUnit: 'mm', probeDelaySeconds: 1 }, millState: { ...DEFAULT_TEST_CONTEXT.millState, connected: true } };
  state = createTestState('idle');
});
afterEach(() => { vi.useRealTimers(); });

describe('manual probe contact contract', () => {
  it('waits for the desired edge coordinate, applies tip compensation, and anchors to contact even after motion', () => {
    arm('edge');
    contact(50, true);
    expect(state.stateName).toBe('probe-coordinate');
    expect(state.vMem.workOffsets.X).toBe(0);
    contact(60, false);
    send('KEY_5');
    send('KEY_ENTER');
    expect(state.display.X).toBe(12); // datum surface53 reads5; live60 reads12
  });

  it('edge2 compensates in the opposite direction and Z uses probe length', () => {
    state = { ...createTestState('probe-axis-select'), stateData: { ...INITIAL_PROBE_DATA, probeFunction: 'edge', probeDiameterMm: 6, probeLengthMm: 20 } };
    send('BTN_SELECT_Z');
    send('KEY_6_RIGHT');
    send('KEY_ENTER');
    contact(50, true);
    send('KEY_ENTER');
    expect(state.display.Z).toBe(20); // captured surface30 is datum0
  });

  it('rejects held, pre-armed and early bounce contacts until release and a fresh trigger after delay', () => {
    context.millState = { ...context.millState, probe: createProbeState('P') };
    arm('midpoint');
    contact(10, true);
    expect((state.stateData as ProbeData).captures).toEqual([]);
    contact(10, false);
    contact(10, true);
    contact(20, true);
    contact(20, false);
    vi.advanceTimersByTime(999);
    contact(20, true);
    expect((state.stateData as ProbeData).captures).toEqual([10]);
    vi.advanceTimersByTime(1);
    contact(30, true); // held at expiry is not a new contact
    expect((state.stateData as ProbeData).captures).toEqual([10]);
    contact(30, false);
    contact(30, true);
    expect(state.stateName).toBe('probe-coordinate');
    send('KEY_7');
    send('KEY_ENTER');
    contact(20, false);
    expect(state.display.X).toBe(7);
  });

  it('sets an independent incremental datum without changing ABS', () => {
    arm('midpoint');
    state = { ...state, vMem: { ...state.vMem, mode: 'inc', workOffsets: { X: 8, Y: 0, Z: 0 } } };
    contact(10, true);
    contact(10, false);
    vi.advanceTimersByTime(1000);
    contact(50, true);
    send('KEY_ENTER');
    expect(state.vMem.workOffsets.X).toBe(8);
    contact(30, false);
    expect(state.display.X).toBe(0);
  });

  it.each([['inside', 56], ['outside', 44]] as const)('shows %s width and center in the current datum', (probeFunction, width) => {
    arm(probeFunction);
    state = { ...state, vMem: { ...state.vMem, workOffsets: { X: 5, Y: 0, Z: 0 } } };
    contact(10, true);
    contact(10, false);
    vi.advanceTimersByTime(1000);
    contact(60, true);
    expect(state.display.X).toBe(width);
    send('KEY_6_RIGHT');
    expect(state.display.X).toBe(30);
    expect(state.display.Z).toBe('CEntrE');
    send('KEY_6_RIGHT');
    expect(state.display.X).toBe(width);
  });

  it('does not report a negative physical outside width', () => {
    arm('outside');
    contact(10, true);
    contact(10, false);
    vi.advanceTimersByTime(1000);
    contact(12, true);
    expect(state.display.X).toBe('Error');
  });

  it('freezes an accepted contact, releases immediately and ignores retriggers within delay', () => {
    context.nvMem = { ...context.nvMem, probeDroType: 'freeze' };
    contact(25, true);
    contact(30, true);
    expect(state.display.X).toBe(25);
    contact(30, false);
    expect(state.display.X).toBe(30);
    contact(35, true);
    contact(40, true);
    expect(state.display.X).toBe(40);
    contact(40, false);
    vi.advanceTimersByTime(1000);
    contact(45, true);
    contact(50, true);
    expect(state.display.X).toBe(45);
  });

  it('flashes T without modifying datum or losing counting', () => {
    contact(25, true);
    expect(state.display.X).toBe('ProbE');
    vi.advanceTimersByTime(1000);
    contact(40, true);
    expect(state.display.X).toBe(40);
    expect(state.vMem.workOffsets.X).toBe(0);
  });

  it('commits diameter and length together and rejects negative configuration', () => {
    const update = vi.spyOn(useSettingsStore.getState(), 'updateNvMem');
    state = { ...createTestState('probe-diameter'), stateData: { ...INITIAL_PROBE_DATA, probeFunction: 'config' } };
    send('KEY_6_RIGHT');
    send('KEY_ENTER');
    expect(state.stateName).toBe('probe-length');
    expect(update).not.toHaveBeenCalled();
    send('KEY_SIGN');
    send('KEY_2_DOWN');
    send('KEY_ENTER');
    expect(state.stateName).toBe('probe-length');
    send('KEY_SIGN');
    send('KEY_ENTER');
    expect(update).toHaveBeenCalledWith({ probeDiameterMm: 6, probeLengthMm: 2 });
    update.mockRestore();
  });
});

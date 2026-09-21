import { describe, it, expect } from 'vitest';
import { sdmReducer } from './sdm';
import { idleReducer } from './idle';
import { createTestState, DEFAULT_TEST_CONTEXT } from '../test-utils';
import { INITIAL_SDM_DATA, type DROEventPayload } from '../droStateMachine';
import type { DROStatePayload, DROReducerContext } from '../types';

const ctx = { ...DEFAULT_TEST_CONTEXT, nvMem: { ...DEFAULT_TEST_CONTEXT.nvMem, defaultUnit: 'mm' as const }, millState: { ...DEFAULT_TEST_CONTEXT.millState, connected: true, position: { x: 24.96, y: 1, z: -3 } } };
function drive(state: DROStatePayload, ...events: DROEventPayload['eventName'][]): DROStatePayload {
  for (const eventName of events) state = sdmReducer(state, { eventName } as DROEventPayload, ctx)!;
  return state;
}

describe('SDM operator workflows', () => {
  it('enters Program immediately and navigates Program → Run → Learn', () => {
    let state = idleReducer(createTestState('idle'), { eventName: 'BTN_SDM' }, ctx)!;
    expect(state.display.X).toBe('ProGrAn');
    state = drive(state, 'KEY_6_RIGHT');
    expect(state.display.X).toBe('rUn');
    state = drive(state, 'KEY_6_RIGHT', 'KEY_ENTER');
    expect(state.display).toEqual({ X: 'StEPno', Y: '1', Z: '' });
  });

  it('Learn X/X preserves exact XYZ on Program readback without an X-zero edit', () => {
    let state = createTestState('sdm-learn-step', { ...INITIAL_SDM_DATA, sdmMode: 'LEARN' });
    state = drive(state, 'KEY_ENTER', 'BTN_SELECT_X', 'BTN_SELECT_X', 'KEY_CLEAR');
    state = idleReducer(state, { eventName: 'BTN_SDM' }, ctx)!;
    state = drive(state, 'KEY_ENTER', 'KEY_ENTER');
    expect(state.display).toEqual({ X: 24.96, Y: 1, Z: -3 });
    state = drive(state, 'KEY_ENTER', 'KEY_ENTER', 'KEY_ENTER', 'KEY_CLEAR');
    state = idleReducer(state, { eventName: 'BTN_SDM' }, ctx)!;
    state = drive(state, 'KEY_6_RIGHT', 'KEY_ENTER', 'KEY_ENTER');
    expect(state.display).toEqual({ X: 0, Y: 0, Z: 0 });
    expect(state.vMem.mode).toBe('inc');
  });

  it('accepts step1000, keeps the boundary, and rejects1001 without overwriting1000', () => {
    let state = createTestState('sdm-learn-step', { ...INITIAL_SDM_DATA, sdmMode: 'LEARN' });
    state.vMem = { ...state.vMem, inputBuffer: '1000' };
    state = drive(state, 'KEY_ENTER', 'BTN_SELECT_X', 'BTN_SELECT_X');
    expect(state.vMem.sdmPoints[1000]).toEqual({ X: 24.96, Y: 1, Z: -3 });
    state = { ...state, stateName: 'sdm-learn-step', vMem: { ...state.vMem, inputBuffer: '1001' } };
    state = drive(state, 'KEY_ENTER');
    expect(state.stateName).toBe('sdm-learn-step');
    expect(state.vMem.sdmPoints[1001]).toBeUndefined();
  });

  it('distinguishes sparse missing points from a stored zero target and preserves ABS', () => {
    let state = createTestState('sdm-run-step', { ...INITIAL_SDM_DATA, sdmMode: 'RUN', points: { 1: { X: 30, Y: 2, Z: -4 } } });
    state = drive(state, 'KEY_ENTER');
    expect(state.display.X).toBeCloseTo(5.04);
    expect(state.display.Y).toBe(1);
    expect(state.display.Z).toBe(-1);
    state = drive(state, 'KEY_6_RIGHT');
    expect(state.display.X).toBe('no dAtA');
    state = drive(state, 'KEY_4_LEFT');
    expect(state.display.X).toBeCloseTo(5.04);
    state = drive(state, 'KEY_CLEAR');
    expect(state.vMem.mode).toBe('abs');
    expect(state.display).toEqual({ X: 24.96, Y: 1, Z: -3 });
  });

  it('interprets4/6 as digits during an explicit jump, not navigation', () => {
    let state = createTestState('sdm-program-step', INITIAL_SDM_DATA);
    state = drive(state, 'BTN_SELECT_Y', 'KEY_4_LEFT', 'KEY_6_RIGHT', 'KEY_ENTER');
    expect(state.display.Y).toBe('46');
    state = drive(state, 'KEY_6_RIGHT');
    expect(state.display.Y).toBe('47');
  });
});

describe('SDM angular coordinates', () => {
  function angularContext(x: number): DROReducerContext {
    return {
      ...DEFAULT_TEST_CONTEXT,
      nvMem: {
        ...DEFAULT_TEST_CONTEXT.nvMem,
        defaultUnit: 'inch',
        countingMode: { ...DEFAULT_TEST_CONTEXT.nvMem.countingMode, X: 'angular' },
        measurementMode: { ...DEFAULT_TEST_CONTEXT.nvMem.measurementMode, X: 'diameter' },
      },
      millState: {
        ...DEFAULT_TEST_CONTEXT.millState,
        connected: true,
        position: { x, y: 0, z: 0 },
      },
    };
  }

  it('learns 90 degrees in inch mode and reports a 1-degree run residual at 89 degrees', () => {
    const learnContext = angularContext(90);
    let state = createTestState('sdm-learn-step', {
      ...INITIAL_SDM_DATA,
      sdmMode: 'LEARN',
    });
    for (const eventName of ['KEY_ENTER', 'BTN_SELECT_X', 'BTN_SELECT_X'] as const) {
      state = sdmReducer(state, { eventName }, learnContext)!;
    }

    const learned = state.stateData.stateDataType === 'sdm' ? state.stateData : INITIAL_SDM_DATA;
    expect(learned.points[1]?.X).toBe(90);

    state = createTestState('sdm-run-step', {
      ...learned,
      sdmMode: 'RUN',
      currentStep: 1,
    });
    state = sdmReducer(state, { eventName: 'KEY_ENTER' }, angularContext(89))!;
    expect(state.display.X).toBe(1);
  });

  it('programs 90 degrees in inch mode and reports a 1-degree run residual at 89 degrees', () => {
    const programContext = angularContext(90);
    let state = createTestState('sdm-program-step', {
      ...INITIAL_SDM_DATA,
      sdmMode: 'PROGRAM',
    });
    for (const eventName of ['KEY_ENTER', 'KEY_9', 'KEY_0', 'KEY_ENTER'] as const) {
      state = sdmReducer(state, { eventName }, programContext)!;
    }

    const programmed = state.stateData.stateDataType === 'sdm' ? state.stateData : INITIAL_SDM_DATA;
    expect(programmed.points[1]?.X).toBe(90);

    state = createTestState('sdm-run-step', {
      ...programmed,
      sdmMode: 'RUN',
      currentStep: 1,
    });
    state = sdmReducer(state, { eventName: 'KEY_ENTER' }, angularContext(89))!;
    expect(state.display.X).toBe(1);
  });
});

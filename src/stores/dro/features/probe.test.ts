/**
 * Touch Probe Feature Reducer - unit tests (US-032)
 *
 * Covers the user-facing probe function menu and probe-triggered behaviours:
 * - probe mode (transmit / freeze) driving datum-set vs display-freeze (AC 32.1-32.3, 32.7)
 * - Edge / Midpoint / Inside / Outside sub-functions (AC 32.4-32.6)
 * - rising-edge detection of a REAL probe trigger arriving via MILL_STATE_CHANGED (AC 32.9)
 * - visual indication flag on trigger (AC 32.8)
 * - C exits the probe function (AC 32.10)
 *
 * Probe triggers are simulated by setting context.millState.probe (the same
 * MillState the CncjsMillAdapter computes from a real controller pin state) and
 * dispatching MILL_STATE_CHANGED - never by forcing internal state directly.
 */

import { describe, it, expect, vi } from 'vitest';
import { probeReducer } from './probe';
import { idleReducer } from './idle';
import {
  INITIAL_PROBE_DATA,
  type ProbeData,
  type DROStateName,
} from '../droStateMachine';
import type { DROReducerContext, DROStatePayload } from '../types';
import { createTestState, DEFAULT_TEST_CONTEXT } from '../test-utils';
import { createProbeState } from '../../../types/millState';
import { INITIAL_VOLATILE_MEMORY_STATE } from '../../../types/volatileMemory';
import { useMillStore } from '../../millStore';

/** Build a connected mill context at a given position with a probe pin state. */
function ctxAt(
  pos: { x?: number; y?: number; z?: number },
  pinState = ''
): DROReducerContext {
  return {
    ...DEFAULT_TEST_CONTEXT,
    millState: {
      ...DEFAULT_TEST_CONTEXT.millState,
      connected: true,
      position: { x: pos.x ?? 0, y: pos.y ?? 0, z: pos.z ?? 0 },
      probe: createProbeState(pinState),
    },
  };
}

/** A probe-function state payload with the given data. */
function probeState(
  stateName: DROStateName,
  data: ProbeData,
  vMem = INITIAL_VOLATILE_MEMORY_STATE
): DROStatePayload {
  return { stateName, stateData: data, vMem, display: { X: 0, Y: 0, Z: 0 } };
}

describe('probeReducer - connected INC datums', () => {
  it.each(['X', 'Y', 'Z'] as const)('sets the %s edge datum without changing ABS and counts subsequent motion', (axis) => {
    const vMem = {
      ...INITIAL_VOLATILE_MEMORY_STATE,
      mode: 'inc' as const,
      workOffsets: { X: 1, Y: 2, Z: 3 },
      incrementalOffsets: { X: 10, Y: 20, Z: 30 },
      incrementalValues: { X: 71, Y: 72, Z: 73 },
    };
    const context: DROReducerContext = {
      ...ctxAt({ x: 50, y: 50, z: 50 }, 'P'),
      nvMem: { ...DEFAULT_TEST_CONTEXT.nvMem, defaultUnit: 'mm' },
    };
    const start = probeState('probe-waiting', {
      ...INITIAL_PROBE_DATA, probeFunction: 'edge', probeAxis: axis, lastProbeTriggered: false,
    }, vMem);
    const contact = probeReducer(start, { eventName: 'MILL_STATE_CHANGED' }, context)!;
    expect(contact.stateName).toBe('probe-result');
    expect(contact.vMem.incrementalOffsets).toEqual({ ...vMem.incrementalOffsets, [axis]: 50 });
    expect(contact.vMem.workOffsets).toEqual(vMem.workOffsets);
    expect(contact.vMem.incrementalValues).toEqual(vMem.incrementalValues);
    const idle = probeReducer(contact, { eventName: 'KEY_CLEAR' }, context)!;
    expect(idle.display[axis]).toBe(0);
    const moved = idleReducer(idle, { eventName: 'MILL_STATE_CHANGED' }, {
      ...context,
      millState: { ...context.millState, position: { x: 57, y: 57, z: 57 } },
    })!;
    expect(moved.display[axis]).toBe(7);
  });

  it.each(['X', 'Y', 'Z'] as const)('sets the %s midpoint in machine coordinates, not at the second contact', (axis) => {
    const vMem = {
      ...INITIAL_VOLATILE_MEMORY_STATE,
      mode: 'inc' as const,
      workOffsets: { X: 1, Y: 2, Z: 3 },
      incrementalOffsets: { X: 4, Y: 5, Z: 6 },
      incrementalValues: { X: 71, Y: 72, Z: 73 },
    };
    const contextAt = (position: number, pin: string): DROReducerContext => ({
      ...ctxAt({ x: position, y: position, z: position }, pin),
      nvMem: { ...DEFAULT_TEST_CONTEXT.nvMem, defaultUnit: 'mm' },
    });
    let state = probeState('probe-waiting', {
      ...INITIAL_PROBE_DATA, probeFunction: 'midpoint', probeAxis: axis, lastProbeTriggered: false,
    }, vMem);
    state = probeReducer(state, { eventName: 'MILL_STATE_CHANGED' }, contextAt(10, 'P'))!;
    expect(state.stateData).toMatchObject({ captures: [10] });
    state = probeReducer(state, { eventName: 'MILL_STATE_CHANGED' }, contextAt(30, ''))!;
    state = probeReducer(state, { eventName: 'MILL_STATE_CHANGED' }, contextAt(50, 'P'))!;
    expect(state.stateName).toBe('probe-result');
    expect(state.vMem.incrementalOffsets).toEqual({ ...vMem.incrementalOffsets, [axis]: 30 });
    expect(state.vMem.workOffsets).toEqual(vMem.workOffsets);
    expect(state.vMem.incrementalValues).toEqual(vMem.incrementalValues);
    const idle = probeReducer(state, { eventName: 'KEY_CLEAR' }, contextAt(50, ''))!;
    expect(idle.display[axis]).toBe(20);
    const midpoint = idleReducer(idle, { eventName: 'MILL_STATE_CHANGED' }, contextAt(30, ''))!;
    expect(midpoint.display[axis]).toBe(0);
  });
});

describe('probeReducer - non-probe states', () => {
  it('returns null for unrelated states (does not own them)', () => {
    expect(probeReducer(createTestState('idle'), { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT)).toBeNull();
    expect(probeReducer(createTestState('calculator-idle'), { eventName: 'MILL_STATE_CHANGED' }, DEFAULT_TEST_CONTEXT)).toBeNull();
  });
});

describe('probeReducer - function menu entry & navigation (AC 32.4-32.6, 32.10)', () => {
  it('cycles sub-functions with KEY_6_RIGHT: edge -> midpoint -> inside -> outside -> edge', () => {
    let s = probeState('probe-menu-function', INITIAL_PROBE_DATA);
    // Navigation re-renders the menu label; the first right press lands on midpoint.
    s = probeReducer(s, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT)!;
    expect(s.stateData).toMatchObject({ probeFunction: 'midpoint' });
    expect(s.display.X).toBe('Prob nd');

    s = probeReducer(s, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT)!;
    expect(s.stateData).toMatchObject({ probeFunction: 'inside' });
    expect(s.display.X).toBe('inS dE');

    s = probeReducer(s, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT)!;
    expect(s.stateData).toMatchObject({ probeFunction: 'outside' });
    expect(s.display.X).toBe('oUtS dE');

    s = probeReducer(s, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT)!;
    expect(s.stateData).toMatchObject({ probeFunction: 'edge' });
  });

  it('cycles backwards with KEY_4_LEFT (wraps edge -> outside)', () => {
    const s = probeReducer(
      probeState('probe-menu-function', INITIAL_PROBE_DATA),
      { eventName: 'KEY_4_LEFT' },
      DEFAULT_TEST_CONTEXT
    )!;
    expect(s.stateData).toMatchObject({ probeFunction: 'outside' });
  });

  it('KEY_CLEAR exits the probe menu to idle (AC 32.10)', () => {
    const s = probeReducer(
      probeState('probe-menu-function', INITIAL_PROBE_DATA),
      { eventName: 'KEY_CLEAR' },
      ctxAt({ x: 5 })
    )!;
    expect(s.stateName).toBe('idle');
  });

  it('edge function: ENT goes straight to axis selection (no diameter prompt)', () => {
    const s = probeReducer(
      probeState('probe-menu-function', { ...INITIAL_PROBE_DATA, probeFunction: 'edge' }),
      { eventName: 'KEY_ENTER' },
      DEFAULT_TEST_CONTEXT
    )!;
    expect(s.stateName).toBe('probe-axis-select');
  });

  it('inside function: ENT prompts for probe tip diameter first (AC 32.6)', () => {
    const s = probeReducer(
      probeState('probe-menu-function', { ...INITIAL_PROBE_DATA, probeFunction: 'inside' }),
      { eventName: 'KEY_ENTER' },
      DEFAULT_TEST_CONTEXT
    )!;
    expect(s.stateName).toBe('probe-diameter');
    expect(s.display.X).toBe('Prb d A');
  });
});

describe('probeReducer - diameter entry then axis select (AC 32.6)', () => {
  it('captures entered diameter and advances to axis select', () => {
    // Probe-diameter consumes the input buffer on ENT. Simulate a typed buffer.
    const vMem = { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '6', defaultUnit: 'mm' as const };
    const ctx: DROReducerContext = { ...DEFAULT_TEST_CONTEXT, nvMem: { ...DEFAULT_TEST_CONTEXT.nvMem, defaultUnit: 'mm' } };
    const s = probeReducer(
      probeState('probe-diameter', { ...INITIAL_PROBE_DATA, probeFunction: 'inside' }, vMem),
      { eventName: 'KEY_ENTER' },
      ctx
    )!;
    expect(s.stateName).toBe('probe-axis-select');
    expect(s.stateData).toMatchObject({ probeDiameterMm: 6 });
  });
});

describe('probeReducer - axis selection', () => {
  it('selecting X advances to waiting and records the axis', () => {
    const s = probeReducer(
      probeState('probe-axis-select', { ...INITIAL_PROBE_DATA, probeFunction: 'edge' }),
      { eventName: 'BTN_SELECT_X' },
      ctxAt({ x: 10 })
    )!;
    expect(s.stateName).toBe('probe-waiting');
    expect(s.stateData).toMatchObject({ probeAxis: 'X' });
  });

  it('records the probe-armed baseline trigger state so a pre-held probe does not auto-fire', () => {
    // Probe already held high when entering waiting: lastProbeTriggered must be
    // seeded true so only a release+re-trigger (a fresh rising edge) captures.
    const s = probeReducer(
      probeState('probe-axis-select', { ...INITIAL_PROBE_DATA, probeFunction: 'edge' }),
      { eventName: 'BTN_SELECT_X' },
      ctxAt({ x: 10 }, 'P')
    )!;
    expect(s.stateData).toMatchObject({ lastProbeTriggered: true });
  });
});

describe('probeReducer - Edge function (AC 32.4)', () => {
  it('rising edge sets the selected axis datum to zero at the contact point', () => {
    const start = probeState(
      'probe-waiting',
      { ...INITIAL_PROBE_DATA, probeFunction: 'edge', probeAxis: 'X', lastProbeTriggered: false }
    );
    // Probe contact at X=50: pin state goes '' -> 'P'.
    const s = probeReducer(start, { eventName: 'MILL_STATE_CHANGED' }, ctxAt({ x: 50 }, 'P'))!;
    // Datum set: ABS work offset becomes the contact machine position so the
    // displayed X reads 0 at the edge.
    expect(s.vMem.workOffsets.X).toBe(50);
    expect(s.stateName).toBe('probe-result');
  });

  it('does NOT fire while the probe stays open (no rising edge)', () => {
    const start = probeState(
      'probe-waiting',
      { ...INITIAL_PROBE_DATA, probeFunction: 'edge', probeAxis: 'X', lastProbeTriggered: false }
    );
    const s = probeReducer(start, { eventName: 'MILL_STATE_CHANGED' }, ctxAt({ x: 50 }, ''))!;
    expect(s.stateName).toBe('probe-waiting');
    expect(s.vMem.workOffsets.X).toBe(0);
  });

  it('ignores a held trigger (no repeated capture without release)', () => {
    // lastProbeTriggered already true: the same held 'P' must not re-capture.
    const start = probeState(
      'probe-waiting',
      { ...INITIAL_PROBE_DATA, probeFunction: 'edge', probeAxis: 'X', lastProbeTriggered: true }
    );
    const s = probeReducer(start, { eventName: 'MILL_STATE_CHANGED' }, ctxAt({ x: 50 }, 'P'))!;
    expect(s.stateName).toBe('probe-waiting');
  });
});

describe('probeReducer - Midpoint function (AC 32.5)', () => {
  it('captures two edges and sets datum at their midpoint', () => {
    let s = probeState(
      'probe-waiting',
      { ...INITIAL_PROBE_DATA, probeFunction: 'midpoint', probeAxis: 'X', lastProbeTriggered: false }
    );
    // First edge at X=10.
    s = probeReducer(s, { eventName: 'MILL_STATE_CHANGED' }, ctxAt({ x: 10 }, 'P'))!;
    expect(s.stateName).toBe('probe-waiting');
    expect(s.stateData).toMatchObject({ captures: [10] });
    // Probe releases (open) before second touch.
    s = probeReducer(s, { eventName: 'MILL_STATE_CHANGED' }, ctxAt({ x: 30 }, ''))!;
    // Second edge at X=50.
    s = probeReducer(s, { eventName: 'MILL_STATE_CHANGED' }, ctxAt({ x: 50 }, 'P'))!;
    // Midpoint = (10 + 50) / 2 = 30 -> datum so displayed X reads 0 there.
    expect(s.vMem.workOffsets.X).toBe(30);
    expect(s.stateName).toBe('probe-result');
  });
});

describe('probeReducer - Inside diameter measurement (AC 32.6)', () => {
  it('inside diameter = |edge2 - edge1| + probe diameter', () => {
    let s = probeState(
      'probe-waiting',
      {
        ...INITIAL_PROBE_DATA,
        probeFunction: 'inside',
        probeAxis: 'X',
        probeDiameterMm: 6,
        lastProbeTriggered: false,
      },
      { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'abs' }
    );
    const ctxMm: Partial<DROReducerContext> = { nvMem: { ...DEFAULT_TEST_CONTEXT.nvMem, defaultUnit: 'mm' } };
    s = probeReducer(s, { eventName: 'MILL_STATE_CHANGED' }, { ...ctxAt({ x: 10 }, 'P'), ...ctxMm })!;
    s = probeReducer(s, { eventName: 'MILL_STATE_CHANGED' }, { ...ctxAt({ x: 30 }, ''), ...ctxMm })!;
    s = probeReducer(s, { eventName: 'MILL_STATE_CHANGED' }, { ...ctxAt({ x: 60 }, 'P'), ...ctxMm })!;
    // (60 - 10) + 6 = 56 mm. Stored as a number; the display layer formats it.
    expect(s.stateName).toBe('probe-result');
    expect(s.stateData).toMatchObject({ resultMm: 56 });
    expect(s.display.X).toBeCloseTo(56, 4);
  });
});

describe('probeReducer - Outside diameter measurement (AC 32.6)', () => {
  it('outside diameter = |edge2 - edge1| - probe diameter', () => {
    let s = probeState(
      'probe-waiting',
      {
        ...INITIAL_PROBE_DATA,
        probeFunction: 'outside',
        probeAxis: 'X',
        probeDiameterMm: 6,
        lastProbeTriggered: false,
      },
      { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'abs' }
    );
    const ctxMm: Partial<DROReducerContext> = { nvMem: { ...DEFAULT_TEST_CONTEXT.nvMem, defaultUnit: 'mm' } };
    s = probeReducer(s, { eventName: 'MILL_STATE_CHANGED' }, { ...ctxAt({ x: 0 }, 'P'), ...ctxMm })!;
    s = probeReducer(s, { eventName: 'MILL_STATE_CHANGED' }, { ...ctxAt({ x: 25 }, ''), ...ctxMm })!;
    s = probeReducer(s, { eventName: 'MILL_STATE_CHANGED' }, { ...ctxAt({ x: 50 }, 'P'), ...ctxMm })!;
    // (50 - 0) - 6 = 44 mm.
    expect(s.stateName).toBe('probe-result');
    expect(s.stateData).toMatchObject({ resultMm: 44 });
    expect(s.display.X).toBeCloseTo(44, 4);
  });
});

describe('probeReducer - visual indication on trigger (AC 32.8)', () => {
  it('sets a probeTriggered flag in state data on a rising edge', () => {
    const start = probeState(
      'probe-waiting',
      { ...INITIAL_PROBE_DATA, probeFunction: 'edge', probeAxis: 'X', lastProbeTriggered: false }
    );
    const s = probeReducer(start, { eventName: 'MILL_STATE_CHANGED' }, ctxAt({ x: 50 }, 'P'))!;
    expect(s.stateData).toMatchObject({ probeTriggered: true });
  });
});

describe('probeReducer - disconnected mill', () => {
  it('does not capture when the mill is disconnected (no probe pin)', () => {
    const disconnected: DROReducerContext = {
      ...DEFAULT_TEST_CONTEXT,
      millState: { ...DEFAULT_TEST_CONTEXT.millState, connected: false, probe: createProbeState('') },
    };
    const start = probeState(
      'probe-waiting',
      { ...INITIAL_PROBE_DATA, probeFunction: 'edge', probeAxis: 'X', lastProbeTriggered: false }
    );
    const s = probeReducer(start, { eventName: 'MILL_STATE_CHANGED' }, disconnected)!;
    expect(s.stateName).toBe('probe-waiting');
  });
});

describe('probeReducer - idle freeze/transmit modes (AC 32.2, 32.3, 32.7)', () => {
  function idleAbsMm(): DROStatePayload {
    return {
      stateName: 'idle',
      stateData: INITIAL_PROBE_DATA, // idle carries probe edge-tracking data
      vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'abs' },
      display: { X: 0, Y: 0, Z: 0 },
    };
  }

  it('Freeze mode: display halts at the contact value and ignores further motion (AC 32.3)', () => {
    const freezeCtx = (x: number, pin: string): DROReducerContext => ({
      ...ctxAt({ x }, pin),
      nvMem: { ...DEFAULT_TEST_CONTEXT.nvMem, defaultUnit: 'mm', probeDroType: 'freeze' },
    });
    // Move to X=25 (open) - normal counting.
    let s = probeReducer(idleAbsMm(), { eventName: 'MILL_STATE_CHANGED' }, freezeCtx(25, ''))!;
    expect(s.display.X).toBeCloseTo(25, 4);
    // Probe contact at X=25 - freeze.
    s = probeReducer(s, { eventName: 'MILL_STATE_CHANGED' }, freezeCtx(25, 'P'))!;
    expect(s.display.X).toBeCloseTo(25, 4);
    // Continue moving to X=30 while still triggered - display stays frozen at 25.
    s = probeReducer(s, { eventName: 'MILL_STATE_CHANGED' }, freezeCtx(30, 'P'))!;
    expect(s.display.X).toBeCloseTo(25, 4);
  });

  it('Freeze mode: display resumes counting after probe clears', () => {
    const freezeCtx = (x: number, pin: string): DROReducerContext => ({
      ...ctxAt({ x }, pin),
      nvMem: { ...DEFAULT_TEST_CONTEXT.nvMem, defaultUnit: 'mm', probeDroType: 'freeze' },
    });
    let s = probeReducer(idleAbsMm(), { eventName: 'MILL_STATE_CHANGED' }, freezeCtx(25, 'P'))!;
    expect(s.display.X).toBeCloseTo(25, 4);
    // Probe clears, axis now at 30 -> resumes counting.
    s = probeReducer(s, { eventName: 'MILL_STATE_CHANGED' }, freezeCtx(30, ''))!;
    expect(s.display.X).toBeCloseTo(30, 4);
  });

  it('Transmit mode: display keeps counting through a trigger (AC 32.2)', () => {
    const transmitCtx = (x: number, pin: string): DROReducerContext => ({
      ...ctxAt({ x }, pin),
      nvMem: { ...DEFAULT_TEST_CONTEXT.nvMem, defaultUnit: 'mm', probeDroType: 'transmit' },
    });
    // In transmit mode the idle reducer owns counting; probe reducer must NOT
    // freeze, so it returns null (lets idle compute the live display).
    const s = probeReducer(idleAbsMm(), { eventName: 'MILL_STATE_CHANGED' }, transmitCtx(25, 'P'));
    expect(s).toBeNull();
  });
});

describe('probeReducer - exit (AC 32.10)', () => {
  it('KEY_CLEAR from any probe state returns to idle', () => {
    for (const state of ['probe-axis-select', 'probe-waiting', 'probe-result', 'probe-diameter'] as DROStateName[]) {
      const s = probeReducer(
        probeState(state, { ...INITIAL_PROBE_DATA, probeFunction: 'edge', probeAxis: 'X' }),
        { eventName: 'KEY_CLEAR' },
        ctxAt({ x: 5 })
      )!;
      expect(s.stateName).toBe('idle');
    }
  });
});

describe('probeReducer - physical readings across controller updates', () => {
  it('reformats the frozen physical contact on unit changes without following held motion or converting angular axes', () => {
    const context = (x: number, unit: 'mm' | 'inch', pin = 'P'): DROReducerContext => ({
      ...ctxAt({ x, y: 12.5, z: 50.8 }, pin),
      nvMem: {
        ...DEFAULT_TEST_CONTEXT.nvMem, defaultUnit: unit, probeDroType: 'freeze',
        countingMode: { X: 'linear', Y: 'angular', Z: 'linear' },
      },
    });
    let state = probeReducer(
      probeState('idle', INITIAL_PROBE_DATA),
      { eventName: 'MILL_STATE_CHANGED' }, context(25.4, 'mm')
    )!;
    const angularContact = state.display.Y;
    expect(state.display.X).toBeCloseTo(25.4);
    expect(state.display.Z).toBeCloseTo(50.8);
    state = probeReducer(state, { eventName: 'MILL_STATE_CHANGED' }, context(101.6, 'inch'))!;
    expect(state.display.X).toBeCloseTo(1);
    expect(state.display.Z).toBeCloseTo(2);
    expect(state.display.Y).toBe(angularContact);
    state = probeReducer(state, { eventName: 'MILL_STATE_CHANGED' }, context(127, 'mm'))!;
    expect(state.display.X).toBeCloseTo(25.4);
    expect(state.display.Y).toBe(angularContact);
    state = probeReducer(state, { eventName: 'MILL_STATE_CHANGED' }, context(127, 'mm', ''))!;
    expect(state.display.X).toBeCloseTo(127);
  });

  it.each(['edge', 'midpoint'] as const)('refreshes %s GRBL ABS results only from native WPos, without leaving the result screen', (probeFunction) => {
    const request = vi.spyOn(useMillStore.getState(), 'requestWorkPosition').mockResolvedValue();
    try {
      const context = (workX: number, pending: boolean, unit: 'mm' | 'inch' = 'mm'): DROReducerContext => ({
        ...ctxAt({ x: 50 }, 'P'),
        nvMem: { ...DEFAULT_TEST_CONTEXT.nvMem, defaultUnit: unit },
        millState: {
          ...ctxAt({ x: 50 }, 'P').millState,
          controllerType: 'cncjs',
          workPosition: { x: workX, y: 0, z: 0 },
          workPositionControl: {
            availability: pending ? 'busy' : 'ready',
            pending: pending ? { x: probeFunction === 'edge' ? 0 : 20 } : null,
            error: null,
          },
        },
      });
      const vMem = { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'abs' as const };
      let state = probeState('probe-waiting', {
        ...INITIAL_PROBE_DATA, probeFunction, probeAxis: 'X',
        captures: probeFunction === 'midpoint' ? [10] : [],
      }, vMem);
      state = probeReducer(state, { eventName: 'MILL_STATE_CHANGED' }, context(42, false))!;
      const desired = probeFunction === 'edge' ? 0 : 20;
      expect(request).toHaveBeenCalledTimes(1);
      expect(request).toHaveBeenCalledWith({ x: desired });
      expect(state.stateName).toBe('probe-result');
      expect(state.display.X).toBeCloseTo(42);
      expect(state.vMem.incrementalOffsets).toEqual(vMem.incrementalOffsets);
      state = probeReducer(state, { eventName: 'MILL_STATE_CHANGED' }, context(42, true))!;
      expect(state.display.X).toBeCloseTo(42);
      state = probeReducer(state, { eventName: 'MILL_STATE_CHANGED' }, context(desired, false))!;
      expect(state.stateName).toBe('probe-result');
      expect(state.display.X).toBeCloseTo(desired);
      state = probeReducer(state, { eventName: 'MILL_STATE_CHANGED' }, context(desired, false, 'inch'))!;
      expect(state.display.X).toBeCloseTo(desired / 25.4);
      expect(request).toHaveBeenCalledTimes(1);
    } finally {
      request.mockRestore();
    }
  });

  it.each(['edge', 'midpoint'] as const)('keeps native %s INC datum local even while disconnected', (probeFunction) => {
    const request = vi.spyOn(useMillStore.getState(), 'requestWorkPosition').mockResolvedValue();
    try {
      const context: DROReducerContext = {
        ...ctxAt({ x: 50 }, 'P'),
        nvMem: { ...DEFAULT_TEST_CONTEXT.nvMem, defaultUnit: 'mm' },
        millState: {
          ...ctxAt({ x: 50 }, 'P').millState,
          connected: false,
          controllerType: 'cncjs',
          workPosition: { x: 42, y: 0, z: 0 },
          workPositionControl: { availability: 'ready', pending: null, error: null },
        },
      };
      const vMem = {
        ...INITIAL_VOLATILE_MEMORY_STATE,
        mode: 'inc' as const,
        workOffsets: { X: 3, Y: 4, Z: 5 },
        incrementalOffsets: { X: 7, Y: 8, Z: 9 },
      };
      const start = probeState('probe-waiting', {
        ...INITIAL_PROBE_DATA, probeFunction, probeAxis: 'X',
        captures: probeFunction === 'midpoint' ? [10] : [],
      }, vMem);
      const result = probeReducer(start, { eventName: 'MILL_STATE_CHANGED' }, context)!;
      expect(request).not.toHaveBeenCalled();
      expect(result.stateName).toBe('probe-result');
      expect(result.vMem.incrementalOffsets).toEqual({
        ...vMem.incrementalOffsets, X: probeFunction === 'edge' ? 50 : 30,
      });
      expect(result.vMem.workOffsets).toEqual(vMem.workOffsets);
      const idle = probeReducer(result, { eventName: 'KEY_CLEAR' }, context)!;
      expect(idle.display.X).toBe(probeFunction === 'edge' ? 0 : 20);
    } finally {
      request.mockRestore();
    }
  });

  it.each(['inside', 'outside'] as const)('keeps the captured %s measurement physical while live positions and units change', (probeFunction) => {
    const mmContext: DROReducerContext = {
      ...ctxAt({ x: 25.4 }, 'P'),
      nvMem: { ...DEFAULT_TEST_CONTEXT.nvMem, defaultUnit: 'mm' },
    };
    let state = probeState('probe-waiting', {
      ...INITIAL_PROBE_DATA, probeFunction, probeAxis: 'X', captures: [0],
    });
    state = probeReducer(state, { eventName: 'MILL_STATE_CHANGED' }, mmContext)!;
    expect(state.display.X).toBeCloseTo(25.4);
    const inchContext: DROReducerContext = {
      ...ctxAt({ x: 254 }, ''),
      nvMem: { ...mmContext.nvMem, defaultUnit: 'inch' },
    };
    state = probeReducer(state, { eventName: 'MILL_STATE_CHANGED' }, inchContext)!;
    expect(state.stateName).toBe('probe-result');
    expect(state.display.X).toBeCloseTo(1);
    expect(state.stateData).toMatchObject({ resultMm: 25.4, captures: [0, 25.4] });
    state = probeReducer(state, { eventName: 'MILL_STATE_CHANGED' }, mmContext)!;
    expect(state.display.X).toBeCloseTo(25.4);
  });
});

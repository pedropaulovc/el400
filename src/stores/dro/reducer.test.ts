/**
 * Root Reducer Tests
 *
 * Front-panel workflows spanning multiple features.
 */

import { describe, it, expect, vi } from 'vitest';
import { droReducer } from './reducer';
import type { DROStatePayload } from './types';
import { createTestState, DEFAULT_TEST_CONTEXT } from './test-utils';
import { INITIAL_VOLATILE_MEMORY_STATE } from '../../types/volatileMemory';
import { INITIAL_DISPLAY_STATE } from './utils/displayComputation';

/** Helper to create state with a specific position for testing KEY_6_RIGHT */
function stateWithPosition(
  stateName: DROStatePayload['stateName'],
  stateData: DROStatePayload['stateData'],
  position: { X: number; Y: number; Z: number }
): DROStatePayload {
  return {
    stateName,
    stateData,
    vMem: {
      ...INITIAL_VOLATILE_MEMORY_STATE,
      manualAbsoluteValues: position,
    },
    display: INITIAL_DISPLAY_STATE,
  };
}

describe('droReducer', () => {
  describe('front-panel actions', () => {
    it('finishes boot when the startup message is disabled', () => {
      const initial = createTestState('boot');

      const result = droReducer(initial, {
        eventName: 'BOOT_STARTED',
        skipBootMessage: true,
      }, DEFAULT_TEST_CONTEXT);

      expect(result.stateName).toBe('idle');
    });

    it('advances from Center to Linear in the top-level function menu', () => {
      const initial = createTestState('function-menu-center');

      const result = droReducer(initial, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);

      expect(result.stateName).toBe('function-menu-linear');
    });

    it('captures the first center-finding point', () => {
      const initial = stateWithPosition(
        'function-menu-center-line-point-1',
        { stateDataType: 'center-finding', storedPoints: [], centerResult: null, captureStatus: 'ready' },
        { X: 10, Y: 20, Z: 30 }
      );

      const result = droReducer(initial, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);

      expect(result.stateName).toBe('function-menu-center-line-point-2');
    });
  });

  describe('global sleep gate', () => {
    it('consumes asleep encoder ticks and the waking key before feature reducers without collision diagnostics', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      try {
        let state = droReducer(createTestState('idle'), { eventName: 'SLEEP_TIMER_ELAPSED' }, DEFAULT_TEST_CONTEXT);
        for (let tick = 0; tick < 20; tick++) state = droReducer(state, { eventName: 'MILL_STATE_CHANGED' }, DEFAULT_TEST_CONTEXT);
        expect(state.vMem.displayPower).toBe('asleep');
        state = droReducer(state, { eventName: 'KEY_5' }, DEFAULT_TEST_CONTEXT);
        expect(state.vMem.displayPower).toBe('awake');
        expect(state.stateName).toBe('idle');
        expect(state.vMem.inputBuffer).toBe('');
        state = droReducer(state, { eventName: 'KEY_5' }, DEFAULT_TEST_CONTEXT);
        expect(state.vMem.inputBuffer).toBe('5');
        expect(error).not.toHaveBeenCalled();
      } finally {
        error.mockRestore();
      }
    });

    it('records a sleeping reference crossing before gating feature input and retains it after a real jog wakes the display', () => {
      const asleep = droReducer(createTestState('idle'), { eventName: 'SLEEP_TIMER_ELAPSED' }, DEFAULT_TEST_CONTEXT);
      const crossed = droReducer(asleep, { eventName: 'ENCODER_REF_MARK_CROSSED', axis: 'X', markPositionMm: 12 }, DEFAULT_TEST_CONTEXT);
      expect(crossed.vMem.displayPower).toBe('asleep');
      expect(crossed.vMem.referenceMarks.X).toBe(12);
      const movedContext = { ...DEFAULT_TEST_CONTEXT, millState: { ...DEFAULT_TEST_CONTEXT.millState,
        position: { ...DEFAULT_TEST_CONTEXT.millState.position, x: 13 } } };
      const awake = droReducer(crossed, { eventName: 'MILL_STATE_CHANGED' }, movedContext);
      expect(awake.vMem.displayPower).toBe('awake');
      expect(awake.vMem.referenceMarks.X).toBe(12);
    });

    it('allows a locked-panel key to wake the display without executing its action', () => {
      const lockedContext = { ...DEFAULT_TEST_CONTEXT, nvMem: { ...DEFAULT_TEST_CONTEXT.nvMem, keypadLock: 'on' as const } };
      const asleep = droReducer(createTestState('idle'), { eventName: 'SLEEP_TIMER_ELAPSED' }, lockedContext);
      const awake = droReducer(asleep, { eventName: 'KEY_5' }, lockedContext);
      expect(awake.vMem.displayPower).toBe('awake');
      expect(awake.vMem.inputBuffer).toBe('');
      expect(droReducer(awake, { eventName: 'KEY_5' }, lockedContext).vMem.inputBuffer).toBe('');
    });
  });

  describe('unhandled events', () => {
    it('opens HALF axis selection without requiring a preselected axis', () => {
      const initial = stateWithPosition('idle', { stateDataType: 'none' }, { X: 10, Y: 20, Z: 0 });
      const selecting = droReducer(initial, { eventName: 'BTN_HALF' }, DEFAULT_TEST_CONTEXT);
      expect(selecting.stateName).toBe('half-select');
      const result = droReducer(selecting, { eventName: 'BTN_SELECT_X' }, DEFAULT_TEST_CONTEXT);
      expect(result.stateName).toBe('idle');
      expect(result.vMem.manualAbsoluteValues).toEqual({ X: 5, Y: 20, Z: 0 });
    });

    it('should return current state for unrecognized events in boot state', () => {
      const initial = createTestState('boot');

      // BTN_FUNCTION is not handled during boot
      const result = droReducer(initial, { eventName: 'BTN_FUNCTION' }, DEFAULT_TEST_CONTEXT);

      expect(result).toBe(initial);
    });
  });

  describe('state transitions chain', () => {
    it('should support full workflow: boot -> idle -> menu -> point collection -> result', () => {
      let state: DROStatePayload = createTestState('boot');

      // Boot complete
      state = droReducer(state, { eventName: 'BOOT_STARTED', skipBootMessage: true }, DEFAULT_TEST_CONTEXT);
      expect(state.stateName).toBe('idle');

      // Open function menu
      state = droReducer(state, { eventName: 'BTN_FUNCTION' }, DEFAULT_TEST_CONTEXT);
      expect(state.stateName).toBe('function-menu-center');

      // CEntrE contains CirCLE (default) and LinE, rather than starting measurement.
      state = droReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);
      expect(state.stateName).toBe('function-menu-circle');
      state = droReducer(state, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);
      expect(state.stateName).toBe('function-menu-line');
      state = droReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);
      expect(state.stateName).toBe('function-menu-center-line-point-1');

      // Store first point - set position via vMem and dispatch KEY_6_RIGHT
      state = {
        ...state,
        vMem: {
          ...state.vMem,
          manualAbsoluteValues: { X: 0, Y: 0, Z: 0 },
        },
      };
      state = droReducer(state, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);
      expect(state.stateName).toBe('function-menu-center-line-point-2');

      // Store second point
      state = {
        ...state,
        vMem: {
          ...state.vMem,
          manualAbsoluteValues: { X: 100, Y: 0, Z: 0 },
        },
      };
      state = droReducer(state, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);
      expect(state.stateName).toBe('function-menu-center-line-result');
      expect(state.display.X).toBeCloseTo(-50 / 25.4, 4);
      expect(state.display.Z).toBe('CEntrE');

      // Exit to idle
      state = droReducer(state, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);
      expect(state.stateName).toBe('idle');
    });
  });

});

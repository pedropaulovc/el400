/**
 * ABS/INC Mode Feature Reducer Tests
 *
 * Tests for ABS/INC mode toggling from idle and abs-inc-mode states.
 */

import { describe, it, expect } from 'vitest';
import { absIncReducer } from './abs-inc';
import { idleReducer } from './idle';
import { createTestState, DEFAULT_TEST_CONTEXT } from '../test-utils';
import type { DROStatePayload } from '../types';
import { INITIAL_DRO_STATE_DATA } from '../droStateMachine';
import { INITIAL_VOLATILE_MEMORY_STATE } from '../../../types/volatileMemory';
import { INITIAL_DISPLAY_STATE } from '../utils/displayComputation';


describe('connected ABS/INC datum retention', () => {
  it.each(['X', 'Y', 'Z'] as const)('includes %s motion made in ABS when toggling back to INC', (axis) => {
    const state: DROStatePayload = {
      ...createTestState('idle'),
      vMem: {
        ...INITIAL_VOLATILE_MEMORY_STATE,
        mode: 'inc',
        workOffsets: { X: 1, Y: 2, Z: 3 },
        incrementalOffsets: { X: 10, Y: 20, Z: 30 },
        incrementalValues: { X: 71, Y: 72, Z: 73 },
      },
    };
    const context = {
      ...DEFAULT_TEST_CONTEXT,
      millState: {
        ...DEFAULT_TEST_CONTEXT.millState,
        connected: true,
        position: { x: 14, y: 24, z: 34 },
      },
      nvMem: { ...DEFAULT_TEST_CONTEXT.nvMem, defaultUnit: 'mm' as const },
    };
    const absolute = absIncReducer(state, { eventName: 'BTN_ABS_INC' }, context)!;
    expect(absolute.vMem.mode).toBe('abs');
    const movedContext = {
      ...context,
      millState: { ...context.millState, position: { x: 19, y: 29, z: 39 } },
    };
    const moved = idleReducer(absolute, { eventName: 'MILL_STATE_CHANGED' }, movedContext)!;
    expect(moved.display[axis]).toBe(19 + (axis === 'X' ? 0 : axis === 'Y' ? 10 : 20) - state.vMem.workOffsets[axis]);
    const incremental = absIncReducer(moved, { eventName: 'BTN_ABS_INC' }, movedContext)!;
    expect(incremental.display[axis]).toBe(9);
    expect(incremental.vMem.incrementalOffsets).toEqual(state.vMem.incrementalOffsets);
    expect(incremental.vMem.workOffsets).toEqual(state.vMem.workOffsets);
    expect(incremental.vMem.incrementalValues).toEqual(state.vMem.incrementalValues);
  });
});
describe('absIncReducer', () => {
  describe('state handling', () => {
    it('should return null for non-idle/non-abs-inc states', () => {
      const state = createTestState('boot');
      const result = absIncReducer(state, { eventName: 'BTN_ABS_INC' }, DEFAULT_TEST_CONTEXT);
      expect(result).toBeNull();
    });
  });

  describe('BTN_ABS_INC in idle state', () => {
    it('should stay in idle state', () => {
      const state = createTestState('idle');
      const result = absIncReducer(state, { eventName: 'BTN_ABS_INC' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('idle');
    });

    it('should toggle mode from abs to inc', () => {
      const state: DROStatePayload = {
        stateName: 'idle',
        stateData: INITIAL_DRO_STATE_DATA,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'abs' },
        display: INITIAL_DISPLAY_STATE,
      };
      const result = absIncReducer(state, { eventName: 'BTN_ABS_INC' }, DEFAULT_TEST_CONTEXT);
      expect(result?.vMem.mode).toBe('inc');
    });

    it('should toggle mode from inc to abs', () => {
      const state: DROStatePayload = {
        stateName: 'idle',
        stateData: INITIAL_DRO_STATE_DATA,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'inc' },
        display: INITIAL_DISPLAY_STATE,
      };
      const result = absIncReducer(state, { eventName: 'BTN_ABS_INC' }, DEFAULT_TEST_CONTEXT);
      expect(result?.vMem.mode).toBe('abs');
    });

    it('should clear input buffer but preserve active axis', () => {
      const state: DROStatePayload = {
        stateName: 'idle',
        stateData: INITIAL_DRO_STATE_DATA,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '123', activeAxis: 'X' },
        display: INITIAL_DISPLAY_STATE,
      };
      const result = absIncReducer(state, { eventName: 'BTN_ABS_INC' }, DEFAULT_TEST_CONTEXT);
      expect(result?.vMem.inputBuffer).toBe('');
      expect(result?.vMem.activeAxis).toBe('X');
    });

    it('should compute display after toggle', () => {
      const state = createTestState('idle');
      const result = absIncReducer(state, { eventName: 'BTN_ABS_INC' }, DEFAULT_TEST_CONTEXT);
      expect(result?.display).toBeDefined();
    });
  });

  describe('BTN_ABS_INC in abs-inc-mode state', () => {
    it('should return to idle state', () => {
      const state: DROStatePayload = {
        stateName: 'abs-inc-mode',
        stateData: INITIAL_DRO_STATE_DATA,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'inc' },
        display: INITIAL_DISPLAY_STATE,
      };
      const result = absIncReducer(state, { eventName: 'BTN_ABS_INC' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('idle');
    });

    it('should toggle mode', () => {
      const state: DROStatePayload = {
        stateName: 'abs-inc-mode',
        stateData: INITIAL_DRO_STATE_DATA,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'inc' },
        display: INITIAL_DISPLAY_STATE,
      };
      const result = absIncReducer(state, { eventName: 'BTN_ABS_INC' }, DEFAULT_TEST_CONTEXT);
      expect(result?.vMem.mode).toBe('abs');
    });
  });

  describe('ABS_INC_TOGGLE_COMPLETE in abs-inc-mode', () => {
    it('should transition back to idle', () => {
      const state: DROStatePayload = {
        stateName: 'abs-inc-mode',
        stateData: INITIAL_DRO_STATE_DATA,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'inc' },
        display: INITIAL_DISPLAY_STATE,
      };
      const result = absIncReducer(state, { eventName: 'ABS_INC_TOGGLE_COMPLETE' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('idle');
    });

    it('should preserve vMem state', () => {
      const state: DROStatePayload = {
        stateName: 'abs-inc-mode',
        stateData: INITIAL_DRO_STATE_DATA,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'inc' },
        display: INITIAL_DISPLAY_STATE,
      };
      const result = absIncReducer(state, { eventName: 'ABS_INC_TOGGLE_COMPLETE' }, DEFAULT_TEST_CONTEXT);
      expect(result?.vMem.mode).toBe('inc');
    });

    it('should compute display', () => {
      const state = createTestState('abs-inc-mode');
      const result = absIncReducer(state, { eventName: 'ABS_INC_TOGGLE_COMPLETE' }, DEFAULT_TEST_CONTEXT);
      expect(result?.display).toBeDefined();
    });
  });

  describe('unhandled events', () => {
    it('should return null for other events in idle state', () => {
      const state = createTestState('idle');
      expect(absIncReducer(state, { eventName: 'BTN_FUNCTION' }, DEFAULT_TEST_CONTEXT)).toBeNull();
      expect(absIncReducer(state, { eventName: 'KEY_5' }, DEFAULT_TEST_CONTEXT)).toBeNull();
    });

    it('should return null for unhandled events in abs-inc-mode', () => {
      const state = createTestState('abs-inc-mode');
      expect(absIncReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT)).toBeNull();
    });
  });
});

/**
 * ABS/INC Mode Feature Reducer Tests
 *
 * Tests for ABS/INC mode toggling from idle and abs-inc-mode states.
 */

import { describe, it, expect } from 'vitest';
import { absIncReducer } from './abs-inc';
import { createTestState, DEFAULT_TEST_CONTEXT } from '../test-utils';
import type { DROStatePayload } from '../types';
import { INITIAL_DRO_STATE_DATA } from '../droStateMachine';
import { INITIAL_VOLATILE_MEMORY_STATE } from '../../../types/volatileMemory';
import { INITIAL_DISPLAY_STATE } from '../utils/displayComputation';

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

  describe('MODE_TOGGLE_COMPLETE in abs-inc-mode', () => {
    it('should transition back to idle', () => {
      const state: DROStatePayload = {
        stateName: 'abs-inc-mode',
        stateData: INITIAL_DRO_STATE_DATA,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'inc' },
        display: INITIAL_DISPLAY_STATE,
      };
      const result = absIncReducer(state, { eventName: 'MODE_TOGGLE_COMPLETE' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('idle');
    });

    it('should preserve vMem state', () => {
      const state: DROStatePayload = {
        stateName: 'abs-inc-mode',
        stateData: INITIAL_DRO_STATE_DATA,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'inc' },
        display: INITIAL_DISPLAY_STATE,
      };
      const result = absIncReducer(state, { eventName: 'MODE_TOGGLE_COMPLETE' }, DEFAULT_TEST_CONTEXT);
      expect(result?.vMem.mode).toBe('inc');
    });

    it('should compute display', () => {
      const state = createTestState('abs-inc-mode');
      const result = absIncReducer(state, { eventName: 'MODE_TOGGLE_COMPLETE' }, DEFAULT_TEST_CONTEXT);
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

/**
 * Mill State Changed Feature Reducer Tests
 *
 * Tests for the mill state changed reducer which handles MILL_STATE_CHANGED events
 * dispatched by the MillConnection when the mill state updates.
 */

import { describe, it, expect } from 'vitest';
import { millStateChangedReducer } from './millStateChanged';
import { createTestState, DEFAULT_TEST_CONTEXT } from '../test-utils';

describe('millStateChangedReducer', () => {
  describe('event handling', () => {
    it('should return null for non-MILL_STATE_CHANGED events', () => {
      const state = createTestState('idle');
      const result = millStateChangedReducer(state, { eventName: 'KEY_1' }, DEFAULT_TEST_CONTEXT);
      expect(result).toBeNull();
    });

    it('should handle MILL_STATE_CHANGED events', () => {
      const state = createTestState('idle');
      const result = millStateChangedReducer(state, { eventName: 'MILL_STATE_CHANGED' }, DEFAULT_TEST_CONTEXT);
      expect(result).not.toBeNull();
    });
  });

  describe('MILL_STATE_CHANGED handling', () => {
    it('should acknowledge the event without changing state', () => {
      const state = createTestState('idle');
      const result = millStateChangedReducer(state, { eventName: 'MILL_STATE_CHANGED' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('idle');
      expect(result?.stateData).toBe(state.stateData);
      expect(result?.vMem).toBe(state.vMem);
    });

    it('should work in any state', () => {
      const states = ['boot', 'idle', 'calculator-idle', 'function-menu-center', 'inch-mm-mode'] as const;

      for (const stateName of states) {
        const state = createTestState(stateName);
        const result = millStateChangedReducer(state, { eventName: 'MILL_STATE_CHANGED' }, DEFAULT_TEST_CONTEXT);

        expect(result).toBe(state);
      }
    });

    it('should preserve state data on MILL_STATE_CHANGED', () => {
      const state = createTestState('idle');
      const beforeResult = millStateChangedReducer(state, { eventName: 'MILL_STATE_CHANGED' }, DEFAULT_TEST_CONTEXT);

      // Run multiple times - state should not change
      const afterResult = millStateChangedReducer(
        beforeResult!,
        { eventName: 'MILL_STATE_CHANGED' },
        DEFAULT_TEST_CONTEXT
      );

      expect(afterResult).toBe(beforeResult);
    });
  });
});

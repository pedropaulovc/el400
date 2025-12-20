/**
 * Idle State Feature Reducer Tests
 *
 * Tests for the idle state, which is the default operating state of the DRO.
 * Note: BTN_ABS_INC is now handled by modeToggleReducer, not idleReducer.
 */

import { describe, it, expect } from 'vitest';
import { idleReducer } from './idle';
import type { DROEventPayload } from '../droStateMachine';
import { createTestState, DEFAULT_TEST_CONTEXT } from '../test-utils';

describe('idleReducer', () => {
  describe('state handling', () => {
    it('should return null for non-idle states', () => {
      const state = createTestState('boot');
      const result = idleReducer(state, { eventName: 'BTN_INCH_MM' }, DEFAULT_TEST_CONTEXT);
      expect(result).toBeNull();
    });

    it('should process events only when in idle state', () => {
      const idleState = createTestState('idle');
      const nonIdleState = createTestState('boot');

      // Specific events are handled in idle state
      expect(idleReducer(idleState, { eventName: 'BTN_INCH_MM' }, DEFAULT_TEST_CONTEXT)).not.toBeNull();
      expect(idleReducer(idleState, { eventName: 'BTN_FUNCTION' }, DEFAULT_TEST_CONTEXT)).not.toBeNull();

      // But not in other states
      expect(idleReducer(nonIdleState, { eventName: 'BTN_INCH_MM' }, DEFAULT_TEST_CONTEXT)).toBeNull();
      expect(idleReducer(nonIdleState, { eventName: 'BTN_FUNCTION' }, DEFAULT_TEST_CONTEXT)).toBeNull();
    });
  });

  describe('idle state', () => {
    it('should transition to inch-mm-mode on BTN_INCH_MM', () => {
      const state = createTestState('idle');
      const result = idleReducer(state, { eventName: 'BTN_INCH_MM' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('inch-mm-mode');
      expect(result?.stateData).toBe(state.stateData);
    });

    it('should transition to function-menu-center on BTN_FUNCTION', () => {
      const state = createTestState('idle');
      const result = idleReducer(state, { eventName: 'BTN_FUNCTION' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('function-menu-center');
      expect(result?.stateData.stateDataType).toBe('none');
    });

    it('should return null for unhandled events (handled by other reducers)', () => {
      const state = createTestState('idle');

      expect(idleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT)).toBeNull();
      expect(idleReducer(state, { eventName: 'KEY_4_LEFT' }, DEFAULT_TEST_CONTEXT)).toBeNull();
      expect(idleReducer(state, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT)).toBeNull();
      expect(idleReducer(state, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT)).toBeNull();
    });

    it('should return null for numeric key events (handled by keypadReducer)', () => {
      const state = createTestState('idle');
      const numericKeys = ['KEY_0', 'KEY_1', 'KEY_2_DOWN', 'KEY_3', 'KEY_4_LEFT', 'KEY_5', 'KEY_6_RIGHT', 'KEY_7', 'KEY_8_UP', 'KEY_9'] as const;

      for (const key of numericKeys) {
        const result = idleReducer(state, { eventName: key }, DEFAULT_TEST_CONTEXT);
        expect(result).toBeNull();
      }
    });

    it('should return null for BTN_ABS_INC (handled by modeToggleReducer)', () => {
      const state = createTestState('idle');
      const result = idleReducer(state, { eventName: 'BTN_ABS_INC' }, DEFAULT_TEST_CONTEXT);
      expect(result).toBeNull();
    });

    it('should return null for boot and mode toggle events (handled by other reducers)', () => {
      const state = createTestState('idle');

      const systemEvents: DROEventPayload[] = [
        { eventName: 'BOOT_STARTED', skipBootMessage: false },
        { eventName: 'BOOT_MESSAGE_TIMEOUT' },
        { eventName: 'MODE_TOGGLE_COMPLETE' },
      ];

      for (const event of systemEvents) {
        const result = idleReducer(state, event, DEFAULT_TEST_CONTEXT);
        expect(result).toBeNull();
      }
    });

    it('should handle MILL_STATE_CHANGED by recomputing display', () => {
      const state = createTestState('idle');
      const result = idleReducer(state, { eventName: 'MILL_STATE_CHANGED' }, DEFAULT_TEST_CONTEXT);
      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('idle');
      expect(result?.display).toBeDefined();
    });
  });

  describe('data preservation', () => {
    it('should preserve data during mode toggle transitions', () => {
      const customData = { stateDataType: 'none' as const };
      const state = createTestState('idle', customData);

      // BTN_INCH_MM is still handled by idleReducer
      const result = idleReducer(state, { eventName: 'BTN_INCH_MM' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateData).toBe(customData);
    });

    it('should reset data when entering function menu', () => {
      const state = createTestState('idle', { stateDataType: 'none' });
      const result = idleReducer(state, { eventName: 'BTN_FUNCTION' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateData).toEqual({ stateDataType: 'none' });
    });
  });
});

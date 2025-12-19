/**
 * Idle State Feature Reducer Tests
 *
 * Tests for the idle state, which is the default operating state of the DRO.
 * Note: BTN_ABS_INC is now handled by modeToggleReducer, not idleReducer.
 */

import { describe, it, expect } from 'vitest';
import { idleReducer } from './idle';
import { createTestState, DEFAULT_TEST_CONTEXT } from '../test-utils';

describe('idleReducer', () => {
  describe('state handling', () => {
    it('should return null for non-idle states', () => {
      const state = createTestState('boot');
      const result = idleReducer(state, { eventName: 'BTN_INCH_MM' }, DEFAULT_TEST_CONTEXT);
      expect(result).toBeNull();
    });

    it('should handle idle state', () => {
      const state = createTestState('idle');
      const result = idleReducer(state, { eventName: 'KEY_5' }, DEFAULT_TEST_CONTEXT);
      expect(result).not.toBeNull();
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

    it('should return current state for unhandled events', () => {
      const state = createTestState('idle');

      expect(idleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT)).toBe(state);
      expect(idleReducer(state, { eventName: 'KEY_4_LEFT' }, DEFAULT_TEST_CONTEXT)).toBe(state);
      expect(idleReducer(state, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT)).toBe(state);
      expect(idleReducer(state, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT)).toBe(state);
    });

    it('should return current state for numeric key events (handled by keypadReducer)', () => {
      const state = createTestState('idle');
      const numericKeys = ['KEY_0', 'KEY_1', 'KEY_2_DOWN', 'KEY_3', 'KEY_4_LEFT', 'KEY_5', 'KEY_6_RIGHT', 'KEY_7', 'KEY_8_UP', 'KEY_9'] as const;

      for (const key of numericKeys) {
        const result = idleReducer(state, { eventName: key }, DEFAULT_TEST_CONTEXT);
        // idleReducer returns current state, but in the actual reducer chain,
        // keypadReducer will handle these before idleReducer
        expect(result).toBe(state);
      }
    });

    it('should return current state for BTN_ABS_INC (handled by modeToggleReducer)', () => {
      // BTN_ABS_INC is now handled by modeToggleReducer, not idleReducer
      // idleReducer returns current state for unhandled events
      const state = createTestState('idle');
      const result = idleReducer(state, { eventName: 'BTN_ABS_INC' }, DEFAULT_TEST_CONTEXT);
      expect(result).toBe(state);
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

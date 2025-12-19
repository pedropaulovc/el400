/**
 * Boot Feature Reducer Tests
 *
 * Tests for boot sequence states: 'boot' and 'boot-show-message'.
 */

import { describe, it, expect } from 'vitest';
import { bootReducer } from './boot';
import { createTestState, DEFAULT_TEST_CONTEXT } from '../test-utils';

describe('bootReducer', () => {
  describe('state handling', () => {
    it('should return null for non-boot states', () => {
      const state = createTestState('function-menu-center');
      const result = bootReducer(state, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);
      expect(result).toBeNull();
    });

    it('should return null for idle state', () => {
      const state = createTestState('idle');
      const result = bootReducer(state, { eventName: 'BTN_ABS_INC' }, DEFAULT_TEST_CONTEXT);
      expect(result).toBeNull();
    });

    it('should handle boot states', () => {
      const bootStates = ['boot', 'boot-show-message'] as const;

      for (const bootState of bootStates) {
        const state = createTestState(bootState);
        // Should not return null for boot states (may return current state if event not handled)
        const result = bootReducer(state, { eventName: 'KEY_5' }, DEFAULT_TEST_CONTEXT);
        expect(result).not.toBeNull();
      }
    });
  });

  describe('boot state', () => {
    it('should transition to boot-show-message on BOOT_STARTED with skipMessage=false', () => {
      const state = createTestState('boot');
      const result = bootReducer(state, { eventName: 'BOOT_STARTED', skipBootMessage: false }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('boot-show-message');
      expect(result?.stateData.stateDataType).toBe('none');
    });

    it('should transition to idle on BOOT_STARTED with skipMessage=true', () => {
      const state = createTestState('boot');
      const result = bootReducer(state, { eventName: 'BOOT_STARTED', skipBootMessage: true }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('idle');
      expect(result?.stateData.stateDataType).toBe('none');
    });

    it('should return current state for unhandled events', () => {
      const state = createTestState('boot');
      const result = bootReducer(state, { eventName: 'BTN_FUNCTION' }, DEFAULT_TEST_CONTEXT);
      expect(result).toBe(state);
    });

    it('should ignore mode toggle events during boot', () => {
      const state = createTestState('boot');

      expect(bootReducer(state, { eventName: 'BTN_ABS_INC' }, DEFAULT_TEST_CONTEXT)).toBe(state);
      expect(bootReducer(state, { eventName: 'BTN_INCH_MM' }, DEFAULT_TEST_CONTEXT)).toBe(state);
    });
  });

  describe('boot-show-message state', () => {
    it('should transition to idle on BOOT_MESSAGE_TIMEOUT', () => {
      const state = createTestState('boot-show-message');
      const result = bootReducer(state, { eventName: 'BOOT_MESSAGE_TIMEOUT' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('idle');
      expect(result?.stateData.stateDataType).toBe('none');
    });

    it('should transition to idle on KEY_CLEAR', () => {
      const state = createTestState('boot-show-message');
      const result = bootReducer(state, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('idle');
      expect(result?.stateData.stateDataType).toBe('none');
    });

    it('should return current state for unhandled events', () => {
      const state = createTestState('boot-show-message');
      const result = bootReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);
      expect(result).toBe(state);
    });
  });
});

/**
 * Boot Feature Reducer Tests
 *
 * Tests for boot sequence and idle state.
 */

import { describe, it, expect } from 'vitest';
import { bootReducer } from './boot';
import type { DROStatePayload } from '../types';
import { INITIAL_DRO_STATE_DATA } from '../droStateMachine';

describe('bootReducer', () => {
  describe('state handling', () => {
    it('should return null for non-boot states', () => {
      const state: DROStatePayload = {
        stateName: 'function-menu-center',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      const result = bootReducer(state, { eventName: 'KEY_CLEAR' });

      expect(result).toBeNull();
    });

    it('should handle boot states', () => {
      const bootStates = ['boot', 'showMessage', 'idle'] as const;

      for (const bootState of bootStates) {
        const state: DROStatePayload = {
          stateName: bootState,
          stateData: INITIAL_DRO_STATE_DATA,
        };

        // Should not return null for boot states (may return current state if event not handled)
        const result = bootReducer(state, { eventName: 'KEY_5' });
        expect(result).not.toBeNull();
      }
    });
  });

  describe('boot state', () => {
    it('should transition to showMessage on BOOT_STARTED with skipMessage=false', () => {
      const state: DROStatePayload = {
        stateName: 'boot',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      const result = bootReducer(state, { eventName: 'BOOT_STARTED', skipBootMessage: false });

      expect(result?.stateName).toBe('showMessage');
      expect(result?.stateData.stateDataType).toBe('none');
    });

    it('should transition to idle on BOOT_STARTED with skipMessage=true', () => {
      const state: DROStatePayload = {
        stateName: 'boot',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      const result = bootReducer(state, { eventName: 'BOOT_STARTED', skipBootMessage: true });

      expect(result?.stateName).toBe('idle');
      expect(result?.stateData.stateDataType).toBe('none');
    });

    it('should return current state for unhandled events', () => {
      const state: DROStatePayload = {
        stateName: 'boot',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      const result = bootReducer(state, { eventName: 'BTN_FUNCTION' });

      expect(result).toBe(state);
    });

    it('should ignore mode toggle events during boot', () => {
      const state: DROStatePayload = {
        stateName: 'boot',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      expect(bootReducer(state, { eventName: 'BTN_ABS_INC' })).toBe(state);
      expect(bootReducer(state, { eventName: 'BTN_INCH_MM' })).toBe(state);
    });
  });

  describe('showMessage state', () => {
    it('should transition to idle on BOOT_MESSAGE_TIMEOUT', () => {
      const state: DROStatePayload = {
        stateName: 'showMessage',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      const result = bootReducer(state, { eventName: 'BOOT_MESSAGE_TIMEOUT' });

      expect(result?.stateName).toBe('idle');
      expect(result?.stateData.stateDataType).toBe('none');
    });

    it('should transition to idle on KEY_CLEAR', () => {
      const state: DROStatePayload = {
        stateName: 'showMessage',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      const result = bootReducer(state, { eventName: 'KEY_CLEAR' });

      expect(result?.stateName).toBe('idle');
      expect(result?.stateData.stateDataType).toBe('none');
    });

    it('should return current state for unhandled events', () => {
      const state: DROStatePayload = {
        stateName: 'showMessage',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      const result = bootReducer(state, { eventName: 'KEY_ENTER' });

      expect(result).toBe(state);
    });
  });

  describe('idle state', () => {
    it('should transition to abs-inc-mode on BTN_ABS_INC', () => {
      const state: DROStatePayload = {
        stateName: 'idle',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      const result = bootReducer(state, { eventName: 'BTN_ABS_INC' });

      expect(result?.stateName).toBe('abs-inc-mode');
      expect(result?.stateData).toBe(state.stateData);
    });

    it('should transition to inch-mm-mode on BTN_INCH_MM', () => {
      const state: DROStatePayload = {
        stateName: 'idle',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      const result = bootReducer(state, { eventName: 'BTN_INCH_MM' });

      expect(result?.stateName).toBe('inch-mm-mode');
      expect(result?.stateData).toBe(state.stateData);
    });

    it('should transition to function-menu-center on BTN_FUNCTION', () => {
      const state: DROStatePayload = {
        stateName: 'idle',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      const result = bootReducer(state, { eventName: 'BTN_FUNCTION' });

      expect(result?.stateName).toBe('function-menu-center');
      expect(result?.stateData.stateDataType).toBe('none');
    });

    it('should return current state for unhandled events', () => {
      const state: DROStatePayload = {
        stateName: 'idle',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      expect(bootReducer(state, { eventName: 'KEY_ENTER' })).toBe(state);
      expect(bootReducer(state, { eventName: 'KEY_4_LEFT' })).toBe(state);
      expect(bootReducer(state, { eventName: 'KEY_6_RIGHT' })).toBe(state);
      expect(bootReducer(state, { eventName: 'KEY_CLEAR' })).toBe(state);
    });

    it('should ignore numeric key events', () => {
      const state: DROStatePayload = {
        stateName: 'idle',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      const numericKeys = ['KEY_0', 'KEY_1', 'KEY_2_DOWN', 'KEY_3', 'KEY_4_LEFT', 'KEY_5', 'KEY_6_RIGHT', 'KEY_7', 'KEY_8_UP', 'KEY_9'] as const;

      for (const key of numericKeys) {
        const result = bootReducer(state, { eventName: key });
        expect(result).toBe(state);
      }
    });
  });

  describe('data preservation', () => {
    it('should preserve data during mode toggle transitions', () => {
      const customData = { stateDataType: 'none' as const };
      const state: DROStatePayload = {
        stateName: 'idle',
        stateData: customData,
      };

      const result = bootReducer(state, { eventName: 'BTN_ABS_INC' });

      expect(result?.stateData).toBe(customData);
    });

    it('should reset data when entering function menu', () => {
      const state: DROStatePayload = {
        stateName: 'idle',
        stateData: { stateDataType: 'none' },
      };

      const result = bootReducer(state, { eventName: 'BTN_FUNCTION' });

      expect(result?.stateData).toEqual({ stateDataType: 'none' });
    });
  });
});

/**
 * Boot Feature Reducer Tests
 *
 * Tests for boot sequence, idle state, and mode toggle states.
 */

import { describe, it, expect } from 'vitest';
import { bootReducer } from './boot';
import type { DROShape } from '../types';
import { INITIAL_DRO_CONTEXT } from '../droStateMachine';

describe('bootReducer', () => {
  describe('state handling', () => {
    it('should return null for non-boot states', () => {
      const state: DROShape = {
        state: 'function-menu-center',
        data: INITIAL_DRO_CONTEXT,
      };

      const result = bootReducer(state, { type: 'KEY_CLEAR' });

      expect(result).toBeNull();
    });

    it('should handle boot states', () => {
      const bootStates = ['boot', 'showMessage', 'idle', 'abs-inc-mode', 'inch-mm-mode'] as const;

      for (const bootState of bootStates) {
        const state: DROShape = {
          state: bootState,
          data: INITIAL_DRO_CONTEXT,
        };

        // Should not return null for boot states (may return current state if event not handled)
        const result = bootReducer(state, { type: 'KEY_5' });
        expect(result).not.toBeNull();
      }
    });
  });

  describe('boot state', () => {
    it('should transition to showMessage on BOOT_COMPLETE with skipMessage=false', () => {
      const state: DROShape = {
        state: 'boot',
        data: INITIAL_DRO_CONTEXT,
      };

      const result = bootReducer(state, { type: 'BOOT_COMPLETE', skipMessage: false });

      expect(result?.state).toBe('showMessage');
      expect(result?.data.type).toBe('none');
    });

    it('should transition to idle on BOOT_COMPLETE with skipMessage=true', () => {
      const state: DROShape = {
        state: 'boot',
        data: INITIAL_DRO_CONTEXT,
      };

      const result = bootReducer(state, { type: 'BOOT_COMPLETE', skipMessage: true });

      expect(result?.state).toBe('idle');
      expect(result?.data.type).toBe('none');
    });

    it('should return current state for unhandled events', () => {
      const state: DROShape = {
        state: 'boot',
        data: INITIAL_DRO_CONTEXT,
      };

      const result = bootReducer(state, { type: 'BTN_FUNCTION' });

      expect(result).toBe(state);
    });

    it('should ignore mode toggle events during boot', () => {
      const state: DROShape = {
        state: 'boot',
        data: INITIAL_DRO_CONTEXT,
      };

      expect(bootReducer(state, { type: 'BTN_ABS_INC' })).toBe(state);
      expect(bootReducer(state, { type: 'BTN_INCH_MM' })).toBe(state);
    });
  });

  describe('showMessage state', () => {
    it('should transition to idle on BOOT_MESSAGE_TIMEOUT', () => {
      const state: DROShape = {
        state: 'showMessage',
        data: INITIAL_DRO_CONTEXT,
      };

      const result = bootReducer(state, { type: 'BOOT_MESSAGE_TIMEOUT' });

      expect(result?.state).toBe('idle');
      expect(result?.data.type).toBe('none');
    });

    it('should transition to idle on KEY_CLEAR', () => {
      const state: DROShape = {
        state: 'showMessage',
        data: INITIAL_DRO_CONTEXT,
      };

      const result = bootReducer(state, { type: 'KEY_CLEAR' });

      expect(result?.state).toBe('idle');
      expect(result?.data.type).toBe('none');
    });

    it('should return current state for unhandled events', () => {
      const state: DROShape = {
        state: 'showMessage',
        data: INITIAL_DRO_CONTEXT,
      };

      const result = bootReducer(state, { type: 'KEY_ENTER' });

      expect(result).toBe(state);
    });
  });

  describe('idle state', () => {
    it('should transition to abs-inc-mode on BTN_ABS_INC', () => {
      const state: DROShape = {
        state: 'idle',
        data: INITIAL_DRO_CONTEXT,
      };

      const result = bootReducer(state, { type: 'BTN_ABS_INC' });

      expect(result?.state).toBe('abs-inc-mode');
      expect(result?.data).toBe(state.data);
    });

    it('should transition to inch-mm-mode on BTN_INCH_MM', () => {
      const state: DROShape = {
        state: 'idle',
        data: INITIAL_DRO_CONTEXT,
      };

      const result = bootReducer(state, { type: 'BTN_INCH_MM' });

      expect(result?.state).toBe('inch-mm-mode');
      expect(result?.data).toBe(state.data);
    });

    it('should transition to function-menu-center on BTN_FUNCTION', () => {
      const state: DROShape = {
        state: 'idle',
        data: INITIAL_DRO_CONTEXT,
      };

      const result = bootReducer(state, { type: 'BTN_FUNCTION' });

      expect(result?.state).toBe('function-menu-center');
      expect(result?.data.type).toBe('none');
    });

    it('should return current state for unhandled events', () => {
      const state: DROShape = {
        state: 'idle',
        data: INITIAL_DRO_CONTEXT,
      };

      expect(bootReducer(state, { type: 'KEY_ENTER' })).toBe(state);
      expect(bootReducer(state, { type: 'KEY_4_LEFT' })).toBe(state);
      expect(bootReducer(state, { type: 'KEY_6_RIGHT' })).toBe(state);
      expect(bootReducer(state, { type: 'KEY_CLEAR' })).toBe(state);
    });

    it('should ignore numeric key events', () => {
      const state: DROShape = {
        state: 'idle',
        data: INITIAL_DRO_CONTEXT,
      };

      const numericKeys = ['KEY_0', 'KEY_1', 'KEY_2_DOWN', 'KEY_3', 'KEY_4_LEFT', 'KEY_5', 'KEY_6_RIGHT', 'KEY_7', 'KEY_8_UP', 'KEY_9'] as const;

      for (const key of numericKeys) {
        const result = bootReducer(state, { type: key });
        expect(result).toBe(state);
      }
    });
  });

  describe('abs-inc-mode state', () => {
    it('should transition to idle on MODE_TOGGLE_COMPLETE', () => {
      const state: DROShape = {
        state: 'abs-inc-mode',
        data: INITIAL_DRO_CONTEXT,
      };

      const result = bootReducer(state, { type: 'MODE_TOGGLE_COMPLETE' });

      expect(result?.state).toBe('idle');
      expect(result?.data.type).toBe('none');
    });

    it('should return current state for unhandled events', () => {
      const state: DROShape = {
        state: 'abs-inc-mode',
        data: INITIAL_DRO_CONTEXT,
      };

      expect(bootReducer(state, { type: 'KEY_ENTER' })).toBe(state);
      expect(bootReducer(state, { type: 'BTN_ABS_INC' })).toBe(state);
    });
  });

  describe('inch-mm-mode state', () => {
    it('should transition to idle on MODE_TOGGLE_COMPLETE', () => {
      const state: DROShape = {
        state: 'inch-mm-mode',
        data: INITIAL_DRO_CONTEXT,
      };

      const result = bootReducer(state, { type: 'MODE_TOGGLE_COMPLETE' });

      expect(result?.state).toBe('idle');
      expect(result?.data.type).toBe('none');
    });

    it('should return current state for unhandled events', () => {
      const state: DROShape = {
        state: 'inch-mm-mode',
        data: INITIAL_DRO_CONTEXT,
      };

      expect(bootReducer(state, { type: 'KEY_ENTER' })).toBe(state);
      expect(bootReducer(state, { type: 'BTN_INCH_MM' })).toBe(state);
    });
  });

  describe('data preservation', () => {
    it('should preserve data during mode toggle transitions', () => {
      const customData = { type: 'none' as const };
      const state: DROShape = {
        state: 'idle',
        data: customData,
      };

      const result = bootReducer(state, { type: 'BTN_ABS_INC' });

      expect(result?.data).toBe(customData);
    });

    it('should reset data when entering function menu', () => {
      const state: DROShape = {
        state: 'idle',
        data: { type: 'none' },
      };

      const result = bootReducer(state, { type: 'BTN_FUNCTION' });

      expect(result?.data).toEqual({ type: 'none' });
    });
  });
});

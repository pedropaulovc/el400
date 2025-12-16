/**
 * Boot Feature Reducer Tests
 *
 * Tests for boot sequence, idle state, and mode toggle states.
 */

import { describe, it, expect } from 'vitest';
import { bootReducer } from '../features/boot';
import type { OperationStateShape } from '../types';
import { INITIAL_OPERATION_CONTEXT } from '../../types/operationState';

describe('bootReducer', () => {
  describe('state handling', () => {
    it('should return null for non-boot states', () => {
      const state: OperationStateShape = {
        state: 'function-menu-center',
        context: INITIAL_OPERATION_CONTEXT,
      };

      const result = bootReducer(state, { type: 'KEY_CLEAR' });

      expect(result).toBeNull();
    });

    it('should handle boot states', () => {
      const bootStates = ['boot', 'showMessage', 'idle', 'abs-inc-mode', 'inch-mm-mode'] as const;

      for (const bootState of bootStates) {
        const state: OperationStateShape = {
          state: bootState,
          context: INITIAL_OPERATION_CONTEXT,
        };

        // Should not return null for boot states (may return current state if event not handled)
        const result = bootReducer(state, { type: 'KEY_5' });
        expect(result).not.toBeNull();
      }
    });
  });

  describe('boot state', () => {
    it('should transition to showMessage on BOOT_COMPLETE with skipMessage=false', () => {
      const state: OperationStateShape = {
        state: 'boot',
        context: INITIAL_OPERATION_CONTEXT,
      };

      const result = bootReducer(state, { type: 'BOOT_COMPLETE', skipMessage: false });

      expect(result?.state).toBe('showMessage');
      expect(result?.context.type).toBe('none');
    });

    it('should transition to idle on BOOT_COMPLETE with skipMessage=true', () => {
      const state: OperationStateShape = {
        state: 'boot',
        context: INITIAL_OPERATION_CONTEXT,
      };

      const result = bootReducer(state, { type: 'BOOT_COMPLETE', skipMessage: true });

      expect(result?.state).toBe('idle');
      expect(result?.context.type).toBe('none');
    });

    it('should return current state for unhandled events', () => {
      const state: OperationStateShape = {
        state: 'boot',
        context: INITIAL_OPERATION_CONTEXT,
      };

      const result = bootReducer(state, { type: 'BTN_FUNCTION' });

      expect(result).toBe(state);
    });

    it('should ignore mode toggle events during boot', () => {
      const state: OperationStateShape = {
        state: 'boot',
        context: INITIAL_OPERATION_CONTEXT,
      };

      expect(bootReducer(state, { type: 'BTN_ABS_INC' })).toBe(state);
      expect(bootReducer(state, { type: 'BTN_INCH_MM' })).toBe(state);
    });
  });

  describe('showMessage state', () => {
    it('should transition to idle on BOOT_MESSAGE_TIMEOUT', () => {
      const state: OperationStateShape = {
        state: 'showMessage',
        context: INITIAL_OPERATION_CONTEXT,
      };

      const result = bootReducer(state, { type: 'BOOT_MESSAGE_TIMEOUT' });

      expect(result?.state).toBe('idle');
      expect(result?.context.type).toBe('none');
    });

    it('should transition to idle on KEY_CLEAR', () => {
      const state: OperationStateShape = {
        state: 'showMessage',
        context: INITIAL_OPERATION_CONTEXT,
      };

      const result = bootReducer(state, { type: 'KEY_CLEAR' });

      expect(result?.state).toBe('idle');
      expect(result?.context.type).toBe('none');
    });

    it('should return current state for unhandled events', () => {
      const state: OperationStateShape = {
        state: 'showMessage',
        context: INITIAL_OPERATION_CONTEXT,
      };

      const result = bootReducer(state, { type: 'KEY_ENTER' });

      expect(result).toBe(state);
    });
  });

  describe('idle state', () => {
    it('should transition to abs-inc-mode on BTN_ABS_INC', () => {
      const state: OperationStateShape = {
        state: 'idle',
        context: INITIAL_OPERATION_CONTEXT,
      };

      const result = bootReducer(state, { type: 'BTN_ABS_INC' });

      expect(result?.state).toBe('abs-inc-mode');
      expect(result?.context).toBe(state.context);
    });

    it('should transition to inch-mm-mode on BTN_INCH_MM', () => {
      const state: OperationStateShape = {
        state: 'idle',
        context: INITIAL_OPERATION_CONTEXT,
      };

      const result = bootReducer(state, { type: 'BTN_INCH_MM' });

      expect(result?.state).toBe('inch-mm-mode');
      expect(result?.context).toBe(state.context);
    });

    it('should transition to function-menu-center on BTN_FUNCTION', () => {
      const state: OperationStateShape = {
        state: 'idle',
        context: INITIAL_OPERATION_CONTEXT,
      };

      const result = bootReducer(state, { type: 'BTN_FUNCTION' });

      expect(result?.state).toBe('function-menu-center');
      expect(result?.context.type).toBe('none');
    });

    it('should return current state for unhandled events', () => {
      const state: OperationStateShape = {
        state: 'idle',
        context: INITIAL_OPERATION_CONTEXT,
      };

      expect(bootReducer(state, { type: 'KEY_ENTER' })).toBe(state);
      expect(bootReducer(state, { type: 'KEY_4' })).toBe(state);
      expect(bootReducer(state, { type: 'KEY_6' })).toBe(state);
      expect(bootReducer(state, { type: 'KEY_CLEAR' })).toBe(state);
    });

    it('should ignore numeric key events', () => {
      const state: OperationStateShape = {
        state: 'idle',
        context: INITIAL_OPERATION_CONTEXT,
      };

      const numericKeys = ['KEY_0', 'KEY_1', 'KEY_2', 'KEY_3', 'KEY_4', 'KEY_5', 'KEY_6', 'KEY_7', 'KEY_8', 'KEY_9'] as const;

      for (const key of numericKeys) {
        const result = bootReducer(state, { type: key });
        expect(result).toBe(state);
      }
    });
  });

  describe('abs-inc-mode state', () => {
    it('should transition to idle on MODE_TOGGLE_COMPLETE', () => {
      const state: OperationStateShape = {
        state: 'abs-inc-mode',
        context: INITIAL_OPERATION_CONTEXT,
      };

      const result = bootReducer(state, { type: 'MODE_TOGGLE_COMPLETE' });

      expect(result?.state).toBe('idle');
      expect(result?.context.type).toBe('none');
    });

    it('should return current state for unhandled events', () => {
      const state: OperationStateShape = {
        state: 'abs-inc-mode',
        context: INITIAL_OPERATION_CONTEXT,
      };

      expect(bootReducer(state, { type: 'KEY_ENTER' })).toBe(state);
      expect(bootReducer(state, { type: 'BTN_ABS_INC' })).toBe(state);
    });
  });

  describe('inch-mm-mode state', () => {
    it('should transition to idle on MODE_TOGGLE_COMPLETE', () => {
      const state: OperationStateShape = {
        state: 'inch-mm-mode',
        context: INITIAL_OPERATION_CONTEXT,
      };

      const result = bootReducer(state, { type: 'MODE_TOGGLE_COMPLETE' });

      expect(result?.state).toBe('idle');
      expect(result?.context.type).toBe('none');
    });

    it('should return current state for unhandled events', () => {
      const state: OperationStateShape = {
        state: 'inch-mm-mode',
        context: INITIAL_OPERATION_CONTEXT,
      };

      expect(bootReducer(state, { type: 'KEY_ENTER' })).toBe(state);
      expect(bootReducer(state, { type: 'BTN_INCH_MM' })).toBe(state);
    });
  });

  describe('context preservation', () => {
    it('should preserve context during mode toggle transitions', () => {
      const customContext = { type: 'none' as const };
      const state: OperationStateShape = {
        state: 'idle',
        context: customContext,
      };

      const result = bootReducer(state, { type: 'BTN_ABS_INC' });

      expect(result?.context).toBe(customContext);
    });

    it('should reset context when entering function menu', () => {
      const state: OperationStateShape = {
        state: 'idle',
        context: { type: 'none' },
      };

      const result = bootReducer(state, { type: 'BTN_FUNCTION' });

      expect(result?.context).toEqual({ type: 'none' });
    });
  });
});

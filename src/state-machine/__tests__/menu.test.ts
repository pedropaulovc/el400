/**
 * Menu Feature Reducer Tests
 *
 * Tests for function menu navigation.
 */

import { describe, it, expect } from 'vitest';
import { menuReducer } from '../features/menu';
import type { OperationStateShape } from '../types';
import type { OperationState } from '../../types/operationState';
import { INITIAL_OPERATION_CONTEXT } from '../../types/operationState';

describe('menuReducer', () => {
  describe('state handling', () => {
    it('should return null for non-menu states', () => {
      const nonMenuStates: OperationState[] = [
        'boot',
        'showMessage',
        'idle',
        'abs-inc-mode',
        'inch-mm-mode',
        'function-menu-center-line-point-1',
        'function-menu-center-line-result',
      ];

      for (const menuState of nonMenuStates) {
        const state: OperationStateShape = {
          state: menuState,
          context: INITIAL_OPERATION_CONTEXT,
        };

        const result = menuReducer(state, { type: 'KEY_6' });
        expect(result).toBeNull();
      }
    });

    it('should handle all menu selection states', () => {
      const menuStates: OperationState[] = [
        'function-menu-center',
        'function-menu-circle',
        'function-menu-line',
        'function-menu-linear',
        'function-menu-polar',
      ];

      for (const menuState of menuStates) {
        const state: OperationStateShape = {
          state: menuState,
          context: INITIAL_OPERATION_CONTEXT,
        };

        const result = menuReducer(state, { type: 'KEY_6' });
        expect(result).not.toBeNull();
      }
    });
  });

  describe('forward navigation (KEY_6)', () => {
    it('should navigate from center to circle', () => {
      const state: OperationStateShape = {
        state: 'function-menu-center',
        context: INITIAL_OPERATION_CONTEXT,
      };

      const result = menuReducer(state, { type: 'KEY_6' });

      expect(result?.state).toBe('function-menu-circle');
    });

    it('should navigate from circle to line', () => {
      const state: OperationStateShape = {
        state: 'function-menu-circle',
        context: INITIAL_OPERATION_CONTEXT,
      };

      const result = menuReducer(state, { type: 'KEY_6' });

      expect(result?.state).toBe('function-menu-line');
    });

    it('should navigate from line to linear', () => {
      const state: OperationStateShape = {
        state: 'function-menu-line',
        context: INITIAL_OPERATION_CONTEXT,
      };

      const result = menuReducer(state, { type: 'KEY_6' });

      expect(result?.state).toBe('function-menu-linear');
    });

    it('should navigate from linear to polar', () => {
      const state: OperationStateShape = {
        state: 'function-menu-linear',
        context: INITIAL_OPERATION_CONTEXT,
      };

      const result = menuReducer(state, { type: 'KEY_6' });

      expect(result?.state).toBe('function-menu-polar');
    });

    it('should wrap from polar to center', () => {
      const state: OperationStateShape = {
        state: 'function-menu-polar',
        context: INITIAL_OPERATION_CONTEXT,
      };

      const result = menuReducer(state, { type: 'KEY_6' });

      expect(result?.state).toBe('function-menu-center');
    });

    it('should preserve context during navigation', () => {
      const context = { type: 'none' as const };
      const state: OperationStateShape = {
        state: 'function-menu-center',
        context,
      };

      const result = menuReducer(state, { type: 'KEY_6' });

      expect(result?.context).toBe(context);
    });
  });

  describe('backward navigation (KEY_4)', () => {
    it('should navigate from circle to center', () => {
      const state: OperationStateShape = {
        state: 'function-menu-circle',
        context: INITIAL_OPERATION_CONTEXT,
      };

      const result = menuReducer(state, { type: 'KEY_4' });

      expect(result?.state).toBe('function-menu-center');
    });

    it('should navigate from line to circle', () => {
      const state: OperationStateShape = {
        state: 'function-menu-line',
        context: INITIAL_OPERATION_CONTEXT,
      };

      const result = menuReducer(state, { type: 'KEY_4' });

      expect(result?.state).toBe('function-menu-circle');
    });

    it('should navigate from linear to line', () => {
      const state: OperationStateShape = {
        state: 'function-menu-linear',
        context: INITIAL_OPERATION_CONTEXT,
      };

      const result = menuReducer(state, { type: 'KEY_4' });

      expect(result?.state).toBe('function-menu-line');
    });

    it('should navigate from polar to linear', () => {
      const state: OperationStateShape = {
        state: 'function-menu-polar',
        context: INITIAL_OPERATION_CONTEXT,
      };

      const result = menuReducer(state, { type: 'KEY_4' });

      expect(result?.state).toBe('function-menu-linear');
    });

    it('should wrap from center to polar', () => {
      const state: OperationStateShape = {
        state: 'function-menu-center',
        context: INITIAL_OPERATION_CONTEXT,
      };

      const result = menuReducer(state, { type: 'KEY_4' });

      expect(result?.state).toBe('function-menu-polar');
    });
  });

  describe('menu ring cycle', () => {
    it('should complete full forward cycle', () => {
      const menuStates: OperationState[] = [
        'function-menu-center',
        'function-menu-circle',
        'function-menu-line',
        'function-menu-linear',
        'function-menu-polar',
      ];

      let state: OperationStateShape = {
        state: 'function-menu-center',
        context: INITIAL_OPERATION_CONTEXT,
      };

      for (let i = 0; i < menuStates.length; i++) {
        const expectedNext = menuStates[(i + 1) % menuStates.length];
        state = menuReducer(state, { type: 'KEY_6' })!;
        expect(state.state).toBe(expectedNext);
      }

      // Should be back at center after full cycle
      expect(state.state).toBe('function-menu-center');
    });

    it('should complete full backward cycle', () => {
      const menuStates: OperationState[] = [
        'function-menu-center',
        'function-menu-circle',
        'function-menu-line',
        'function-menu-linear',
        'function-menu-polar',
      ];

      let state: OperationStateShape = {
        state: 'function-menu-center',
        context: INITIAL_OPERATION_CONTEXT,
      };

      for (let i = 0; i < menuStates.length; i++) {
        const expectedPrev = menuStates[(menuStates.length - 1 - i + menuStates.length) % menuStates.length];
        state = menuReducer(state, { type: 'KEY_4' })!;
        expect(state.state).toBe(expectedPrev);
      }

      // Should be back at center after full cycle
      expect(state.state).toBe('function-menu-center');
    });
  });

  describe('menu exit (KEY_CLEAR)', () => {
    it('should exit to idle from any menu state', () => {
      const menuStates: OperationState[] = [
        'function-menu-center',
        'function-menu-circle',
        'function-menu-line',
        'function-menu-linear',
        'function-menu-polar',
      ];

      for (const menuState of menuStates) {
        const state: OperationStateShape = {
          state: menuState,
          context: INITIAL_OPERATION_CONTEXT,
        };

        const result = menuReducer(state, { type: 'KEY_CLEAR' });

        expect(result?.state).toBe('idle');
        expect(result?.context.type).toBe('none');
      }
    });
  });

  describe('menu entry (KEY_ENTER)', () => {
    it('should enter center-line point collection from center menu', () => {
      const state: OperationStateShape = {
        state: 'function-menu-center',
        context: INITIAL_OPERATION_CONTEXT,
      };

      const result = menuReducer(state, { type: 'KEY_ENTER' });

      expect(result?.state).toBe('function-menu-center-line-point-1');
      expect(result?.context.type).toBe('center-finding');
      expect(result?.context).toEqual({
        type: 'center-finding',
        storedPoints: [],
        centerResult: null,
      });
    });

    it('should enter center-line point collection from line menu', () => {
      const state: OperationStateShape = {
        state: 'function-menu-line',
        context: INITIAL_OPERATION_CONTEXT,
      };

      const result = menuReducer(state, { type: 'KEY_ENTER' });

      expect(result?.state).toBe('function-menu-center-line-point-1');
      expect(result?.context.type).toBe('center-finding');
    });

    it('should enter center-circle point collection from circle menu', () => {
      const state: OperationStateShape = {
        state: 'function-menu-circle',
        context: INITIAL_OPERATION_CONTEXT,
      };

      const result = menuReducer(state, { type: 'KEY_ENTER' });

      expect(result?.state).toBe('function-menu-center-circle-point-1');
      expect(result?.context.type).toBe('center-finding');
    });

    it('should return to idle from linear menu (not yet implemented)', () => {
      const state: OperationStateShape = {
        state: 'function-menu-linear',
        context: INITIAL_OPERATION_CONTEXT,
      };

      const result = menuReducer(state, { type: 'KEY_ENTER' });

      expect(result?.state).toBe('idle');
      expect(result?.context.type).toBe('none');
    });

    it('should return to idle from polar menu (not yet implemented)', () => {
      const state: OperationStateShape = {
        state: 'function-menu-polar',
        context: INITIAL_OPERATION_CONTEXT,
      };

      const result = menuReducer(state, { type: 'KEY_ENTER' });

      expect(result?.state).toBe('idle');
      expect(result?.context.type).toBe('none');
    });
  });

  describe('unhandled events', () => {
    it('should return current state for unhandled events', () => {
      const state: OperationStateShape = {
        state: 'function-menu-center',
        context: INITIAL_OPERATION_CONTEXT,
      };

      expect(menuReducer(state, { type: 'KEY_5' })).toBe(state);
      expect(menuReducer(state, { type: 'BTN_ABS_INC' })).toBe(state);
      expect(menuReducer(state, { type: 'BTN_INCH_MM' })).toBe(state);
      expect(menuReducer(state, { type: 'POINT_DATA', point: { X: 0, Y: 0, Z: 0 } })).toBe(state);
    });

    it('should ignore numeric keys other than 4 and 6', () => {
      const state: OperationStateShape = {
        state: 'function-menu-center',
        context: INITIAL_OPERATION_CONTEXT,
      };

      const keysToIgnore = ['KEY_0', 'KEY_1', 'KEY_2', 'KEY_3', 'KEY_5', 'KEY_7', 'KEY_8', 'KEY_9'] as const;

      for (const key of keysToIgnore) {
        const result = menuReducer(state, { type: key });
        expect(result).toBe(state);
      }
    });
  });
});

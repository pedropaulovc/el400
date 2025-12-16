/**
 * Menu Feature Reducer Tests
 *
 * Tests for function menu navigation.
 */

import { describe, it, expect } from 'vitest';
import { menuReducer } from './menu';
import type { DROShape } from '../types';
import type { DROState } from '../../types/droStateMachine';
import { INITIAL_DRO_CONTEXT } from '../../types/droStateMachine';

describe('menuReducer', () => {
  describe('state handling', () => {
    it('should return null for non-menu states', () => {
      const nonMenuStates: DROState[] = [
        'boot',
        'showMessage',
        'idle',
        'abs-inc-mode',
        'inch-mm-mode',
        'function-menu-center-line-point-1',
        'function-menu-center-line-result',
      ];

      for (const menuState of nonMenuStates) {
        const state: DROShape = {
          state: menuState,
          data: INITIAL_DRO_CONTEXT,
        };

        const result = menuReducer(state, { type: 'KEY_6_RIGHT' });
        expect(result).toBeNull();
      }
    });

    it('should handle all menu selection states', () => {
      const menuStates: DROState[] = [
        'function-menu-center',
        'function-menu-circle',
        'function-menu-line',
        'function-menu-linear',
        'function-menu-polar',
      ];

      for (const menuState of menuStates) {
        const state: DROShape = {
          state: menuState,
          data: INITIAL_DRO_CONTEXT,
        };

        const result = menuReducer(state, { type: 'KEY_6_RIGHT' });
        expect(result).not.toBeNull();
      }
    });
  });

  describe('forward navigation (KEY_6_RIGHT)', () => {
    it('should navigate from center to circle', () => {
      const state: DROShape = {
        state: 'function-menu-center',
        data: INITIAL_DRO_CONTEXT,
      };

      const result = menuReducer(state, { type: 'KEY_6_RIGHT' });

      expect(result?.state).toBe('function-menu-circle');
    });

    it('should navigate from circle to line', () => {
      const state: DROShape = {
        state: 'function-menu-circle',
        data: INITIAL_DRO_CONTEXT,
      };

      const result = menuReducer(state, { type: 'KEY_6_RIGHT' });

      expect(result?.state).toBe('function-menu-line');
    });

    it('should navigate from line to linear', () => {
      const state: DROShape = {
        state: 'function-menu-line',
        data: INITIAL_DRO_CONTEXT,
      };

      const result = menuReducer(state, { type: 'KEY_6_RIGHT' });

      expect(result?.state).toBe('function-menu-linear');
    });

    it('should navigate from linear to polar', () => {
      const state: DROShape = {
        state: 'function-menu-linear',
        data: INITIAL_DRO_CONTEXT,
      };

      const result = menuReducer(state, { type: 'KEY_6_RIGHT' });

      expect(result?.state).toBe('function-menu-polar');
    });

    it('should wrap from polar to center', () => {
      const state: DROShape = {
        state: 'function-menu-polar',
        data: INITIAL_DRO_CONTEXT,
      };

      const result = menuReducer(state, { type: 'KEY_6_RIGHT' });

      expect(result?.state).toBe('function-menu-center');
    });

    it('should preserve data during navigation', () => {
      const data = { type: 'none' as const };
      const state: DROShape = {
        state: 'function-menu-center',
        data,
      };

      const result = menuReducer(state, { type: 'KEY_6_RIGHT' });

      expect(result?.data).toBe(data);
    });
  });

  describe('backward navigation (KEY_4_LEFT)', () => {
    it('should navigate from circle to center', () => {
      const state: DROShape = {
        state: 'function-menu-circle',
        data: INITIAL_DRO_CONTEXT,
      };

      const result = menuReducer(state, { type: 'KEY_4_LEFT' });

      expect(result?.state).toBe('function-menu-center');
    });

    it('should navigate from line to circle', () => {
      const state: DROShape = {
        state: 'function-menu-line',
        data: INITIAL_DRO_CONTEXT,
      };

      const result = menuReducer(state, { type: 'KEY_4_LEFT' });

      expect(result?.state).toBe('function-menu-circle');
    });

    it('should navigate from linear to line', () => {
      const state: DROShape = {
        state: 'function-menu-linear',
        data: INITIAL_DRO_CONTEXT,
      };

      const result = menuReducer(state, { type: 'KEY_4_LEFT' });

      expect(result?.state).toBe('function-menu-line');
    });

    it('should navigate from polar to linear', () => {
      const state: DROShape = {
        state: 'function-menu-polar',
        data: INITIAL_DRO_CONTEXT,
      };

      const result = menuReducer(state, { type: 'KEY_4_LEFT' });

      expect(result?.state).toBe('function-menu-linear');
    });

    it('should wrap from center to polar', () => {
      const state: DROShape = {
        state: 'function-menu-center',
        data: INITIAL_DRO_CONTEXT,
      };

      const result = menuReducer(state, { type: 'KEY_4_LEFT' });

      expect(result?.state).toBe('function-menu-polar');
    });
  });

  describe('menu ring cycle', () => {
    it('should complete full forward cycle', () => {
      const menuStates: DROState[] = [
        'function-menu-center',
        'function-menu-circle',
        'function-menu-line',
        'function-menu-linear',
        'function-menu-polar',
      ];

      let state: DROShape = {
        state: 'function-menu-center',
        data: INITIAL_DRO_CONTEXT,
      };

      for (let i = 0; i < menuStates.length; i++) {
        const expectedNext = menuStates[(i + 1) % menuStates.length];
        state = menuReducer(state, { type: 'KEY_6_RIGHT' })!;
        expect(state.state).toBe(expectedNext);
      }

      // Should be back at center after full cycle
      expect(state.state).toBe('function-menu-center');
    });

    it('should complete full backward cycle', () => {
      const menuStates: DROState[] = [
        'function-menu-center',
        'function-menu-circle',
        'function-menu-line',
        'function-menu-linear',
        'function-menu-polar',
      ];

      let state: DROShape = {
        state: 'function-menu-center',
        data: INITIAL_DRO_CONTEXT,
      };

      for (let i = 0; i < menuStates.length; i++) {
        const expectedPrev = menuStates[(menuStates.length - 1 - i + menuStates.length) % menuStates.length];
        state = menuReducer(state, { type: 'KEY_4_LEFT' })!;
        expect(state.state).toBe(expectedPrev);
      }

      // Should be back at center after full cycle
      expect(state.state).toBe('function-menu-center');
    });
  });

  describe('menu exit (KEY_CLEAR)', () => {
    it('should exit to idle from any menu state', () => {
      const menuStates: DROState[] = [
        'function-menu-center',
        'function-menu-circle',
        'function-menu-line',
        'function-menu-linear',
        'function-menu-polar',
      ];

      for (const menuState of menuStates) {
        const state: DROShape = {
          state: menuState,
          data: INITIAL_DRO_CONTEXT,
        };

        const result = menuReducer(state, { type: 'KEY_CLEAR' });

        expect(result?.state).toBe('idle');
        expect(result?.data.type).toBe('none');
      }
    });
  });

  describe('menu entry (KEY_ENTER)', () => {
    it('should enter center-line point collection from center menu', () => {
      const state: DROShape = {
        state: 'function-menu-center',
        data: INITIAL_DRO_CONTEXT,
      };

      const result = menuReducer(state, { type: 'KEY_ENTER' });

      expect(result?.state).toBe('function-menu-center-line-point-1');
      expect(result?.data.type).toBe('center-finding');
      expect(result?.data).toEqual({
        type: 'center-finding',
        storedPoints: [],
        centerResult: null,
      });
    });

    it('should enter center-line point collection from line menu', () => {
      const state: DROShape = {
        state: 'function-menu-line',
        data: INITIAL_DRO_CONTEXT,
      };

      const result = menuReducer(state, { type: 'KEY_ENTER' });

      expect(result?.state).toBe('function-menu-center-line-point-1');
      expect(result?.data.type).toBe('center-finding');
    });

    it('should enter center-circle point collection from circle menu', () => {
      const state: DROShape = {
        state: 'function-menu-circle',
        data: INITIAL_DRO_CONTEXT,
      };

      const result = menuReducer(state, { type: 'KEY_ENTER' });

      expect(result?.state).toBe('function-menu-center-circle-point-1');
      expect(result?.data.type).toBe('center-finding');
    });

    it('should return to idle from linear menu (not yet implemented)', () => {
      const state: DROShape = {
        state: 'function-menu-linear',
        data: INITIAL_DRO_CONTEXT,
      };

      const result = menuReducer(state, { type: 'KEY_ENTER' });

      expect(result?.state).toBe('idle');
      expect(result?.data.type).toBe('none');
    });

    it('should return to idle from polar menu (not yet implemented)', () => {
      const state: DROShape = {
        state: 'function-menu-polar',
        data: INITIAL_DRO_CONTEXT,
      };

      const result = menuReducer(state, { type: 'KEY_ENTER' });

      expect(result?.state).toBe('idle');
      expect(result?.data.type).toBe('none');
    });
  });

  describe('unhandled events', () => {
    it('should return current state for unhandled events', () => {
      const state: DROShape = {
        state: 'function-menu-center',
        data: INITIAL_DRO_CONTEXT,
      };

      expect(menuReducer(state, { type: 'KEY_5' })).toBe(state);
      expect(menuReducer(state, { type: 'BTN_ABS_INC' })).toBe(state);
      expect(menuReducer(state, { type: 'BTN_INCH_MM' })).toBe(state);
      expect(menuReducer(state, { type: 'POINT_DATA', point: { X: 0, Y: 0, Z: 0 } })).toBe(state);
    });

    it('should ignore numeric keys other than 4 and 6', () => {
      const state: DROShape = {
        state: 'function-menu-center',
        data: INITIAL_DRO_CONTEXT,
      };

      const keysToIgnore = ['KEY_0', 'KEY_1', 'KEY_2_DOWN', 'KEY_3', 'KEY_5', 'KEY_7', 'KEY_8_UP', 'KEY_9'] as const;

      for (const key of keysToIgnore) {
        const result = menuReducer(state, { type: key });
        expect(result).toBe(state);
      }
    });
  });
});

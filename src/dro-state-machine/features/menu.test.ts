/**
 * Menu Feature Reducer Tests
 *
 * Tests for function menu navigation.
 */

import { describe, it, expect } from 'vitest';
import { menuReducer } from './menu';
import type { DROStatePayload } from '../types';
import type { DROStateName } from '../droStateMachine';
import { INITIAL_DRO_STATE_DATA } from '../droStateMachine';

describe('menuReducer', () => {
  describe('state handling', () => {
    it('should return null for non-menu states', () => {
      const nonMenuStates: DROStateName[] = [
        'boot',
        'boot-show-message',
        'idle',
        'abs-inc-mode',
        'inch-mm-mode',
        'function-menu-center-line-point-1',
        'function-menu-center-line-result',
      ];

      for (const menuState of nonMenuStates) {
        const state: DROStatePayload = {
          stateName: menuState,
          stateData: INITIAL_DRO_STATE_DATA,
        };

        const result = menuReducer(state, { eventName: 'KEY_6_RIGHT' });
        expect(result).toBeNull();
      }
    });

    it('should handle all menu selection states', () => {
      const menuStates: DROStateName[] = [
        'function-menu-center',
        'function-menu-circle',
        'function-menu-line',
        'function-menu-linear',
        'function-menu-polar',
      ];

      for (const menuState of menuStates) {
        const state: DROStatePayload = {
          stateName: menuState,
          stateData: INITIAL_DRO_STATE_DATA,
        };

        const result = menuReducer(state, { eventName: 'KEY_6_RIGHT' });
        expect(result).not.toBeNull();
      }
    });
  });

  describe('forward navigation (KEY_6_RIGHT)', () => {
    it('should navigate from center to circle', () => {
      const state: DROStatePayload = {
        stateName: 'function-menu-center',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      const result = menuReducer(state, { eventName: 'KEY_6_RIGHT' });

      expect(result?.stateName).toBe('function-menu-circle');
    });

    it('should navigate from circle to line', () => {
      const state: DROStatePayload = {
        stateName: 'function-menu-circle',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      const result = menuReducer(state, { eventName: 'KEY_6_RIGHT' });

      expect(result?.stateName).toBe('function-menu-line');
    });

    it('should navigate from line to linear', () => {
      const state: DROStatePayload = {
        stateName: 'function-menu-line',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      const result = menuReducer(state, { eventName: 'KEY_6_RIGHT' });

      expect(result?.stateName).toBe('function-menu-linear');
    });

    it('should navigate from linear to polar', () => {
      const state: DROStatePayload = {
        stateName: 'function-menu-linear',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      const result = menuReducer(state, { eventName: 'KEY_6_RIGHT' });

      expect(result?.stateName).toBe('function-menu-polar');
    });

    it('should wrap from polar to center', () => {
      const state: DROStatePayload = {
        stateName: 'function-menu-polar',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      const result = menuReducer(state, { eventName: 'KEY_6_RIGHT' });

      expect(result?.stateName).toBe('function-menu-center');
    });

    it('should preserve data during navigation', () => {
      const data = { stateDataType: 'none' as const };
      const state: DROStatePayload = {
        stateName: 'function-menu-center',
        stateData: data,
      };

      const result = menuReducer(state, { eventName: 'KEY_6_RIGHT' });

      expect(result?.stateData).toBe(data);
    });
  });

  describe('backward navigation (KEY_4_LEFT)', () => {
    it('should navigate from circle to center', () => {
      const state: DROStatePayload = {
        stateName: 'function-menu-circle',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      const result = menuReducer(state, { eventName: 'KEY_4_LEFT' });

      expect(result?.stateName).toBe('function-menu-center');
    });

    it('should navigate from line to circle', () => {
      const state: DROStatePayload = {
        stateName: 'function-menu-line',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      const result = menuReducer(state, { eventName: 'KEY_4_LEFT' });

      expect(result?.stateName).toBe('function-menu-circle');
    });

    it('should navigate from linear to line', () => {
      const state: DROStatePayload = {
        stateName: 'function-menu-linear',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      const result = menuReducer(state, { eventName: 'KEY_4_LEFT' });

      expect(result?.stateName).toBe('function-menu-line');
    });

    it('should navigate from polar to linear', () => {
      const state: DROStatePayload = {
        stateName: 'function-menu-polar',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      const result = menuReducer(state, { eventName: 'KEY_4_LEFT' });

      expect(result?.stateName).toBe('function-menu-linear');
    });

    it('should wrap from center to polar', () => {
      const state: DROStatePayload = {
        stateName: 'function-menu-center',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      const result = menuReducer(state, { eventName: 'KEY_4_LEFT' });

      expect(result?.stateName).toBe('function-menu-polar');
    });
  });

  describe('menu ring cycle', () => {
    it('should complete full forward cycle', () => {
      const menuStates: DROStateName[] = [
        'function-menu-center',
        'function-menu-circle',
        'function-menu-line',
        'function-menu-linear',
        'function-menu-polar',
      ];

      let state: DROStatePayload = {
        stateName: 'function-menu-center',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      for (let i = 0; i < menuStates.length; i++) {
        const expectedNext = menuStates[(i + 1) % menuStates.length];
        state = menuReducer(state, { eventName: 'KEY_6_RIGHT' })!;
        expect(state.stateName).toBe(expectedNext);
      }

      // Should be back at center after full cycle
      expect(state.stateName).toBe('function-menu-center');
    });

    it('should complete full backward cycle', () => {
      const menuStates: DROStateName[] = [
        'function-menu-center',
        'function-menu-circle',
        'function-menu-line',
        'function-menu-linear',
        'function-menu-polar',
      ];

      let state: DROStatePayload = {
        stateName: 'function-menu-center',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      for (let i = 0; i < menuStates.length; i++) {
        const expectedPrev = menuStates[(menuStates.length - 1 - i + menuStates.length) % menuStates.length];
        state = menuReducer(state, { eventName: 'KEY_4_LEFT' })!;
        expect(state.stateName).toBe(expectedPrev);
      }

      // Should be back at center after full cycle
      expect(state.stateName).toBe('function-menu-center');
    });
  });

  describe('menu exit (KEY_CLEAR)', () => {
    it('should exit to idle from any menu state', () => {
      const menuStates: DROStateName[] = [
        'function-menu-center',
        'function-menu-circle',
        'function-menu-line',
        'function-menu-linear',
        'function-menu-polar',
      ];

      for (const menuState of menuStates) {
        const state: DROStatePayload = {
          stateName: menuState,
          stateData: INITIAL_DRO_STATE_DATA,
        };

        const result = menuReducer(state, { eventName: 'KEY_CLEAR' });

        expect(result?.stateName).toBe('idle');
        expect(result?.stateData.stateDataType).toBe('none');
      }
    });
  });

  describe('menu entry (KEY_ENTER)', () => {
    it('should enter center-line point collection from center menu', () => {
      const state: DROStatePayload = {
        stateName: 'function-menu-center',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      const result = menuReducer(state, { eventName: 'KEY_ENTER' });

      expect(result?.stateName).toBe('function-menu-center-line-point-1');
      expect(result?.stateData.stateDataType).toBe('center-finding');
      expect(result?.stateData).toEqual({
        stateDataType: 'center-finding',
        storedPoints: [],
        centerResult: null,
      });
    });

    it('should enter center-line point collection from line menu', () => {
      const state: DROStatePayload = {
        stateName: 'function-menu-line',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      const result = menuReducer(state, { eventName: 'KEY_ENTER' });

      expect(result?.stateName).toBe('function-menu-center-line-point-1');
      expect(result?.stateData.stateDataType).toBe('center-finding');
    });

    it('should enter center-circle point collection from circle menu', () => {
      const state: DROStatePayload = {
        stateName: 'function-menu-circle',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      const result = menuReducer(state, { eventName: 'KEY_ENTER' });

      expect(result?.stateName).toBe('function-menu-center-circle-point-1');
      expect(result?.stateData.stateDataType).toBe('center-finding');
    });

    it('should return to idle from linear menu (not yet implemented)', () => {
      const state: DROStatePayload = {
        stateName: 'function-menu-linear',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      const result = menuReducer(state, { eventName: 'KEY_ENTER' });

      expect(result?.stateName).toBe('idle');
      expect(result?.stateData.stateDataType).toBe('none');
    });

    it('should return to idle from polar menu (not yet implemented)', () => {
      const state: DROStatePayload = {
        stateName: 'function-menu-polar',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      const result = menuReducer(state, { eventName: 'KEY_ENTER' });

      expect(result?.stateName).toBe('idle');
      expect(result?.stateData.stateDataType).toBe('none');
    });
  });

  describe('unhandled events', () => {
    it('should return current state for unhandled events', () => {
      const state: DROStatePayload = {
        stateName: 'function-menu-center',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      expect(menuReducer(state, { eventName: 'KEY_5' })).toBe(state);
      expect(menuReducer(state, { eventName: 'BTN_ABS_INC' })).toBe(state);
      expect(menuReducer(state, { eventName: 'BTN_INCH_MM' })).toBe(state);
      expect(menuReducer(state, { eventName: 'POINT_DATA', point: { X: 0, Y: 0, Z: 0 } })).toBe(state);
    });

    it('should ignore numeric keys other than 4 and 6', () => {
      const state: DROStatePayload = {
        stateName: 'function-menu-center',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      const keysToIgnore = ['KEY_0', 'KEY_1', 'KEY_2_DOWN', 'KEY_3', 'KEY_5', 'KEY_7', 'KEY_8_UP', 'KEY_9'] as const;

      for (const key of keysToIgnore) {
        const result = menuReducer(state, { eventName: key });
        expect(result).toBe(state);
      }
    });
  });
});

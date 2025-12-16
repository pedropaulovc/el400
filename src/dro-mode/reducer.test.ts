/**
 * Root Reducer Tests
 *
 * Tests for the reducer composition and delegation to feature reducers.
 */

import { describe, it, expect } from 'vitest';
import { droModeReducer } from './reducer';
import type { DROModeShape } from './types';
import { INITIAL_DRO_MODE_DATA } from '../types/droMode';

describe('droModeReducer', () => {
  describe('reducer composition', () => {
    it('should delegate to boot reducer for boot states', () => {
      const initial: DROModeShape = {
        state: 'boot',
        data: INITIAL_DRO_MODE_DATA,
      };

      const result = droModeReducer(initial, {
        type: 'BOOT_COMPLETE',
        skipMessage: true,
      });

      expect(result.state).toBe('idle');
    });

    it('should delegate to menu reducer for menu states', () => {
      const initial: DROModeShape = {
        state: 'function-menu-center',
        data: INITIAL_DRO_MODE_DATA,
      };

      const result = droModeReducer(initial, { type: 'KEY_6_RIGHT' });

      expect(result.state).toBe('function-menu-circle');
    });

    it('should delegate to center-finding reducer for point collection states', () => {
      const initial: DROModeShape = {
        state: 'function-menu-center-line-point-1',
        data: { type: 'center-finding', storedPoints: [], centerResult: null },
      };

      const result = droModeReducer(initial, {
        type: 'POINT_DATA',
        point: { X: 10, Y: 20, Z: 30 },
      });

      expect(result.state).toBe('function-menu-center-line-point-2');
    });
  });

  describe('unhandled events', () => {
    it('should return current state when no reducer handles the event', () => {
      const initial: DROModeShape = {
        state: 'idle',
        data: INITIAL_DRO_MODE_DATA,
      };

      // KEY_5 is not handled by any reducer in idle state
      const result = droModeReducer(initial, { type: 'KEY_5' });

      expect(result).toBe(initial);
    });

    it('should return current state for unrecognized events in boot state', () => {
      const initial: DROModeShape = {
        state: 'boot',
        data: INITIAL_DRO_MODE_DATA,
      };

      // BTN_FUNCTION is not handled during boot
      const result = droModeReducer(initial, { type: 'BTN_FUNCTION' });

      expect(result).toBe(initial);
    });
  });

  describe('reducer priority', () => {
    it('should process boot reducer before menu reducer', () => {
      // Boot reducer has priority, so even if menu could handle a key,
      // boot reducer should handle boot states first
      const initial: DROModeShape = {
        state: 'idle',
        data: INITIAL_DRO_MODE_DATA,
      };

      // From idle, BTN_FUNCTION opens menu (handled by boot reducer)
      const result = droModeReducer(initial, { type: 'BTN_FUNCTION' });

      expect(result.state).toBe('function-menu-center');
    });

    it('should allow later reducers to handle when earlier ones return null', () => {
      const initial: DROModeShape = {
        state: 'function-menu-center',
        data: INITIAL_DRO_MODE_DATA,
      };

      // Menu reducer handles function-menu states
      const result = droModeReducer(initial, { type: 'KEY_CLEAR' });

      expect(result.state).toBe('idle');
    });
  });

  describe('state transitions chain', () => {
    it('should support full workflow: boot -> idle -> menu -> point collection -> result', () => {
      let state: DROModeShape = {
        state: 'boot',
        data: INITIAL_DRO_MODE_DATA,
      };

      // Boot complete
      state = droModeReducer(state, { type: 'BOOT_COMPLETE', skipMessage: true });
      expect(state.state).toBe('idle');

      // Open function menu
      state = droModeReducer(state, { type: 'BTN_FUNCTION' });
      expect(state.state).toBe('function-menu-center');

      // Enter center finding
      state = droModeReducer(state, { type: 'KEY_ENTER' });
      expect(state.state).toBe('function-menu-center-line-point-1');

      // Store first point
      state = droModeReducer(state, {
        type: 'POINT_DATA',
        point: { X: 0, Y: 0, Z: 0 },
      });
      expect(state.state).toBe('function-menu-center-line-point-2');

      // Store second point
      state = droModeReducer(state, {
        type: 'POINT_DATA',
        point: { X: 100, Y: 0, Z: 0 },
      });
      expect(state.state).toBe('function-menu-center-line-result');

      // Exit to idle
      state = droModeReducer(state, { type: 'KEY_CLEAR' });
      expect(state.state).toBe('idle');
    });
  });
});

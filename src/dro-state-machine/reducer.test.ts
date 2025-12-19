/**
 * Root Reducer Tests
 *
 * Tests for the reducer composition and delegation to feature reducers.
 */

import { describe, it, expect } from 'vitest';
import { droReducer } from './reducer';
import type { DROStatePayload } from './types';
import { createTestState, DEFAULT_TEST_CONTEXT } from './test-utils';

describe('droReducer', () => {
  describe('reducer composition', () => {
    it('should delegate to boot reducer for boot states', () => {
      const initial = createTestState('boot');

      const result = droReducer(initial, {
        eventName: 'BOOT_STARTED',
        skipBootMessage: true,
      }, DEFAULT_TEST_CONTEXT);

      expect(result.stateName).toBe('idle');
    });

    it('should delegate to menu reducer for menu states', () => {
      const initial = createTestState('function-menu-center');

      const result = droReducer(initial, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);

      expect(result.stateName).toBe('function-menu-circle');
    });

    it('should delegate to center-finding reducer for point collection states', () => {
      const initial = createTestState(
        'function-menu-center-line-point-1',
        { stateDataType: 'center-finding', storedPoints: [], centerResult: null }
      );

      const result = droReducer(initial, {
        eventName: 'POINT_DATA',
        point: { X: 10, Y: 20, Z: 30 },
      }, DEFAULT_TEST_CONTEXT);

      expect(result.stateName).toBe('function-menu-center-line-point-2');
    });
  });

  describe('unhandled events', () => {
    it('should return current state when no reducer handles the event', () => {
      const initial = createTestState('idle');

      // POINT_DATA is not handled in idle state (only in center-finding states)
      const result = droReducer(initial, {
        eventName: 'POINT_DATA',
        point: { X: 0, Y: 0, Z: 0 },
      }, DEFAULT_TEST_CONTEXT);

      expect(result).toBe(initial);
    });

    it('should return current state for unrecognized events in boot state', () => {
      const initial = createTestState('boot');

      // BTN_FUNCTION is not handled during boot
      const result = droReducer(initial, { eventName: 'BTN_FUNCTION' }, DEFAULT_TEST_CONTEXT);

      expect(result).toBe(initial);
    });
  });

  describe('reducer priority', () => {
    it('should process boot reducer before menu reducer', () => {
      // Boot reducer has priority, so even if menu could handle a key,
      // boot reducer should handle boot states first
      const initial = createTestState('idle');

      // From idle, BTN_FUNCTION opens menu (handled by idle reducer)
      const result = droReducer(initial, { eventName: 'BTN_FUNCTION' }, DEFAULT_TEST_CONTEXT);

      expect(result.stateName).toBe('function-menu-center');
    });

    it('should allow later reducers to handle when earlier ones return null', () => {
      const initial = createTestState('function-menu-center');

      // Menu reducer handles function-menu states
      const result = droReducer(initial, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);

      expect(result.stateName).toBe('idle');
    });
  });

  describe('state transitions chain', () => {
    it('should support full workflow: boot -> idle -> menu -> point collection -> result', () => {
      let state: DROStatePayload = createTestState('boot');

      // Boot complete
      state = droReducer(state, { eventName: 'BOOT_STARTED', skipBootMessage: true }, DEFAULT_TEST_CONTEXT);
      expect(state.stateName).toBe('idle');

      // Open function menu
      state = droReducer(state, { eventName: 'BTN_FUNCTION' }, DEFAULT_TEST_CONTEXT);
      expect(state.stateName).toBe('function-menu-center');

      // Enter center finding
      state = droReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);
      expect(state.stateName).toBe('function-menu-center-line-point-1');

      // Store first point
      state = droReducer(state, {
        eventName: 'POINT_DATA',
        point: { X: 0, Y: 0, Z: 0 },
      }, DEFAULT_TEST_CONTEXT);
      expect(state.stateName).toBe('function-menu-center-line-point-2');

      // Store second point
      state = droReducer(state, {
        eventName: 'POINT_DATA',
        point: { X: 100, Y: 0, Z: 0 },
      }, DEFAULT_TEST_CONTEXT);
      expect(state.stateName).toBe('function-menu-center-line-result');

      // Exit to idle
      state = droReducer(state, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);
      expect(state.stateName).toBe('idle');
    });
  });
});

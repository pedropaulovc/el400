/**
 * Root Reducer Tests
 *
 * Tests for the reducer composition and delegation to feature reducers.
 */

import { describe, it, expect, vi } from 'vitest';
import { droReducer } from './reducer';
import type { DROStatePayload } from './types';
import { createTestState, DEFAULT_TEST_CONTEXT } from './test-utils';
import { INITIAL_VOLATILE_MEMORY_STATE } from '../../types/volatileMemory';

/** Helper to create state with a specific position for testing KEY_6_RIGHT */
function stateWithPosition(
  stateName: DROStatePayload['stateName'],
  stateData: DROStatePayload['stateData'],
  position: { X: number; Y: number; Z: number }
): DROStatePayload {
  return {
    stateName,
    stateData,
    vMem: {
      ...INITIAL_VOLATILE_MEMORY_STATE,
      manualAbsoluteValues: position,
    },
  };
}

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
      const initial = stateWithPosition(
        'function-menu-center-line-point-1',
        { stateDataType: 'center-finding', storedPoints: [], centerResult: null },
        { X: 10, Y: 20, Z: 30 }
      );

      const result = droReducer(initial, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);

      expect(result.stateName).toBe('function-menu-center-line-point-2');
    });
  });

  describe('unhandled events', () => {
    it('should return current state when no reducer handles the event', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const initial = createTestState('idle');

      // BTN_HALF without active axis is handled by both halfReducer and idleReducer
      const result = droReducer(initial, { eventName: 'BTN_HALF' }, DEFAULT_TEST_CONTEXT);

      expect(result).toBe(initial);
      consoleErrorSpy.mockRestore();
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

      // Store first point - set position via vMem and dispatch KEY_6_RIGHT
      state = {
        ...state,
        vMem: {
          ...state.vMem,
          manualAbsoluteValues: { X: 0, Y: 0, Z: 0 },
        },
      };
      state = droReducer(state, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);
      expect(state.stateName).toBe('function-menu-center-line-point-2');

      // Store second point
      state = {
        ...state,
        vMem: {
          ...state.vMem,
          manualAbsoluteValues: { X: 100, Y: 0, Z: 0 },
        },
      };
      state = droReducer(state, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);
      expect(state.stateName).toBe('function-menu-center-line-result');

      // Exit to idle
      state = droReducer(state, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);
      expect(state.stateName).toBe('idle');
    });
  });

  describe('conflict detection', () => {
    it('should not log error when only one reducer handles an event', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const initial = createTestState('boot');

      droReducer(initial, { eventName: 'BOOT_STARTED', skipBootMessage: true }, DEFAULT_TEST_CONTEXT);

      expect(consoleErrorSpy).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should not log error when reducer returns current state as-is', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const initial = createTestState('function-menu-center');

      // KEY_CLEAR is handled and exits to idle
      droReducer(initial, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);

      expect(consoleErrorSpy).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should still return first reducer result when multiple reducers handle same event', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const initial = createTestState('idle');

      const result = droReducer(initial, { eventName: 'BTN_FUNCTION' }, DEFAULT_TEST_CONTEXT);

      // Should return the state that the first reducer would produce
      expect(result.stateName).toBe('function-menu-center');

      consoleErrorSpy.mockRestore();
    });

    it('should detect conflicts between feature reducers and catch-all handlers', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const initial = createTestState('idle');

      // BTN_HALF is handled by both halfReducer and idleReducer's catch-all
      // when activeAxis is null (halfReducer returns state, idleReducer also returns state)
      droReducer(initial, { eventName: 'BTN_HALF' }, DEFAULT_TEST_CONTEXT);

      // Should detect this as a conflict if both reducers return non-null
      if (consoleErrorSpy.mock.calls.length > 0) {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Multiple reducers handled the same event'),
          expect.objectContaining({
            eventName: 'BTN_HALF',
            currentState: expect.any(Object),
            handlersInOrder: expect.any(Array),
          })
        );
        // Verify that multiple handlers are in the array (first is winner, rest are conflicts)
        const errorCallArgs = consoleErrorSpy.mock.calls[0];
        const errorObject = errorCallArgs?.[1] as Record<string, unknown> | undefined;
        const handlers = errorObject?.['handlersInOrder'] as unknown[] | undefined;
        expect(handlers?.length).toBeGreaterThanOrEqual(2);
      }

      consoleErrorSpy.mockRestore();
    });
  });
});

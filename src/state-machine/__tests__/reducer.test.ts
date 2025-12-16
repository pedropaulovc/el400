/**
 * Root Reducer Tests
 *
 * Tests for the reducer composition and delegation to feature reducers.
 */

import { describe, it, expect } from 'vitest';
import { operationReducer } from '../reducer';
import type { OperationStateShape } from '../types';
import { INITIAL_OPERATION_CONTEXT } from '../../types/operationState';

describe('operationReducer', () => {
  describe('reducer composition', () => {
    it('should delegate to boot reducer for boot states', () => {
      const initial: OperationStateShape = {
        state: 'boot',
        context: INITIAL_OPERATION_CONTEXT,
      };

      const result = operationReducer(initial, {
        type: 'BOOT_COMPLETE',
        skipMessage: true,
      });

      expect(result.state).toBe('idle');
    });

    it('should delegate to menu reducer for menu states', () => {
      const initial: OperationStateShape = {
        state: 'function-menu-center',
        context: INITIAL_OPERATION_CONTEXT,
      };

      const result = operationReducer(initial, { type: 'KEY_6' });

      expect(result.state).toBe('function-menu-circle');
    });

    it('should delegate to center-finding reducer for point collection states', () => {
      const initial: OperationStateShape = {
        state: 'function-menu-center-line-point-1',
        context: { type: 'center-finding', storedPoints: [], centerResult: null },
      };

      const result = operationReducer(initial, {
        type: 'POINT_DATA',
        point: { X: 10, Y: 20, Z: 30 },
      });

      expect(result.state).toBe('function-menu-center-line-point-2');
    });
  });

  describe('unhandled events', () => {
    it('should return current state when no reducer handles the event', () => {
      const initial: OperationStateShape = {
        state: 'idle',
        context: INITIAL_OPERATION_CONTEXT,
      };

      // KEY_5 is not handled by any reducer in idle state
      const result = operationReducer(initial, { type: 'KEY_5' });

      expect(result).toBe(initial);
    });

    it('should return current state for unrecognized events in boot state', () => {
      const initial: OperationStateShape = {
        state: 'boot',
        context: INITIAL_OPERATION_CONTEXT,
      };

      // BTN_FUNCTION is not handled during boot
      const result = operationReducer(initial, { type: 'BTN_FUNCTION' });

      expect(result).toBe(initial);
    });
  });

  describe('reducer priority', () => {
    it('should process boot reducer before menu reducer', () => {
      // Boot reducer has priority, so even if menu could handle a key,
      // boot reducer should handle boot states first
      const initial: OperationStateShape = {
        state: 'idle',
        context: INITIAL_OPERATION_CONTEXT,
      };

      // From idle, BTN_FUNCTION opens menu (handled by boot reducer)
      const result = operationReducer(initial, { type: 'BTN_FUNCTION' });

      expect(result.state).toBe('function-menu-center');
    });

    it('should allow later reducers to handle when earlier ones return null', () => {
      const initial: OperationStateShape = {
        state: 'function-menu-center',
        context: INITIAL_OPERATION_CONTEXT,
      };

      // Menu reducer handles function-menu states
      const result = operationReducer(initial, { type: 'KEY_CLEAR' });

      expect(result.state).toBe('idle');
    });
  });

  describe('state transitions chain', () => {
    it('should support full workflow: boot -> idle -> menu -> point collection -> result', () => {
      let state: OperationStateShape = {
        state: 'boot',
        context: INITIAL_OPERATION_CONTEXT,
      };

      // Boot complete
      state = operationReducer(state, { type: 'BOOT_COMPLETE', skipMessage: true });
      expect(state.state).toBe('idle');

      // Open function menu
      state = operationReducer(state, { type: 'BTN_FUNCTION' });
      expect(state.state).toBe('function-menu-center');

      // Enter center finding
      state = operationReducer(state, { type: 'KEY_ENTER' });
      expect(state.state).toBe('function-menu-center-line-point-1');

      // Store first point
      state = operationReducer(state, {
        type: 'POINT_DATA',
        point: { X: 0, Y: 0, Z: 0 },
      });
      expect(state.state).toBe('function-menu-center-line-point-2');

      // Store second point
      state = operationReducer(state, {
        type: 'POINT_DATA',
        point: { X: 100, Y: 0, Z: 0 },
      });
      expect(state.state).toBe('function-menu-center-line-result');

      // Exit to idle
      state = operationReducer(state, { type: 'KEY_CLEAR' });
      expect(state.state).toBe('idle');
    });
  });
});

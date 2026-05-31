/**
 * Polar Coordinates Feature Reducer Tests (US-030)
 *
 * Polar mode is a DISPLAY mode (manual §9.1.7): one axis shows radius (R),
 * another shows angle (θ), for a selected plane (X-Y, X-Z, Y-Z).
 *
 * Manual plane/R/θ table:
 *   X-Y  -> R from X axis, θ from Y axis
 *   X-Z  -> R from X axis, θ from Z axis
 *   Y-Z  -> R from Y axis, θ from Z axis
 *
 * R = sqrt(a² + b²), θ = atan2(b, a) (degrees, 0° = first axis, CCW positive).
 */

import { describe, it, expect } from 'vitest';
import { polarReducer } from './polar';
import { createTestState, DEFAULT_TEST_CONTEXT } from '../test-utils';
import type { DROReducerContext, DROStatePayload } from '../types';
import type { PolarData } from '../droStateMachine';
import { INITIAL_POLAR_DATA } from '../droStateMachine';
import { createDefaultMillState } from '../../../types/millState';
import { DEFAULT_NON_VOLATILE_MEMORY } from '../../../types/nonVolatileMemory';
import { INITIAL_VOLATILE_MEMORY_STATE } from '../../../types/volatileMemory';

/** Build a context where the mill is connected and reports the given mm position. */
function connectedContext(x: number, y: number, z: number): DROReducerContext {
  const millState = createDefaultMillState('mock');
  return {
    millState: {
      ...millState,
      connected: true,
      position: { x, y, z },
    },
    nvMem: { ...DEFAULT_NON_VOLATILE_MEMORY, defaultUnit: 'mm' },
  };
}

/** Build a polar-coordinates state payload with a given plane. */
function polarState(plane: PolarData['plane']): DROStatePayload {
  const state = createTestState('polar-coordinates', {
    ...INITIAL_POLAR_DATA,
    plane,
  });
  return {
    ...state,
    vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'abs' },
  };
}

describe('polarReducer', () => {
  describe('non-handled states', () => {
    it('returns null for idle state', () => {
      const result = polarReducer(
        createTestState('idle'),
        { eventName: 'KEY_ENTER' },
        DEFAULT_TEST_CONTEXT
      );
      expect(result).toBeNull();
    });

    it('returns null for function-menu-center state', () => {
      const result = polarReducer(
        createTestState('function-menu-center'),
        { eventName: 'KEY_ENTER' },
        DEFAULT_TEST_CONTEXT
      );
      expect(result).toBeNull();
    });
  });

  describe('plane selection (polar-select-plane)', () => {
    it('cycles plane forward X-Y -> X-Z -> Y-Z -> X-Y with KEY_6_RIGHT', () => {
      let state = createTestState('polar-select-plane', { ...INITIAL_POLAR_DATA });

      state = polarReducer(state, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT)!;
      expect((state.stateData as PolarData).plane).toBe('X-Z');
      expect(state.display.X).toBe('h-Z');

      state = polarReducer(state, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT)!;
      expect((state.stateData as PolarData).plane).toBe('Y-Z');
      expect(state.display.X).toBe('Y-Z');

      state = polarReducer(state, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT)!;
      expect((state.stateData as PolarData).plane).toBe('X-Y');
      expect(state.display.X).toBe('h-Y');
    });

    it('cycles plane backward with KEY_4_LEFT (wraps to Y-Z)', () => {
      let state = createTestState('polar-select-plane', { ...INITIAL_POLAR_DATA });

      state = polarReducer(state, { eventName: 'KEY_4_LEFT' }, DEFAULT_TEST_CONTEXT)!;
      expect((state.stateData as PolarData).plane).toBe('Y-Z');
      expect(state.display.X).toBe('Y-Z');
    });

    it('confirms plane with KEY_ENTER and enters polar-coordinates counting mode', () => {
      const state = createTestState('polar-select-plane', {
        ...INITIAL_POLAR_DATA,
        plane: 'X-Y',
      });
      const result = polarReducer(
        state,
        { eventName: 'KEY_ENTER' },
        connectedContext(3, 4, 0)
      )!;
      expect(result.stateName).toBe('polar-coordinates');
      expect((result.stateData as PolarData).plane).toBe('X-Y');
      // Immediately shows R/θ on entering counting mode
      expect(result.display.X).toBeCloseTo(5, 4);
      expect(result.display.Y).toBeCloseTo(53.1301, 3);
    });

    it('cancels plane selection with KEY_CLEAR and returns to idle', () => {
      const state = createTestState('polar-select-plane', { ...INITIAL_POLAR_DATA });
      const result = polarReducer(state, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT)!;
      expect(result.stateName).toBe('idle');
      expect(result.stateData.stateDataType).toBe('none');
    });
  });

  describe('polar display computation (polar-coordinates)', () => {
    it('X-Y plane: X=3,Y=4 -> R=5 on X, θ≈53.13° on Y, Z blank', () => {
      const result = polarReducer(
        polarState('X-Y'),
        { eventName: 'MILL_STATE_CHANGED' },
        connectedContext(3, 4, 0)
      )!;
      expect(result.display.X).toBeCloseTo(5, 4);
      expect(result.display.Y).toBeCloseTo(53.1301, 3);
      expect(result.display.Z).toBe('');
    });

    it('X-Z plane: X=3,Z=4 -> R=5 on X, θ≈53.13° on Z, Y blank', () => {
      const result = polarReducer(
        polarState('X-Z'),
        { eventName: 'MILL_STATE_CHANGED' },
        connectedContext(3, 0, 4)
      )!;
      expect(result.display.X).toBeCloseTo(5, 4);
      expect(result.display.Z).toBeCloseTo(53.1301, 3);
      expect(result.display.Y).toBe('');
    });

    it('Y-Z plane: Y=3,Z=4 -> R=5 on Y, θ≈53.13° on Z, X blank', () => {
      const result = polarReducer(
        polarState('Y-Z'),
        { eventName: 'MILL_STATE_CHANGED' },
        connectedContext(0, 3, 4)
      )!;
      expect(result.display.Y).toBeCloseTo(5, 4);
      expect(result.display.Z).toBeCloseTo(53.1301, 3);
      expect(result.display.X).toBe('');
    });

    it('angle is 0° on the positive first axis', () => {
      const result = polarReducer(
        polarState('X-Y'),
        { eventName: 'MILL_STATE_CHANGED' },
        connectedContext(10, 0, 0)
      )!;
      expect(result.display.X).toBeCloseTo(10, 4);
      expect(result.display.Y).toBeCloseTo(0, 4);
    });

    it('angle is 90° on the positive second axis', () => {
      const result = polarReducer(
        polarState('X-Y'),
        { eventName: 'MILL_STATE_CHANGED' },
        connectedContext(0, 10, 0)
      )!;
      expect(result.display.X).toBeCloseTo(10, 4);
      expect(result.display.Y).toBeCloseTo(90, 4);
    });

    it('angle is negative below the first axis (atan2 convention)', () => {
      const result = polarReducer(
        polarState('X-Y'),
        { eventName: 'MILL_STATE_CHANGED' },
        connectedContext(0, -10, 0)
      )!;
      expect(result.display.Y).toBeCloseTo(-90, 4);
    });

    it('R is unit-converted to inches but θ stays in degrees', () => {
      const ctx: DROReducerContext = {
        ...connectedContext(0, 25.4, 0),
        nvMem: { ...DEFAULT_NON_VOLATILE_MEMORY, defaultUnit: 'inch' },
      };
      const result = polarReducer(
        polarState('X-Y'),
        { eventName: 'MILL_STATE_CHANGED' },
        ctx
      )!;
      // 25.4mm = 1 inch radius
      expect(result.display.X).toBeCloseTo(1, 4);
      // angle unchanged by units
      expect(result.display.Y).toBeCloseTo(90, 4);
    });

    it('exits polar mode with KEY_CLEAR and returns to idle Cartesian display', () => {
      const result = polarReducer(
        polarState('X-Y'),
        { eventName: 'KEY_CLEAR' },
        connectedContext(3, 4, 0)
      )!;
      expect(result.stateName).toBe('idle');
      expect(result.stateData.stateDataType).toBe('none');
    });
  });
});

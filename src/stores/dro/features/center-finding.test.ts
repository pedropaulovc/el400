/**
 * Center Finding Feature Reducer Tests
 *
 * Tests for center-line (2 points) and center-circle (3 points) operations.
 */

import { describe, it, expect } from 'vitest';
import { centerFindingReducer } from './center-finding';
import type { DROStatePayload } from '../types';
import type { DROStateName, CenterFindingData, DROStateData } from '../droStateMachine';
import { INITIAL_CENTER_FINDING_DATA } from '../droStateMachine';
import { createTestState, DEFAULT_TEST_CONTEXT } from '../test-utils';
import { INITIAL_VOLATILE_MEMORY_STATE } from '../../../types/volatileMemory';

/**
 * Helper to create test state with a specific position.
 * Sets manualAbsoluteValues so computeDisplayPosition returns the desired point.
 */
function stateWithPosition(
  stateName: DROStateName,
  stateData: DROStateData,
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

/**
 * Helper to update vMem position in existing state.
 */
function withPosition(
  state: DROStatePayload,
  position: { X: number; Y: number; Z: number }
): DROStatePayload {
  return {
    ...state,
    vMem: {
      ...state.vMem,
      manualAbsoluteValues: position,
    },
  };
}

describe('centerFindingReducer', () => {
  describe('state handling', () => {
    it('should return null for non-center-finding states', () => {
      const nonCenterStates: DROStateName[] = [
        'boot',
        'boot-show-message',
        'idle',
        'abs-inc-mode',
        'inch-mm-mode',
        'function-menu-center',
        'function-menu-circle',
        'function-menu-line',
      ];

      for (const state of nonCenterStates) {
        const current = createTestState(state);
        const result = centerFindingReducer(current, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);
        expect(result).toBeNull();
      }
    });

    it('should handle all center-line states', () => {
      const lineStates: DROStateName[] = [
        'function-menu-center-line-point-1',
        'function-menu-center-line-point-2',
        'function-menu-center-line-result',
      ];

      for (const state of lineStates) {
        const current = createTestState(state, INITIAL_CENTER_FINDING_DATA);
        const result = centerFindingReducer(current, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);
        expect(result).not.toBeNull();
      }
    });

    it('should handle all center-circle states', () => {
      const circleStates: DROStateName[] = [
        'function-menu-center-circle-point-1',
        'function-menu-center-circle-point-2',
        'function-menu-center-circle-point-3',
        'function-menu-center-circle-result',
      ];

      for (const state of circleStates) {
        const current = createTestState(state, INITIAL_CENTER_FINDING_DATA);
        const result = centerFindingReducer(current, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);
        expect(result).not.toBeNull();
      }
    });
  });

  describe('KEY_CLEAR cancellation', () => {
    it('should cancel from center-line-point-1', () => {
      const current = createTestState('function-menu-center-line-point-1', INITIAL_CENTER_FINDING_DATA);
      const result = centerFindingReducer(current, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('idle');
      expect(result?.stateData.stateDataType).toBe('none');
    });

    it('should cancel from center-line-point-2', () => {
      const current: DROStatePayload = {
        stateName: 'function-menu-center-line-point-2',
        stateData: {
          stateDataType: 'center-finding',
          storedPoints: [{ X: 0, Y: 0, Z: 0 }],
          centerResult: null,
        },
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
      };

      const result = centerFindingReducer(current, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('idle');
      expect(result?.stateData.stateDataType).toBe('none');
    });

    it('should cancel from center-line-result', () => {
      const current: DROStatePayload = {
        stateName: 'function-menu-center-line-result',
        stateData: {
          stateDataType: 'center-finding',
          storedPoints: [{ X: 0, Y: 0, Z: 0 }, { X: 100, Y: 0, Z: 0 }],
          centerResult: { X: 50, Y: 0, Z: 0 },
        },
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
      };

      const result = centerFindingReducer(current, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('idle');
      expect(result?.stateData.stateDataType).toBe('none');
    });

    it('should cancel from all circle point collection states', () => {
      const circleStates: DROStateName[] = [
        'function-menu-center-circle-point-1',
        'function-menu-center-circle-point-2',
        'function-menu-center-circle-point-3',
        'function-menu-center-circle-result',
      ];

      for (const state of circleStates) {
        const current = createTestState(state, INITIAL_CENTER_FINDING_DATA);
        const result = centerFindingReducer(current, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);

        expect(result?.stateName).toBe('idle');
        expect(result?.stateData.stateDataType).toBe('none');
      }
    });
  });

  describe('center-line point collection', () => {
    it('should store first point and advance to point-2', () => {
      const current = stateWithPosition(
        'function-menu-center-line-point-1',
        INITIAL_CENTER_FINDING_DATA,
        { X: 10, Y: 20, Z: 30 }
      );

      const result = centerFindingReducer(current, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('function-menu-center-line-point-2');
      expect(result?.stateData.stateDataType).toBe('center-finding');
      const data = result?.stateData as CenterFindingData;
      expect(data.storedPoints).toHaveLength(1);
      expect(data.storedPoints[0]).toEqual({ X: 10, Y: 20, Z: 30 });
    });

    it('should store second point and calculate result', () => {
      const current = stateWithPosition(
        'function-menu-center-line-point-2',
        {
          stateDataType: 'center-finding',
          storedPoints: [{ X: 0, Y: 0, Z: 0 }],
          centerResult: null,
        },
        { X: 100, Y: 200, Z: 100 }
      );

      const result = centerFindingReducer(current, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('function-menu-center-line-result');
      const data = result?.stateData as CenterFindingData;
      expect(data.storedPoints).toHaveLength(2);
      expect(data.centerResult).not.toBeNull();
      expect(data.centerResult?.X).toBe(50);
      expect(data.centerResult?.Y).toBe(100);
      expect(data.centerResult?.Z).toBe(50);
    });

    it('should calculate center for horizontal line', () => {
      const current = stateWithPosition(
        'function-menu-center-line-point-2',
        {
          stateDataType: 'center-finding',
          storedPoints: [{ X: 0, Y: 50, Z: 0 }],
          centerResult: null,
        },
        { X: 100, Y: 50, Z: 0 }
      );

      const result = centerFindingReducer(current, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);

      const data = result?.stateData as CenterFindingData;
      expect(data.centerResult?.X).toBe(50);
      expect(data.centerResult?.Y).toBe(50);
    });

    it('should calculate center for vertical line', () => {
      const current = stateWithPosition(
        'function-menu-center-line-point-2',
        {
          stateDataType: 'center-finding',
          storedPoints: [{ X: 50, Y: 0, Z: 0 }],
          centerResult: null,
        },
        { X: 50, Y: 100, Z: 0 }
      );

      const result = centerFindingReducer(current, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);

      const data = result?.stateData as CenterFindingData;
      expect(data.centerResult?.X).toBe(50);
      expect(data.centerResult?.Y).toBe(50);
    });

    it('should calculate center for diagonal line', () => {
      const current = stateWithPosition(
        'function-menu-center-line-point-2',
        {
          stateDataType: 'center-finding',
          storedPoints: [{ X: 0, Y: 0, Z: 10 }],
          centerResult: null,
        },
        { X: 100, Y: 100, Z: 30 }
      );

      const result = centerFindingReducer(current, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);

      const data = result?.stateData as CenterFindingData;
      expect(data.centerResult?.X).toBe(50);
      expect(data.centerResult?.Y).toBe(50);
      expect(data.centerResult?.Z).toBe(20);
    });

    it('should handle negative coordinates', () => {
      const current = stateWithPosition(
        'function-menu-center-line-point-2',
        {
          stateDataType: 'center-finding',
          storedPoints: [{ X: -50, Y: -30, Z: 0 }],
          centerResult: null,
        },
        { X: 50, Y: 30, Z: 0 }
      );

      const result = centerFindingReducer(current, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);

      const data = result?.stateData as CenterFindingData;
      expect(data.centerResult?.X).toBe(0);
      expect(data.centerResult?.Y).toBe(0);
    });
  });

  describe('center-line result state', () => {
    it('should stay in result state for unhandled events', () => {
      const current: DROStatePayload = {
        stateName: 'function-menu-center-line-result',
        stateData: {
          stateDataType: 'center-finding',
          storedPoints: [{ X: 0, Y: 0, Z: 0 }, { X: 100, Y: 0, Z: 0 }],
          centerResult: { X: 50, Y: 0, Z: 0 },
        },
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
      };

      expect(centerFindingReducer(current, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT)).toBe(current);
      expect(centerFindingReducer(current, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT)).toBe(current);
    });
  });

  describe('center-circle point collection', () => {
    it('should store first point and advance to point-2', () => {
      const current = stateWithPosition(
        'function-menu-center-circle-point-1',
        INITIAL_CENTER_FINDING_DATA,
        { X: 10, Y: 0, Z: 0 }
      );

      const result = centerFindingReducer(current, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('function-menu-center-circle-point-2');
      const data = result?.stateData as CenterFindingData;
      expect(data.storedPoints).toHaveLength(1);
    });

    it('should store second point and advance to point-3', () => {
      const current = stateWithPosition(
        'function-menu-center-circle-point-2',
        {
          stateDataType: 'center-finding',
          storedPoints: [{ X: 10, Y: 0, Z: 0 }],
          centerResult: null,
        },
        { X: 0, Y: 10, Z: 0 }
      );

      const result = centerFindingReducer(current, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('function-menu-center-circle-point-3');
      const data = result?.stateData as CenterFindingData;
      expect(data.storedPoints).toHaveLength(2);
    });

    it('should store third point and calculate circle center', () => {
      const current = stateWithPosition(
        'function-menu-center-circle-point-3',
        {
          stateDataType: 'center-finding',
          storedPoints: [
            { X: 10, Y: 0, Z: 0 },
            { X: 0, Y: 10, Z: 0 },
          ],
          centerResult: null,
        },
        { X: -10, Y: 0, Z: 0 }
      );

      const result = centerFindingReducer(current, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('function-menu-center-circle-result');
      const data = result?.stateData as CenterFindingData;
      expect(data.storedPoints).toHaveLength(3);
      expect(data.centerResult).not.toBeNull();
      expect(data.centerResult?.X).toBeCloseTo(0, 5);
      expect(data.centerResult?.Y).toBeCloseTo(0, 5);
    });

    it('should calculate center for circle not at origin', () => {
      const current = stateWithPosition(
        'function-menu-center-circle-point-3',
        {
          stateDataType: 'center-finding',
          storedPoints: [
            { X: 15, Y: 5, Z: 0 },  // Right of center (5,5)
            { X: 5, Y: 15, Z: 0 },  // Above center
          ],
          centerResult: null,
        },
        { X: -5, Y: 5, Z: 0 }  // Left of center
      );

      const result = centerFindingReducer(current, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);

      const data = result?.stateData as CenterFindingData;
      expect(data.centerResult?.X).toBeCloseTo(5, 1);
      expect(data.centerResult?.Y).toBeCloseTo(5, 1);
    });

    it('should calculate average Z for circle center', () => {
      const current = stateWithPosition(
        'function-menu-center-circle-point-3',
        {
          stateDataType: 'center-finding',
          storedPoints: [
            { X: 10, Y: 0, Z: 10 },
            { X: 0, Y: 10, Z: 20 },
          ],
          centerResult: null,
        },
        { X: -10, Y: 0, Z: 30 }
      );

      const result = centerFindingReducer(current, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);

      const data = result?.stateData as CenterFindingData;
      expect(data.centerResult?.Z).toBe(20); // Average of 10, 20, 30
    });

    it('should handle collinear points (return null center)', () => {
      const current = stateWithPosition(
        'function-menu-center-circle-point-3',
        {
          stateDataType: 'center-finding',
          storedPoints: [
            { X: 0, Y: 0, Z: 0 },
            { X: 5, Y: 0, Z: 0 },
          ],
          centerResult: null,
        },
        { X: 10, Y: 0, Z: 0 }  // Collinear with first two
      );

      const result = centerFindingReducer(current, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('function-menu-center-circle-result');
      const data = result?.stateData as CenterFindingData;
      expect(data.centerResult).toBeNull();
    });
  });

  describe('center-circle result state', () => {
    it('should stay in result state for unhandled events', () => {
      const current: DROStatePayload = {
        stateName: 'function-menu-center-circle-result',
        stateData: {
          stateDataType: 'center-finding',
          storedPoints: [
            { X: 10, Y: 0, Z: 0 },
            { X: 0, Y: 10, Z: 0 },
            { X: -10, Y: 0, Z: 0 },
          ],
          centerResult: { X: 0, Y: 0, Z: 0 },
        },
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
      };

      expect(centerFindingReducer(current, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT)).toBe(current);
      expect(centerFindingReducer(current, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT)).toBe(current);
    });
  });

  describe('unhandled events in point collection', () => {
    it('should return current state for non-KEY_6_RIGHT events in point-1', () => {
      const current = createTestState('function-menu-center-line-point-1', INITIAL_CENTER_FINDING_DATA);

      expect(centerFindingReducer(current, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT)).toBe(current);
      expect(centerFindingReducer(current, { eventName: 'BTN_ABS_INC' }, DEFAULT_TEST_CONTEXT)).toBe(current);
    });

    it('should return current state for non-KEY_6_RIGHT events in point-2', () => {
      const current: DROStatePayload = {
        stateName: 'function-menu-center-line-point-2',
        stateData: {
          stateDataType: 'center-finding',
          storedPoints: [{ X: 0, Y: 0, Z: 0 }],
          centerResult: null,
        },
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
      };

      expect(centerFindingReducer(current, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT)).toBe(current);
    });

    it('should return current state for non-KEY_6_RIGHT events in circle point-3', () => {
      const current: DROStatePayload = {
        stateName: 'function-menu-center-circle-point-3',
        stateData: {
          stateDataType: 'center-finding',
          storedPoints: [
            { X: 10, Y: 0, Z: 0 },
            { X: 0, Y: 10, Z: 0 },
          ],
          centerResult: null,
        },
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
      };

      expect(centerFindingReducer(current, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT)).toBe(current);
    });
  });

  describe('data initialization', () => {
    it('should initialize data if not center-finding type', () => {
      const current = stateWithPosition(
        'function-menu-center-line-point-1',
        { stateDataType: 'none' },
        { X: 10, Y: 20, Z: 30 }
      );

      const result = centerFindingReducer(current, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);

      const data = result?.stateData as CenterFindingData;
      expect(data.stateDataType).toBe('center-finding');
      expect(data.storedPoints).toHaveLength(1);
    });
  });

  describe('full workflow', () => {
    it('should complete center-line workflow from point-1 to result', () => {
      let state: DROStatePayload = stateWithPosition(
        'function-menu-center-line-point-1',
        INITIAL_CENTER_FINDING_DATA,
        { X: 0, Y: 0, Z: 0 }
      );

      // Point 1
      state = centerFindingReducer(state, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT)!;
      expect(state.stateName).toBe('function-menu-center-line-point-2');

      // Move to second position
      state = withPosition(state, { X: 100, Y: 0, Z: 0 });

      // Point 2
      state = centerFindingReducer(state, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT)!;
      expect(state.stateName).toBe('function-menu-center-line-result');

      const data = state.stateData as CenterFindingData;
      expect(data.centerResult?.X).toBe(50);
    });

    it('should complete center-circle workflow from point-1 to result', () => {
      let state: DROStatePayload = stateWithPosition(
        'function-menu-center-circle-point-1',
        INITIAL_CENTER_FINDING_DATA,
        { X: 0, Y: 10, Z: 0 }
      );

      // Point 1
      state = centerFindingReducer(state, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT)!;
      expect(state.stateName).toBe('function-menu-center-circle-point-2');

      // Move to second position
      state = withPosition(state, { X: 10, Y: 0, Z: 0 });

      // Point 2
      state = centerFindingReducer(state, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT)!;
      expect(state.stateName).toBe('function-menu-center-circle-point-3');

      // Move to third position
      state = withPosition(state, { X: -10, Y: 0, Z: 0 });

      // Point 3
      state = centerFindingReducer(state, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT)!;
      expect(state.stateName).toBe('function-menu-center-circle-result');

      const data = state.stateData as CenterFindingData;
      expect(data.centerResult?.X).toBeCloseTo(0, 5);
      expect(data.centerResult?.Y).toBeCloseTo(0, 5);
    });
  });
});

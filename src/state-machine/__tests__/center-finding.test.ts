/**
 * Center Finding Feature Reducer Tests
 *
 * Tests for center-line (2 points) and center-circle (3 points) operations.
 */

import { describe, it, expect } from 'vitest';
import { centerFindingReducer } from '../features/center-finding';
import type { OperationStateShape } from '../types';
import type { OperationState, CenterFindingContext } from '../../types/operationState';
import {
  INITIAL_OPERATION_CONTEXT,
  INITIAL_CENTER_FINDING_CONTEXT,
} from '../../types/operationState';

describe('centerFindingReducer', () => {
  describe('state handling', () => {
    it('should return null for non-center-finding states', () => {
      const nonCenterStates: OperationState[] = [
        'boot',
        'showMessage',
        'idle',
        'abs-inc-mode',
        'inch-mm-mode',
        'function-menu-center',
        'function-menu-circle',
        'function-menu-line',
      ];

      for (const state of nonCenterStates) {
        const current: OperationStateShape = {
          state,
          context: INITIAL_OPERATION_CONTEXT,
        };

        const result = centerFindingReducer(current, { type: 'KEY_CLEAR' });
        expect(result).toBeNull();
      }
    });

    it('should handle all center-line states', () => {
      const lineStates: OperationState[] = [
        'function-menu-center-line-point-1',
        'function-menu-center-line-point-2',
        'function-menu-center-line-result',
      ];

      for (const state of lineStates) {
        const current: OperationStateShape = {
          state,
          context: INITIAL_CENTER_FINDING_CONTEXT,
        };

        // KEY_CLEAR is handled by all center finding states
        const result = centerFindingReducer(current, { type: 'KEY_CLEAR' });
        expect(result).not.toBeNull();
      }
    });

    it('should handle all center-circle states', () => {
      const circleStates: OperationState[] = [
        'function-menu-center-circle-point-1',
        'function-menu-center-circle-point-2',
        'function-menu-center-circle-point-3',
        'function-menu-center-circle-result',
      ];

      for (const state of circleStates) {
        const current: OperationStateShape = {
          state,
          context: INITIAL_CENTER_FINDING_CONTEXT,
        };

        const result = centerFindingReducer(current, { type: 'KEY_CLEAR' });
        expect(result).not.toBeNull();
      }
    });
  });

  describe('KEY_CLEAR cancellation', () => {
    it('should cancel from center-line-point-1', () => {
      const current: OperationStateShape = {
        state: 'function-menu-center-line-point-1',
        context: INITIAL_CENTER_FINDING_CONTEXT,
      };

      const result = centerFindingReducer(current, { type: 'KEY_CLEAR' });

      expect(result?.state).toBe('idle');
      expect(result?.context.type).toBe('none');
    });

    it('should cancel from center-line-point-2', () => {
      const current: OperationStateShape = {
        state: 'function-menu-center-line-point-2',
        context: {
          type: 'center-finding',
          storedPoints: [{ X: 0, Y: 0, Z: 0 }],
          centerResult: null,
        },
      };

      const result = centerFindingReducer(current, { type: 'KEY_CLEAR' });

      expect(result?.state).toBe('idle');
      expect(result?.context.type).toBe('none');
    });

    it('should cancel from center-line-result', () => {
      const current: OperationStateShape = {
        state: 'function-menu-center-line-result',
        context: {
          type: 'center-finding',
          storedPoints: [{ X: 0, Y: 0, Z: 0 }, { X: 100, Y: 0, Z: 0 }],
          centerResult: { X: 50, Y: 0, Z: 0 },
        },
      };

      const result = centerFindingReducer(current, { type: 'KEY_CLEAR' });

      expect(result?.state).toBe('idle');
      expect(result?.context.type).toBe('none');
    });

    it('should cancel from all circle point collection states', () => {
      const circleStates: OperationState[] = [
        'function-menu-center-circle-point-1',
        'function-menu-center-circle-point-2',
        'function-menu-center-circle-point-3',
        'function-menu-center-circle-result',
      ];

      for (const state of circleStates) {
        const current: OperationStateShape = {
          state,
          context: INITIAL_CENTER_FINDING_CONTEXT,
        };

        const result = centerFindingReducer(current, { type: 'KEY_CLEAR' });

        expect(result?.state).toBe('idle');
        expect(result?.context.type).toBe('none');
      }
    });
  });

  describe('center-line point collection', () => {
    it('should store first point and advance to point-2', () => {
      const current: OperationStateShape = {
        state: 'function-menu-center-line-point-1',
        context: INITIAL_CENTER_FINDING_CONTEXT,
      };

      const result = centerFindingReducer(current, {
        type: 'POINT_DATA',
        point: { X: 10, Y: 20, Z: 30 },
      });

      expect(result?.state).toBe('function-menu-center-line-point-2');
      expect(result?.context.type).toBe('center-finding');
      const ctx = result?.context as CenterFindingContext;
      expect(ctx.storedPoints).toHaveLength(1);
      expect(ctx.storedPoints[0]).toEqual({ X: 10, Y: 20, Z: 30 });
    });

    it('should store second point and calculate result', () => {
      const current: OperationStateShape = {
        state: 'function-menu-center-line-point-2',
        context: {
          type: 'center-finding',
          storedPoints: [{ X: 0, Y: 0, Z: 0 }],
          centerResult: null,
        },
      };

      const result = centerFindingReducer(current, {
        type: 'POINT_DATA',
        point: { X: 100, Y: 200, Z: 100 },
      });

      expect(result?.state).toBe('function-menu-center-line-result');
      const ctx = result?.context as CenterFindingContext;
      expect(ctx.storedPoints).toHaveLength(2);
      expect(ctx.centerResult).not.toBeNull();
      expect(ctx.centerResult?.X).toBe(50);
      expect(ctx.centerResult?.Y).toBe(100);
      expect(ctx.centerResult?.Z).toBe(50);
    });

    it('should calculate center for horizontal line', () => {
      const current: OperationStateShape = {
        state: 'function-menu-center-line-point-2',
        context: {
          type: 'center-finding',
          storedPoints: [{ X: 0, Y: 50, Z: 0 }],
          centerResult: null,
        },
      };

      const result = centerFindingReducer(current, {
        type: 'POINT_DATA',
        point: { X: 100, Y: 50, Z: 0 },
      });

      const ctx = result?.context as CenterFindingContext;
      expect(ctx.centerResult?.X).toBe(50);
      expect(ctx.centerResult?.Y).toBe(50);
    });

    it('should calculate center for vertical line', () => {
      const current: OperationStateShape = {
        state: 'function-menu-center-line-point-2',
        context: {
          type: 'center-finding',
          storedPoints: [{ X: 50, Y: 0, Z: 0 }],
          centerResult: null,
        },
      };

      const result = centerFindingReducer(current, {
        type: 'POINT_DATA',
        point: { X: 50, Y: 100, Z: 0 },
      });

      const ctx = result?.context as CenterFindingContext;
      expect(ctx.centerResult?.X).toBe(50);
      expect(ctx.centerResult?.Y).toBe(50);
    });

    it('should calculate center for diagonal line', () => {
      const current: OperationStateShape = {
        state: 'function-menu-center-line-point-2',
        context: {
          type: 'center-finding',
          storedPoints: [{ X: 0, Y: 0, Z: 10 }],
          centerResult: null,
        },
      };

      const result = centerFindingReducer(current, {
        type: 'POINT_DATA',
        point: { X: 100, Y: 100, Z: 30 },
      });

      const ctx = result?.context as CenterFindingContext;
      expect(ctx.centerResult?.X).toBe(50);
      expect(ctx.centerResult?.Y).toBe(50);
      expect(ctx.centerResult?.Z).toBe(20);
    });

    it('should handle negative coordinates', () => {
      const current: OperationStateShape = {
        state: 'function-menu-center-line-point-2',
        context: {
          type: 'center-finding',
          storedPoints: [{ X: -50, Y: -30, Z: 0 }],
          centerResult: null,
        },
      };

      const result = centerFindingReducer(current, {
        type: 'POINT_DATA',
        point: { X: 50, Y: 30, Z: 0 },
      });

      const ctx = result?.context as CenterFindingContext;
      expect(ctx.centerResult?.X).toBe(0);
      expect(ctx.centerResult?.Y).toBe(0);
    });
  });

  describe('center-line result state', () => {
    it('should stay in result state for unhandled events', () => {
      const current: OperationStateShape = {
        state: 'function-menu-center-line-result',
        context: {
          type: 'center-finding',
          storedPoints: [{ X: 0, Y: 0, Z: 0 }, { X: 100, Y: 0, Z: 0 }],
          centerResult: { X: 50, Y: 0, Z: 0 },
        },
      };

      expect(centerFindingReducer(current, { type: 'KEY_ENTER' })).toBe(current);
      expect(centerFindingReducer(current, { type: 'KEY_6' })).toBe(current);
      expect(centerFindingReducer(current, { type: 'POINT_DATA', point: { X: 0, Y: 0, Z: 0 } })).toBe(current);
    });
  });

  describe('center-circle point collection', () => {
    it('should store first point and advance to point-2', () => {
      const current: OperationStateShape = {
        state: 'function-menu-center-circle-point-1',
        context: INITIAL_CENTER_FINDING_CONTEXT,
      };

      const result = centerFindingReducer(current, {
        type: 'POINT_DATA',
        point: { X: 10, Y: 0, Z: 0 },
      });

      expect(result?.state).toBe('function-menu-center-circle-point-2');
      const ctx = result?.context as CenterFindingContext;
      expect(ctx.storedPoints).toHaveLength(1);
    });

    it('should store second point and advance to point-3', () => {
      const current: OperationStateShape = {
        state: 'function-menu-center-circle-point-2',
        context: {
          type: 'center-finding',
          storedPoints: [{ X: 10, Y: 0, Z: 0 }],
          centerResult: null,
        },
      };

      const result = centerFindingReducer(current, {
        type: 'POINT_DATA',
        point: { X: 0, Y: 10, Z: 0 },
      });

      expect(result?.state).toBe('function-menu-center-circle-point-3');
      const ctx = result?.context as CenterFindingContext;
      expect(ctx.storedPoints).toHaveLength(2);
    });

    it('should store third point and calculate circle center', () => {
      const current: OperationStateShape = {
        state: 'function-menu-center-circle-point-3',
        context: {
          type: 'center-finding',
          storedPoints: [
            { X: 10, Y: 0, Z: 0 },
            { X: 0, Y: 10, Z: 0 },
          ],
          centerResult: null,
        },
      };

      const result = centerFindingReducer(current, {
        type: 'POINT_DATA',
        point: { X: -10, Y: 0, Z: 0 },
      });

      expect(result?.state).toBe('function-menu-center-circle-result');
      const ctx = result?.context as CenterFindingContext;
      expect(ctx.storedPoints).toHaveLength(3);
      expect(ctx.centerResult).not.toBeNull();
      expect(ctx.centerResult?.X).toBeCloseTo(0, 5);
      expect(ctx.centerResult?.Y).toBeCloseTo(0, 5);
    });

    it('should calculate center for circle not at origin', () => {
      const current: OperationStateShape = {
        state: 'function-menu-center-circle-point-3',
        context: {
          type: 'center-finding',
          storedPoints: [
            { X: 15, Y: 5, Z: 0 },  // Right of center (5,5)
            { X: 5, Y: 15, Z: 0 },  // Above center
          ],
          centerResult: null,
        },
      };

      const result = centerFindingReducer(current, {
        type: 'POINT_DATA',
        point: { X: -5, Y: 5, Z: 0 },  // Left of center
      });

      const ctx = result?.context as CenterFindingContext;
      expect(ctx.centerResult?.X).toBeCloseTo(5, 1);
      expect(ctx.centerResult?.Y).toBeCloseTo(5, 1);
    });

    it('should calculate average Z for circle center', () => {
      const current: OperationStateShape = {
        state: 'function-menu-center-circle-point-3',
        context: {
          type: 'center-finding',
          storedPoints: [
            { X: 10, Y: 0, Z: 10 },
            { X: 0, Y: 10, Z: 20 },
          ],
          centerResult: null,
        },
      };

      const result = centerFindingReducer(current, {
        type: 'POINT_DATA',
        point: { X: -10, Y: 0, Z: 30 },
      });

      const ctx = result?.context as CenterFindingContext;
      expect(ctx.centerResult?.Z).toBe(20); // Average of 10, 20, 30
    });

    it('should handle collinear points (return null center)', () => {
      const current: OperationStateShape = {
        state: 'function-menu-center-circle-point-3',
        context: {
          type: 'center-finding',
          storedPoints: [
            { X: 0, Y: 0, Z: 0 },
            { X: 5, Y: 0, Z: 0 },
          ],
          centerResult: null,
        },
      };

      const result = centerFindingReducer(current, {
        type: 'POINT_DATA',
        point: { X: 10, Y: 0, Z: 0 },  // Collinear with first two
      });

      expect(result?.state).toBe('function-menu-center-circle-result');
      const ctx = result?.context as CenterFindingContext;
      expect(ctx.centerResult).toBeNull();
    });
  });

  describe('center-circle result state', () => {
    it('should stay in result state for unhandled events', () => {
      const current: OperationStateShape = {
        state: 'function-menu-center-circle-result',
        context: {
          type: 'center-finding',
          storedPoints: [
            { X: 10, Y: 0, Z: 0 },
            { X: 0, Y: 10, Z: 0 },
            { X: -10, Y: 0, Z: 0 },
          ],
          centerResult: { X: 0, Y: 0, Z: 0 },
        },
      };

      expect(centerFindingReducer(current, { type: 'KEY_ENTER' })).toBe(current);
      expect(centerFindingReducer(current, { type: 'KEY_6' })).toBe(current);
    });
  });

  describe('unhandled events in point collection', () => {
    it('should return current state for non-POINT_DATA events in point-1', () => {
      const current: OperationStateShape = {
        state: 'function-menu-center-line-point-1',
        context: INITIAL_CENTER_FINDING_CONTEXT,
      };

      expect(centerFindingReducer(current, { type: 'KEY_ENTER' })).toBe(current);
      expect(centerFindingReducer(current, { type: 'KEY_6' })).toBe(current);
      expect(centerFindingReducer(current, { type: 'BTN_ABS_INC' })).toBe(current);
    });

    it('should return current state for non-POINT_DATA events in point-2', () => {
      const current: OperationStateShape = {
        state: 'function-menu-center-line-point-2',
        context: {
          type: 'center-finding',
          storedPoints: [{ X: 0, Y: 0, Z: 0 }],
          centerResult: null,
        },
      };

      expect(centerFindingReducer(current, { type: 'KEY_ENTER' })).toBe(current);
    });

    it('should return current state for non-POINT_DATA events in circle point-3', () => {
      const current: OperationStateShape = {
        state: 'function-menu-center-circle-point-3',
        context: {
          type: 'center-finding',
          storedPoints: [
            { X: 10, Y: 0, Z: 0 },
            { X: 0, Y: 10, Z: 0 },
          ],
          centerResult: null,
        },
      };

      expect(centerFindingReducer(current, { type: 'KEY_ENTER' })).toBe(current);
    });
  });

  describe('context initialization', () => {
    it('should initialize context if not center-finding type', () => {
      const current: OperationStateShape = {
        state: 'function-menu-center-line-point-1',
        context: { type: 'none' },
      };

      const result = centerFindingReducer(current, {
        type: 'POINT_DATA',
        point: { X: 10, Y: 20, Z: 30 },
      });

      const ctx = result?.context as CenterFindingContext;
      expect(ctx.type).toBe('center-finding');
      expect(ctx.storedPoints).toHaveLength(1);
    });
  });

  describe('full workflow', () => {
    it('should complete center-line workflow from point-1 to result', () => {
      let state: OperationStateShape = {
        state: 'function-menu-center-line-point-1',
        context: INITIAL_CENTER_FINDING_CONTEXT,
      };

      // Point 1
      state = centerFindingReducer(state, {
        type: 'POINT_DATA',
        point: { X: 0, Y: 0, Z: 0 },
      })!;
      expect(state.state).toBe('function-menu-center-line-point-2');

      // Point 2
      state = centerFindingReducer(state, {
        type: 'POINT_DATA',
        point: { X: 100, Y: 0, Z: 0 },
      })!;
      expect(state.state).toBe('function-menu-center-line-result');

      const ctx = state.context as CenterFindingContext;
      expect(ctx.centerResult?.X).toBe(50);
    });

    it('should complete center-circle workflow from point-1 to result', () => {
      let state: OperationStateShape = {
        state: 'function-menu-center-circle-point-1',
        context: INITIAL_CENTER_FINDING_CONTEXT,
      };

      // Point 1
      state = centerFindingReducer(state, {
        type: 'POINT_DATA',
        point: { X: 0, Y: 10, Z: 0 },
      })!;
      expect(state.state).toBe('function-menu-center-circle-point-2');

      // Point 2
      state = centerFindingReducer(state, {
        type: 'POINT_DATA',
        point: { X: 10, Y: 0, Z: 0 },
      })!;
      expect(state.state).toBe('function-menu-center-circle-point-3');

      // Point 3
      state = centerFindingReducer(state, {
        type: 'POINT_DATA',
        point: { X: -10, Y: 0, Z: 0 },
      })!;
      expect(state.state).toBe('function-menu-center-circle-result');

      const ctx = state.context as CenterFindingContext;
      expect(ctx.centerResult?.X).toBeCloseTo(0, 5);
      expect(ctx.centerResult?.Y).toBeCloseTo(0, 5);
    });
  });
});

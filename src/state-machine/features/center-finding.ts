/**
 * Center Finding Feature Reducer
 *
 * Handles center-line (2 points) and center-circle (3 points) operations.
 */

import type { OperationStateShape, FeatureReducer } from '../types';
import type {
  OperationState,
  OperationContext,
  CenterFindingContext,
  StoredPoint,
} from '../../types/operationState';
import {
  INITIAL_OPERATION_CONTEXT,
  INITIAL_CENTER_FINDING_CONTEXT,
  isCenterLineState,
  isCenterCircleState,
} from '../../types/operationState';
import type { AxisValues } from '../../types/volatileMemory';
import { findLineCenter, findCircleCenter } from '../../utils/centerFinding';

/**
 * Check if state is handled by this feature.
 */
function isCenterFindingState(state: OperationState): boolean {
  return isCenterLineState(state) || isCenterCircleState(state);
}

/**
 * Add a point to the center finding context.
 */
function addPointToContext(
  context: OperationContext,
  point: StoredPoint
): CenterFindingContext {
  if (context.type === 'center-finding') {
    return {
      ...context,
      storedPoints: [...context.storedPoints, point],
    };
  }
  return {
    ...INITIAL_CENTER_FINDING_CONTEXT,
    storedPoints: [point],
  };
}

/**
 * Calculate the center of a line from two points.
 */
function calculateLineCenterResult(points: StoredPoint[]): AxisValues | null {
  if (points.length < 2) return null;
  const center = findLineCenter(
    { x: points[0].X, y: points[0].Y },
    { x: points[1].X, y: points[1].Y }
  );
  return {
    X: center.x,
    Y: center.y,
    Z: (points[0].Z + points[1].Z) / 2,
  };
}

/**
 * Calculate the center of a circle from three points.
 */
function calculateCircleCenterResult(points: StoredPoint[]): AxisValues | null {
  if (points.length < 3) return null;
  const center = findCircleCenter(
    { x: points[0].X, y: points[0].Y },
    { x: points[1].X, y: points[1].Y },
    { x: points[2].X, y: points[2].Y }
  );
  if (!center) return null;
  return {
    X: center.x,
    Y: center.y,
    Z: (points[0].Z + points[1].Z + points[2].Z) / 3,
  };
}

export const centerFindingReducer: FeatureReducer = (current, event) => {
  const { state, context } = current;

  if (!isCenterFindingState(state)) return null;

  // All center finding states can be cancelled with KEY_CLEAR
  if (event.type === 'KEY_CLEAR') {
    return { state: 'idle', context: INITIAL_OPERATION_CONTEXT };
  }

  switch (state) {
    // ─────────────────────────────────────────────────────────────
    // CENTER LINE POINT COLLECTION
    // ─────────────────────────────────────────────────────────────
    case 'function-menu-center-line-point-1':
      if (event.type === 'POINT_DATA') {
        return {
          state: 'function-menu-center-line-point-2',
          context: addPointToContext(context, event.point),
        };
      }
      return current;

    case 'function-menu-center-line-point-2':
      if (event.type === 'POINT_DATA') {
        const newContext = addPointToContext(context, event.point);
        const centerResult = calculateLineCenterResult(newContext.storedPoints);
        return {
          state: 'function-menu-center-line-result',
          context: { ...newContext, centerResult },
        };
      }
      return current;

    case 'function-menu-center-line-result':
      // Result state only exits via KEY_CLEAR (handled above)
      return current;

    // ─────────────────────────────────────────────────────────────
    // CENTER CIRCLE POINT COLLECTION
    // ─────────────────────────────────────────────────────────────
    case 'function-menu-center-circle-point-1':
      if (event.type === 'POINT_DATA') {
        return {
          state: 'function-menu-center-circle-point-2',
          context: addPointToContext(context, event.point),
        };
      }
      return current;

    case 'function-menu-center-circle-point-2':
      if (event.type === 'POINT_DATA') {
        return {
          state: 'function-menu-center-circle-point-3',
          context: addPointToContext(context, event.point),
        };
      }
      return current;

    case 'function-menu-center-circle-point-3':
      if (event.type === 'POINT_DATA') {
        const newContext = addPointToContext(context, event.point);
        const centerResult = calculateCircleCenterResult(newContext.storedPoints);
        return {
          state: 'function-menu-center-circle-result',
          context: { ...newContext, centerResult },
        };
      }
      return current;

    case 'function-menu-center-circle-result':
      // Result state only exits via KEY_CLEAR (handled above)
      return current;

    default:
      return null;
  }
};

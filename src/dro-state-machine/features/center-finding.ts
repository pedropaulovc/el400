/**
 * Center Finding Feature Reducer
 *
 * Handles center-line (2 points) and center-circle (3 points) operations.
 */

import type { DROStatePayload, FeatureReducer } from '../types';
import type {
  DROStateName,
  DROStateData,
  CenterFindingData,
  StoredPoint,
} from '../droStateMachine';
import {
  INITIAL_DRO_STATE_DATA,
  INITIAL_CENTER_FINDING_DATA,
  isCenterLineState,
  isCenterCircleState,
} from '../droStateMachine';
import type { AxisValues } from '../../types/volatileMemory';
import { findLineCenter, findCircleCenter } from '../../utils/centerFinding';

/**
 * Check if state is handled by this feature.
 */
function isCenterFindingState(state: DROStateName): boolean {
  return isCenterLineState(state) || isCenterCircleState(state);
}

/**
 * Add a point to the center finding data.
 */
function addPointToData(
  data: DROStateData,
  point: StoredPoint
): CenterFindingData {
  if (data.stateDataType === 'center-finding') {
    return {
      ...data,
      storedPoints: [...data.storedPoints, point],
    };
  }
  return {
    ...INITIAL_CENTER_FINDING_DATA,
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
  const { stateName: state, stateData: data } = current;

  if (!isCenterFindingState(state)) return null;

  // All center finding states can be cancelled with KEY_CLEAR
  if (event.eventName === 'KEY_CLEAR') {
    return { stateName: 'idle', stateData: INITIAL_DRO_STATE_DATA };
  }

  switch (state) {
    // ─────────────────────────────────────────────────────────────
    // CENTER LINE POINT COLLECTION
    // ─────────────────────────────────────────────────────────────
    case 'function-menu-center-line-point-1':
      if (event.eventName === 'POINT_DATA') {
        return {
          stateName: 'function-menu-center-line-point-2',
          stateData: addPointToData(data, event.point),
        };
      }
      return current;

    case 'function-menu-center-line-point-2':
      if (event.eventName === 'POINT_DATA') {
        const newData = addPointToData(data, event.point);
        const centerResult = calculateLineCenterResult(newData.storedPoints);
        return {
          stateName: 'function-menu-center-line-result',
          stateData: { ...newData, centerResult },
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
      if (event.eventName === 'POINT_DATA') {
        return {
          stateName: 'function-menu-center-circle-point-2',
          stateData: addPointToData(data, event.point),
        };
      }
      return current;

    case 'function-menu-center-circle-point-2':
      if (event.eventName === 'POINT_DATA') {
        return {
          stateName: 'function-menu-center-circle-point-3',
          stateData: addPointToData(data, event.point),
        };
      }
      return current;

    case 'function-menu-center-circle-point-3':
      if (event.eventName === 'POINT_DATA') {
        const newData = addPointToData(data, event.point);
        const centerResult = calculateCircleCenterResult(newData.storedPoints);
        return {
          stateName: 'function-menu-center-circle-result',
          stateData: { ...newData, centerResult },
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

/**
 * Center Finding Feature Reducer
 *
 * Handles center-line (2 points) and center-circle (3 points) operations.
 * When KEY_6_RIGHT is pressed in point collection state, computes the current
 * display position from context and stores it as a point.
 */

import type { FeatureReducer, DROReducerContext } from '../types';
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
  isCollectingPoints,
  isResultState,
} from '../droStateMachine';
import type { AxisValues, VolatileMemoryState } from '../../../types/volatileMemory';
import { findLineCenter, findCircleCenter } from '../../../utils/centerFinding';
import {
  computeNormalDisplay,
  computeAxisPositionMm,
  createDisplay,
  type DisplayState,
} from '../utils/displayComputation';
import { fromMmToAnyUnit } from '../../../utils/unitConversion';

/**
 * Check if state is handled by this feature.
 */
function isCenterFindingState(state: DROStateName): boolean {
  return isCenterLineState(state) || isCenterCircleState(state);
}

/**
 * Compute current position (in mm) from vMem and context.
 * This is the raw position that gets stored when collecting points.
 */
function computeStoredPosition(
  vMem: VolatileMemoryState,
  context: DROReducerContext
): StoredPoint {
  if (vMem.mode === 'abs') {
    // ABS mode: machine position - work offset (or manual values if disconnected)
    if (context.millState.connected) {
      return {
        X: context.millState.position.x - vMem.workOffsets.X,
        Y: context.millState.position.y - vMem.workOffsets.Y,
        Z: context.millState.position.z - vMem.workOffsets.Z,
      };
    }
    return {
      X: vMem.manualAbsoluteValues.X,
      Y: vMem.manualAbsoluteValues.Y,
      Z: vMem.manualAbsoluteValues.Z,
    };
  }
  // INC mode: incremental values
  return {
    X: vMem.incrementalValues.X,
    Y: vMem.incrementalValues.Y,
    Z: vMem.incrementalValues.Z,
  };
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
  const p0 = points[0];
  const p1 = points[1];
  if (!p0 || !p1) return null;
  const center = findLineCenter(
    { x: p0.X, y: p0.Y },
    { x: p1.X, y: p1.Y }
  );
  return {
    X: center.x,
    Y: center.y,
    Z: (p0.Z + p1.Z) / 2,
  };
}

/**
 * Calculate the center of a circle from three points.
 */
function calculateCircleCenterResult(points: StoredPoint[]): AxisValues | null {
  if (points.length < 3) return null;
  const p0 = points[0];
  const p1 = points[1];
  const p2 = points[2];
  if (!p0 || !p1 || !p2) return null;
  const center = findCircleCenter(
    { x: p0.X, y: p0.Y },
    { x: p1.X, y: p1.Y },
    { x: p2.X, y: p2.Y }
  );
  if (!center) return null;
  return {
    X: center.x,
    Y: center.y,
    Z: (p0.Z + p1.Z + p2.Z) / 3,
  };
}

/**
 * Compute display showing distance-to-go to center result.
 * Shows (centerResult - currentPosition) in user's preferred unit.
 */
function computeCenterResultDisplay(
  centerResult: AxisValues,
  vMem: VolatileMemoryState,
  context: DROReducerContext
): DisplayState {
  const currentX = computeAxisPositionMm('X', vMem, context);
  const currentY = computeAxisPositionMm('Y', vMem, context);
  const currentZ = computeAxisPositionMm('Z', vMem, context);
  const unit = context.nvMem.defaultUnit;

  return createDisplay(
    fromMmToAnyUnit(centerResult.X - currentX, unit),
    fromMmToAnyUnit(centerResult.Y - currentY, unit),
    fromMmToAnyUnit(centerResult.Z - currentZ, unit)
  );
}

export const centerFindingReducer: FeatureReducer = (current, event, context) => {
  const { stateName: state, stateData: data, vMem } = current;

  if (!isCenterFindingState(state)) return null;

  const centerData = data.stateDataType === 'center-finding' ? data : INITIAL_CENTER_FINDING_DATA;

  // Handle MILL_STATE_CHANGED - update display for position changes
  if (event.eventName === 'MILL_STATE_CHANGED') {
    if (isCollectingPoints(state)) {
      // Collecting points shows normal position display
      return {
        ...current,
        display: computeNormalDisplay(vMem, context),
      };
    }
    if (isResultState(state) && centerData.centerResult) {
      // Result state shows distance-to-go display
      return {
        ...current,
        display: computeCenterResultDisplay(centerData.centerResult, vMem, context),
      };
    }
    return current;
  }

  // All center finding states can be cancelled with KEY_CLEAR
  if (event.eventName === 'KEY_CLEAR') {
    return {
      stateName: 'idle',
      stateData: INITIAL_DRO_STATE_DATA,
      vMem,
      display: computeNormalDisplay(vMem, context),
    };
  }

  // KEY_6_RIGHT stores the current position as a point during collection
  if (event.eventName === 'KEY_6_RIGHT') {
    const point = computeStoredPosition(vMem, context);

    switch (state) {
      // ─────────────────────────────────────────────────────────────
      // CENTER LINE POINT COLLECTION
      // ─────────────────────────────────────────────────────────────
      case 'function-menu-center-line-point-1':
        return {
          stateName: 'function-menu-center-line-point-2',
          stateData: addPointToData(data, point),
          vMem,
          display: computeNormalDisplay(vMem, context),
        };

      case 'function-menu-center-line-point-2': {
        const newData = addPointToData(data, point);
        const centerResult = calculateLineCenterResult(newData.storedPoints);
        return {
          stateName: 'function-menu-center-line-result',
          stateData: { ...newData, centerResult },
          vMem,
          display: centerResult
            ? computeCenterResultDisplay(centerResult, vMem, context)
            : computeNormalDisplay(vMem, context),
        };
      }

      // ─────────────────────────────────────────────────────────────
      // CENTER CIRCLE POINT COLLECTION
      // ─────────────────────────────────────────────────────────────
      case 'function-menu-center-circle-point-1':
        return {
          stateName: 'function-menu-center-circle-point-2',
          stateData: addPointToData(data, point),
          vMem,
          display: computeNormalDisplay(vMem, context),
        };

      case 'function-menu-center-circle-point-2':
        return {
          stateName: 'function-menu-center-circle-point-3',
          stateData: addPointToData(data, point),
          vMem,
          display: computeNormalDisplay(vMem, context),
        };

      case 'function-menu-center-circle-point-3': {
        const newData = addPointToData(data, point);
        const centerResult = calculateCircleCenterResult(newData.storedPoints);
        return {
          stateName: 'function-menu-center-circle-result',
          stateData: { ...newData, centerResult },
          vMem,
          display: centerResult
            ? computeCenterResultDisplay(centerResult, vMem, context)
            : computeNormalDisplay(vMem, context),
        };
      }

      default:
        // Result states don't handle KEY_6_RIGHT
        return current;
    }
  }

  // Result states only exit via KEY_CLEAR (handled above)
  return current;
};

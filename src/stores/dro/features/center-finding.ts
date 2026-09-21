/**
 * Center Finding Feature Reducer
 *
 * Handles center-line (2 points) and center-circle (3 points) operations.
 * When KEY_6_RIGHT is pressed in point collection state, computes the current
 * display position from context and stores it as a point.
 */

import type { FeatureReducer, DROReducerContext, DROStatePayload } from '../types';
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
 * Capture the same compensated ABS/INC position shown by the normal readout.
 */
function computeStoredPosition(
  vMem: VolatileMemoryState,
  context: DROReducerContext
): StoredPoint {
  return {
    X: computeAxisPositionMm('X', vMem, context),
    Y: computeAxisPositionMm('Y', vMem, context),
    Z: computeAxisPositionMm('Z', vMem, context),
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
      captureStatus: 'ready',
      storedPoints: [...data.storedPoints, point],
    };
  }
  return {
    ...INITIAL_CENTER_FINDING_DATA,
    captureStatus: 'ready',
    storedPoints: [point],
  };
}

const CENTER_POINT_PROMPTS: Partial<Record<DROStateName, string>> = {
  'function-menu-center-line-point-1': 'Point 1',
  'function-menu-center-line-point-2': 'Point 2',
  'function-menu-center-circle-point-1': 'Point 1',
  'function-menu-center-circle-point-2': 'Point 2',
  'function-menu-center-circle-point-3': 'Point 3',
};

const INVALID_ENTRY = 'inuAL d';
const INVALID_CIRCLE_DISPLAY: DisplayState = createDisplay(INVALID_ENTRY, '', 'Point 1');

/** Keep live X/Y coordinates visible while the Z window identifies the point. */
function computePointCollectionDisplay(
  state: DROStateName,
  vMem: VolatileMemoryState,
  context: DROReducerContext
): DisplayState {
  const normal = computeNormalDisplay(vMem, context);
  return createDisplay(normal.X, normal.Y, CENTER_POINT_PROMPTS[state] ?? '');
}


function restartInvalidCircle(vMem: VolatileMemoryState): DROStatePayload {
  return {
    stateName: 'function-menu-center-circle-point-1',
    stateData: {
      ...INITIAL_CENTER_FINDING_DATA,
      captureStatus: 'invalid',
    },
    vMem,
    display: INVALID_CIRCLE_DISPLAY,
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
 * Show live X/Y distance-to-go while the Z window retains the CEntrE label.
 */
function computeCenterResultDisplay(
  centerResult: AxisValues,
  vMem: VolatileMemoryState,
  context: DROReducerContext
): DisplayState {
  const currentX = computeAxisPositionMm('X', vMem, context);
  const currentY = computeAxisPositionMm('Y', vMem, context);
  const unit = context.nvMem.defaultUnit;

  return createDisplay(
    fromMmToAnyUnit(centerResult.X - currentX, unit),
    fromMmToAnyUnit(centerResult.Y - currentY, unit),
    'CEntrE'
  );
}

export const centerFindingReducer: FeatureReducer = (current, event, context) => {
  const { stateName: state, stateData: data, vMem } = current;

  if (!isCenterFindingState(state)) return null;

  const centerData = data.stateDataType === 'center-finding' ? data : INITIAL_CENTER_FINDING_DATA;

  // Handle MILL_STATE_CHANGED - update display for position changes
  if (event.eventName === 'MILL_STATE_CHANGED') {
    if (isCollectingPoints(state)) {
      // A rejected capture remains legible while the operator repositions. The
      // next KEY_6_RIGHT capture clears the status through addPointToData.
      return {
        ...current,
        display: centerData.captureStatus === 'invalid'
          ? INVALID_CIRCLE_DISPLAY
          : computePointCollectionDisplay(state, vMem, context),
      };
    }
    if (isResultState(state) && centerData.centerResult) {
      // Result state shows live distance-to-go.
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
      case 'function-menu-center-line-point-1': {
        const nextState = 'function-menu-center-line-point-2';
        return {
          stateName: nextState,
          stateData: addPointToData(data, point),
          vMem,
          display: computePointCollectionDisplay(nextState, vMem, context),
        };
      }

      case 'function-menu-center-line-point-2': {
        const newData = addPointToData(data, point);
        const centerResult = calculateLineCenterResult(newData.storedPoints);
        return {
          stateName: 'function-menu-center-line-result',
          stateData: { ...newData, centerResult },
          vMem,
          display: centerResult
            ? computeCenterResultDisplay(centerResult, vMem, context)
            : computePointCollectionDisplay(state, vMem, context),
        };
      }

      // ─────────────────────────────────────────────────────────────
      // CENTER CIRCLE POINT COLLECTION
      // ─────────────────────────────────────────────────────────────
      case 'function-menu-center-circle-point-1': {
        const nextState = 'function-menu-center-circle-point-2';
        return {
          stateName: nextState,
          stateData: addPointToData(data, point),
          vMem,
          display: computePointCollectionDisplay(nextState, vMem, context),
        };
      }

      case 'function-menu-center-circle-point-2': {
        if (centerData.storedPoints.some(
          (stored) => stored.X === point.X && stored.Y === point.Y
        )) {
          return restartInvalidCircle(vMem);
        }
        const nextState = 'function-menu-center-circle-point-3';
        return {
          stateName: nextState,
          stateData: addPointToData(data, point),
          vMem,
          display: computePointCollectionDisplay(nextState, vMem, context),
        };
      }

      case 'function-menu-center-circle-point-3': {
        if (centerData.storedPoints.some(
          (stored) => stored.X === point.X && stored.Y === point.Y
        )) {
          return restartInvalidCircle(vMem);
        }
        const newData = addPointToData(data, point);
        const centerResult = calculateCircleCenterResult(newData.storedPoints);
        if (!centerResult) return restartInvalidCircle(vMem);
        return {
          stateName: 'function-menu-center-circle-result',
          stateData: { ...newData, centerResult },
          vMem,
          display: computeCenterResultDisplay(centerResult, vMem, context),
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

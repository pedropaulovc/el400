/**
 * Taper Calculation Feature Reducer (US-045)
 *
 * Lathe-class function (manual Section 9.2.2). From two ends of a tapered job
 * the DRO derives the taper Radius (R) and included Angle (theta). The user
 * touches one end, (optionally) zeroes the axes, enters the function, then
 * moves to the other end; the angle and radius update live.
 *
 * Geometry: the cross-slide axis (X) measures the radius travel and the bed
 * axis (Z) measures the length travel. The included angle is
 *   theta = atan(deltaX / deltaZ)
 * measured from the position captured when the function was entered.
 *
 * The `tAPEr on` setup parameter (Section 6.2) selects which display shows the
 * angle; the paired display shows the radius:
 *
 *   tAPEr on | Radius (R) | Angle (theta)
 *   ---------|------------|--------------
 *   X        | Z display  | X display
 *   Z        | X display  | Z display
 *   Z'       | X display  | Z display   (Z' maps to Z on this 3-axis sim)
 *
 * Entered from the function menu (PoLAr-style lathe entry); exits on `C`.
 */

import type { FeatureReducer, DROReducerContext } from '../types';
import type { TaperData } from '../droStateMachine';
import { INITIAL_DRO_STATE_DATA, isTaperActive } from '../droStateMachine';
import type { VolatileMemoryState } from '../../../types/volatileMemory';
import {
  computeAxisPositionMm,
  computeNormalDisplay,
  createDisplay,
  type DisplayState,
} from '../utils/displayComputation';
import { fromMmToAnyUnit } from '../../../utils/unitConversion';

/** Convert radians to degrees. */
function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Compute the taper Radius (mm) and Angle (degrees) from the travel since the
 * function was entered.
 *
 * - radius = travel on the radius axis (X)
 * - angle  = atan(radiusTravel / lengthTravel) = atan(deltaX / deltaZ)
 */
function computeTaper(
  data: TaperData,
  vMem: VolatileMemoryState,
  context: DROReducerContext
): { radiusMm: number; angleDeg: number } {
  const deltaX = computeAxisPositionMm('X', vMem, context) - data.entryX;
  const deltaZ = computeAxisPositionMm('Z', vMem, context) - data.entryZ;

  const radiusMm = deltaX;
  const angleDeg = toDegrees(Math.atan2(deltaX, deltaZ));
  return { radiusMm, angleDeg };
}

/**
 * Compute the live taper display: angle on the taper-on axis, radius on the
 * paired axis, blank on the unused (Y) axis. The angle is always in degrees;
 * the radius respects the user's unit (AC 45.6).
 */
export function computeTaperDisplay(
  data: TaperData,
  vMem: VolatileMemoryState,
  context: DROReducerContext
): DisplayState {
  const { radiusMm, angleDeg } = computeTaper(data, vMem, context);
  const radius = fromMmToAnyUnit(radiusMm, context.nvMem.defaultUnit);

  if (context.nvMem.taperOnAxis === 'X') {
    // Angle on X, radius on Z.
    return createDisplay(angleDeg, '', radius);
  }
  // taper on Z or Z': angle on Z, radius on X.
  return createDisplay(radius, '', angleDeg);
}

export const taperReducer: FeatureReducer = (current, event, context) => {
  const { stateName: state, stateData: data, vMem } = current;

  if (!isTaperActive(state)) return null;

  const taperData = data.stateDataType === 'taper' ? data : null;

  if (event.eventName === 'KEY_CLEAR') {
    return {
      stateName: 'idle',
      stateData: INITIAL_DRO_STATE_DATA,
      vMem,
      display: computeNormalDisplay(vMem, context),
    };
  }

  if (event.eventName === 'MILL_STATE_CHANGED') {
    if (!taperData) return current;
    return {
      ...current,
      display: computeTaperDisplay(taperData, vMem, context),
    };
  }

  // Taper is a passive read-out; ignore all other input.
  return current;
};

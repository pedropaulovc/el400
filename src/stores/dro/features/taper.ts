/**
 * Taper Calculation Feature Reducer (US-045)
 *
 * This is an explicit milling-simulator adaptation of the lathe-class function
 * in manual Section 9.2.2. The DRO derives the taper radius and acute half-angle
 * from movement between the two touched ends:
 *
 *   radius = |delta X|
 *   length = |delta Z|
 *   half-angle = atan(radius / length)
 *
 * Using magnitudes makes the measurement independent of traversal direction;
 * a zero axial length is not a taper and is displayed as INVALID. The `tAPEr
 * on` setup choice selects the angle display while the paired display shows
 * radius:
 *
 *   X -> angle X, radius Z
 *   Y -> angle Y, radius X
 *   Z -> angle Z, radius X
 *
 * The angle follows the primary manual's degrees-minutes-seconds presentation.
 */

import type { FeatureReducer, DROReducerContext } from '../types';
import type { TaperData } from '../droStateMachine';
import { INITIAL_DRO_STATE_DATA, isTaperActive } from '../droStateMachine';
import type { VolatileMemoryState } from '../../../types/volatileMemory';
import {
  computeAxisPositionMm,
  computeNormalDisplay,
  createDisplay,
  formatAngularValue,
  type DisplayState,
} from '../utils/displayComputation';
import { fromMmToAnyUnit } from '@/utils/unitConversion';

const INVALID_ENTRY = 'inuAL d';

/**
 * Compute radius and the acute taper half-angle from travel since entry.
 * `null` angle means the two ends have no axial separation.
 */
function computeTaper(
  data: TaperData,
  vMem: VolatileMemoryState,
  context: DROReducerContext
): { radiusMm: number; angleDeg: number | null } {
  const deltaX = computeAxisPositionMm('X', vMem, context) - data.entryX;
  const deltaZ = computeAxisPositionMm('Z', vMem, context) - data.entryZ;
  const radiusMm = Math.abs(deltaX);
  const lengthMm = Math.abs(deltaZ);

  return {
    radiusMm,
    angleDeg: lengthMm === 0
      ? null
      : (Math.atan(radiusMm / lengthMm) * 180) / Math.PI,
  };
}

/**
 * Compute the live taper display. Radius follows the current linear unit; the
 * half-angle is rendered as the manual's `dd.mn.SS` readout.
 */
export function computeTaperDisplay(
  data: TaperData,
  vMem: VolatileMemoryState,
  context: DROReducerContext
): DisplayState {
  const { radiusMm, angleDeg } = computeTaper(data, vMem, context);
  const radius = fromMmToAnyUnit(radiusMm, context.nvMem.defaultUnit);
  const angle = angleDeg === null
    ? INVALID_ENTRY
    : formatAngularValue(angleDeg, 'dd-mn-ss');

  switch (context.nvMem.taperOnAxis) {
    case 'X':
      return createDisplay(angle, '', radius);
    case 'Y':
      return createDisplay(radius, angle, '');
    case 'Z':
      return createDisplay(radius, '', angle);
  }
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

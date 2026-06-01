/**
 * Zero-Approach (Near-Zero) Warning utilities (US-024)
 *
 * The EL400 emits a continuous warning beep as an axis nears a target position
 * (manual §8.3 "Near Zero Warning"; setup-menu `ZERO AP` / `BP DIST` / `BP TOLR`,
 * video §1.13). It is a purely derived signal: given the live readout value for
 * an axis (which, in distance-to-go / SDM / milling functions, is the distance
 * remaining to the target — so "near zero" means "near the target"), the warning
 * is active when the axis is within `BP DIST` of zero.
 *
 * BP TOLR adds hysteresis so the beep does not flutter at the threshold: once
 * active, the axis must move farther than `BP DIST + BP TOLR` away from zero
 * before the warning clears. This file is pure (no React, no store) so it can be
 * unit-tested in isolation and reused by the store and any consumer.
 */

import type { AxisDisplayValue, DisplayState } from './displayComputation';
import type {
  NonVolatileMemory,
  ZeroApproachDistance,
  ZeroApproachTolerance,
} from '../../../types/nonVolatileMemory';
import type { DROStateName } from '../droStateMachine';
import { isZeroApproachContext } from '../droStateMachine';
import { fromAnyUnitToMm } from '../../../utils/unitConversion';

/** Per-axis active state of the zero-approach warning. */
export interface ZeroApproachByAxis {
  X: boolean;
  Y: boolean;
  Z: boolean;
}

/** All-off zero-approach state (the warning starts disengaged). */
export const ZERO_APPROACH_OFF: ZeroApproachByAxis = { X: false, Y: false, Z: false };

/** Per-axis mask of which axes are armed (subject to the warning). */
export interface ZeroApproachArmed {
  X: boolean;
  Y: boolean;
  Z: boolean;
}

/** Default arming: every axis is armed (whole-readout near-zero, e.g. SDM/milling). */
export const ALL_ARMED: ZeroApproachArmed = { X: true, Y: true, Z: true };

/**
 * The `BP DIST` / `BP TOLR` setup values are stored as inch strings (the device's
 * native unit for these tolerances). Convert to mm so the comparison is unit and
 * display-format independent — the warning depends on real machine geometry, not
 * on whatever unit the operator is currently viewing.
 */
function inchStringToMm(value: string): number {
  const inches = Number(value);
  if (!Number.isFinite(inches)) return 0;
  return fromAnyUnitToMm(inches, 'inch');
}

/** Approach distance (`BP DIST`) in mm. */
export function approachDistanceMm(value: ZeroApproachDistance): number {
  return inchStringToMm(value);
}

/** Departure tolerance (`BP TOLR`) in mm. */
export function approachToleranceMm(value: ZeroApproachTolerance): number {
  return inchStringToMm(value);
}

/**
 * Distance (in mm) of a single axis from zero, given its live display value and
 * the operator's current unit. Text displays (e.g. `SELECt`) are treated as
 * "far" (no warning) by returning Infinity.
 */
function distanceToZeroMm(value: AxisDisplayValue, unit: 'inch' | 'mm'): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return Infinity;
  return Math.abs(fromAnyUnitToMm(numeric, unit));
}

/**
 * Compute the next warning state for one axis with hysteresis.
 *
 * - Engages when |distanceToZero| <= BP DIST.
 * - Once engaged, stays engaged until |distanceToZero| > BP DIST + BP TOLR.
 * - Disabled (`enabled === false`) is always off, regardless of position.
 *
 * @param distMm - absolute distance of the axis from zero, in mm
 * @param prevActive - whether the warning was active on the previous update
 * @param enabled - whether the zero-approach warning is switched on (BU22)
 * @param distanceMm - BP DIST threshold in mm
 * @param toleranceMm - BP TOLR departure hysteresis in mm
 */
export function nextAxisWarning(
  distMm: number,
  prevActive: boolean,
  enabled: boolean,
  distanceMm: number,
  toleranceMm: number
): boolean {
  if (!enabled) return false;
  if (!Number.isFinite(distMm)) return false;
  // Already beeping: only clear once we leave the wider release band.
  if (prevActive) return distMm <= distanceMm + toleranceMm;
  // Not beeping: engage when inside the approach band.
  return distMm <= distanceMm;
}

/**
 * Compute the per-axis zero-approach warning state from the live display values
 * and committed settings, carrying the previous state forward for hysteresis.
 *
 * Driven by the REAL readout (which reflects live machine position via
 * MILL_STATE_CHANGED), so the warning tracks actual motion toward the target,
 * not any forced/test-only signal.
 *
 * Gated to the function contexts where the warning is automatically enabled
 * (`isZeroApproachContext`: distance-to-go / SDM / milling functions, AC24.9):
 * outside them — e.g. plain idle, where a freshly-zeroed axis sits at 0 with no
 * target being approached — the warning is always off.
 *
 * `armed` masks which axes are actually approaching a target. In distance-to-go
 * only the axes with a preset show distance-to-target; the others show raw
 * position and must NOT warn merely for reading 0. Defaults to all-armed for
 * whole-readout contexts (SDM / milling) where every axis is a distance-to-go.
 */
export function computeZeroApproach(
  display: DisplayState,
  nvMem: NonVolatileMemory,
  prev: ZeroApproachByAxis,
  stateName: DROStateName,
  armed: ZeroApproachArmed = ALL_ARMED
): ZeroApproachByAxis {
  if (!isZeroApproachContext(stateName)) return ZERO_APPROACH_OFF;

  const enabled = nvMem.zeroApproachEnabled;
  const distanceMm = approachDistanceMm(nvMem.zeroApproachDistance);
  const toleranceMm = approachToleranceMm(nvMem.zeroApproachTolerance);
  const unit = nvMem.defaultUnit;

  const forAxis = (axis: 'X' | 'Y' | 'Z'): boolean => {
    if (!armed[axis]) return false;
    return nextAxisWarning(
      distanceToZeroMm(display[axis], unit),
      prev[axis],
      enabled,
      distanceMm,
      toleranceMm
    );
  };

  return { X: forAxis('X'), Y: forAxis('Y'), Z: forAxis('Z') };
}

/** True when the warning is active on at least one axis. */
export function isAnyZeroApproachActive(state: ZeroApproachByAxis): boolean {
  return state.X || state.Y || state.Z;
}

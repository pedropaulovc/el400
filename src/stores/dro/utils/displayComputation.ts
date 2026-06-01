/**
 * Display Computation Utilities
 *
 * Pure utility functions for computing display values from DRO state.
 * Handles abs/inc mode, connected vs manual positioning, and unit conversion.
 */

import type { Axis, VolatileMemoryState } from '../../../types/volatileMemory';
import type {
  NonVolatileMemory,
  DisplayResolutionValue,
  AngularFormat,
} from '../../../types/nonVolatileMemory';
import type { DROReducerContext } from '../types';
import { fromMmToAnyUnit } from '../../../utils/unitConversion';

/**
 * Maximum fractional digits the 8-cell seven-segment panel can render
 * (1 sign cell + 3 integer cells + 4 decimal cells). Finer dP settings clamp to
 * this, which also keeps the device's and simulator's default 4-decimal readout.
 */
export const MAX_DISPLAY_DECIMALS = 4;

/**
 * Decimal places to render for a given dP display-resolution value (US-022).
 *
 * dP is the 5-micron mill default, anchored at the panel-maximum of 4 decimals.
 * Each decade coarser drops one decimal (display gets less sensitive, AC22.4),
 * each decade finer would add one but is clamped to the panel maximum. The
 * mapping is unit-independent so the default reads 4 decimals in both inch and
 * mm, preserving the device's standard readout (AC22.2); only the coarse
 * 50-micron value drops to 3 decimals (≈0.002", matching the manual / story).
 *
 * @param value - dP value in microns
 * @returns Number of fractional digits to display (0..MAX_DISPLAY_DECIMALS)
 */
export function decimalsForDisplayResolution(value: DisplayResolutionValue): number {
  const microns = Number(value);
  // Decades coarser than the 5-micron anchor; floor so the mapping is monotonic
  // and a value strictly within a decade does not round up to the next step.
  const decadesCoarser = Math.floor(Math.log10(microns / 5) + 1e-9);
  const decimals = MAX_DISPLAY_DECIMALS - decadesCoarser;
  return Math.max(0, Math.min(MAX_DISPLAY_DECIMALS, decimals));
}

/**
 * Decimal places to render for a single axis, from its committed dP resolution
 * (US-022). Independent of scale resolution SC (AC22.3).
 */
export function axisDisplayDecimals(axis: Axis, nvMem: NonVolatileMemory): number {
  return decimalsForDisplayResolution(nvMem.displayResolution[axis]);
}

/**
 * Pure counting-direction sign for an axis (US-002).
 *
 * The displayed position is `rawPositionMm × directionSign(axis, nvMem)`. This is
 * a display-only transform applied AFTER the datum offset is subtracted; it never
 * mutates stored machine position, offsets, or macro coordinate math.
 *
 * - Base sign comes from the per-axis Direction: `'reversed' → -1`, else `+1`.
 * - For Z, the depth-sense preference composes on top: `'depth-positive'` inverts
 *   the Z sign so increasing cutting depth increases the displayed value. A Z axis
 *   that is both `'reversed'` and `'depth-positive'` double-inverts back to `+1`.
 *
 * @param axis - The axis to compute the sign for
 * @param nvMem - Non-volatile memory (counting direction + Z depth-sense)
 * @returns +1 (standard) or -1 (flipped)
 */
export function directionSign(axis: Axis, nvMem: NonVolatileMemory): 1 | -1 {
  const reversed = nvMem.axisDirection[axis] === 'reversed';
  const depthInverted = axis === 'Z' && nvMem.zDepthSense === 'depth-positive';
  // XOR: a single inversion flips the sign; both (reversed Z + depth-positive)
  // cancel back to +1.
  return reversed !== depthInverted ? -1 : 1;
}

/**
 * Pure radius/diameter scale factor for an axis (US-041).
 *
 * Lathe diameter turning shows the cut diameter, which is twice the slide travel,
 * so a `'diameter'`-mode axis displays `2 ×` the actual movement; `'radius'` (the
 * mill default) is 1:1. Like `directionSign`, this is a display-only transform
 * applied AFTER the datum offset is subtracted; it never mutates stored machine
 * position, offsets, or macro coordinate math.
 *
 * @param axis - The axis to compute the scale for
 * @param nvMem - Non-volatile memory (per-axis measurement mode)
 * @returns 2 (diameter) or 1 (radius)
 */
export function measurementScale(axis: Axis, nvMem: NonVolatileMemory): 1 | 2 {
  return nvMem.measurementMode[axis] === 'diameter' ? 2 : 1;
}

/**
 * Wrap an angle in degrees into the half-open range [0, 360) (US-040).
 *
 * Angular (rotary) axes count an angle, so the readout rolls over at a full
 * revolution: 360° -> 0°, 370° -> 10°, and negatives wrap up (-10° -> 350°).
 * This is the angular analogue of the linear readout and is applied to angular
 * axes in place of unit conversion.
 *
 * @param degrees - The raw angle in degrees (may be any real value)
 * @returns The equivalent angle in [0, 360)
 */
export function wrapDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

/** Decimal places rendered for the degrees-decimal (`dd.dEC`) angular format. */
export const ANGULAR_DECIMAL_PLACES = 3;

/** Left-pad a non-negative integer to two digits (e.g. 6 -> "06"). */
function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

/**
 * Render an angular-axis value in the selected DMS format (US-040 AC 40.3/40.4).
 *
 * The seven-segment panel has no °/'/" glyphs, so degree/minute/second groups are
 * separated by the panel's decimal point — exactly how the manual writes the
 * format labels (`dd.mn`, `dd.mn.SS`). The input is wrapped to [0, 360) first so
 * negatives and over-a-revolution values render in range:
 *
 *   - `'dd-dec'`   12.5° -> "12.500"   (degrees with 3 decimals)
 *   - `'dd-mn'`    12.5° -> "12.30"    (degrees "." minutes, minutes 2-digit)
 *   - `'dd-mn-ss'` 12.5° -> "12.30.00" (degrees "." minutes "." seconds, 2-digit)
 *
 * Minute/second rounding carries up (e.g. 12.9999° -> 13.00 in `dd-mn`) so the
 * groups never read an out-of-range 60. The result is a pre-formatted string so
 * the readout renders it verbatim through the text path rather than re-rounding
 * it as a plain number.
 *
 * @param degrees - The raw angle in degrees (any real value; wrapped internally)
 * @param format - The angular display-resolution format for the axis
 * @returns The seven-segment-renderable DMS string
 */
export function formatAngularValue(degrees: number, format: AngularFormat): string {
  const wrapped = wrapDegrees(degrees);

  if (format === 'dd-dec') {
    return wrapped.toFixed(ANGULAR_DECIMAL_PLACES);
  }

  if (format === 'dd-mn') {
    // Round to whole minutes, then carry a rounded-up 60' into the degree group
    // and wrap a 360° carry back to 0° (e.g. 359.9999° -> 0.00).
    const totalMinutes = Math.round(wrapped * 60);
    const deg = Math.floor(totalMinutes / 60) % 360;
    const min = totalMinutes % 60;
    return `${deg.toString()}.${pad2(min)}`;
  }

  // dd-mn-ss: round to whole seconds, carrying 60" -> minutes and 60' -> degrees.
  const totalSeconds = Math.round(wrapped * 3600);
  const deg = Math.floor(totalSeconds / 3600) % 360;
  const min = Math.floor((totalSeconds % 3600) / 60);
  const sec = totalSeconds % 60;
  return `${deg.toString()}.${pad2(min)}.${pad2(sec)}`;
}

/**
 * Display value for a single axis - can be a number or text string
 */
export type AxisDisplayValue = number | string;

/**
 * Display state for all three axes
 */
export interface DisplayState {
  X: AxisDisplayValue;
  Y: AxisDisplayValue;
  Z: AxisDisplayValue;
}

/**
 * Initial display state - all zeros
 */
export const INITIAL_DISPLAY_STATE: DisplayState = {
  X: 0,
  Y: 0,
  Z: 0,
};

/**
 * Compute the raw position (in mm) for a single axis.
 * Handles abs vs inc mode and connected vs manual positioning.
 *
 * @param axis - The axis to compute position for
 * @param vMem - Volatile memory state
 * @param context - Reducer context (millState, nvMem)
 * @returns Position in millimeters
 */
export function computeAxisPositionMm(
  axis: Axis,
  vMem: VolatileMemoryState,
  context: DROReducerContext
): number {
  const { mode, workOffsets, incrementalValues, manualAbsoluteValues } = vMem;
  const { millState } = context;

  if (mode === 'abs') {
    if (millState.connected) {
      const axisKey = axis.toLowerCase() as 'x' | 'y' | 'z';
      return millState.position[axisKey] - workOffsets[axis];
    }
    return manualAbsoluteValues[axis];
  }
  return incrementalValues[axis];
}

/**
 * Compute display value for a single axis with unit conversion.
 * This is the main function for normal position display.
 *
 * @param axis - The axis to compute display value for
 * @param vMem - Volatile memory state
 * @param context - Reducer context (millState, nvMem)
 * @returns Numeric value for linear axes; a pre-formatted DMS string for angular
 */
export function computeDisplayPosition(
  axis: Axis,
  vMem: VolatileMemoryState,
  context: DROReducerContext
): AxisDisplayValue {
  const rawMm = computeAxisPositionMm(axis, vMem, context);
  // Counting direction (US-002) and radius/diameter scale (US-041) are display-only
  // transforms applied AFTER datum subtraction; they never mutate stored machine
  // position, offsets, or macro coordinate math.
  const signed = rawMm * directionSign(axis, context.nvMem);
  // Angular (rotary) axes read an ANGLE: the raw position is degrees, wrapped to
  // [0, 360) and NOT unit-converted (US-040, AC 40.4). The axis's angular dP
  // format renders the wrapped degrees as a pre-formatted DMS string (AC 40.3).
  // Diameter ×2 scale applies only in linear mode (AC41.7 — angular has no
  // diameter concept).
  if (context.nvMem.countingMode[axis] === 'angular') {
    return formatAngularValue(signed, context.nvMem.angularResolution[axis]);
  }
  // Diameter mode shows 2× the slide travel (the turned diameter); radius is 1:1.
  const signedMm = signed * measurementScale(axis, context.nvMem);
  return fromMmToAnyUnit(signedMm, context.nvMem.defaultUnit);
}

/**
 * Compute normal display state for all three axes.
 * Used by reducers that show standard position values.
 *
 * @param vMem - Volatile memory state
 * @param context - Reducer context (millState, nvMem)
 * @returns Display state with unit-converted position values
 */
export function computeNormalDisplay(
  vMem: VolatileMemoryState,
  context: DROReducerContext
): DisplayState {
  return {
    X: computeDisplayPosition('X', vMem, context),
    Y: computeDisplayPosition('Y', vMem, context),
    Z: computeDisplayPosition('Z', vMem, context),
  };
}

/**
 * Create a custom display state.
 * Used by reducers that override the normal position display.
 *
 * @param x - Value for X axis
 * @param y - Value for Y axis
 * @param z - Value for Z axis
 * @returns Display state with the given values
 */
export function createDisplay(
  x: AxisDisplayValue,
  y: AxisDisplayValue,
  z: AxisDisplayValue
): DisplayState {
  return { X: x, Y: y, Z: z };
}

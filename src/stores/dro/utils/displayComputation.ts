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
import type { MillState } from '../../../types/millState';
import type { DROReducerContext } from '../types';
import { fromMmToAnyUnit } from '../../../utils/unitConversion';

/**
 * Maximum fractional digits the 8-cell seven-segment panel can render
 * (1 sign cell + 3 integer cells + 4 decimal cells). Finer dP settings clamp to
 * this, which also keeps the device's and simulator's default 4-decimal readout.
 */
export const MAX_DISPLAY_DECIMALS = 4;

/**
 * Number of seven-segment DIGIT cells on the panel, excluding the +/- sign cell.
 *
 * The panel is physically 8 cells: 1 sign cell + 7 digit cells (this constant).
 * `DISPLAY_WIDTH` in `axisDigits.ts` is 8 because it counts the sign cell; here we
 * count only the digits that hold the number, since the integer-vs-fraction budget
 * is split across these 7 cells (`integer cells = PANEL_DIGIT_CELLS − decimals`).
 */
export const PANEL_DIGIT_CELLS = 7;

/**
 * Largest magnitude the 7-digit panel can render at a given fractional precision
 * (US-047). The integer part gets `PANEL_DIGIT_CELLS − decimals` cells and the
 * fraction gets `decimals`, so every cell at 9 is:
 *
 *   maxDisplayableMagnitude(decimals) = 10^(PANEL_DIGIT_CELLS − decimals) − 10^(−decimals)
 *
 * e.g. 4 decimals -> 999.9999, 3 decimals -> 9999.999, 0 decimals -> 9999999.
 * A value keyed larger than this cannot be shown, so it is clamped (keeping sign)
 * at the value-commit boundary so the stored value equals what the panel shows.
 *
 * @param decimals - Fractional digits the axis currently displays (0..PANEL_DIGIT_CELLS)
 * @returns The maximum displayable magnitude (always non-negative)
 */
export function maxDisplayableMagnitude(decimals: number): number {
  return 10 ** (PANEL_DIGIT_CELLS - decimals) - 10 ** -decimals;
}

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
 * Seven-segment text shown on an axis whose encoder signal is lost while the
 * Encoder-Fail warning (`EnF`) is on (US-042, manual section 6.2 note *2).
 */
export const ENCODER_FAIL_TEXT = 'no SIG';

/**
 * Seven-segment text shown when a LINEAR axis's derived reading cannot fit the
 * 7 digit cells at its current dP resolution (e.g. a near-limit radius value
 * re-scaled ×2 into diameter mode). Mirrors the Acu-Rite DRO100 "display
 * overflow" behaviour — an honest out-of-range indicator rather than a clamped,
 * plausible-but-wrong number. Seven dashes fill the 7 digit cells; the sign cell
 * stays blank so it can never be misread as a negative number. The stored slide
 * value is untouched, so the reading self-clears when the axis returns in range,
 * dP is coarsened, or the axis is zeroed.
 *
 * This complements the US-047 entry-time clamp (which bounds KEYED values at the
 * commit boundary); this guard bounds DERIVED readings at the display step.
 */
export const DISPLAY_OVERFLOW_TEXT = '-------';

/**
 * Whether an axis should show the encoder-fail warning (US-042): the `EnF`
 * parameter must be on AND the live mill must report that axis's signal as lost.
 * A pure predicate so reducers and the display computation share one rule.
 */
export function isEncoderFailWarningActive(
  axis: Axis,
  millState: MillState,
  nvMem: NonVolatileMemory
): boolean {
  if (!nvMem.encoderFailWarning) return false;
  return millState.encoderSignal[axis] === 'lost';
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
  // Encoder-fail warning (US-042) overrides the numeric value: a lost signal on
  // this axis with `EnF` on shows `no SIG` instead of a stale reading.
  if (isEncoderFailWarningActive(axis, context.millState, context.nvMem)) {
    return ENCODER_FAIL_TEXT;
  }


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
  const displayed = fromMmToAnyUnit(signedMm, context.nvMem.defaultUnit);
  // Derived-reading overflow (Acu-Rite precedent): if the value, as it would round
  // on the panel, needs more than the 7 digit cells at this axis's dP resolution,
  // show the all-dashes indicator instead of growing past the physical panel. This
  // catches the radius→diameter ×2 re-scale of an already-stored value (US-047's
  // entry-time clamp can't, since nothing was keyed) and any other derived overflow
  // (e.g. a connected machine position jogged far out of range).
  const decimals = axisDisplayDecimals(axis, context.nvMem);
  const rounded = Number(Math.abs(displayed).toFixed(decimals));
  if (rounded > maxDisplayableMagnitude(decimals)) {
    return DISPLAY_OVERFLOW_TEXT;
  }
  return displayed;
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

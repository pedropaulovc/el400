/**
 * Display Computation Utilities
 *
 * Pure utility functions for computing display values from DRO state.
 * Handles abs/inc mode, connected vs manual positioning, and unit conversion.
 */

import type { Axis, VolatileMemoryState } from '../../../types/volatileMemory';
import type { NonVolatileMemory } from '../../../types/nonVolatileMemory';
import type { DROReducerContext } from '../types';
import { fromMmToAnyUnit } from '../../../utils/unitConversion';

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
 * @returns Display value in the user's preferred unit
 */
export function computeDisplayPosition(
  axis: Axis,
  vMem: VolatileMemoryState,
  context: DROReducerContext
): number {
  const rawMm = computeAxisPositionMm(axis, vMem, context);
  // Counting direction is a display-only transform applied AFTER datum subtraction;
  // it never mutates stored machine position, offsets, or macro coordinate math.
  const signed = rawMm * directionSign(axis, context.nvMem);
  // Angular (rotary) axes read an ANGLE: the raw position is degrees, wrapped to
  // [0, 360) and NOT unit-converted (US-040, AC 40.4). Linear axes unit-convert.
  if (context.nvMem.countingMode[axis] === 'angular') {
    return wrapDegrees(signed);
  }
  return fromMmToAnyUnit(signed, context.nvMem.defaultUnit);
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

/**
 * Volatile memory types - DRO runtime state that is lost on refresh.
 */

/**
 * Axis values for X, Y, Z
 */
export interface AxisValues {
  X: number;
  Y: number;
  Z: number;
}

export type Axis = 'X' | 'Y' | 'Z';
export type DatumMode = 'abs' | 'inc';

/**
 * DRO volatile memory - runtime state managed by VolatileMemoryContext
 * Note: Boot stage is now managed by DROModeContext
 */
export interface VolatileMemory {
  displayValues: AxisValues;
  absolute: AxisValues;
  incremental: AxisValues;
  mode: DatumMode;
  workOffsets: AxisValues;
  activeAxis: Axis | null;
  /** Input buffer for keypad digit accumulation */
  inputBuffer: string;
}

/**
 * Actions for modifying volatile memory
 * Note: clearKeyPressed is now handled by DROModeContext
 */
export interface VolatileMemoryActions {
  toggleMode: () => void;
  setMode: (mode: DatumMode) => void;
  zeroAxis: (axis: Axis) => void;
  zeroAll: () => void;
  setAxisValue: (axis: Axis, value: number) => void;
  selectAxis: (axis: Axis | null) => void;
  halfAxis: (axis: Axis) => void;
  /** Append a digit (0-9) to the input buffer */
  appendDigit: (digit: string) => void;
  /** Append a decimal point (if not already present) */
  appendDecimal: () => void;
  /** Toggle the sign (positive/negative) of the input buffer */
  toggleSign: () => void;
  /** Clear the input buffer */
  clearBuffer: () => void;
  /** Get the buffer value as a number (or null if empty/invalid) */
  getBufferValue: () => number | null;
}

export const ZERO_AXIS_VALUES: AxisValues = { X: 0, Y: 0, Z: 0 };

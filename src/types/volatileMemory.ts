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
export type BootStage = 'showMessage' | 'run';

/**
 * Function mode for center finding and other special functions
 */
export type FunctionMode =
  | 'normal'          // Normal DRO operation
  | 'centerMenu'      // Showing "CEntrE" menu
  | 'centerLine'      // Line center finding mode - collecting 2 points
  | 'centerCircle';   // Circle center finding mode - collecting 3 points

/**
 * Stored point for center finding
 */
export interface StoredPoint {
  X: number;
  Y: number;
  Z: number;
}

/**
 * Center finding state
 */
export interface CenterFindingState {
  mode: FunctionMode;
  storedPoints: StoredPoint[];
  centerResult: AxisValues | null;
}

/**
 * DRO volatile memory - runtime state managed by VolatileMemoryContext
 */
export interface VolatileMemory {
  displayValues: AxisValues;
  absolute: AxisValues;
  incremental: AxisValues;
  mode: DatumMode;
  workOffsets: AxisValues;
  activeAxis: Axis | null;
  bootStage: BootStage;
  centerFinding: CenterFindingState;
}

/**
 * Actions for modifying volatile memory
 */
export interface VolatileMemoryActions {
  toggleMode: () => void;
  setMode: (mode: DatumMode) => void;
  zeroAxis: (axis: Axis) => void;
  zeroAll: () => void;
  setAxisValue: (axis: Axis, value: number) => void;
  selectAxis: (axis: Axis | null) => void;
  halfAxis: (axis: Axis) => void;
  clearKeyPressed: () => void;
  // Center finding actions
  enterFunctionMode: () => void;
  selectCenterLine: () => void;
  selectCenterCircle: () => void;
  storePoint: () => void;
  exitFunctionMode: () => void;
  navigateMenu: (direction: 'next' | 'prev') => void;
}

export const ZERO_AXIS_VALUES: AxisValues = { X: 0, Y: 0, Z: 0 };

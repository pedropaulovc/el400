/**
 * Volatile memory types - DRO runtime state that is lost on refresh.
 */

import type { MachinePosition, ProbeState, ControllerType } from './machineState';

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
export type BootStage = 'boot' | 'showMessage' | 'run';

/**
 * Unified volatile memory - combines machine state and DRO memory
 */
export interface VolatileMemory {
  // Machine state (from MachineStateContext)
  machinePosition: MachinePosition;
  workPosition?: MachinePosition;
  probe: ProbeState;
  connected: boolean;
  controllerType: ControllerType;

  // DRO memory (internal)
  displayValues: AxisValues;
  absolute: AxisValues;
  incremental: AxisValues;
  mode: DatumMode;
  workOffsets: AxisValues;
  activeAxis: Axis | null;
  bootStage: BootStage;
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
}

export const ZERO_AXIS_VALUES: AxisValues = { X: 0, Y: 0, Z: 0 };

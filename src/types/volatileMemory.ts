/**
 * Volatile memory types - runtime state that is lost on refresh.
 * Combines machine state (from adapters) and DRO memory (internal state).
 */

/**
 * 3-axis position coordinates
 */
export interface MachinePosition {
  x: number;
  y: number;
  z: number;
}

/**
 * Probe state using CNCjs pin state format.
 * The pinState string contains flag characters indicating active inputs:
 * - 'P' = Probe triggered
 * - 'X', 'Y', 'Z' = Limit switches
 * - 'D' = Door switch
 * - 'H' = Homing switch
 * - 'R' = Reset
 * - 'S' = Safety door
 *
 * Examples: '', 'P', 'XP', 'XYZPD'
 */
export interface ProbeState {
  /** Raw pin state string from controller (e.g., 'P', 'XP', 'XYZPD') */
  pinState: string;
  /** Convenience boolean: true if pinState includes 'P' */
  triggered: boolean;
}

/**
 * Supported controller types
 */
export type ControllerType = 'cncjs' | 'linuxcnc' | 'mock' | 'manual';

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
 * Machine state from adapter (internal use)
 * This is what adapters return - kept for adapter interface compatibility
 */
export interface MachineState {
  /** Absolute machine coordinates */
  position: MachinePosition;
  /** Work coordinates (if available from controller) */
  workPosition?: MachinePosition;
  /** Probe input state */
  probe: ProbeState;
  /** Whether the adapter is connected to the data source */
  connected: boolean;
  /** Type of controller providing the data */
  controllerType: ControllerType;
}

/**
 * Callback type for machine state updates
 */
export interface MachineStateListener {
  (state: MachineState): void;
}

/**
 * Configuration for data source connection
 */
export interface DataSourceConfig {
  type: ControllerType;
  host: string;
  port: number;
}

/**
 * Unified volatile memory - combines machine state and DRO memory
 */
export interface VolatileMemory {
  // Machine state (from adapter)
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

/**
 * Helper to create a ProbeState from a pin state string
 */
export function createProbeState(pinState: string = ''): ProbeState {
  return {
    pinState,
    triggered: pinState.includes('P'),
  };
}

/**
 * Creates a default/initial machine state
 */
export function createDefaultMachineState(controllerType: ControllerType = 'manual'): MachineState {
  return {
    position: { x: 0, y: 0, z: 0 },
    probe: createProbeState(''),
    connected: false,
    controllerType,
  };
}

export const ZERO_AXIS_VALUES: AxisValues = { X: 0, Y: 0, Z: 0 };

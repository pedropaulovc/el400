/**
 * Machine state types - data from external machine adapters.
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
 * Machine state from adapter
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
  sessionId?: string;
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

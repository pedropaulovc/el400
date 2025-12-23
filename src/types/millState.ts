/**
 * Mill state types - data from external mill connections.
 */

/**
 * 3-axis position coordinates
 */
export interface MillPosition {
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
export type ControllerType = 'cncjs' | 'linuxcnc' | 'mock' | 'debug' | 'noop';

/**
 * Mill state from connection
 */
export interface MillState {
  /** Absolute machine coordinates */
  position: MillPosition;
  /** Work coordinates (if available from controller) */
  workPosition?: MillPosition;
  /** Probe input state */
  probe: ProbeState;
  /** Whether the connection is connected to the data source */
  connected: boolean;
  /** Type of controller providing the data */
  controllerType: ControllerType;
}

/**
 * Callback type for mill state updates
 */
export type MillStateListener = (state: MillState) => void;

/**
 * Configuration for data source connection
 */
export interface DataSourceConfig {
  type: ControllerType;
  host: string;
  port: number;
  sessionId?: string | undefined;
}

/**
 * Helper to create a ProbeState from a pin state string
 */
export function createProbeState(pinState = ''): ProbeState {
  return {
    pinState,
    triggered: pinState.includes('P'),
  };
}

/**
 * Creates a default/initial mill state
 */
export function createDefaultMillState(controllerType: ControllerType = 'noop'): MillState {
  return {
    position: { x: 0, y: 0, z: 0 },
    probe: createProbeState(''),
    connected: false,
    controllerType,
  };
}

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
 * Per-axis encoder signal state (US-042). `'ok'` is a valid live encoder;
 * `'lost'` means the scale's signal dropped — the cable disconnected or was
 * damaged (manual section 6.2, note *2). Drives the `no SIG` warning when the
 * Encoder-Fail (`EnF`) parameter is enabled. Modeled as a string enum rather
 * than a boolean so future fault kinds (e.g. 'degraded') can be added.
 */
export type EncoderSignalState = 'ok' | 'lost';

/** Per-axis encoder signal state. */
export interface EncoderSignalByAxis {
  X: EncoderSignalState;
  Y: EncoderSignalState;
  Z: EncoderSignalState;
}

/** Default encoder signal: all axes reporting a valid signal. */
export const DEFAULT_ENCODER_SIGNAL: EncoderSignalByAxis = {
  X: 'ok',
  Y: 'ok',
  Z: 'ok',
};

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
  /** Per-axis encoder signal state - drives the `no SIG` warning (US-042) */
  encoderSignal: EncoderSignalByAxis;
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
    encoderSignal: { ...DEFAULT_ENCODER_SIGNAL },
  };
}

/**
 * CNCjs WebSocket adapter for receiving machine state.
 * Supports all CNCjs controllers: GRBL, GrblHAL, TinyG, Smoothie, Marlin.
 */

import { io, type CncjsSocket } from './cncjsSocket';
import type { Dispatch } from 'react';
import type { MillAdapter } from './MillAdapter';
import type {
  MillStateListener,
  MillState,
  MillPosition,
  EncoderSignalByAxis,
  EncoderSignalState,
} from '../types/millState';
import type { DROEventPayload } from '../stores/dro/droStateMachine';
import { createProbeState, createDefaultMillState, DEFAULT_ENCODER_SIGNAL } from '../types/millState';

export interface CncjsMillAdapterOptions {
  host: string;
  port: number;
  token?: string | undefined;
  sessionId?: string | undefined;
  /**
   * Serial port to open/join (e.g. /dev/ttyUSB0). When omitted, the adapter
   * discovers ports via the CNCjs `list` command and joins the one in use.
   * Joining the port room is required: CNCjs only forwards controller:state
   * events to sockets that have opened the port.
   */
  serialport?: string | undefined;
}

export type CncjsControllerType = 'Grbl' | 'grbl' | 'GrblHAL' | 'grblhal' | 'TinyG' | 'tinyg' | 'Smoothie' | 'smoothie' | 'Marlin' | 'marlin';

/** Raw controller state from CNCjs WebSocket - structure varies by controller type */
interface CncjsControllerState {
  status?: {
    /** [x, y, z] array, or {x, y, z} object with string values (CNCjs 1.x) */
    mpos?: (number | string)[] | Record<string, number | string>;
    /** [x, y, z] array, or {x, y, z} object with string values (CNCjs 1.x) */
    wpos?: (number | string)[] | Record<string, number | string>;
    pn?: string;
    /** Triggered input pins, e.g. 'P' - field name used by CNCjs 1.x Grbl */
    pinState?: string;
    pos?: { x?: number; y?: number; z?: number };
    substate?: { probe?: number };
  };
  sr?: {
    posx?: number;
    posy?: number;
    posz?: number;
    prb?: number;
  };
  /**
   * Per-axis encoder signal state (US-042). The real device surfaces a scale
   * dropout as the `no SIG` measuring-system error; GRBL controllers do not
   * model this natively, so when a connected source reports it (e.g. a DRO-aware
   * gateway or the simulator's mock server) it is carried here and normalized
   * into MillState.encoderSignal. Absent on stock controllers (treated as 'ok').
   */
  encoderSignal?: Partial<Record<'X' | 'Y' | 'Z', EncoderSignalState>>;
}

/**
 * Normalizes an optional per-axis encoder-signal report into a full
 * EncoderSignalByAxis, defaulting any unreported axis to 'ok' (US-042).
 */
function normalizeEncoderSignal(
  signal: CncjsControllerState['encoderSignal']
): EncoderSignalByAxis {
  if (!signal) return { ...DEFAULT_ENCODER_SIGNAL };
  return {
    X: signal.X ?? 'ok',
    Y: signal.Y ?? 'ok',
    Z: signal.Z ?? 'ok',
  };
}

/**
 * Converts a CNCjs position report to MillPosition. CNCjs 1.x sends
 * {x, y, z} objects with string values; the DRO-aware mock server sends
 * [x, y, z] number arrays. Both are supported.
 */
function toMillPosition(
  value: (number | string)[] | Record<string, number | string> | undefined
): MillPosition {
  if (!value) {
    return { x: 0, y: 0, z: 0 };
  }
  if (Array.isArray(value)) {
    return {
      x: Number(value[0] ?? 0),
      y: Number(value[1] ?? 0),
      z: Number(value[2] ?? 0),
    };
  }
  return {
    x: Number(value['x'] ?? 0),
    y: Number(value['y'] ?? 0),
    z: Number(value['z'] ?? 0),
  };
}

/**
 * Normalizes GRBL controller state to MillState.
 * Position arrives as [x, y, z] arrays or {x, y, z} objects depending on the
 * source; triggered pins arrive in 'pn' or 'pinState' (CNCjs 1.x).
 */
function normalizeGrbl(state: CncjsControllerState): Partial<MillState> {
  const wpos = state.status?.wpos;
  const pn = state.status?.pn ?? state.status?.pinState ?? '';

  const result: Partial<MillState> = {
    position: toMillPosition(state.status?.mpos),
    probe: createProbeState(pn),
    encoderSignal: normalizeEncoderSignal(state.encoderSignal),
  };

  if (wpos) {
    result.workPosition = toMillPosition(wpos);
  }

  return result;
}

/**
 * Normalizes GrblHAL controller state to MillState.
 * GrblHAL extends GRBL with substate for detailed pin states.
 */
function normalizeGrblHAL(state: CncjsControllerState): Partial<MillState> {
  const base = normalizeGrbl(state);

  // GrblHAL may have substate with probe value (0=open, 1=triggered, 2=latched, 3=alarm)
  const substate = state.status?.substate;
  if (substate && typeof substate.probe === 'number') {
    const triggered = substate.probe > 0;
    base.probe = createProbeState(triggered ? 'P' : '');
  }

  return base;
}

/**
 * Normalizes TinyG/g2core controller state to MillState.
 * TinyG uses individual position properties (posx, posy, posz) and prb for probe.
 */
function normalizeTinyG(state: CncjsControllerState): Partial<MillState> {
  const sr = state.sr ?? {};
  const prb = sr.prb;
  const pinState = prb ? 'P' : '';

  return {
    position: {
      x: sr.posx ?? 0,
      y: sr.posy ?? 0,
      z: sr.posz ?? 0,
    },
    probe: createProbeState(pinState),
  };
}

/**
 * Normalizes Smoothie controller state to MillState.
 * Smoothie uses pos object with x, y, z properties.
 * Note: Smoothie does NOT expose realtime probe state.
 */
function normalizeSmoothie(state: CncjsControllerState): Partial<MillState> {
  const pos = state.status?.pos ?? { x: 0, y: 0, z: 0 };

  return {
    position: {
      x: pos.x ?? 0,
      y: pos.y ?? 0,
      z: pos.z ?? 0,
    },
    probe: createProbeState(''), // Smoothie doesn't expose probe state
  };
}

/**
 * Normalizes Marlin controller state to MillState.
 * Marlin uses pos object with x, y, z properties.
 * Note: Marlin does NOT stream probe state continuously.
 */
function normalizeMarlin(state: CncjsControllerState): Partial<MillState> {
  const pos = state.status?.pos ?? { x: 0, y: 0, z: 0 };

  return {
    position: {
      x: pos.x ?? 0,
      y: pos.y ?? 0,
      z: pos.z ?? 0,
    },
    probe: createProbeState(''), // Marlin doesn't stream probe state
  };
}

/**
 * Normalizes controller state based on controller type.
 */
export function normalizeControllerState(
  controllerType: string,
  state: CncjsControllerState
): Partial<MillState> {
  const type = controllerType.toLowerCase();

  switch (type) {
    case 'grbl':
      return normalizeGrbl(state);
    case 'grblhal':
      return normalizeGrblHAL(state);
    case 'tinyg':
    case 'g2core':
      return normalizeTinyG(state);
    case 'smoothie':
      return normalizeSmoothie(state);
    case 'marlin':
      return normalizeMarlin(state);
    default:
      // Unknown controller - try GRBL-style parsing as fallback
      return normalizeGrbl(state);
  }
}

export class CncjsMillAdapter implements MillAdapter {
  readonly controllerType = 'cncjs' as const;

  private socket: CncjsSocket | null = null;
  private listeners = new Set<MillStateListener>();
  private dispatch: Dispatch<DROEventPayload> | null = null;
  private state: MillState = {
    ...createDefaultMillState(),
    controllerType: 'cncjs',
  };
  private options: CncjsMillAdapterOptions;
  private currentControllerType: CncjsControllerType = 'grbl';
  private discoveryTimer: ReturnType<typeof setInterval> | null = null;
  private portJoined = false;

  constructor(options: CncjsMillAdapterOptions) {
    this.options = options;
  }

  setDispatch(dispatch: Dispatch<DROEventPayload> | null): void {
    this.dispatch = dispatch;
  }

  /**
   * Builds the socket.io URL.
   * - Empty host: connect to the page's own origin (same-origin custom
   *   widget served via `cncjs --mount`; works behind https proxies).
   * - Host with scheme (http:// or https://): treated as a full origin. The
   *   port is appended only if the origin does not already carry one, so a
   *   value like `https://cncjs.example.com:443` is used verbatim.
   * - Bare host: legacy behavior, http://host:port.
   */
  private buildUrl(): string {
    const { host, port } = this.options;
    if (!host) {
      return typeof window !== 'undefined' ? window.location.origin : `http://localhost:${String(port)}`;
    }
    if (host.includes('://')) {
      // Already a port in the authority (e.g. ":8000", but not the "://" scheme)?
      const authority = host.slice(host.indexOf('://') + 3);
      const hasPort = /:\d+(?:\/|$)/.test(authority);
      return hasPort ? host : `${host}:${String(port)}`;
    }
    return `http://${host}:${String(port)}`;
  }

  async connect(): Promise<void> {
    const { token, sessionId } = this.options;
    const url = this.buildUrl();

    return new Promise((resolve, reject) => {
      const query: Record<string, string> = {};
      if (token) query['token'] = token;
      if (sessionId) query['sessionId'] = sessionId;

      this.socket = io(url, {
        query,
        reconnection: true,
        // A DRO must keep trying: losing the readout on a transient network
        // blip is worse than a little reconnect traffic.
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        // Prefer websocket: long-polling is unreliable behind buffering
        // https proxies/tunnels (requests get cut and the server times the
        // session out every pingInterval+pingTimeout).
        transports: ['websocket', 'polling'],
      });

      const connectTimeout = setTimeout(() => {
        this.socket?.disconnect();
        reject(new Error('Connection timeout'));
      }, 10000);

      this.socket.on('connect', () => {
        clearTimeout(connectTimeout);
        this.updateState({ connected: true });
        // Fires on reconnects too: the new server-side socket has no room
        // membership, so always rediscover and re-join the port.
        this.portJoined = false;
        this.stopPortDiscovery();
        this.startPortDiscovery();
        resolve();
      });

      this.socket.on('disconnect', () => {
        this.updateState({ connected: false });
      });

      this.socket.on('connect_error', (error: unknown) => {
        clearTimeout(connectTimeout);
        this.updateState({ connected: false });
        reject(error instanceof Error ? error : new Error(String(error)));
      });

      // Controller state updates
      this.socket.on('controller:state', (type: string, controllerState: CncjsControllerState) => {
        this.currentControllerType = type as CncjsControllerType;
        const normalized = normalizeControllerState(type, controllerState);
        this.updateState({
          ...normalized,
          connected: true,
        });
      });

      // Serial port open event indicates connection to controller
      this.socket.on('serialport:open', () => {
        this.updateState({ connected: true });
      });

      // Serial port close event
      this.socket.on('serialport:close', () => {
        this.updateState({ connected: false });
        // Port closed (e.g. from the CNCjs UI); resume discovery so we
        // re-join when it reopens.
        this.portJoined = false;
        this.startPortDiscovery();
      });

      // Port discovery: pick the port already in use, or the explicit one.
      this.socket.on('serialport:list', (ports: { port: string; inuse?: boolean }[]) => {
        if (this.portJoined || !Array.isArray(ports) || ports.length === 0) return;
        // Only join a port that is already open by another client (the active
        // controller). Never auto-open an idle port: we don't know its
        // controller type or baud rate, and doing so would start a connection
        // the user never asked for. To target a specific idle port, pass it
        // explicitly via the `serialport` option.
        const inUse = ports.find((p) => p.inuse);
        if (inUse) {
          this.tryOpenPort(inUse.port);
        }
      });
    });
  }

  /**
   * Joins the controller's socket room by issuing an `open` for the port.
   * CNCjs adds this socket to the controller's connections, after which
   * controller:state updates stream to us. If the port is already open
   * (e.g. opened from the CNCjs UI), this is a pure join with no side effects.
   */
  private tryOpenPort(port: string): void {
    if (this.portJoined || !this.socket) return;
    this.socket.emit(
      'open',
      port,
      { controllerType: 'Grbl', baudrate: 115200 },
      (err: unknown) => {
        if (!err) {
          this.portJoined = true;
          this.stopPortDiscovery();
          this.updateState({ connected: true });
        }
      }
    );
  }

  private startPortDiscovery(): void {
    if (!this.socket || this.discoveryTimer !== null) return;
    const { serialport } = this.options;

    const probe = (): void => {
      if (this.portJoined || !this.socket) {
        this.stopPortDiscovery();
        return;
      }
      if (serialport) {
        this.tryOpenPort(serialport);
      } else {
        this.socket.emit('list');
      }
    };

    probe();
    this.discoveryTimer = setInterval(probe, 2000);
  }

  private stopPortDiscovery(): void {
    if (this.discoveryTimer !== null) {
      clearInterval(this.discoveryTimer);
      this.discoveryTimer = null;
    }
  }

  disconnect(): void {
    this.stopPortDiscovery();
    this.portJoined = false;
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.updateState({ connected: false });
  }

  subscribe(listener: MillStateListener): () => void {
    this.listeners.add(listener);
    // Immediately notify with current state
    listener(this.state);

    return () => {
      this.listeners.delete(listener);
    };
  }

  getState(): MillState {
    return this.state;
  }

  getCurrentControllerType(): CncjsControllerType {
    return this.currentControllerType;
  }

  private updateState(partial: Partial<MillState>): void {
    this.state = {
      ...this.state,
      ...partial,
    };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
    if (this.dispatch) {
      this.dispatch({ eventName: 'MILL_STATE_CHANGED' });
    }
  }
}

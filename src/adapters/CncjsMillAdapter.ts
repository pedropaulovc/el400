/**
 * CNCjs WebSocket readout adapter with controller-confirmed GRBL unit control.
 * Other controller normalizers retain their existing readout-only behavior.
 */

import { io, type CncjsSocket } from './cncjsSocket';
import type { Dispatch } from 'react';
import type { MillAdapter } from './MillAdapter';
import type {
  MillStateListener,
  MillState,
  MillPosition,
  MillUnit,
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
  parserstate?: { modal?: { units?: string; wcs?: string } };
  status?: {
    activeState?: string;
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
  private joinedPort: string | null = null;
  private joiningPort: string | null = null;
  private connectionEpoch = 0;
  private socketConnected = false;
  private workflow: string | null = null;
  private activeState: string | null = null;
  private confirmedUnit: MillUnit | null = null;
  private pendingUnit: MillUnit | null = null;
  private unitRequest: {
    resolve: () => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  } | null = null;
  private activeWcs: string | null = null;
  private workRequest: {
    id: string;
    phase: 'queued' | 'confirming';
    target: Partial<MillPosition>;
    wcs: string;
    resolve: () => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  } | null = null;
  private workRequestSequence = 0;
  private readonly requestNamespace = `${String(Date.now())}-${String(Math.random())}`;
  private reportError: string | null = null;
  private reportDeadline: ReturnType<typeof setTimeout> | null = null;
  private reportedSetting: string | null = null;
  private reportScale: number | null = null;
  private reportQueryNeeded = true;
  private reportQueryPending = false;
  private awaitingFreshStatus = false;
  private positionReady = false;
  private statusQueriesRemaining = 0;
  private statusQueryTimer: ReturnType<typeof setTimeout> | null = null;
  private options: CncjsMillAdapterOptions;
  private currentControllerType: CncjsControllerType | 'unknown' = 'unknown';
  private discoveryTimer: ReturnType<typeof setInterval> | null = null;
  private portJoined = false;

  constructor(options: CncjsMillAdapterOptions) {
    this.options = options;
    this.updateState({});
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
        this.resetController('CNCjs reconnected; unit request cancelled');
        this.socketConnected = true;
        this.stopPortDiscovery();
        this.startPortDiscovery();
        resolve();
      });

      this.socket.on('disconnect', () => {
        this.socketConnected = false;
        this.stopPortDiscovery();
        this.resetController('CNCjs disconnected before unit confirmation');
      });

      this.socket.on('connect_error', (error: unknown) => {
        clearTimeout(connectTimeout);
        this.socketConnected = false;
        this.resetController('CNCjs connection failed before unit confirmation');
        reject(error instanceof Error ? error : new Error(String(error)));
      });

      // Joining an already-open port replays settings/state before its callback.
      this.socket.on('controller:state', (type: string, controllerState: CncjsControllerState) => {
        if (!this.socketConnected || (!this.joinedPort && !this.joiningPort)) return;
        this.currentControllerType = type as CncjsControllerType;
        const normalized = normalizeControllerState(type, controllerState);
        if (type.toLowerCase() === 'grbl') {
          this.activeState = controllerState.status?.activeState ?? null;
          const units = controllerState.parserstate?.modal?.units;
          this.confirmedUnit = units === 'G20' ? 'inch' : units === 'G21' ? 'mm' : null;
          this.activeWcs = controllerState.parserstate?.modal?.wcs ?? null;
          if (this.workRequest && this.workRequest.wcs !== this.activeWcs) {
            this.finishWorkRequest(new Error('Active work coordinate system changed while awaiting confirmation'));
          }
          if (this.pendingUnit !== null && this.confirmedUnit === this.pendingUnit) {
            this.finishUnitRequest();
          }
          // A modal-only snapshot includes cached raw coordinates. Only a fresh,
          // explicitly requested status can establish a new $13 scale boundary.
          if (!this.positionReady || this.reportScale === null) {
            delete normalized.position;
            delete normalized.workPosition;
          } else {
            if (normalized.position) normalized.position = this.scalePosition(normalized.position);
            if (normalized.workPosition) normalized.workPosition = this.scalePosition(normalized.workPosition);
          }
        } else {
          this.confirmedUnit = null;
          this.finishUnitRequest(new Error('Unit control is supported only for GRBL'));
          this.finishWorkRequest(new Error('Native work-coordinate control is supported only for GRBL'));
        }
        this.updateState(normalized);
        this.requestReportBoundary();
      });

      this.socket.on('controller:settings', (type: string, settings: { settings?: Record<string, unknown> }) => {
        if (!this.socketConnected || (!this.joinedPort && !this.joiningPort) || type.toLowerCase() !== 'grbl') return;
        this.currentControllerType = type as CncjsControllerType;
        const setting = String(settings.settings?.['$13']);
        const known = setting === '0' || setting === '1' ? setting : null;
        if (known !== this.reportedSetting) {
          this.reportedSetting = known;
          this.positionReady = false;
          this.cancelStatusQuery();
          this.reportScale = null;
          this.awaitingFreshStatus = false;
          this.reportQueryNeeded = true;
          this.updateState({});
          this.requestReportBoundary();
        }
      });

      this.socket.on('workflow:state', (workflow: string) => {
        if (!this.socketConnected || (!this.joinedPort && !this.joiningPort)) return;
        this.workflow = workflow;
        this.updateState({});
        this.requestReportBoundary();
      });

      this.socket.on('serialport:read', (line: string) => {
        this.handleSerialRead(line);
      });

      this.socket.on('serialport:write', (line: string, context?: { el400WorkRequest?: string }) => {
        const request = this.workRequest;
        if (!request || request.phase !== 'queued' || context?.el400WorkRequest !== request.id || line.trim() !== '$G') return;
        // The feeder sends this marker only after advancing past G10. Querying
        // realtime status at initial emit could overtake the buffered G10.
        request.phase = 'confirming';
        this.statusQueriesRemaining = 10;
        this.queryFreshStatus();
      });

      // Port announcements alone do not establish room membership or readiness.
      this.socket.on('serialport:open', () => {
        if (!this.portJoined) this.startPortDiscovery();
      });

      this.socket.on('serialport:close', (info?: { port?: string }) => {
        if (info?.port && info.port !== (this.joinedPort ?? this.joiningPort)) return;
        this.resetController('Serial port closed before unit confirmation');
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
    if (this.portJoined || this.joiningPort || !this.socket || !this.socketConnected) return;
    const epoch = this.connectionEpoch;
    this.joiningPort = port;
    this.socket.emit(
      'open',
      port,
      { controllerType: 'Grbl', baudrate: 115200 },
      (err: unknown) => {
        if (epoch !== this.connectionEpoch || !this.socketConnected) return;
        this.joiningPort = null;
        if (!err) {
          this.portJoined = true;
          this.joinedPort = port;
          this.stopPortDiscovery();
          this.updateState({ connected: true });
          this.requestReportBoundary();
        }
      }
    );
  }

  private startPortDiscovery(): void {
    if (!this.socket || !this.socketConnected || this.discoveryTimer !== null) return;
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
    this.socketConnected = false;
    this.stopPortDiscovery();
    this.resetController('CNCjs disconnected before unit confirmation');
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
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

  getCurrentControllerType(): CncjsControllerType | 'unknown' {
    return this.currentControllerType;
  }

  requestUnits(unit: MillUnit): Promise<void> {
    if (this.state.unitControl?.availability !== 'ready' || !this.socket || !this.joinedPort) {
      return Promise.reject(new Error('Unit change unavailable: connect an idle GRBL controller with known units'));
    }
    if (unit === this.confirmedUnit) return Promise.resolve();
    return new Promise((resolve, reject) => {
      this.pendingUnit = unit;
      this.unitRequest = {
        resolve,
        reject,
        timer: setTimeout(() => {
          this.finishUnitRequest(new Error('Controller did not confirm units within 5 seconds'));
          this.updateState({});
        }, 5000),
      };
      this.updateState({});
      // This native command has no execution ACK. Never infer success from emit.
      this.socket?.emit('command', this.joinedPort, 'gcode', unit === 'inch' ? 'G20' : 'G21');
    });
  }

  requestWorkPosition(position: Partial<MillPosition>): Promise<void> {
    if (this.state.workPositionControl?.availability !== 'ready' || !this.socket ||
        !this.joinedPort || !this.activeWcs || !this.confirmedUnit) {
      return Promise.reject(new Error('Work-coordinate change unavailable: wait for an idle GRBL controller and fresh coordinates'));
    }
    const target: Partial<MillPosition> = {};
    const words: string[] = [];
    for (const axis of ['x', 'y', 'z'] as const) {
      const value = position[axis];
      if (value === undefined) continue;
      if (!Number.isFinite(value)) return Promise.reject(new Error('Work coordinates must be finite'));
      target[axis] = value;
      const commandValue = this.confirmedUnit === 'inch' ? value / 25.4 : value;
      words.push(`${axis.toUpperCase()}${String(Number(commandValue.toFixed(6)))}`);
    }
    if (words.length === 0) return Promise.reject(new Error('Select at least one work-coordinate axis'));
    const wcs = this.activeWcs;
    // GRBL G10 L20 subtracts G92 and tool-length offsets itself. Capturing the
    // actual modal WCS avoids silently writing G54 or execution-time P0.
    const p = Number(wcs.slice(1)) - 53;
    const id = `${this.requestNamespace}-${String(++this.workRequestSequence)}`;
    return new Promise((resolve, reject) => {
      this.workRequest = {
        id, phase: 'queued', target, wcs, resolve, reject,
        timer: setTimeout(() => {
          this.finishWorkRequest(new Error('Controller did not confirm work coordinates within 5 seconds'));
          this.updateState({});
        }, 5000),
      };
      this.updateState({});
      this.socket?.emit('command', this.joinedPort, 'gcode', `G10 L20 P${String(p)} ${words.join(' ')}`);
      // The native feeder preserves command order. Its marker write is not
      // success: only a fresh raw coordinate report can satisfy the target.
      this.socket?.emit('command', this.joinedPort, 'gcode', '$G', { el400WorkRequest: id });
    });
  }

  private matchesWorkTarget(position: MillPosition, target: Partial<MillPosition>): boolean {
    // GRBL status resolution: 0.001 mm or 0.0001 inch, independent of G20/G21.
    const tolerance = this.reportScale === 25.4 ? 0.00254 : 0.001;
    return (['x', 'y', 'z'] as const).every((axis) =>
      target[axis] === undefined || Math.abs(position[axis] - target[axis]) <= tolerance);
  }

  private finishWorkRequest(error?: Error): void {
    const request = this.workRequest;
    this.workRequest = null;
    if (!request) return;
    if (request.phase === 'confirming' && !this.awaitingFreshStatus) this.cancelStatusQuery();
    clearTimeout(request.timer);
    if (error) request.reject(error);
    else request.resolve();
  }

  private finishUnitRequest(error?: Error): void {
    const request = this.unitRequest;
    this.unitRequest = null;
    this.pendingUnit = null;
    if (!request) return;
    clearTimeout(request.timer);
    if (error) request.reject(error);
    else request.resolve();
  }

  private resetController(reason: string): void {
    this.connectionEpoch++;
    this.finishUnitRequest(new Error(reason));
    this.finishWorkRequest(new Error(reason));
    this.activeWcs = null;
    this.reportError = null;
    clearTimeout(this.reportDeadline ?? undefined);
    this.reportDeadline = null;
    this.portJoined = false;
    this.joinedPort = null;
    this.joiningPort = null;
    this.currentControllerType = 'unknown';
    this.workflow = null;
    this.activeState = null;
    this.confirmedUnit = null;
    this.reportedSetting = null;
    this.reportScale = null;
    this.reportQueryNeeded = true;
    this.reportQueryPending = false;
    this.awaitingFreshStatus = false;
    this.positionReady = false;
    this.cancelStatusQuery();
    this.updateState({ connected: false });
  }

  private scalePosition(position: MillPosition): MillPosition {
    const scale = this.reportScale ?? 1;
    return { x: position.x * scale, y: position.y * scale, z: position.z * scale };
  }

  private requestReportBoundary(): void {
    if (!this.reportQueryNeeded || this.reportQueryPending || !this.joinedPort ||
        this.currentControllerType.toLowerCase() !== 'grbl' ||
        this.workflow !== 'idle' || this.activeState !== 'Idle') return;
    this.reportQueryNeeded = false;
    this.reportQueryPending = true;
    this.reportError = null;
    clearTimeout(this.reportDeadline ?? undefined);
    this.reportDeadline = setTimeout(() => {
      this.failReportBoundary('Fresh GRBL report units and work offset were not received within 5 seconds');
    }, 5000);
    // CNCjs updates cached $13 optimistically on writes. Read firmware settings
    // once, then establish a bounded fresh status/WCO boundary.
    this.socket?.emit('command', this.joinedPort, 'gcode', '$$');
  }

  private handleSerialRead(line: string): void {
    if (!this.socketConnected || !this.joinedPort || typeof line !== 'string') return;
    if (/^(?:error:|ALARM:)/i.test(line.trim())) {
      this.finishUnitRequest(new Error(`Controller reported ${line.trim()} while awaiting unit confirmation`));
      this.finishWorkRequest(new Error(`Controller reported ${line.trim()} while awaiting work-coordinate confirmation`));
      this.updateState({});
      return;
    }
    const setting = /^\$13=([01])(?:\s|$)/.exec(line.trim());
    if (setting && this.reportQueryPending) {
      this.reportQueryPending = false;
      this.reportQueryNeeded = false;
      this.reportedSetting = setting[1] ?? null;
      this.reportScale = setting[1] === '1' ? 25.4 : 1;
      this.awaitingFreshStatus = true;
      this.statusQueriesRemaining = 10;
      this.queryFreshStatus();
      return;
    }
    const confirmingWork = this.workRequest?.phase === 'confirming';
    if ((!this.awaitingFreshStatus && !confirmingWork) || this.reportScale === null || !/^<[^>]+>$/.test(line.trim())) return;
    const fields: Partial<Record<'MPos' | 'WPos' | 'WCO', MillPosition>> = {};
    for (const match of line.matchAll(/(?:\||,)(MPos|WPos|WCO):(-?[\d.]+),(-?[\d.]+),(-?[\d.]+)/g)) {
      const value = { x: Number(match[2]), y: Number(match[3]), z: Number(match[4]) };
      if (![value.x, value.y, value.z].every(Number.isFinite)) return;
      fields[match[1] as 'MPos' | 'WPos' | 'WCO'] = this.scalePosition(value);
    }
    let machine = fields.MPos;
    let work = fields.WPos;
    const wco = fields.WCO;
    // GRBL 0.9 reports paired MPos/WPos rather than WCO. Both forms establish
    // the same physical boundary without borrowing a cached controller offset.
    if (!machine && work && wco) {
      machine = { x: work.x + wco.x, y: work.y + wco.y, z: work.z + wco.z };
    }
    if (!work && machine && wco) {
      work = { x: machine.x - wco.x, y: machine.y - wco.y, z: machine.z - wco.z };
    }
    if (!machine || !work) {
      if (machine) this.updateState({ position: machine });
      this.scheduleFreshStatus();
      return;
    }
    this.awaitingFreshStatus = false;
    clearTimeout(this.reportDeadline ?? undefined);
    this.reportDeadline = null;
    this.reportError = null;
    // Native runner updates status before emitting this line. Socket FIFO means
    // subsequent composite snapshots cannot predate this explicit boundary.
    this.positionReady = true;
    if (confirmingWork && this.workRequest) {
      if (this.matchesWorkTarget(work, this.workRequest.target)) this.finishWorkRequest();
      else this.scheduleFreshStatus();
    } else {
      this.cancelStatusQuery();
    }
    this.updateState({ position: machine, workPosition: work });
  }

  private queryFreshStatus(): void {
    this.statusQueryTimer = null;
    if (!this.socketConnected || !this.joinedPort ||
        (!this.awaitingFreshStatus && this.workRequest?.phase !== 'confirming') || this.statusQueriesRemaining === 0) return;
    this.statusQueriesRemaining--;
    this.socket?.emit('write', this.joinedPort, '?');
  }

  private scheduleFreshStatus(): void {
    clearTimeout(this.statusQueryTimer ?? undefined);
    if (this.statusQueriesRemaining > 0) {
      this.statusQueryTimer = setTimeout(() => { this.queryFreshStatus(); }, 250);
    } else if (this.awaitingFreshStatus) {
      this.failReportBoundary('Fresh GRBL work offset was not received after 10 status requests');
    } else {
      this.finishWorkRequest(new Error('Controller did not confirm work coordinates after 10 status requests'));
      this.updateState({});
    }
  }

  private cancelStatusQuery(): void {
    clearTimeout(this.statusQueryTimer ?? undefined);
    this.statusQueryTimer = null;
    this.statusQueriesRemaining = 0;
  }

  private failReportBoundary(message: string): void {
    this.cancelStatusQuery();
    clearTimeout(this.reportDeadline ?? undefined);
    this.reportDeadline = null;
    this.reportQueryPending = false;
    this.awaitingFreshStatus = false;
    this.positionReady = false;
    this.reportError = message;
    this.finishWorkRequest(new Error(message));
    this.updateState({});
  }

  private updateState(partial: Partial<MillState>): void {
    this.state = {
      ...this.state,
      ...partial,
      unitControl: this.currentControllerType !== 'unknown' && this.currentControllerType.toLowerCase() !== 'grbl'
        ? { control: 'display', confirmed: null, pending: null, availability: 'unavailable' }
        : {
          control: 'controller',
          confirmed: this.confirmedUnit,
          pending: this.pendingUnit,
          availability: !(partial.connected ?? this.state.connected) || !this.joinedPort || this.confirmedUnit === null
            ? 'unavailable'
            : this.pendingUnit !== null || this.workRequest !== null || this.workflow !== 'idle' || this.activeState !== 'Idle'
              ? 'busy'
              : 'ready',
        },
    };
    if (this.state.unitControl?.control === 'controller') {
      this.state.workPositionControl = {
        availability: !this.positionReady || !this.activeWcs || !/^G5[4-9]$/.test(this.activeWcs)
          ? 'unavailable' : this.state.unitControl.availability,
        pending: this.workRequest?.target ?? null,
        error: this.reportError,
      };
    } else {
      delete this.state.workPositionControl;
    }
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

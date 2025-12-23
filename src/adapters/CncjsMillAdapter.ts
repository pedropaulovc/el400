/**
 * CNCjs WebSocket adapter for receiving machine state.
 * Supports all CNCjs controllers: GRBL, GrblHAL, TinyG, Smoothie, Marlin.
 */

import { io, Socket } from 'socket.io-client';
import type { Dispatch } from 'react';
import type { MillAdapter } from './MillAdapter';
import type { MillStateListener, MillState, MillPosition } from '../types/millState';
import type { DROEventPayload } from '../stores/dro/droStateMachine';
import { createProbeState, createDefaultMillState } from '../types/millState';
import { DebugServer } from '../debug/DebugServer';

export interface CncjsMillAdapterOptions {
  // Remote connection (existing)
  host?: string;
  port?: number;
  token?: string | undefined;
  sessionId?: string | undefined;

  // Local connection (new)
  localServer?: DebugServer;
}

export type CncjsControllerType = 'Grbl' | 'grbl' | 'GrblHAL' | 'grblhal' | 'TinyG' | 'tinyg' | 'Smoothie' | 'smoothie' | 'Marlin' | 'marlin';

/** Raw controller state from CNCjs WebSocket - structure varies by controller type */
interface CncjsControllerState {
  status?: {
    mpos?: number[];
    wpos?: number[];
    pn?: string;
    pos?: { x?: number; y?: number; z?: number };
    substate?: { probe?: number };
  };
  sr?: {
    posx?: number;
    posy?: number;
    posz?: number;
    prb?: number;
  };
}

/**
 * Normalizes GRBL controller state to MillState.
 * GRBL provides position as [x, y, z] arrays and pin state in 'pn' field.
 */
function normalizeGrbl(state: CncjsControllerState): Partial<MillState> {
  const mpos = state.status?.mpos ?? [0, 0, 0];
  const wpos = state.status?.wpos;
  const pn = state.status?.pn ?? '';

  const position: MillPosition = {
    x: mpos[0] ?? 0,
    y: mpos[1] ?? 0,
    z: mpos[2] ?? 0,
  };

  const result: Partial<MillState> = {
    position,
    probe: createProbeState(pn),
  };

  if (wpos) {
    result.workPosition = {
      x: wpos[0] ?? 0,
      y: wpos[1] ?? 0,
      z: wpos[2] ?? 0,
    };
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

  private socket: Socket | null = null;
  private localServer: DebugServer | null = null;
  private listeners = new Set<MillStateListener>();
  private dispatch: Dispatch<DROEventPayload> | null = null;
  private state: MillState = {
    ...createDefaultMillState(),
    controllerType: 'cncjs',
  };
  private options: CncjsMillAdapterOptions;
  private currentControllerType: CncjsControllerType = 'grbl';

  constructor(options: CncjsMillAdapterOptions) {
    this.options = options;
    this.localServer = options.localServer ?? null;
  }

  setDispatch(dispatch: Dispatch<DROEventPayload> | null): void {
    this.dispatch = dispatch;
  }

  private setupLocalConnection(): void {
    if (!this.localServer) {
      throw new Error('Local server not provided');
    }

    // Listen to local server events directly
    this.localServer.on('controller:state', (data: unknown) => {
      // Use GRBL normalization for local server (it follows GRBL format)
      const normalized = normalizeGrbl(data as CncjsControllerState);
      this.updateState({
        ...normalized,
        connected: true,
      });
    });

    // Immediately set connected state
    this.updateState({ connected: true });
  }

  async connect(): Promise<void> {
    // Local mode: connect to in-browser server
    if (this.localServer) {
      this.setupLocalConnection();
      return Promise.resolve();
    }

    // Remote mode: connect via Socket.IO (existing logic)
    const { host, port, token, sessionId } = this.options;
    if (!host || !port) {
      return Promise.reject(new Error('Host and port required for remote connection'));
    }
    const url = `http://${host}:${String(port)}`;

    return new Promise((resolve, reject) => {
      const query: Record<string, string> = {};
      if (token) query['token'] = token;
      if (sessionId) query['sessionId'] = sessionId;

      this.socket = io(url, {
        query,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      const connectTimeout = setTimeout(() => {
        this.socket?.disconnect();
        reject(new Error('Connection timeout'));
      }, 10000);

      this.socket.on('connect', () => {
        clearTimeout(connectTimeout);
        this.updateState({ connected: true });
        resolve();
      });

      this.socket.on('disconnect', () => {
        this.updateState({ connected: false });
      });

      this.socket.on('connect_error', (error) => {
        clearTimeout(connectTimeout);
        this.updateState({ connected: false });
        reject(error);
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
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    if (this.localServer) {
      // Ensure local server stops broadcasting and releases resources
      this.localServer.removeAllListeners('controller:state');
      this.localServer.destroy();
      this.localServer = null;
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

  /**
   * Get the local server instance (null if using remote connection)
   * Used by debug panel to access server controls
   */
  getLocalServer(): DebugServer | null {
    return this.localServer;
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

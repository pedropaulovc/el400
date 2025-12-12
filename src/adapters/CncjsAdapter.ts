/**
 * CNCjs WebSocket adapter for receiving machine state.
 * Supports all CNCjs controllers: GRBL, GrblHAL, TinyG, Smoothie, Marlin.
 */

import { io, Socket } from 'socket.io-client';
import type { MachineAdapter, MachineStateListener } from './MachineAdapter';
import type { MachineState, MachinePosition } from '../types/machine';
import { createProbeState, createDefaultMachineState } from '../types/machine';

export interface CncjsAdapterOptions {
  host: string;
  port: number;
  token?: string;
}

type CncjsControllerType = 'Grbl' | 'grbl' | 'GrblHAL' | 'grblhal' | 'TinyG' | 'tinyg' | 'Smoothie' | 'smoothie' | 'Marlin' | 'marlin';

/**
 * Normalizes GRBL controller state to MachineState.
 * GRBL provides position as [x, y, z] arrays and pin state in 'pn' field.
 */
function normalizeGrbl(state: any): Partial<MachineState> {
  const mpos = state.status?.mpos || [0, 0, 0];
  const wpos = state.status?.wpos;
  const pn = state.status?.pn || '';

  const position: MachinePosition = {
    x: mpos[0] ?? 0,
    y: mpos[1] ?? 0,
    z: mpos[2] ?? 0,
  };

  const result: Partial<MachineState> = {
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
 * Normalizes GrblHAL controller state to MachineState.
 * GrblHAL extends GRBL with substate for detailed pin states.
 */
function normalizeGrblHAL(state: any): Partial<MachineState> {
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
 * Normalizes TinyG/g2core controller state to MachineState.
 * TinyG uses individual position properties (posx, posy, posz) and prb for probe.
 */
function normalizeTinyG(state: any): Partial<MachineState> {
  const sr = state.sr || {};
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
 * Normalizes Smoothie controller state to MachineState.
 * Smoothie uses pos object with x, y, z properties.
 * Note: Smoothie does NOT expose realtime probe state.
 */
function normalizeSmoothie(state: any): Partial<MachineState> {
  const pos = state.status?.pos || { x: 0, y: 0, z: 0 };

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
 * Normalizes Marlin controller state to MachineState.
 * Marlin uses pos object with x, y, z properties.
 * Note: Marlin does NOT stream probe state continuously.
 */
function normalizeMarlin(state: any): Partial<MachineState> {
  const pos = state.status?.pos || { x: 0, y: 0, z: 0 };

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
  state: any
): Partial<MachineState> {
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

export class CncjsAdapter implements MachineAdapter {
  readonly controllerType = 'cncjs' as const;

  private socket: Socket | null = null;
  private listeners: Set<MachineStateListener> = new Set();
  private state: MachineState = {
    ...createDefaultMachineState(),
    controllerType: 'cncjs',
  };
  private options: CncjsAdapterOptions;
  private currentControllerType: string = 'grbl';

  constructor(options: CncjsAdapterOptions) {
    this.options = options;
  }

  async connect(): Promise<void> {
    const { host, port, token } = this.options;
    const url = `http://${host}:${port}`;

    return new Promise((resolve, reject) => {
      this.socket = io(url, {
        query: token ? { token } : {},
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
      this.socket.on('controller:state', (type: string, controllerState: any) => {
        this.currentControllerType = type;
        const normalized = normalizeControllerState(type, controllerState);
        this.updateState({
          ...normalized,
          connected: true,
        });
      });

      // Serial port open event indicates connection to controller
      this.socket.on('serialport:open', (options: any) => {
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
    this.updateState({ connected: false });
  }

  subscribe(listener: MachineStateListener): () => void {
    this.listeners.add(listener);
    // Immediately notify with current state
    listener(this.state);

    return () => {
      this.listeners.delete(listener);
    };
  }

  getState(): MachineState {
    return this.state;
  }

  private updateState(partial: Partial<MachineState>): void {
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
  }
}

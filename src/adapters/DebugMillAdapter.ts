/**
 * Debug adapter for in-browser demo mode.
 * Uses DebugServer to simulate a CNC controller entirely in the browser.
 */

import type { Dispatch } from 'react';
import type { MillAdapter } from './MillAdapter';
import type { MillStateListener, MillState } from '../types/millState';
import type { DROEventPayload } from '../stores/dro/droStateMachine';
import { createDefaultMillState, createProbeState } from '../types/millState';
import { DebugServer } from '../debug/DebugServer';

/** Raw controller state from DebugServer */
interface DebugControllerState {
  status?: {
    mpos?: number[];
    wpos?: number[];
    pn?: string;
  };
  probe?: {
    pinState: string;
    triggered: boolean;
  };
}

export class DebugMillAdapter implements MillAdapter {
  readonly controllerType = 'debug' as const;

  private server: DebugServer;
  private listeners = new Set<MillStateListener>();
  private dispatch: Dispatch<DROEventPayload> | null = null;
  private state: MillState = {
    ...createDefaultMillState('debug'),
    controllerType: 'debug',
  };

  constructor() {
    this.server = new DebugServer();
  }

  setDispatch(dispatch: Dispatch<DROEventPayload> | null): void {
    this.dispatch = dispatch;
  }

  async connect(): Promise<void> {
    // Listen to server events
    this.server.on('controller:state', (data: unknown) => {
      const state = data as DebugControllerState;
      const mpos = state.status?.mpos ?? [0, 0, 0];
      const pn = state.status?.pn ?? '';

      this.updateState({
        position: {
          x: mpos[0] ?? 0,
          y: mpos[1] ?? 0,
          z: mpos[2] ?? 0,
        },
        probe: createProbeState(pn),
        connected: true,
      });
    });

    // Immediately set connected state
    this.updateState({ connected: true });
    return Promise.resolve();
  }

  disconnect(): void {
    this.server.removeAllListeners('controller:state');
    this.server.destroy();
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

  /**
   * Get the debug server instance for direct control.
   * Used by debug panel to access server controls.
   */
  getServer(): DebugServer {
    return this.server;
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

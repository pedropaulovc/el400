/**
 * Debug adapter for in-browser demo mode.
 * Uses DebugServer to simulate a CNC controller entirely in the browser.
 */

import type { Dispatch } from 'react';
import type { MillAdapter } from './MillAdapter';
import type { MillStateListener, MillState, EncoderSignalByAxis } from '../types/millState';
import type { DROEventPayload } from '../stores/dro/droStateMachine';
import { createDefaultMillState, createProbeState, DEFAULT_ENCODER_SIGNAL } from '../types/millState';
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
  encoderSignal?: EncoderSignalByAxis;
}

export class DebugMillAdapter implements MillAdapter {
  readonly controllerType = 'debug' as const;

  private server: DebugServer;
  private listeners = new Set<MillStateListener>();
  private dispatch: Dispatch<DROEventPayload> | null = null;
  private state: MillState = {
    ...createDefaultMillState('debug'),
    controllerType: 'debug',
    encoderResolutionMicrons: { X: 5, Y: 5, Z: 5 },
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

      const previous = this.state.position;
      this.updateState({
        position: {
          x: mpos[0] ?? 0,
          y: mpos[1] ?? 0,
          z: mpos[2] ?? 0,
        },
        probe: createProbeState(pn),
        encoderSignal: state.encoderSignal ?? { ...DEFAULT_ENCODER_SIGNAL },
        connected: true,
      });
      // The simulated encoder index is at physical +10 mm on each scale.
      // Publish after the position update so reference capture sees the live
      // endpoint, including a move that overshoots the index.
      const axes = ['X', 'Y', 'Z'] as const;
      for (const axis of axes) {
        const from = axis === 'X' ? previous.x : axis === 'Y' ? previous.y : previous.z;
        const to = axis === 'X' ? this.state.position.x : axis === 'Y' ? this.state.position.y : this.state.position.z;
        if ((from < 10 && to >= 10) || (from > 10 && to <= 10)) {
          this.dispatch?.({ eventName: 'ENCODER_REF_MARK_CROSSED', axis, markPositionMm: 10 });
        }
      }
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

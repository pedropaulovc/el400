interface SessionState {
  position: { x: number; y: number; z: number };
  probeState: string;
}

/**
 * Simple browser-compatible EventEmitter
 */
class EventEmitter {
  private listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  on(event: string, listener: (...args: unknown[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.add(listener);
    }
  }

  off(event: string, listener: (...args: unknown[]) => void): void {
    this.listeners.get(event)?.delete(listener);
  }

  emit(event: string, ...args: unknown[]): void {
    this.listeners.get(event)?.forEach(listener => {
      listener(...args);
    });
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

/**
 * DebugServer - In-browser debug server for demo mode
 *
 * Emulates a CNC controller server that runs entirely in the browser.
 * Maintains session-based state and broadcasts controller:state events.
 * Compatible with CncjsMillAdapter's Socket.IO client semantics.
 */
export class DebugServer extends EventEmitter {
  private sessionState: SessionState = {
    position: { x: 0, y: 0, z: 0 },
    probeState: '',
  };
  private broadcastInterval: number | null = null;

  constructor() {
    super();
    this.startBroadcasting();
  }

  /**
   * Move to absolute position
   */
  moveAbsolute(x: number, y: number, z: number): void {
    this.sessionState.position = { x, y, z };
    this.broadcastState();
  }

  /**
   * Move relative to current position
   */
  moveRelative(axis: 'x' | 'y' | 'z', delta: number): void {
    this.sessionState.position[axis] += delta;
    this.broadcastState();
  }

  /**
   * Set a single axis position to a specific value
   */
  setPosition(axis: 'x' | 'y' | 'z', value: number): void {
    this.sessionState.position[axis] = value;
    this.broadcastState();
  }

  /**
   * Set probe state
   */
  setProbe(triggered: boolean): void {
    this.sessionState.probeState = triggered ? 'P' : '';
    this.broadcastState();
  }

  /**
   * Reset position to origin
   */
  reset(): void {
    this.sessionState.position = { x: 0, y: 0, z: 0 };
    this.sessionState.probeState = '';
    this.broadcastState();
  }

  /**
   * Get current state (for debugging/testing)
   */
  getState(): SessionState {
    return { ...this.sessionState };
  }

  /**
   * Broadcast state to all listeners (mimics Socket.IO emit)
   */
  private broadcastState(): void {
    const state = {
      status: {
        mpos: [
          this.sessionState.position.x,
          this.sessionState.position.y,
          this.sessionState.position.z,
        ],
        wpos: [
          this.sessionState.position.x,
          this.sessionState.position.y,
          this.sessionState.position.z,
        ],
        pn: this.sessionState.probeState,
      },
      probe: {
        pinState: this.sessionState.probeState,
        triggered: this.sessionState.probeState.includes('P'),
      },
    };

    this.emit('controller:state', state);
  }

  /**
   * Start periodic state broadcasting (mimics real server)
   */
  private startBroadcasting(): void {
    // Broadcast initial state
    this.broadcastState();

    // Periodic broadcasting every 100ms (matches mock server behavior)
    this.broadcastInterval = setInterval(() => {
      this.broadcastState();
    }, 100) as unknown as number;
  }

  /**
   * Stop broadcasting and clean up
   */
  destroy(): void {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }
    this.removeAllListeners();
  }

  /**
   * Socket.IO-like event handling
   */
  override on(event: string, handler: (data: unknown) => void): this {
    super.on(event, handler);
    return this;
  }

  override off(event: string, handler: (data: unknown) => void): this {
    super.off(event, handler);
    return this;
  }
}

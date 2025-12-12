/**
 * Mock adapter for testing and development.
 * Simulates machine position updates without real hardware.
 */

import type { MachineAdapter } from './MachineAdapter';
import type { ControllerType, MachineState, MachineStateListener } from '../types/machine';
import { createDefaultMachineState, createProbeState } from '../types/machine';

export interface MockAdapterOptions {
  /** Update interval in milliseconds (default: 100ms) */
  updateInterval?: number;
  /** Initial position */
  initialPosition?: { x: number; y: number; z: number };
  /** Whether to simulate position changes (default: false) */
  simulateMovement?: boolean;
  /** Movement speed per update (default: 0.1) */
  movementSpeed?: number;
}

export class MockAdapter implements MachineAdapter {
  readonly controllerType: ControllerType = 'mock';

  private state: MachineState;
  private listeners: Set<MachineStateListener> = new Set();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private options: Required<MockAdapterOptions>;

  constructor(options: MockAdapterOptions = {}) {
    this.options = {
      updateInterval: options.updateInterval ?? 100,
      initialPosition: options.initialPosition ?? { x: 0, y: 0, z: 0 },
      simulateMovement: options.simulateMovement ?? false,
      movementSpeed: options.movementSpeed ?? 0.1,
    };

    this.state = {
      ...createDefaultMachineState('mock'),
      position: { ...this.options.initialPosition },
    };
  }

  async connect(): Promise<void> {
    this.state = {
      ...this.state,
      connected: true,
    };
    this.notifyListeners();
    this.startUpdates();
  }

  disconnect(): void {
    this.stopUpdates();
    this.state = {
      ...this.state,
      connected: false,
    };
    this.notifyListeners();
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

  /**
   * Set the mock position (useful for testing)
   */
  setPosition(x: number, y: number, z: number): void {
    this.state = {
      ...this.state,
      position: { x, y, z },
    };
    this.notifyListeners();
  }

  /**
   * Set the probe state (useful for testing)
   */
  setProbeState(pinState: string): void {
    this.state = {
      ...this.state,
      probe: createProbeState(pinState),
    };
    this.notifyListeners();
  }

  /**
   * Toggle probe triggered state
   */
  toggleProbe(): void {
    const newPinState = this.state.probe.triggered ? '' : 'P';
    this.setProbeState(newPinState);
  }

  private startUpdates(): void {
    if (this.intervalId !== null) {
      return;
    }

    this.intervalId = setInterval(() => {
      if (this.options.simulateMovement) {
        this.simulateMovementStep();
      }
      this.notifyListeners();
    }, this.options.updateInterval);
  }

  private stopUpdates(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private simulateMovementStep(): void {
    const speed = this.options.movementSpeed;
    // Simple sinusoidal movement for demo
    const time = Date.now() / 1000;
    this.state = {
      ...this.state,
      position: {
        x: this.state.position.x + Math.sin(time) * speed,
        y: this.state.position.y + Math.cos(time) * speed,
        z: this.state.position.z + Math.sin(time * 0.5) * speed * 0.5,
      },
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}

/**
 * Machine adapter interface for connecting to CNC controllers.
 * Implementations provide data from various sources (CNCjs, LinuxCNC, mock, etc.)
 */

import type { ControllerType, MachineState, MachineStateListener } from '../types/machine';

/**
 * Abstract interface for machine data adapters.
 * Each adapter connects to a specific data source and normalizes
 * the data into the unified MachineState format.
 */
export interface MachineAdapter {
  /**
   * Connect to the data source.
   * @returns Promise that resolves when connected
   * @throws Error if connection fails
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the data source.
   * Cleans up resources and stops data streaming.
   */
  disconnect(): void;

  /**
   * Subscribe to machine state updates.
   * @param listener Callback invoked when state changes
   * @returns Unsubscribe function
   */
  subscribe(listener: MachineStateListener): () => void;

  /**
   * Get the current machine state.
   * @returns Current MachineState
   */
  getState(): MachineState;

  /**
   * The type of controller this adapter connects to.
   */
  readonly controllerType: ControllerType;
}

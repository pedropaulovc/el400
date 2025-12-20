/**
 * Mill connection interface for connecting to CNC controllers.
 * Implementations provide data from various sources (CNCjs, LinuxCNC, mock, etc.)
 */

import type { Dispatch } from 'react';
import type { ControllerType, MillState, MillStateListener } from '../types/millState';
import type { DROEventPayload } from '../stores/dro/droStateMachine';

/**
 * Abstract interface for mill data connections.
 * Each connection connects to a specific data source and normalizes
 * the data into the unified MillState format.
 */
export interface MillConnection {
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
   * Subscribe to mill state updates.
   * @param listener Callback invoked when state changes
   * @returns Unsubscribe function
   */
  subscribe(listener: MillStateListener): () => void;

  /**
   * Get the current mill state.
   * @returns Current MillState
   */
  getState(): MillState;

  /**
   * The type of controller this connection connects to.
   */
  readonly controllerType: ControllerType;

  /**
   * Dispatch DRO events when mill state changes.
   * @param dispatch React dispatch function for DRO events
   */
  setDispatch(dispatch: Dispatch<DROEventPayload> | null): void;
}

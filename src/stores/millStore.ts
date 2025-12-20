/**
 * Mill Store - Mill connection state management
 *
 * Manages the connection to CNC controllers (CNCjs, LinuxCNC, Mock, etc.)
 * and the current mill state (position, probe, connection status).
 */

import { create } from 'zustand';
import type { MillAdapter } from '../adapters/MillAdapter';
import { NoOpMillAdapter } from '../adapters/NoOpMillAdapter';
import type { MillState } from '../types/millState';
import { createDefaultMillState } from '../types/millState';

// ─────────────────────────────────────────────────────────────────
// STORE INTERFACE
// ─────────────────────────────────────────────────────────────────

interface MillStore {
  // State
  millState: MillState;
  connection: MillAdapter;
  isConnecting: boolean;
  error: Error | null;

  // Actions
  setConnection: (connection: MillAdapter) => void;

  // Internal actions (prefixed with _)
  _setMillState: (state: MillState) => void;
  _setConnecting: (isConnecting: boolean) => void;
  _setError: (error: Error | null) => void;
}

// ─────────────────────────────────────────────────────────────────
// STORE IMPLEMENTATION
// ─────────────────────────────────────────────────────────────────

const defaultAdapter = new NoOpMillAdapter();

export const useMillStore = create<MillStore>()((set) => ({
  // Initial state
  millState: createDefaultMillState('noop'),
  connection: defaultAdapter,
  isConnecting: false,
  error: null,

  // Actions
  setConnection: (connection) => {
    set({
      connection,
      error: null,
    });
  },

  // Internal actions
  _setMillState: (millState) => { set({ millState }); },
  _setConnecting: (isConnecting) => { set({ isConnecting }); },
  _setError: (error) => { set({ error }); },
}));

// ─────────────────────────────────────────────────────────────────
// SELECTORS - Granular subscriptions for performance
// ─────────────────────────────────────────────────────────────────

/** Get the full mill state */
export const useMillState = () => useMillStore((s) => s.millState);

/** Get mill position */
export const useMillPosition = () => useMillStore((s) => s.millState.position);

/** Get mill X position only */
export const useMillPositionX = () => useMillStore((s) => s.millState.position.x);
/** Get mill Y position only */
export const useMillPositionY = () => useMillStore((s) => s.millState.position.y);
/** Get mill Z position only */
export const useMillPositionZ = () => useMillStore((s) => s.millState.position.z);

/** Get mill connection status */
export const useMillConnected = () => useMillStore((s) => s.millState.connected);

/** Get mill probe state */
export const useMillProbe = () => useMillStore((s) => s.millState.probe);

/** Get the current connection adapter */
export const useConnection = () => useMillStore((s) => s.connection);

/** Get connecting status */
export const useIsConnecting = () => useMillStore((s) => s.isConnecting);

/** Get connection error */
export const useConnectionError = () => useMillStore((s) => s.error);

/** Get setConnection action */
export const useSetConnection = () => useMillStore((s) => s.setConnection);

// ─────────────────────────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────────────────────────

// Import droStore dynamically to avoid circular dependencies
let droStoreDispatch: ((event: { eventName: string }) => void) | null = null;

/**
 * Set the DRO store dispatch function for MILL_STATE_CHANGED events.
 * Called during store initialization to avoid circular dependencies.
 */
export function setDRODispatch(
  dispatch: ((event: { eventName: string }) => void) | null
): void {
  droStoreDispatch = dispatch;
}

/**
 * Initialize the mill store with a connection.
 * Sets up state subscription and connects to the data source.
 *
 * @param adapter The mill adapter to use
 * @returns Cleanup function to disconnect and unsubscribe
 */
export async function initializeMillStore(
  adapter: MillAdapter
): Promise<() => void> {
  const store = useMillStore.getState();

  // Set the adapter
  store.setConnection(adapter);
  store._setMillState(adapter.getState());

  // Subscribe to state updates
  const unsubscribe = adapter.subscribe((state) => {
    useMillStore.getState()._setMillState(state);
  });

  // Inject DRO dispatch into adapter for MILL_STATE_CHANGED events
  adapter.setDispatch((event) => {
    if (droStoreDispatch) {
      droStoreDispatch(event);
    }
  });

  // Connect if not already connected
  if (!adapter.getState().connected) {
    store._setConnecting(true);
    store._setError(null);

    try {
      await adapter.connect();
    } catch (err) {
      store._setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      store._setConnecting(false);
    }
  }

  // Return cleanup function
  return () => {
    unsubscribe();
    adapter.setDispatch(null);
    adapter.disconnect();
  };
}

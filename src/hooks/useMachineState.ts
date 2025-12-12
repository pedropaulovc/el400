/**
 * Hooks for consuming machine state from context.
 */

import { useMachineStateContext } from '../context/MachineStateContext';
import type { MachineState } from '../types/machine';
import type { MachineAdapter } from '../adapters/MachineAdapter';

/**
 * Hook to get the current machine state.
 * Use this when you only need the state, not the full context.
 *
 * @returns Current MachineState
 */
export function useMachineState(): MachineState {
  const { state } = useMachineStateContext();
  return state;
}

/**
 * Hook to get the current machine adapter.
 *
 * @returns Current MachineAdapter or null
 */
export function useMachineAdapter(): MachineAdapter | null {
  const { adapter } = useMachineStateContext();
  return adapter;
}

/**
 * Hook to check if connected to a data source.
 *
 * @returns true if connected
 */
export function useMachineConnected(): boolean {
  const { state } = useMachineStateContext();
  return state.connected;
}

/**
 * Hook to get connection status info.
 *
 * @returns Connection status object
 */
export function useMachineConnectionStatus(): {
  connected: boolean;
  isConnecting: boolean;
  error: Error | null;
} {
  const { state, isConnecting, error } = useMachineStateContext();
  return {
    connected: state.connected,
    isConnecting,
    error,
  };
}

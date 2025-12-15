/**
 * Machine state context for managing adapter lifecycle and machine state.
 * Separates machine connection concerns from DRO memory management.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { MachineConnection } from '../adapters/MachineConnection';
import type { MachineState } from '../types/machineState';
import { createDefaultMachineState } from '../types/machineState';

export interface MachineStateContextValue {
  /** Current machine state from adapter */
  machineState: MachineState;
  /** Currently active adapter (or null if none) */
  adapter: MachineConnection | null;
  /** Whether the adapter is currently connecting */
  isConnecting: boolean;
  /** Error from last connection attempt */
  error: Error | null;
  /** Set or replace the active adapter */
  setAdapter: (adapter: MachineConnection | null) => void;
}

const MachineStateContext = createContext<MachineStateContextValue | null>(null);

export interface MachineStateProviderProps {
  children: ReactNode;
  /** Optional initial adapter */
  initialAdapter?: MachineConnection | null;
}

/**
 * Provider component for machine state and adapter lifecycle management.
 * Handles adapter connection, disconnection, and state subscription.
 */
export function MachineStateProvider({
  children,
  initialAdapter,
}: MachineStateProviderProps) {
  // Adapter state
  const [adapter, setAdapterState] = useState<MachineConnection | null>(
    initialAdapter ?? null
  );
  const [machineState, setMachineState] = useState<MachineState>(
    adapter?.getState() ?? createDefaultMachineState('manual')
  );
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Handle adapter changes and connection
  useEffect(() => {
    if (!adapter) {
      setMachineState(createDefaultMachineState('manual'));
      return;
    }

    let mounted = true;

    // Subscribe to state updates
    const unsubscribe = adapter.subscribe((newState) => {
      if (mounted) {
        setMachineState(newState);
      }
    });

    // Connect if not already connected
    const connect = async () => {
      if (!adapter.getState().connected) {
        setIsConnecting(true);
        setError(null);
        try {
          await adapter.connect();
        } catch (err) {
          if (mounted) {
            setError(err instanceof Error ? err : new Error(String(err)));
          }
        } finally {
          if (mounted) {
            setIsConnecting(false);
          }
        }
      }
    };

    connect();

    return () => {
      mounted = false;
      unsubscribe();
      adapter.disconnect();
    };
  }, [adapter]);

  const setAdapter = useCallback((newAdapter: MachineConnection | null) => {
    setAdapterState(newAdapter);
    setError(null);
  }, []);

  const contextValue: MachineStateContextValue = {
    machineState,
    adapter,
    isConnecting,
    error,
    setAdapter,
  };

  return (
    <MachineStateContext.Provider value={contextValue}>
      {children}
    </MachineStateContext.Provider>
  );
}

/**
 * Hook to access the machine state context.
 * Must be used within a MachineStateProvider.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useMachineStateContext(): MachineStateContextValue {
  const context = useContext(MachineStateContext);

  if (context === null) {
    throw new Error('useMachineStateContext must be used within a MachineStateProvider');
  }

  return context;
}

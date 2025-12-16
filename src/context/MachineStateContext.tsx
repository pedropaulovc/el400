/**
 * Machine state context for managing connection lifecycle and machine state.
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
import type { MillConnection } from '../adapters/MillConnection';
import type { MachineState } from '../types/machineState';
import { createDefaultMachineState } from '../types/machineState';

export interface MachineStateContextValue {
  /** Current machine state from connection */
  machineState: MachineState;
  /** Currently active connection (or null if none) */
  connection: MillConnection | null;
  /** Whether the connection is currently connecting */
  isConnecting: boolean;
  /** Error from last connection attempt */
  error: Error | null;
  /** Set or replace the active connection */
  setConnection: (connection: MillConnection | null) => void;
}

const MachineStateContext = createContext<MachineStateContextValue | null>(null);

export interface MachineStateProviderProps {
  children: ReactNode;
  /** Optional initial connection */
  initialConnection?: MillConnection | null;
}

/**
 * Provider component for machine state and connection lifecycle management.
 * Handles connection, disconnection, and state subscription.
 */
export function MachineStateProvider({
  children,
  initialConnection,
}: MachineStateProviderProps) {
  // Connection state
  const [connection, setConnectionState] = useState<MillConnection | null>(
    initialConnection ?? null
  );
  const [machineState, setMachineState] = useState<MachineState>(
    connection?.getState() ?? createDefaultMachineState('manual')
  );
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Handle connection changes
  useEffect(() => {
    if (!connection) {
      setMachineState(createDefaultMachineState('manual'));
      return;
    }

    let mounted = true;

    // Subscribe to state updates
    const unsubscribe = connection.subscribe((newState) => {
      if (mounted) {
        setMachineState(newState);
      }
    });

    // Connect if not already connected
    const connect = async () => {
      if (!connection.getState().connected) {
        setIsConnecting(true);
        setError(null);
        try {
          await connection.connect();
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
      connection.disconnect();
    };
  }, [connection]);

  const setConnection = useCallback((newConnection: MillConnection | null) => {
    setConnectionState(newConnection);
    setError(null);
  }, []);

  const contextValue: MachineStateContextValue = {
    machineState,
    connection,
    isConnecting,
    error,
    setConnection,
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

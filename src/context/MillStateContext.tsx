/**
 * Mill state context for managing connection lifecycle and mill state.
 * Separates mill connection concerns from DRO memory management.
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
import { NoOpMillConnection } from '../adapters/NoOpMillConnection';
import type { MillState } from '../types/millState';

export interface MillStateContextValue {
  /** Current mill state from connection */
  millState: MillState;
  /** Currently active connection */
  connection: MillConnection;
  /** Whether the connection is currently connecting */
  isConnecting: boolean;
  /** Error from last connection attempt */
  error: Error | null;
  /** Set or replace the active connection */
  setConnection: (connection: MillConnection) => void;
}

const MillStateContext = createContext<MillStateContextValue | null>(null);

export interface MillStateProviderProps {
  children: ReactNode;
  /** Optional initial connection (defaults to NoOpMillConnection) */
  initialConnection?: MillConnection;
}

/**
 * Provider component for mill state and connection lifecycle management.
 * Handles connection, disconnection, and state subscription.
 */
export function MillStateProvider({
  children,
  initialConnection,
}: MillStateProviderProps) {
  // Connection state - defaults to NoOpMillConnection
  const [connection, setConnectionState] = useState<MillConnection>(
    () => initialConnection ?? new NoOpMillConnection()
  );
  const [millState, setMillState] = useState<MillState>(
    () => connection.getState()
  );
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Handle connection changes
  useEffect(() => {
    let mounted = true;

    // Subscribe to state updates
    const unsubscribe = connection.subscribe((newState) => {
      if (mounted) {
        setMillState(newState);
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

  const setConnection = useCallback((newConnection: MillConnection) => {
    setConnectionState(newConnection);
    setError(null);
  }, []);

  const contextValue: MillStateContextValue = {
    millState,
    connection,
    isConnecting,
    error,
    setConnection,
  };

  return (
    <MillStateContext.Provider value={contextValue}>
      {children}
    </MillStateContext.Provider>
  );
}

/**
 * Hook to access the mill state context.
 * Must be used within a MillStateProvider.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useMillStateContext(): MillStateContextValue {
  const context = useContext(MillStateContext);

  if (context === null) {
    throw new Error('useMillStateContext must be used within a MillStateProvider');
  }

  return context;
}

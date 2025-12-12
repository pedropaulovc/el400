/**
 * Machine state context for providing machine data throughout the app.
 * Manages adapter connection lifecycle and state updates.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { MachineAdapter } from '../adapters/MachineAdapter';
import type { MachineState, DataSourceConfig } from '../types/machine';
import { createDefaultMachineState } from '../types/machine';
import { MockAdapter } from '../adapters/MockAdapter';

export interface MachineStateContextValue {
  /** Current machine state */
  state: MachineState;
  /** Currently active adapter (or null if none) */
  adapter: MachineAdapter | null;
  /** Whether the adapter is currently connecting */
  isConnecting: boolean;
  /** Error from last connection attempt */
  error: Error | null;
  /** Set or replace the active adapter */
  setAdapter: (adapter: MachineAdapter | null) => void;
}

const MachineStateContext = createContext<MachineStateContextValue | null>(null);

export interface MachineStateProviderProps {
  children: ReactNode;
  /** Optional initial adapter */
  initialAdapter?: MachineAdapter | null;
  /** Optional initial config to auto-create adapter */
  config?: DataSourceConfig;
}

/**
 * Creates an adapter based on the config type.
 * Returns null for 'manual' mode.
 */
function createAdapterFromConfig(config: DataSourceConfig): MachineAdapter | null {
  switch (config.type) {
    case 'mock':
      return new MockAdapter({ simulateMovement: true });
    case 'cncjs':
      // CncjsAdapter will be imported dynamically to avoid bundling socket.io
      // when not needed. For now, return null and log.
      console.log('CNCjs adapter requested, host:', config.host, 'port:', config.port);
      // TODO: return new CncjsAdapter({ host: config.host, port: config.port });
      return null;
    case 'linuxcnc':
      // LinuxCNC adapter not implemented yet
      console.log('LinuxCNC adapter requested');
      return null;
    case 'manual':
    default:
      return null;
  }
}

/**
 * Provider component for machine state.
 * Manages adapter connection lifecycle and broadcasts state updates.
 */
export function MachineStateProvider({
  children,
  initialAdapter,
  config,
}: MachineStateProviderProps) {
  const [adapter, setAdapterState] = useState<MachineAdapter | null>(
    initialAdapter ?? (config ? createAdapterFromConfig(config) : null)
  );
  const [state, setState] = useState<MachineState>(
    adapter?.getState() ?? createDefaultMachineState('manual')
  );
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Handle adapter changes and connection
  useEffect(() => {
    if (!adapter) {
      setState(createDefaultMachineState('manual'));
      return;
    }

    let mounted = true;

    // Subscribe to state updates
    const unsubscribe = adapter.subscribe((newState) => {
      if (mounted) {
        setState(newState);
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

  const setAdapter = useCallback((newAdapter: MachineAdapter | null) => {
    setAdapterState(newAdapter);
    setError(null);
  }, []);

  const contextValue: MachineStateContextValue = {
    state,
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
 * Hook to access the full machine state context.
 * Must be used within a MachineStateProvider.
 */
export function useMachineStateContext(): MachineStateContextValue {
  const context = useContext(MachineStateContext);

  if (context === null) {
    // Return a fallback for standalone use
    return {
      state: createDefaultMachineState('manual'),
      adapter: null,
      isConnecting: false,
      error: null,
      setAdapter: () => {
        console.warn('useMachineStateContext: No MachineStateProvider found');
      },
    };
  }

  return context;
}

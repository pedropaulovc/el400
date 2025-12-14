/**
 * Volatile memory context for providing machine data and DRO state throughout the app.
 * Manages adapter connection lifecycle, state updates, and DRO memory.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type { MachineConnection } from '../adapters/MachineConnection';
import type {
  MachineState,
  DataSourceConfig,
  VolatileMemory,
  VolatileMemoryActions,
  AxisValues,
  Axis,
  DatumMode,
} from '../types/volatileMemory';
import { createDefaultMachineState, ZERO_AXIS_VALUES } from '../types/volatileMemory';
import { MockAdapter } from '../adapters/MockAdapter';
import { fromAnyUnitToMm } from '../utils/unitConversion';
import { useNonVolatileMemoryContext } from './NonVolatileMemoryContext';

export interface VolatileMemoryContextValue extends VolatileMemory, VolatileMemoryActions {
  /** Currently active adapter (or null if none) */
  adapter: MachineConnection | null;
  /** Whether the adapter is currently connecting */
  isConnecting: boolean;
  /** Error from last connection attempt */
  error: Error | null;
  /** Set or replace the active adapter */
  setAdapter: (adapter: MachineConnection | null) => void;
}

const VolatileMemoryContext = createContext<VolatileMemoryContextValue | null>(null);

export interface VolatileMemoryProviderProps {
  children: ReactNode;
  /** Optional initial adapter */
  initialAdapter?: MachineConnection | null;
  /** Optional initial config to auto-create adapter */
  config?: DataSourceConfig;
}

/**
 * Creates an adapter based on the config type.
 * Returns null for 'manual' mode.
 */
function createAdapterFromConfig(config: DataSourceConfig): MachineConnection | null {
  switch (config.type) {
    case 'mock':
      // Don't simulate automatic movement - tests can use setPosition() explicitly
      return new MockAdapter({ simulateMovement: false });
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
 * Provider component for volatile memory (machine state + DRO memory).
 * Manages adapter connection lifecycle and broadcasts state updates.
 */
export function VolatileMemoryProvider({
  children,
  initialAdapter,
  config,
}: VolatileMemoryProviderProps) {
  // Non-volatile memory for unit conversion
  const { memory: nvMemory } = useNonVolatileMemoryContext();

  // Adapter state
  const [adapter, setAdapterState] = useState<MachineConnection | null>(
    initialAdapter ?? (config ? createAdapterFromConfig(config) : null)
  );
  const [machineState, setMachineState] = useState<MachineState>(
    adapter?.getState() ?? createDefaultMachineState('manual')
  );
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // DRO memory state
  const [mode, setModeState] = useState<DatumMode>('abs');
  const [activeAxis, setActiveAxis] = useState<Axis | null>(null);
  const [workOffsets, setWorkOffsets] = useState<AxisValues>(ZERO_AXIS_VALUES);
  const [incrementalValues, setIncrementalValues] = useState<AxisValues>(ZERO_AXIS_VALUES);
  const [manualAbsoluteValues, setManualAbsoluteValues] = useState<AxisValues>(ZERO_AXIS_VALUES);

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

  // Calculate absolute values (machine position - work offset)
  const absoluteValues = useMemo<AxisValues>(() => {
    if (machineState?.connected) {
      // Use external machine position with work offsets applied
      return {
        X: machineState.position.x - workOffsets.X,
        Y: machineState.position.y - workOffsets.Y,
        Z: machineState.position.z - workOffsets.Z,
      };
    }
    // Manual mode: use manual values directly
    return manualAbsoluteValues;
  }, [machineState, workOffsets, manualAbsoluteValues]);

  // Display values based on current mode
  const displayValues = useMemo<AxisValues>(() => {
    return mode === 'abs' ? absoluteValues : incrementalValues;
  }, [mode, absoluteValues, incrementalValues]);

  // DRO Actions
  const toggleMode = useCallback(() => {
    setModeState((prev) => (prev === 'abs' ? 'inc' : 'abs'));
  }, []);

  const setMode = useCallback((newMode: DatumMode) => {
    setModeState(newMode);
  }, []);

  const selectAxis = useCallback((axis: Axis | null) => {
    setActiveAxis(axis);
  }, []);

  const zeroAxis = useCallback((axis: Axis) => {
    if (mode === 'abs') {
      // In ABS mode: set work offset to current machine position
      if (machineState?.connected) {
        const machinePos = axis === 'X' ? machineState.position.x :
                          axis === 'Y' ? machineState.position.y :
                          machineState.position.z;
        setWorkOffsets((prev) => ({ ...prev, [axis]: machinePos }));
      } else {
        // Manual mode: just set the value to zero
        setManualAbsoluteValues((prev) => ({ ...prev, [axis]: 0 }));
      }
    } else {
      // In INC mode: zero the incremental counter
      setIncrementalValues((prev) => ({ ...prev, [axis]: 0 }));
    }
  }, [mode, machineState]);

  const zeroAll = useCallback(() => {
    if (mode === 'abs') {
      if (machineState?.connected) {
        // Set all work offsets to current machine positions
        setWorkOffsets({
          X: machineState.position.x,
          Y: machineState.position.y,
          Z: machineState.position.z,
        });
      } else {
        setManualAbsoluteValues(ZERO_AXIS_VALUES);
      }
    } else {
      setIncrementalValues(ZERO_AXIS_VALUES);
    }
  }, [mode, machineState]);

  const setAxisValue = useCallback((axis: Axis, value: number) => {
    // Convert from display unit to mm for internal storage
    const valueMm = fromAnyUnitToMm(value, nvMemory.defaultUnit);

    if (mode === 'abs') {
      if (machineState?.connected) {
        // In connected mode, setting a value adjusts the work offset
        const machinePos = axis === 'X' ? machineState.position.x :
                          axis === 'Y' ? machineState.position.y :
                          machineState.position.z;
        // offset = machinePos - desiredValue
        setWorkOffsets((prev) => ({ ...prev, [axis]: machinePos - valueMm }));
      } else {
        setManualAbsoluteValues((prev) => ({ ...prev, [axis]: valueMm }));
      }
    } else {
      setIncrementalValues((prev) => ({ ...prev, [axis]: valueMm }));
    }
  }, [mode, machineState, nvMemory.defaultUnit]);

  const halfAxis = useCallback((axis: Axis) => {
    // Get current display value (in mm internally)
    const currentValue = displayValues[axis];
    // Halve it and store directly (no unit conversion needed)
    const halfValue = currentValue / 2;

    if (mode === 'abs') {
      if (machineState?.connected) {
        // In connected mode, adjust work offset to show half the current value
        const machinePos = axis === 'X' ? machineState.position.x :
                          axis === 'Y' ? machineState.position.y :
                          machineState.position.z;
        // New offset so that machinePos - newOffset = halfValue
        setWorkOffsets((prev) => ({ ...prev, [axis]: machinePos - halfValue }));
      } else {
        setManualAbsoluteValues((prev) => ({ ...prev, [axis]: halfValue }));
      }
    } else {
      setIncrementalValues((prev) => ({ ...prev, [axis]: halfValue }));
    }
  }, [mode, machineState, displayValues]);

  const contextValue: VolatileMemoryContextValue = {
    // Machine state
    machinePosition: machineState.position,
    workPosition: machineState.workPosition,
    probe: machineState.probe,
    connected: machineState.connected,
    controllerType: machineState.controllerType,

    // DRO memory state
    displayValues,
    absolute: absoluteValues,
    incremental: incrementalValues,
    mode,
    workOffsets,
    activeAxis,

    // DRO actions
    toggleMode,
    setMode,
    zeroAxis,
    zeroAll,
    setAxisValue,
    selectAxis,
    halfAxis,

    // Adapter management
    adapter,
    isConnecting,
    error,
    setAdapter,
  };

  // Expose adapter to window object for E2E and integration tests.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as unknown as { __el400Adapter?: MachineConnection | null }).__el400Adapter = adapter;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as unknown as { __el400Adapter?: MachineConnection | null }).__el400Adapter;
      }
    };
  }, [adapter]);

  return (
    <VolatileMemoryContext.Provider value={contextValue}>
      {children}
    </VolatileMemoryContext.Provider>
  );
}

/**
 * Hook to access the volatile memory context (machine state + DRO memory).
 * Must be used within a VolatileMemoryProvider.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useVolatileMemoryContext(): VolatileMemoryContextValue {
  const context = useContext(VolatileMemoryContext);

  if (context === null) {
    throw new Error('useVolatileMemoryContext must be used within a VolatileMemoryProvider');
  }

  return context;
}

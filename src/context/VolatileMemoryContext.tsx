/**
 * Volatile memory context for DRO state throughout the app.
 * Manages DRO memory (mode, offsets, incremental values).
 * Consumes mill state from MillStateContext internally for calculations.
 *
 * Note: Boot stage is now managed by DROModeContext.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type {
  VolatileMemory,
  VolatileMemoryActions,
  AxisValues,
  Axis,
  DatumMode,
} from '../types/volatileMemory';
import { ZERO_AXIS_VALUES } from '../types/volatileMemory';
import { fromAnyUnitToMm } from '../utils/unitConversion';
import { useNonVolatileMemoryContext } from './NonVolatileMemoryContext';
import { useMillStateContext } from './MillStateContext';

export interface VolatileMemoryContextValue extends VolatileMemory, VolatileMemoryActions {}

const VolatileMemoryContext = createContext<VolatileMemoryContextValue | null>(null);

export interface VolatileMemoryProviderProps {
  children: ReactNode;
}

/**
 * Provider component for volatile memory (DRO memory).
 * Consumes mill state from MillStateContext internally for calculations.
 */
export function VolatileMemoryProvider({
  children,
}: VolatileMemoryProviderProps) {
  // Get mill state from MillStateContext (used internally for calculations)
  const { millState } = useMillStateContext();

  // Non-volatile memory for unit conversion
  const { nvMem: nvMemory } = useNonVolatileMemoryContext();

  // DRO memory state
  const [mode, setModeState] = useState<DatumMode>('abs');
  const [activeAxis, setActiveAxis] = useState<Axis | null>(null);
  const [workOffsets, setWorkOffsets] = useState<AxisValues>(ZERO_AXIS_VALUES);
  const [incrementalValues, setIncrementalValues] = useState<AxisValues>(ZERO_AXIS_VALUES);
  const [manualAbsoluteValues, setManualAbsoluteValues] = useState<AxisValues>(ZERO_AXIS_VALUES);

  // Calculate absolute values (machine position - work offset)
  const absoluteValues = useMemo<AxisValues>(() => {
    if (millState?.connected) {
      // Use external machine position with work offsets applied
      return {
        X: millState.position.x - workOffsets.X,
        Y: millState.position.y - workOffsets.Y,
        Z: millState.position.z - workOffsets.Z,
      };
    }
    // Manual mode: use manual values directly
    return manualAbsoluteValues;
  }, [millState, workOffsets, manualAbsoluteValues]);

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
      if (millState?.connected) {
        const machinePos = axis === 'X' ? millState.position.x :
                          axis === 'Y' ? millState.position.y :
                          millState.position.z;
        setWorkOffsets((prev) => ({ ...prev, [axis]: machinePos }));
      } else {
        // Manual mode: just set the value to zero
        setManualAbsoluteValues((prev) => ({ ...prev, [axis]: 0 }));
      }
    } else {
      // In INC mode: zero the incremental counter
      setIncrementalValues((prev) => ({ ...prev, [axis]: 0 }));
    }
  }, [mode, millState]);

  const zeroAll = useCallback(() => {
    if (mode === 'abs') {
      if (millState?.connected) {
        // Set all work offsets to current machine positions
        setWorkOffsets({
          X: millState.position.x,
          Y: millState.position.y,
          Z: millState.position.z,
        });
      } else {
        setManualAbsoluteValues(ZERO_AXIS_VALUES);
      }
    } else {
      setIncrementalValues(ZERO_AXIS_VALUES);
    }
  }, [mode, millState]);

  const setAxisValue = useCallback((axis: Axis, value: number) => {
    // Convert from display unit to mm for internal storage
    const valueMm = fromAnyUnitToMm(value, nvMemory.defaultUnit);

    if (mode === 'abs') {
      if (millState?.connected) {
        // In connected mode, setting a value adjusts the work offset
        const machinePos = axis === 'X' ? millState.position.x :
                          axis === 'Y' ? millState.position.y :
                          millState.position.z;
        // offset = machinePos - desiredValue
        setWorkOffsets((prev) => ({ ...prev, [axis]: machinePos - valueMm }));
      } else {
        setManualAbsoluteValues((prev) => ({ ...prev, [axis]: valueMm }));
      }
    } else {
      setIncrementalValues((prev) => ({ ...prev, [axis]: valueMm }));
    }
  }, [mode, millState, nvMemory.defaultUnit]);

  const halfAxis = useCallback((axis: Axis) => {
    // Get current display value (in mm internally)
    const currentValue = displayValues[axis];
    // Halve it and store directly (no unit conversion needed)
    const halfValue = currentValue / 2;

    if (mode === 'abs') {
      if (millState?.connected) {
        // In connected mode, adjust work offset to show half the current value
        const machinePos = axis === 'X' ? millState.position.x :
                          axis === 'Y' ? millState.position.y :
                          millState.position.z;
        // New offset so that machinePos - newOffset = halfValue
        setWorkOffsets((prev) => ({ ...prev, [axis]: machinePos - halfValue }));
      } else {
        setManualAbsoluteValues((prev) => ({ ...prev, [axis]: halfValue }));
      }
    } else {
      setIncrementalValues((prev) => ({ ...prev, [axis]: halfValue }));
    }
  }, [mode, millState, displayValues]);

  const contextValue: VolatileMemoryContextValue = {
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
  };

  return (
    <VolatileMemoryContext.Provider value={contextValue}>
      {children}
    </VolatileMemoryContext.Provider>
  );
}

/**
 * Hook to access the volatile memory context (DRO memory).
 * Must be used within a VolatileMemoryProvider.
 *
 * For mill state (position, probe, connected), use useMillStateContext instead.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useVolatileMemoryContext(): VolatileMemoryContextValue {
  const context = useContext(VolatileMemoryContext);

  if (context === null) {
    throw new Error('useVolatileMemoryContext must be used within a VolatileMemoryProvider');
  }

  return context;
}

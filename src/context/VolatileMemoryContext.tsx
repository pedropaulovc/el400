/**
 * Volatile memory context for DRO state throughout the app.
 * Manages DRO memory (mode, offsets, incremental values, boot stage).
 * Consumes machine state from MachineStateContext internally for calculations.
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
import type {
  VolatileMemory,
  VolatileMemoryActions,
  AxisValues,
  Axis,
  DatumMode,
  BootStage,
} from '../types/volatileMemory';
import { ZERO_AXIS_VALUES } from '../types/volatileMemory';
import { fromAnyUnitToMm } from '../utils/unitConversion';
import { useNonVolatileMemoryContext } from './NonVolatileMemoryContext';
import { useMachineStateContext } from './MachineStateContext';

export interface VolatileMemoryContextValue extends VolatileMemory, VolatileMemoryActions {}

const VolatileMemoryContext = createContext<VolatileMemoryContextValue | null>(null);

/**
 * Duration in milliseconds for the boot message to be displayed before auto-dismissing.
 * Used in the boot sequence state machine.
 */
export const BOOT_MESSAGE_DURATION_MS = 1000;

export interface VolatileMemoryProviderProps {
  children: ReactNode;
}

/**
 * Provider component for volatile memory (DRO memory).
 * Consumes machine state from MachineStateContext internally for calculations.
 */
export function VolatileMemoryProvider({
  children,
}: VolatileMemoryProviderProps) {
  // Get machine state from MachineStateContext (used internally for calculations)
  const { machineState } = useMachineStateContext();

  // Non-volatile memory for unit conversion
  const { nvMem: nvMemory } = useNonVolatileMemoryContext();

  // DRO memory state
  const [mode, setModeState] = useState<DatumMode>('abs');
  const [activeAxis, setActiveAxis] = useState<Axis | null>(null);
  const [workOffsets, setWorkOffsets] = useState<AxisValues>(ZERO_AXIS_VALUES);
  const [incrementalValues, setIncrementalValues] = useState<AxisValues>(ZERO_AXIS_VALUES);
  const [manualAbsoluteValues, setManualAbsoluteValues] = useState<AxisValues>(ZERO_AXIS_VALUES);

  /**
   * Boot Sequence State Machine
   *
   * States: showMessage | run
   *
   * Initial state determined by settings:
   *   - 'run' if nvMem.bootMessageMode === 'skip' or URL param bootMessageMode === 'skip'
   *   - 'showMessage' otherwise
   *
   * Transitions:
   *   showMessage → run   (when BOOT_MESSAGE_DURATION_MS timeout expires)
   *   showMessage → run   (when C key pressed)
   */
  const [bootStage, setBootStage] = useState<BootStage>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlBootMode = urlParams.get('bootMessageMode');
    const shouldSkip = nvMemory.bootMessageMode === 'skip' || urlBootMode === 'skip';
    return shouldSkip ? 'run' : 'showMessage';
  });

  // Timer for auto-dismiss from showMessage
  useEffect(() => {
    if (bootStage === 'showMessage') {
      const timer = setTimeout(() => setBootStage('run'), BOOT_MESSAGE_DURATION_MS);
      return () => clearTimeout(timer);
    }
  }, [bootStage]);

  // Boot stage action: C key dismisses showMessage → run
  const clearKeyPressed = useCallback(() => {
    if (bootStage === 'showMessage') {
      setBootStage('run');
    }
  }, [bootStage]);

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
    // DRO memory state
    displayValues,
    absolute: absoluteValues,
    incremental: incrementalValues,
    mode,
    workOffsets,
    activeAxis,
    bootStage,

    // DRO actions
    toggleMode,
    setMode,
    zeroAxis,
    zeroAll,
    setAxisValue,
    selectAxis,
    halfAxis,
    clearKeyPressed,
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
 * For machine state (position, probe, connected), use useMachineStateContext instead.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useVolatileMemoryContext(): VolatileMemoryContextValue {
  const context = useContext(VolatileMemoryContext);

  if (context === null) {
    throw new Error('useVolatileMemoryContext must be used within a VolatileMemoryProvider');
  }

  return context;
}

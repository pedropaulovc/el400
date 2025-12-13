/**
 * Hook for managing DRO memory with separate ABS and INC value storage.
 * Allows switching between absolute and incremental display modes.
 * 
 * Note: This hook is unit-agnostic. All values are stored in millimeters (mm).
 * Unit conversion (inch/mm) is handled at the UI layer before values reach this hook.
 */

import { useState, useCallback, useMemo } from 'react';
import type { MachineState } from '../types/machine';

/**
 * Axis values for X, Y, Z
 */
export interface AxisValues {
  X: number;
  Y: number;
  Z: number;
}

export type Axis = 'X' | 'Y' | 'Z';
export type DROMode = 'abs' | 'inc';

/**
 * DRO memory state
 */
export interface DROMemoryState {
  /** Absolute position values */
  absolute: AxisValues;
  /** Incremental (work offset) position values */
  incremental: AxisValues;
  /** Current display mode */
  mode: DROMode;
}

export interface UseDROMemoryReturn {
  /** Current values to display (based on mode) */
  displayValues: AxisValues;
  /** Absolute position values */
  absolute: AxisValues;
  /** Incremental position values */
  incremental: AxisValues;
  /** Current display mode */
  mode: DROMode;
  /** Toggle between ABS and INC modes */
  toggleMode: () => void;
  /** Set specific mode */
  setMode: (mode: DROMode) => void;
  /** Zero a single axis in current mode */
  zeroAxis: (axis: Axis) => void;
  /** Zero all axes in current mode */
  zeroAll: () => void;
  /** Set a specific axis value in current mode (value should be in mm) */
  setAxisValue: (axis: Axis, value: number) => void;
}

const ZERO_VALUES: AxisValues = { X: 0, Y: 0, Z: 0 };

/**
 * Hook for managing DRO memory with ABS/INC switching.
 *
 * In ABS mode:
 * - Displays machine position (from external source or manual entry)
 * - Zero sets the reference point (offset from machine position)
 *
 * In INC mode:
 * - Displays incremental/work position
 * - Zero resets incremental counter
 *
 * @param machineState - External machine state (from CNCjs/LinuxCNC), or null for manual mode
 */
export function useDROMemory(machineState: MachineState | null): UseDROMemoryReturn {
  const [mode, setModeState] = useState<DROMode>('abs');

  // Work offsets: when zeroing in ABS mode, we capture the machine position as offset
  const [workOffsets, setWorkOffsets] = useState<AxisValues>(ZERO_VALUES);

  // Incremental values: separate counter that can be zeroed independently
  const [incrementalValues, setIncrementalValues] = useState<AxisValues>(ZERO_VALUES);

  // Manual absolute values: used when no external machine state
  const [manualAbsoluteValues, setManualAbsoluteValues] = useState<AxisValues>(ZERO_VALUES);

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

  const toggleMode = useCallback(() => {
    setModeState((prev) => (prev === 'abs' ? 'inc' : 'abs'));
  }, []);

  const setMode = useCallback((newMode: DROMode) => {
    setModeState(newMode);
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
        setManualAbsoluteValues(ZERO_VALUES);
      }
    } else {
      setIncrementalValues(ZERO_VALUES);
    }
  }, [mode, machineState]);

  const setAxisValue = useCallback((axis: Axis, value: number) => {
    if (mode === 'abs') {
      if (machineState?.connected) {
        // In connected mode, setting a value adjusts the work offset
        const machinePos = axis === 'X' ? machineState.position.x :
                          axis === 'Y' ? machineState.position.y :
                          machineState.position.z;
        // offset = machinePos - desiredValue
        setWorkOffsets((prev) => ({ ...prev, [axis]: machinePos - value }));
      } else {
        setManualAbsoluteValues((prev) => ({ ...prev, [axis]: value }));
      }
    } else {
      setIncrementalValues((prev) => ({ ...prev, [axis]: value }));
    }
  }, [mode, machineState]);

  return {
    displayValues,
    absolute: absoluteValues,
    incremental: incrementalValues,
    mode,
    toggleMode,
    setMode,
    zeroAxis,
    zeroAll,
    setAxisValue,
  };
}

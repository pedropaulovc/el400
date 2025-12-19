/**
 * Hook for accessing unified volatile memory.
 *
 * This hook reads state from the DRO state machine's vMem and provides
 * computed display values based on mode and mill state.
 *
 * Actions dispatch events to the DRO state machine reducer.
 */

import { useMemo, useCallback } from 'react';
import { useDROVMem, useDRODispatch } from '../dro-state-machine';
import { useMillStateContext } from '../context/MillStateContext';
import { useNonVolatileMemoryContext } from '../context/NonVolatileMemoryContext';
import type {
  VolatileMemory,
  VolatileMemoryActions,
  AxisValues,
  Axis,
  DatumMode,
} from '../types/volatileMemory';

export type { VolatileMemory, VolatileMemoryActions, AxisValues, Axis, DatumMode };

export interface VolatileMemoryContextValue extends VolatileMemory, VolatileMemoryActions {}

/**
 * Hook for accessing unified volatile memory.
 * Provides machine state from adapter combined with DRO memory management.
 *
 * In ABS mode:
 * - Displays machine position (from external source or manual entry)
 * - Zero sets the reference point (offset from machine position)
 *
 * In INC mode:
 * - Displays incremental/work position
 * - Zero resets incremental counter
 */
export function useVolatileMemory(): VolatileMemoryContextValue {
  const vMem = useDROVMem();
  const dispatch = useDRODispatch();
  const { millState } = useMillStateContext();
  useNonVolatileMemoryContext(); // Ensure context is available

  // Calculate absolute values (machine position - work offset)
  const absoluteValues = useMemo<AxisValues>(() => {
    if (millState.connected) {
      // Use external machine position with work offsets applied
      return {
        X: millState.position.x - vMem.workOffsets.X,
        Y: millState.position.y - vMem.workOffsets.Y,
        Z: millState.position.z - vMem.workOffsets.Z,
      };
    }
    // Manual mode: use manual values directly
    return vMem.manualAbsoluteValues;
  }, [millState.connected, millState.position, vMem.workOffsets, vMem.manualAbsoluteValues]);

  // Display values based on current mode
  const displayValues = useMemo<AxisValues>(() => {
    return vMem.mode === 'abs' ? absoluteValues : vMem.incrementalValues;
  }, [vMem.mode, absoluteValues, vMem.incrementalValues]);

  // Actions - dispatch events to DRO state machine
  const toggleMode = useCallback(() => {
    dispatch({ eventName: 'BTN_ABS_INC' });
  }, [dispatch]);

  const setMode = useCallback((newMode: DatumMode) => {
    // For now, toggle if different. Full implementation may need a SET_MODE event.
    if (newMode !== vMem.mode) {
      dispatch({ eventName: 'BTN_ABS_INC' });
    }
  }, [dispatch, vMem.mode]);

  const selectAxis = useCallback((axis: Axis | null) => {
    if (axis === null) {
      // Clear selection - dispatch KEY_CLEAR when buffer is empty
      dispatch({ eventName: 'KEY_CLEAR' });
    } else {
      const eventName = `BTN_SELECT_${axis}` as const;
      dispatch({ eventName });
    }
  }, [dispatch]);

  const zeroAxis = useCallback((axis: Axis) => {
    const eventName = `BTN_ZERO_${axis}` as const;
    dispatch({ eventName });
  }, [dispatch]);

  const zeroAll = useCallback(() => {
    dispatch({ eventName: 'BTN_ZERO_ALL' });
  }, [dispatch]);

  const setAxisValue = useCallback((axis: Axis, value: number) => {
    // Dispatch axis selection first
    const selectEvent = `BTN_SELECT_${axis}` as const;
    dispatch({ eventName: selectEvent });
    // Set the input buffer with the value string (reducer handles unit conversion)
    dispatch({ eventName: 'SET_INPUT_BUFFER', value: String(value) });
    // Then dispatch KEY_ENTER to commit the value
    dispatch({ eventName: 'KEY_ENTER' });
  }, [dispatch]);

  const halfAxis = useCallback((axis: Axis) => {
    // First select the axis, then apply half
    if (vMem.activeAxis !== axis) {
      const selectEvent = `BTN_SELECT_${axis}` as const;
      dispatch({ eventName: selectEvent });
    }
    dispatch({ eventName: 'BTN_HALF' });
  }, [dispatch, vMem.activeAxis]);

  return {
    // Read state
    displayValues,
    absolute: absoluteValues,
    incremental: vMem.incrementalValues,
    mode: vMem.mode,
    workOffsets: vMem.workOffsets,
    activeAxis: vMem.activeAxis,
    // Actions
    toggleMode,
    setMode,
    zeroAxis,
    zeroAll,
    setAxisValue,
    selectAxis,
    halfAxis,
  };
}

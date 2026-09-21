/**
 * Hook for accessing unified volatile memory.
 *
 * This hook reads state from Zustand stores and provides
 * computed display values based on mode and mill state.
 *
 * Actions dispatch events to the DRO store.
 */

import { useMemo, useCallback } from 'react';
import {
  useDispatch,
  useMillState,
  useNvMem,
  useVMem,
} from '../stores';
import type {
  VolatileMemory,
  VolatileMemoryActions,
  AxisValues,
  Axis,
  DatumMode,
} from '../types/volatileMemory';
import { computeMachinePositionMm } from '../stores/dro/utils/displayComputation';

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
  const vMem = useVMem();
  const { mode, activeAxis, workOffsets } = vMem;
  const nvMem = useNvMem();
  const dispatch = useDispatch();
  const millState = useMillState();

  const { absoluteValues, incrementalValues } = useMemo(() => {
    if (!millState.connected) return {
      absoluteValues: vMem.manualAbsoluteValues,
      incrementalValues: vMem.incrementalValues,
    };
    const context = { millState, nvMem };
    const x = computeMachinePositionMm('X', vMem, context);
    const y = computeMachinePositionMm('Y', vMem, context);
    const z = computeMachinePositionMm('Z', vMem, context);
    return {
      absoluteValues: {
        X: x - vMem.workOffsets.X,
        Y: y - vMem.workOffsets.Y,
        Z: z - vMem.workOffsets.Z,
      },
      incrementalValues: {
        X: x - vMem.incrementalOffsets.X,
        Y: y - vMem.incrementalOffsets.Y,
        Z: z - vMem.incrementalOffsets.Z,
      },
    };
  }, [millState, nvMem, vMem]);

  // Display values based on current mode
  const displayValues = useMemo<AxisValues>(() => {
    return mode === 'abs' ? absoluteValues : incrementalValues;
  }, [mode, absoluteValues, incrementalValues]);

  // Actions - dispatch events to DRO store
  const toggleMode = useCallback(() => {
    dispatch({ eventName: 'BTN_ABS_INC' });
  }, [dispatch]);

  const setMode = useCallback((newMode: DatumMode) => {
    // For now, toggle if different. Full implementation may need a SET_MODE event.
    if (newMode !== mode) {
      dispatch({ eventName: 'BTN_ABS_INC' });
    }
  }, [dispatch, mode]);

  const selectAxis = useCallback((axis: Axis) => {
    const eventName = `BTN_SELECT_${axis}` as const;
    dispatch({ eventName });
  }, [dispatch]);

  const zeroAxis = useCallback((axis: Axis) => {
    const eventName = `BTN_ZERO_${axis}` as const;
    dispatch({ eventName });
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
    dispatch({ eventName: 'BTN_HALF' });
    dispatch({ eventName: `BTN_SELECT_${axis}` });
  }, [dispatch]);

  // Return memoized object for stable reference
  return useMemo(() => ({
    // Read state
    displayValues,
    absolute: absoluteValues,
    incremental: incrementalValues,
    mode,
    workOffsets,
    activeAxis,
    // Actions
    toggleMode,
    setMode,
    zeroAxis,
    setAxisValue,
    selectAxis,
    halfAxis,
  }), [
    displayValues,
    absoluteValues,
    incrementalValues,
    mode,
    workOffsets,
    activeAxis,
    toggleMode,
    setMode,
    zeroAxis,
    setAxisValue,
    selectAxis,
    halfAxis,
  ]);
}

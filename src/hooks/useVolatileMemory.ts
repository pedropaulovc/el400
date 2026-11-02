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
  useMode,
  useActiveAxis,
  useWorkOffsets,
  useIncrementalOffsets,
  useIncrementalValues,
  useManualAbsoluteValues,
  useDispatch,
  useMillState,
} from '../stores';
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
 * - GRBL displays controller WPos; datum changes request native work offsets.
 * - Other sources retain an independent INC datum or disconnected manual counter.
 */
export function useVolatileMemory(): VolatileMemoryContextValue {
  // Granular store subscriptions - only re-render when specific values change
  const mode = useMode();
  const activeAxis = useActiveAxis();
  const workOffsets = useWorkOffsets();
  const incrementalValues = useIncrementalValues();
  const incrementalOffsets = useIncrementalOffsets();
  const manualAbsoluteValues = useManualAbsoluteValues();
  const dispatch = useDispatch();
  const millState = useMillState();

  // Calculate absolute values (machine position - work offset)
  const absoluteValues = useMemo<AxisValues>(() => {
    if (millState.connected || millState.controllerType === 'cncjs') {
      // Use external machine position with work offsets applied
      return {
        X: millState.position.x - workOffsets.X,
        Y: millState.position.y - workOffsets.Y,
        Z: millState.position.z - workOffsets.Z,
      };
    }
    // Manual mode: use manual values directly
    return manualAbsoluteValues;
  }, [millState.connected, millState.controllerType, millState.position, workOffsets, manualAbsoluteValues]);

  const liveIncrementalValues = useMemo<AxisValues>(() => {
    if (millState.workPositionControl !== undefined) {
      return {
        X: millState.workPosition?.x ?? Number.NaN,
        Y: millState.workPosition?.y ?? Number.NaN,
        Z: millState.workPosition?.z ?? Number.NaN,
      };
    }
    if (millState.connected || millState.controllerType === 'cncjs') {
      return {
        X: millState.position.x - incrementalOffsets.X,
        Y: millState.position.y - incrementalOffsets.Y,
        Z: millState.position.z - incrementalOffsets.Z,
      };
    }
    return incrementalValues;
  }, [millState.connected, millState.controllerType, millState.position, millState.workPosition,
      millState.workPositionControl, incrementalOffsets, incrementalValues]);

  // Display values based on current mode
  const displayValues = useMemo<AxisValues>(() => {
    return mode === 'abs' ? absoluteValues : liveIncrementalValues;
  }, [mode, absoluteValues, liveIncrementalValues]);

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
    if (activeAxis !== axis) {
      const selectEvent = `BTN_SELECT_${axis}` as const;
      dispatch({ eventName: selectEvent });
    }
    dispatch({ eventName: 'BTN_HALF' });
  }, [dispatch, activeAxis]);

  // Return memoized object for stable reference
  return useMemo(() => ({
    // Read state
    displayValues,
    absolute: absoluteValues,
    incremental: liveIncrementalValues,
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
    liveIncrementalValues,
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

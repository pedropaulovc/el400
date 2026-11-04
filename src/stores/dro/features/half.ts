/**
 * Half Feature Reducer
 *
 * Handles the half function that divides the active axis value by 2.
 */

import type { FeatureReducer, DROStatePayload, DROReducerContext } from '../types';
import type { DROEventPayload } from '../droStateMachine';
import type { Axis } from '../../../types/volatileMemory';
import { computeAxisPositionMm, computeNormalDisplay } from '../utils/displayComputation';
import { setAxisValueMm } from './axis-operations';

/**
 * Get the machine position for an axis.
 */
function getMachinePosition(axis: Axis, context: DROReducerContext): number {
  const { millState } = context;
  switch (axis) {
    case 'X':
      return millState.position.x;
    case 'Y':
      return millState.position.y;
    case 'Z':
      return millState.position.z;
  }
}

/**
 * Halve the value of an axis.
 */
function halfAxis(
  vMem: DROStatePayload['vMem'],
  axis: Axis,
  context: DROReducerContext
): DROStatePayload['vMem'] {
  const { millState } = context;

  // Get current display value and halve it
  const currentValue = computeAxisPositionMm(axis, vMem, context);
  const halfValue = currentValue / 2;

  if (vMem.mode === 'abs') {
    if (millState.workPositionControl !== undefined) {
      return setAxisValueMm(vMem, axis, halfValue, context);
    }
    if (millState.connected) {
      // In connected mode, adjust work offset to show half the current value
      const machinePos = getMachinePosition(axis, context);
      // New offset so that machinePos - newOffset = halfValue
      return {
        ...vMem,
        workOffsets: { ...vMem.workOffsets, [axis]: machinePos - halfValue },
      };
    }
    return {
      ...vMem,
      manualAbsoluteValues: { ...vMem.manualAbsoluteValues, [axis]: halfValue },
    };
  }
  if (millState.connected || millState.controllerType === 'cncjs') {
    return {
      ...vMem,
      incrementalOffsets: {
        ...vMem.incrementalOffsets,
        [axis]: getMachinePosition(axis, context) - halfValue,
      },
    };
  }

  return {
    ...vMem,
    incrementalValues: { ...vMem.incrementalValues, [axis]: halfValue },
  };
}

/**
 * Half reducer - handles the half function.
 * Only operates when the DRO is in idle state and an axis is selected.
 */
export const halfReducer: FeatureReducer = (
  state: DROStatePayload,
  event: DROEventPayload,
  context
): DROStatePayload | null => {
  // Only handle in idle state
  if (state.stateName !== 'idle') {
    return null;
  }

  if (event.eventName !== 'BTN_HALF') {
    return null;
  }

  const { vMem } = state;

  // Need an active axis to half
  if (vMem.activeAxis === null) {
    return state;
  }

  const newVMem = halfAxis(vMem, vMem.activeAxis, context);
  return {
    ...state,
    vMem: newVMem,
    display: computeNormalDisplay(newVMem, context),
  };
};

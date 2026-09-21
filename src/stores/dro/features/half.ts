/**
 * Half Feature Reducer
 *
 * Handles the half function that divides the active axis value by 2.
 */

import type { FeatureReducer, DROStatePayload, DROReducerContext } from '../types';
import type { DROEventPayload } from '../droStateMachine';
import type { Axis } from '../../../types/volatileMemory';
import {
  computeAxisPositionMm,
  computeMachinePositionMm,
  computeNormalDisplay,
} from '../utils/displayComputation';

/**
 * Halve the value of an axis.
 */
function halfAxis(
  vMem: DROStatePayload['vMem'],
  axis: Axis,
  context: DROReducerContext
): DROStatePayload['vMem'] {
  const { millState } = context;

  // HALF operates in the datum-relative machine frame, before display-only
  // direction, unit, and diameter transforms.
  const currentValue = computeAxisPositionMm(axis, vMem, context);
  const halfValue = currentValue / 2;

  if (vMem.mode === 'abs') {
    if (millState.connected) {
      // In connected mode, adjust work offset to show half the current value
      const machinePos = computeMachinePositionMm(axis, vMem, context);
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

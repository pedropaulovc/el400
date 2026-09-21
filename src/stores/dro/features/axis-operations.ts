/**
 * Axis Operations Feature Reducer
 *
 * Handles axis selection, zeroing, and value entry operations.
 * Updates vMem based on axis-related button presses.
 */

import type { FeatureReducer, DROStatePayload, DROReducerContext } from '../types';
import type { DROEventPayload } from '../droStateMachine';
import type { Axis } from '../../../types/volatileMemory';
import { getBufferValue } from './buffer-utils';
import {
  displayUnitsToAxisUnits,
  computeNormalDisplay,
  computeMachinePositionMm,
  directionSign,
  axisDisplayDecimals,
  maxDisplayableMagnitude,
  measurementScale,
} from '../utils/displayComputation';

/**
 * Zero a single axis based on current mode.
 */
function zeroAxis(
  vMem: DROStatePayload['vMem'],
  axis: Axis,
  context: DROReducerContext
): DROStatePayload['vMem'] {
  const { millState } = context;

  if (vMem.mode === 'abs') {
    // In ABS mode: set work offset to current machine position
    if (millState.connected) {
      const machinePos = computeMachinePositionMm(axis, vMem, context);
      return {
        ...vMem,
        workOffsets: { ...vMem.workOffsets, [axis]: machinePos },
      };
    }
    // Manual mode: just set the value to zero
    return {
      ...vMem,
      manualAbsoluteValues: { ...vMem.manualAbsoluteValues, [axis]: 0 },
    };
  }

  if (millState.connected) {
    return {
      ...vMem,
      incrementalOffsets: {
        ...vMem.incrementalOffsets,
        [axis]: computeMachinePositionMm(axis, vMem, context),
      },
    };
  }
  // In INC mode: zero the incremental counter
  return {
    ...vMem,
    incrementalValues: { ...vMem.incrementalValues, [axis]: 0 },
  };
}

/**
 * Set an axis to a display value, converting it to canonical axis units
 * (millimetres for linear axes or degrees for angular axes).
 */
function setAxisValue(
  vMem: DROStatePayload['vMem'],
  axis: Axis,
  value: number,
  context: DROReducerContext
): DROStatePayload['vMem'] {
  const { nvMem } = context;
  // Linear entries are clamped to what the physical 7-digit panel can show at
  // the current dP resolution (US-047), keeping sign. Angular entries use their
  // separate configured format and wrap only for display, so their stored value
  // must retain the unwrapped revolution count and ignore this linear limit.
  const clamped = nvMem.countingMode[axis] === 'angular'
    ? value
    : Math.sign(value) * Math.min(
      Math.abs(value),
      maxDisplayableMagnitude(axisDisplayDecimals(axis, nvMem))
    );
  const valueMm = displayUnitsToAxisUnits(axis, clamped, nvMem) /
    measurementScale(axis, nvMem) *
    directionSign(axis, nvMem);
  return setAxisValueMm(vMem, axis, valueMm, context);
}

/**
 * Set an axis to a canonical coordinate (linear mm or angular degrees).
 * Keeps the axis selected for further operations (like half). The legacy `Mm`
 * suffix is retained because it is already internal vocabulary.
 */
function setAxisValueMm(
  vMem: DROStatePayload['vMem'],
  axis: Axis,
  valueMm: number,
  context: DROReducerContext
): DROStatePayload['vMem'] {
  const { millState } = context;

  if (vMem.mode === 'abs') {
    if (millState.connected) {
      // In connected mode, setting a value adjusts the work offset
      const machinePos = computeMachinePositionMm(axis, vMem, context);
      // offset = machinePos - desiredValue
      return {
        ...vMem,
        workOffsets: { ...vMem.workOffsets, [axis]: machinePos - valueMm },
        inputBuffer: '',
        // Keep activeAxis for further operations (like half)
      };
    }
    return {
      ...vMem,
      manualAbsoluteValues: { ...vMem.manualAbsoluteValues, [axis]: valueMm },
      inputBuffer: '',
    };
  }
  if (millState.connected) {
    return {
      ...vMem,
      incrementalOffsets: {
        ...vMem.incrementalOffsets,
        [axis]: computeMachinePositionMm(axis, vMem, context) - valueMm,
      },
      inputBuffer: '',
    };
  }

  return {
    ...vMem,
    incrementalValues: { ...vMem.incrementalValues, [axis]: valueMm },
    inputBuffer: '',
  };
}

/**
 * Axis operations reducer - handles axis selection and zero operations.
 * Only operates when the DRO is in idle state.
 */
export const axisOperationsReducer: FeatureReducer = (
  state: DROStatePayload,
  event: DROEventPayload,
  context
): DROStatePayload | null => {
  // Only handle in idle state
  if (state.stateName !== 'idle') {
    return null;
  }

  const { vMem } = state;

  switch (event.eventName) {
    // Axis selection buttons - no display change (selecting doesn't change values)
    case 'BTN_SELECT_X':
      return {
        ...state,
        vMem: { ...vMem, activeAxis: 'X', inputBuffer: '' },
      };

    case 'BTN_SELECT_Y':
      return {
        ...state,
        vMem: { ...vMem, activeAxis: 'Y', inputBuffer: '' },
      };

    case 'BTN_SELECT_Z':
      return {
        ...state,
        vMem: { ...vMem, activeAxis: 'Z', inputBuffer: '' },
      };

    // Zero buttons - zero the axis and update display
    case 'BTN_ZERO_X': {
      const newVMem = {
        ...zeroAxis(vMem, 'X', context),
        inputBuffer: '',
        activeAxis: null,
      };
      return {
        ...state,
        vMem: newVMem,
        display: computeNormalDisplay(newVMem, context),
      };
    }

    case 'BTN_ZERO_Y': {
      const newVMem = {
        ...zeroAxis(vMem, 'Y', context),
        inputBuffer: '',
        activeAxis: null,
      };
      return {
        ...state,
        vMem: newVMem,
        display: computeNormalDisplay(newVMem, context),
      };
    }

    case 'BTN_ZERO_Z': {
      const newVMem = {
        ...zeroAxis(vMem, 'Z', context),
        inputBuffer: '',
        activeAxis: null,
      };
      return {
        ...state,
        vMem: newVMem,
        display: computeNormalDisplay(newVMem, context),
      };
    }

    // Enter key - commit input buffer value to active axis
    case 'KEY_ENTER': {
      // If there's an active axis and a valid value in the buffer
      if (vMem.activeAxis !== null) {
        const value = getBufferValue(vMem.inputBuffer);
        if (value !== null) {
          const newVMem = setAxisValue(vMem, vMem.activeAxis, value, context);
          return {
            ...state,
            vMem: newVMem,
            display: computeNormalDisplay(newVMem, context),
          };
        }
      }
      return null;
    }

    default:
      return null;
  }
};

/**
 * Axis Operations Feature Reducer
 *
 * Handles axis selection, zeroing, and value entry operations.
 * Updates vMem based on axis-related button presses.
 */

import type { FeatureReducer, DROStatePayload, DROReducerContext } from '../types';
import type { DROEventPayload } from '../droStateMachine';
import type { Axis } from '../../../types/volatileMemory';
import { fromAnyUnitToMm } from '../../../utils/unitConversion';
import { getBufferValue } from './buffer-utils';
import {
  computeNormalDisplay,
  axisDisplayDecimals,
  maxDisplayableMagnitude,
  measurementScale,
} from '../utils/displayComputation';

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
      const machinePos = getMachinePosition(axis, context);
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

  // In INC mode: zero the incremental counter
  return {
    ...vMem,
    incrementalValues: { ...vMem.incrementalValues, [axis]: 0 },
  };
}

/**
 * Set an axis to a specific value (value in display units, will be converted to mm).
 */
function setAxisValue(
  vMem: DROStatePayload['vMem'],
  axis: Axis,
  value: number,
  context: DROReducerContext
): DROStatePayload['vMem'] {
  const { nvMem } = context;
  // Clamp the entered magnitude to what the physical 7-digit panel can show at
  // this axis's current display resolution (US-047), keeping sign. The value is
  // in the displayed unit (what the user typed); clamping here — at the commit
  // boundary, before mm conversion — keeps the stored value equal to the
  // displayed reading (AC 47.5). Angular axes wrap to [0,360) and never reach the
  // limit, so this is a harmless no-op for them.
  //
  // The panel limit bounds the DISPLAYED magnitude. In diameter mode (US-041) the
  // display shows 2× the stored slide value, so the stored value's limit is the
  // panel limit divided by the measurement scale (AC 47.7) — keeping display ≤
  // panel max and display==stored consistent. Radius mode (×1) is unchanged.
  const limit =
    maxDisplayableMagnitude(axisDisplayDecimals(axis, nvMem)) / measurementScale(axis, nvMem);
  const clamped = Math.sign(value) * Math.min(Math.abs(value), limit);
  // Convert from display unit to mm for internal storage
  const valueMm = fromAnyUnitToMm(clamped, nvMem.defaultUnit);
  return setAxisValueMm(vMem, axis, valueMm, context);
}

/**
 * Set an axis to a specific value (value already in mm).
 * Keeps the axis selected for further operations (like half).
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
      const machinePos = getMachinePosition(axis, context);
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

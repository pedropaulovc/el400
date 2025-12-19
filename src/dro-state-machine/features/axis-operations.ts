/**
 * Axis Operations Feature Reducer
 *
 * Handles axis selection, zeroing, and value entry operations.
 * Updates vMem based on axis-related button presses.
 */

import type { FeatureReducer, DROStatePayload, DROReducerContext } from '../types';
import type { DROEventPayload } from '../droStateMachine';
import type { Axis, AxisValues } from '../../types/volatileMemory';
import { fromAnyUnitToMm } from '../../utils/unitConversion';
import { getBufferValue } from './buffer-utils';

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
 * Zero all axes based on current mode.
 */
function zeroAllAxes(
  vMem: DROStatePayload['vMem'],
  context: DROReducerContext
): DROStatePayload['vMem'] {
  const { millState } = context;
  const zeroValues: AxisValues = { X: 0, Y: 0, Z: 0 };

  if (vMem.mode === 'abs') {
    if (millState.connected) {
      // Set all work offsets to current machine positions
      return {
        ...vMem,
        workOffsets: {
          X: millState.position.x,
          Y: millState.position.y,
          Z: millState.position.z,
        },
      };
    }
    return {
      ...vMem,
      manualAbsoluteValues: zeroValues,
    };
  }

  return {
    ...vMem,
    incrementalValues: zeroValues,
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
  // Convert from display unit to mm for internal storage
  const valueMm = fromAnyUnitToMm(value, nvMem.defaultUnit);
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
    // Axis selection buttons
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

    // Zero buttons - zero the axis and clear any input
    case 'BTN_ZERO_X':
      return {
        ...state,
        vMem: {
          ...zeroAxis(vMem, 'X', context),
          inputBuffer: '',
          activeAxis: null,
        },
      };

    case 'BTN_ZERO_Y':
      return {
        ...state,
        vMem: {
          ...zeroAxis(vMem, 'Y', context),
          inputBuffer: '',
          activeAxis: null,
        },
      };

    case 'BTN_ZERO_Z':
      return {
        ...state,
        vMem: {
          ...zeroAxis(vMem, 'Z', context),
          inputBuffer: '',
          activeAxis: null,
        },
      };

    case 'BTN_ZERO_ALL':
      return {
        ...state,
        vMem: {
          ...zeroAllAxes(vMem, context),
          inputBuffer: '',
          activeAxis: null,
        },
      };

    // Enter key - commit input buffer value to active axis
    case 'KEY_ENTER': {
      // If there's an active axis and a valid value in the buffer
      if (vMem.activeAxis !== null) {
        const value = getBufferValue(vMem.inputBuffer);
        if (value !== null) {
          return {
            ...state,
            vMem: setAxisValue(vMem, vMem.activeAxis, value, context),
          };
        }
      }
      return null;
    }

    default:
      return null;
  }
};

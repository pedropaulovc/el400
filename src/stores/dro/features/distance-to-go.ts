/**
 * Distance-to-Go Feature Reducer (US-008)
 *
 * Allows the operator to request relative travel and display distance remaining.
 * Workflow:
 * 1. Press Distance-to-Go (only available in ABS mode) → display shows SELECT
 * 2. Press axis key → enter the requested travel for that axis
 * 3. Press Distance-to-Go again → execute, display shows distance remaining
 * 4. INC LED turns on during distance-to-go display with leading decimal indicator
 * 5. When exiting, returns to ABS mode
 */

import type { FeatureReducer, DROReducerContext } from '../types';
import type { DROStateName, PresetData } from '../droStateMachine';
import {
  INITIAL_DRO_STATE_DATA,
  INITIAL_PRESET_DATA,
  isPresetActive,
} from '../droStateMachine';
import type { Axis, VolatileMemoryState } from '../../../types/volatileMemory';
import {
  getBufferValue,
  appendDigit,
  appendDecimal,
  toggleSign,
  KEY_TO_DIGIT,
} from './buffer-utils';
import {
  axisUnitsToDisplayUnits,
  computeNormalDisplay,
  computeMachinePositionMm,
  directionSign,
  displayUnitsToAxisUnits,
  formatAngularValue,
  measurementScale,
  type AxisDisplayValue,
  type DisplayState,
} from '../utils/displayComputation';
import { useSettingsStore } from '../../settingsStore';

/** Display text for preset-select state */
const SELECT_TEXT = 'SELECt';

/**
 * Toggle unit between inch and mm, updating settings store.
 * Returns the new unit and updated context.
 */
function toggleUnit(context: DROReducerContext): {
  newUnit: 'inch' | 'mm';
  updatedContext: DROReducerContext;
} {
  const currentUnit = context.nvMem.defaultUnit;
  const newUnit: 'inch' | 'mm' = currentUnit === 'inch' ? 'mm' : 'inch';
  useSettingsStore.getState().updateNvMem({ defaultUnit: newUnit });
  return {
    newUnit,
    updatedContext: {
      ...context,
      nvMem: { ...context.nvMem, defaultUnit: newUnit },
    },
  };
}

/** States that accept numeric input for preset values */
const PRESET_INPUT_STATES: DROStateName[] = [
  'preset-input-x',
  'preset-input-y',
  'preset-input-z',
];

/** Check if current state accepts numeric input */
function isPresetInputState(state: DROStateName): boolean {
  return PRESET_INPUT_STATES.includes(state);
}

/** Get the axis for a preset-input state */
function getInputAxis(state: DROStateName): Axis | null {
  switch (state) {
    case 'preset-input-x':
      return 'X';
    case 'preset-input-y':
      return 'Y';
    case 'preset-input-z':
      return 'Z';
    default:
      return null;
  }
}

/**
 * Compute display for preset-select state.
 * Shows SELECT on all axes, but shows stored value if already set.
 */
function computePresetSelectDisplay(
  presetData: PresetData,
  context: DROReducerContext
): DisplayState {
  const { presetTargets } = presetData;
  const { nvMem } = context;

  return {
    X: presetTargets.X !== null
      ? axisUnitsToDisplayUnits('X', presetTargets.X, nvMem)
      : SELECT_TEXT,
    Y: presetTargets.Y !== null
      ? axisUnitsToDisplayUnits('Y', presetTargets.Y, nvMem)
      : SELECT_TEXT,
    Z: presetTargets.Z !== null
      ? axisUnitsToDisplayUnits('Z', presetTargets.Z, nvMem)
      : SELECT_TEXT,
  };
}

/**
 * Compute display for preset-input states.
 * Shows input buffer on selected axis, SELECT or stored value on others.
 */
function computePresetInputDisplay(
  inputAxis: Axis,
  inputBuffer: string,
  presetData: PresetData,
  context: DROReducerContext
): DisplayState {
  const base = computePresetSelectDisplay(presetData, context);
  const displayValue = inputBuffer || '0';
  return {
    ...base,
    [inputAxis]: displayValue,
  };
}

/**
 * Compute the signed ABS coordinate in the axis's canonical unit.
 * Linear coordinates remain display-scaled mm; angular coordinates are degrees.
 */
function getAbsolutePosition(
  axis: Axis,
  vMem: VolatileMemoryState,
  context: DROReducerContext
): number {
  const raw = context.millState.connected
    ? computeMachinePositionMm(axis, vMem, context) - vMem.workOffsets[axis]
    : vMem.manualAbsoluteValues[axis];
  return raw * directionSign(axis, context.nvMem) * measurementScale(axis, context.nvMem);
}

/**
 * Compute display for distance-to-go state.
 * Shows requested travel minus travel since execution for each preset axis.
 * Axes without presets show normal position.
 *
 * Note: Always uses absolute position from mill state, regardless of vMem.mode.
 */
function computeDistanceToGoDisplay(
  vMem: VolatileMemoryState,
  presetData: PresetData,
  context: DROReducerContext
): DisplayState {
  const { presetTargets } = presetData;
  const { nvMem } = context;

  const computeAxisDisplay = (axis: Axis): AxisDisplayValue => {
    const target = presetTargets[axis];
    // Always use absolute position for distance-to-go (ignores mode setting)
    const current = getAbsolutePosition(axis, vMem, context);

    if (target === null) {
      // Untargeted axes retain normal-position presentation while using the
      // absolute datum even though Preset temporarily sets vMem.mode to INC.
      return nvMem.countingMode[axis] === 'angular'
        ? formatAngularValue(current, nvMem.angularResolution[axis])
        : axisUnitsToDisplayUnits(axis, current, nvMem);
    }

    // Subtract travel, not the pre-existing absolute coordinate. Angular DTG
    // deliberately remains a signed decimal-degree residual rather than wrapping
    // or adopting the normal position readout's configured DMS format.
    const distance = target - (current - presetData.entryPosition[axis]);
    return axisUnitsToDisplayUnits(axis, distance, nvMem);
  };

  return {
    X: computeAxisDisplay('X'),
    Y: computeAxisDisplay('Y'),
    Z: computeAxisDisplay('Z'),
  };
}

/**
 * Distance-to-Go feature reducer.
 * Handles all distance-to-go state transitions and events.
 */
export const distanceToGoReducer: FeatureReducer = (state, event, context) => {
  const { stateName, stateData, vMem } = state;

  // Handle BTN_DISTANCE_TO_GO from idle → preset-select (only in ABS mode)
  if (stateName === 'idle' && event.eventName === 'BTN_DISTANCE_TO_GO') {
    // Distance-to-go is only available in ABS mode
    if (vMem.mode !== 'abs') {
      return null;
    }
    const newPresetData = { ...INITIAL_PRESET_DATA };
    return {
      stateName: 'preset-select',
      stateData: newPresetData,
      vMem: { ...vMem, inputBuffer: '' },
      display: computePresetSelectDisplay(newPresetData, context),
    };
  }

  // Only handle events when preset mode is active
  if (!isPresetActive(stateName)) {
    return null;
  }

  // Type guard for preset state data
  if (stateData.stateDataType !== 'preset') {
    return null;
  }

  const presetData = stateData;

  // Handle preset-select state
  if (stateName === 'preset-select') {
    // BTN_SELECT_X/Y/Z → transition to input state for that axis
    if (event.eventName === 'BTN_SELECT_X') {
      return {
        stateName: 'preset-input-x',
        stateData: { ...presetData, activeInputAxis: 'X' },
        vMem: { ...vMem, inputBuffer: '' },
        display: computePresetInputDisplay('X', '', presetData, context),
      };
    }
    if (event.eventName === 'BTN_SELECT_Y') {
      return {
        stateName: 'preset-input-y',
        stateData: { ...presetData, activeInputAxis: 'Y' },
        vMem: { ...vMem, inputBuffer: '' },
        display: computePresetInputDisplay('Y', '', presetData, context),
      };
    }
    if (event.eventName === 'BTN_SELECT_Z') {
      return {
        stateName: 'preset-input-z',
        stateData: { ...presetData, activeInputAxis: 'Z' },
        vMem: { ...vMem, inputBuffer: '' },
        display: computePresetInputDisplay('Z', '', presetData, context),
      };
    }

    // BTN_DISTANCE_TO_GO → execute (only if at least one axis has a preset)
    if (event.eventName === 'BTN_DISTANCE_TO_GO') {
      const { presetTargets } = presetData;
      const hasAnyPreset =
        presetTargets.X !== null || presetTargets.Y !== null || presetTargets.Z !== null;

      if (hasAnyPreset) {
        const executingData: PresetData = {
          ...presetData,
          entryPosition: {
            X: getAbsolutePosition('X', vMem, context),
            Y: getAbsolutePosition('Y', vMem, context),
            Z: getAbsolutePosition('Z', vMem, context),
          },
        };
        return {
          stateName: 'distance-to-go',
          stateData: executingData,
          vMem: { ...vMem, inputBuffer: '', mode: 'inc' }, // INC LED turns on
          display: computeDistanceToGoDisplay(vMem, executingData, context),
        };
      }
      // No presets entered - stay in preset-select
      return null;
    }

    // KEY_CLEAR → exit to idle
    if (event.eventName === 'KEY_CLEAR') {
      return {
        stateName: 'idle',
        stateData: INITIAL_DRO_STATE_DATA,
        vMem: { ...vMem, inputBuffer: '' },
        display: computeNormalDisplay(vMem, context),
      };
    }

    // BTN_INCH_MM → toggle unit and recompute display
    if (event.eventName === 'BTN_INCH_MM') {
      const { updatedContext } = toggleUnit(context);
      return {
        ...state,
        display: computePresetSelectDisplay(presetData, updatedContext),
      };
    }

    return null;
  }

  // Handle preset-input states (numeric entry)
  if (isPresetInputState(stateName)) {
    const inputAxis = getInputAxis(stateName);
    if (!inputAxis) return null;

    const digit = KEY_TO_DIGIT[event.eventName];

    // Digit keys → append to buffer
    if (digit !== undefined) {
      const newBuffer = appendDigit(vMem.inputBuffer, digit);
      return {
        ...state,
        vMem: { ...vMem, inputBuffer: newBuffer },
        display: computePresetInputDisplay(inputAxis, newBuffer, presetData, context),
      };
    }

    // Decimal key
    if (event.eventName === 'KEY_DECIMAL') {
      const newBuffer = appendDecimal(vMem.inputBuffer);
      return {
        ...state,
        vMem: { ...vMem, inputBuffer: newBuffer },
        display: computePresetInputDisplay(inputAxis, newBuffer, presetData, context),
      };
    }

    // Sign toggle
    if (event.eventName === 'KEY_SIGN') {
      const newBuffer = toggleSign(vMem.inputBuffer);
      return {
        ...state,
        vMem: { ...vMem, inputBuffer: newBuffer },
        display: computePresetInputDisplay(inputAxis, newBuffer, presetData, context),
      };
    }

    // KEY_ENTER → store value and return to preset-select
    if (event.eventName === 'KEY_ENTER') {
      const bufferValue = getBufferValue(vMem.inputBuffer);
      if (bufferValue === null && vMem.inputBuffer !== '0' && vMem.inputBuffer !== '') {
        // Invalid input - stay in current state
        return null;
      }

      // Store linear targets in scaled mm and angular targets in degrees.
      const valueInAxisUnits = bufferValue !== null
        ? displayUnitsToAxisUnits(inputAxis, bufferValue, context.nvMem)
        : 0;

      const newPresetTargets = {
        ...presetData.presetTargets,
        [inputAxis]: valueInAxisUnits,
      };

      const newPresetData: PresetData = {
        ...presetData,
        presetTargets: newPresetTargets,
        activeInputAxis: null,
      };

      return {
        stateName: 'preset-select',
        stateData: newPresetData,
        vMem: { ...vMem, inputBuffer: '' },
        display: computePresetSelectDisplay(newPresetData, context),
      };
    }

    // KEY_CLEAR in input state → return to preset-select without saving
    if (event.eventName === 'KEY_CLEAR') {
      return {
        stateName: 'preset-select',
        stateData: { ...presetData, activeInputAxis: null },
        vMem: { ...vMem, inputBuffer: '' },
        display: computePresetSelectDisplay(presetData, context),
      };
    }

    // BTN_INCH_MM → toggle unit and recompute display
    if (event.eventName === 'BTN_INCH_MM') {
      const { updatedContext } = toggleUnit(context);
      return {
        ...state,
        display: computePresetInputDisplay(inputAxis, vMem.inputBuffer, presetData, updatedContext),
      };
    }

    return null;
  }

  // Handle distance-to-go state
  if (stateName === 'distance-to-go') {
    // MILL_STATE_CHANGED → recalculate display
    if (event.eventName === 'MILL_STATE_CHANGED') {
      return {
        ...state,
        display: computeDistanceToGoDisplay(vMem, presetData, context),
      };
    }

    // KEY_CLEAR → exit to idle, restore ABS mode
    if (event.eventName === 'KEY_CLEAR') {
      const newVMem = { ...vMem, inputBuffer: '', mode: 'abs' as const };
      return {
        stateName: 'idle',
        stateData: INITIAL_DRO_STATE_DATA,
        vMem: newVMem,
        display: computeNormalDisplay(newVMem, context),
      };
    }

    // BTN_DISTANCE_TO_GO → re-enter preset-select to modify targets
    if (event.eventName === 'BTN_DISTANCE_TO_GO') {
      return {
        stateName: 'preset-select',
        stateData: presetData,
        vMem: { ...vMem, inputBuffer: '', mode: 'abs' },
        display: computePresetSelectDisplay(presetData, context),
      };
    }

    // BTN_INCH_MM → toggle unit and recompute display
    if (event.eventName === 'BTN_INCH_MM') {
      const { updatedContext } = toggleUnit(context);
      return {
        ...state,
        display: computeDistanceToGoDisplay(vMem, presetData, updatedContext),
      };
    }

    return null;
  }

  return null;
};

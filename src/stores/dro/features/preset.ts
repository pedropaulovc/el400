/**
 * Preset / Distance-to-Go Feature Reducer (US-008)
 *
 * Allows the operator to preset target positions and display distance remaining.
 * Workflow:
 * 1. Press Preset → display shows SELECT
 * 2. Press axis key → enter target value for that axis
 * 3. Press Preset again → execute, display shows distance-to-go
 * 4. Works in incremental mode without disturbing absolute datum
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
  computeNormalDisplay,
  computeAxisPositionMm,
  type DisplayState,
} from '../utils/displayComputation';
import { fromMmToAnyUnit, fromAnyUnitToMm } from '../../../utils/unitConversion';

/** Display text for preset-select state */
const SELECT_TEXT = 'SELECt';

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
    X: presetTargets.X !== null ? fromMmToAnyUnit(presetTargets.X, nvMem.defaultUnit) : SELECT_TEXT,
    Y: presetTargets.Y !== null ? fromMmToAnyUnit(presetTargets.Y, nvMem.defaultUnit) : SELECT_TEXT,
    Z: presetTargets.Z !== null ? fromMmToAnyUnit(presetTargets.Z, nvMem.defaultUnit) : SELECT_TEXT,
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
 * Compute display for distance-to-go state.
 * Shows (preset - currentPosition) for each axis with a preset.
 * Axes without presets show normal position.
 */
function computeDistanceToGoDisplay(
  vMem: VolatileMemoryState,
  presetData: PresetData,
  context: DROReducerContext
): DisplayState {
  const { presetTargets } = presetData;
  const { nvMem } = context;

  const computeAxisDisplay = (axis: Axis): number => {
    const target = presetTargets[axis];
    if (target === null) {
      // No preset for this axis - show normal position
      return fromMmToAnyUnit(computeAxisPositionMm(axis, vMem, context), nvMem.defaultUnit);
    }

    // Compute distance-to-go: target - current position
    const currentMm = computeAxisPositionMm(axis, vMem, context);
    const distanceMm = target - currentMm;
    return fromMmToAnyUnit(distanceMm, nvMem.defaultUnit);
  };

  return {
    X: computeAxisDisplay('X'),
    Y: computeAxisDisplay('Y'),
    Z: computeAxisDisplay('Z'),
  };
}

/**
 * Preset feature reducer.
 * Handles all preset/distance-to-go state transitions and events.
 */
export const presetReducer: FeatureReducer = (state, event, context) => {
  const { stateName, stateData, vMem } = state;

  // Handle BTN_PRESET from idle → preset-select
  if (stateName === 'idle' && event.eventName === 'BTN_PRESET') {
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

    // BTN_PRESET → execute (only if at least one axis has a preset)
    if (event.eventName === 'BTN_PRESET') {
      const { presetTargets } = presetData;
      const hasAnyPreset =
        presetTargets.X !== null || presetTargets.Y !== null || presetTargets.Z !== null;

      if (hasAnyPreset) {
        return {
          stateName: 'distance-to-go',
          stateData: presetData,
          vMem: { ...vMem, inputBuffer: '' },
          display: computeDistanceToGoDisplay(vMem, presetData, context),
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

      // Convert from user unit to mm for storage
      const valueInMm = bufferValue !== null
        ? fromAnyUnitToMm(bufferValue, context.nvMem.defaultUnit)
        : 0;

      const newPresetTargets = {
        ...presetData.presetTargets,
        [inputAxis]: valueInMm,
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

    // KEY_CLEAR → exit to idle
    if (event.eventName === 'KEY_CLEAR') {
      return {
        stateName: 'idle',
        stateData: INITIAL_DRO_STATE_DATA,
        vMem: { ...vMem, inputBuffer: '' },
        display: computeNormalDisplay(vMem, context),
      };
    }

    // BTN_PRESET → re-enter preset-select to modify targets
    if (event.eventName === 'BTN_PRESET') {
      return {
        stateName: 'preset-select',
        stateData: presetData,
        vMem: { ...vMem, inputBuffer: '' },
        display: computePresetSelectDisplay(presetData, context),
      };
    }

    return null;
  }

  return null;
};

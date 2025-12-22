/**
 * Settings Menu Feature Reducer
 *
 * Handles settings menu navigation and configuration.
 * Menu structure:
 * 1. Press wrench button → "SELECT" (settings-select-axis)
 * 2. Select X/Y/Z → Enter parameter menu (settings-menu)
 * 3. Navigate with 2/8 keys, modify with 4/6 keys or ENT
 * 4. Save changes (SAV CHG) or exit (END or C key twice)
 */

import type { FeatureReducer, DROReducerContext } from '../types';
import type { SettingsParameter, SettingsData } from '../droStateMachine';
import { INITIAL_DRO_STATE_DATA, INITIAL_SETTINGS_DATA } from '../droStateMachine';
import { createDisplay, computeNormalDisplay } from '../utils/displayComputation';
import type { Axis } from '../../../types/nonVolatileMemory';

/**
 * All settable parameters in order of appearance
 */
const PARAMETER_ORDER: SettingsParameter[] = [
  'SCALE_TYPE',   // LINEAR/ANGULAR
  'SC',           // Scale resolution
  'DP',           // Display resolution
  'RAD_DIA',      // Radius/Diameter (for angular)
  'DIRECTION',    // LEFT/RIGHT
  'CALIB',        // Error compensation
  'ZERO_AP',      // Zero approach warning
  'BP_DIST',      // Backplane distance
  'BP_TOLR',      // Backplane tolerance
  'BEEP',         // Keypad beep
  'SLEEP_T',      // Sleep timer
  'SAV_CHG',      // Save changes
  'RST_DEF',      // Restore defaults
  'END',          // Exit
];

/**
 * Display text for each parameter (shown on X axis display)
 * Note: Seven-segment display supports: 0-9, space, -, and letters:
 * A, b, C, c, d, E, F, G, h, I, i, J, L, l, n, m, o, P, r, S, t, U, v, X, Y
 */
const PARAMETER_DISPLAY_TEXT: Record<SettingsParameter, string> = {
  SCALE_TYPE: 'LinEAr',  // or 'AnGULAr'
  SC: 'SC',
  DP: 'dP',
  RAD_DIA: 'rAdiU5',     // or 'diA'
  DIRECTION: 'LEFt',     // or 'riGht'
  CALIB: 'CALib',
  ZERO_AP: '2Ero AP',
  BP_DIST: 'bP di5t',
  BP_TOLR: 'bP toLr',
  BEEP: 'bEEP',
  SLEEP_T: 'SLEEP t',
  SAV_CHG: 'SAv chG',
  RST_DEF: 'r5t dEF',
  END: 'End',
};

/**
 * Get parameter display text
 */
function getParameterDisplayText(
  param: SettingsParameter,
  data: SettingsData,
  context: DROReducerContext
): string {
  const { nvMem } = context;
  const axis = data.selectedAxis;

  // Merge temporary config with current nvMem
  const currentConfig = { ...nvMem, ...data.tempConfig };

  switch (param) {
    case 'SCALE_TYPE':
      if (!axis) return 'LinEAr';
      return currentConfig.axisConfig?.[axis]?.scaleType === 'angular'
        ? 'AnGULAr'
        : 'LinEAr';

    case 'SC':
      if (!axis) return '5';
      return String(currentConfig.axisConfig?.[axis]?.scaleResolution ?? 5);

    case 'DP':
      if (!axis) return '5';
      return String(currentConfig.axisConfig?.[axis]?.displayResolution ?? 5);

    case 'RAD_DIA':
      if (!axis) return 'rAdiU5';
      return currentConfig.axisConfig?.[axis]?.radiusDiameter === 'diameter'
        ? 'diA'
        : 'rAdiU5';

    case 'DIRECTION':
      if (!axis) return 'LEFt';
      return currentConfig.axisConfig?.[axis]?.scaleDirection === 'right'
        ? 'riGht'
        : 'LEFt';

    case 'CALIB':
      if (!axis) return 'oFF';
      return currentConfig.axisConfig?.[axis]?.errorCompensationEnabled ? 'on' : 'oFF';

    case 'ZERO_AP':
      return currentConfig.zeroApproachEnabled ? 'bU22 on' : 'oFF';

    case 'BP_DIST':
      return String(currentConfig.zeroApproachDistance ?? 0.002);

    case 'BP_TOLR':
      return String(currentConfig.zeroApproachTolerance ?? 0.0);

    case 'BEEP':
      return currentConfig.beepEnabled ? 'on' : 'oFF';

    case 'SLEEP_T':
      return String(currentConfig.sleepTimer ?? 0).padStart(3, '0');

    case 'SAV_CHG':
      return '5Av chG';

    case 'RST_DEF':
      return 'r5t dEF';

    case 'END':
      return 'End';

    default:
      return PARAMETER_DISPLAY_TEXT[param] ?? '';
  }
}

/**
 * Compute display for settings-select-axis state
 */
function computeSelectAxisDisplay(): ReturnType<typeof createDisplay> {
  return createDisplay('SELECt', '', '');
}

/**
 * Compute display for settings-menu state
 */
function computeSettingsMenuDisplay(
  data: SettingsData,
  context: DROReducerContext
): ReturnType<typeof createDisplay> {
  const paramText = PARAMETER_DISPLAY_TEXT[data.currentParameter] ?? '';
  const valueText = getParameterDisplayText(data.currentParameter, data, context);

  return createDisplay(paramText, valueText, '');
}

/**
 * Navigate to next parameter (KEY_2_DOWN)
 */
function navigateDown(data: SettingsData): SettingsData {
  const nextIndex = (data.parameterIndex + 1) % PARAMETER_ORDER.length;
  const nextParam = PARAMETER_ORDER[nextIndex];

  return {
    ...data,
    parameterIndex: nextIndex,
    currentParameter: nextParam ?? data.currentParameter,
  };
}

/**
 * Navigate to previous parameter (KEY_8_UP)
 */
function navigateUp(data: SettingsData): SettingsData {
  const prevIndex =
    (data.parameterIndex - 1 + PARAMETER_ORDER.length) % PARAMETER_ORDER.length;
  const prevParam = PARAMETER_ORDER[prevIndex];

  return {
    ...data,
    parameterIndex: prevIndex,
    currentParameter: prevParam ?? data.currentParameter,
  };
}

/**
 * Toggle or modify parameter value (KEY_6_RIGHT or KEY_ENTER)
 */
function modifyParameter(
  data: SettingsData,
  context: DROReducerContext
): SettingsData {
  const { nvMem } = context;
  const axis = data.selectedAxis;
  const param = data.currentParameter;

  // Get current config (nvMem merged with temp changes)
  const currentConfig = { ...nvMem, ...data.tempConfig };

  // Create a new tempConfig with the modification
  let newTempConfig = { ...data.tempConfig };

  switch (param) {
    case 'SCALE_TYPE':
      if (!axis) break;
      const currentScaleType =
        currentConfig.axisConfig?.[axis]?.scaleType ?? 'linear';
      newTempConfig = {
        ...newTempConfig,
        axisConfig: {
          ...currentConfig.axisConfig,
          [axis]: {
            ...currentConfig.axisConfig[axis],
            scaleType: currentScaleType === 'linear' ? 'angular' : 'linear',
          },
        },
      };
      break;

    case 'DIRECTION':
      if (!axis) break;
      const currentDirection =
        currentConfig.axisConfig?.[axis]?.scaleDirection ?? 'left';
      newTempConfig = {
        ...newTempConfig,
        axisConfig: {
          ...currentConfig.axisConfig,
          [axis]: {
            ...currentConfig.axisConfig[axis],
            scaleDirection: currentDirection === 'left' ? 'right' : 'left',
          },
        },
      };
      break;

    case 'RAD_DIA':
      if (!axis) break;
      const currentRadDia =
        currentConfig.axisConfig?.[axis]?.radiusDiameter ?? 'radius';
      newTempConfig = {
        ...newTempConfig,
        axisConfig: {
          ...currentConfig.axisConfig,
          [axis]: {
            ...currentConfig.axisConfig[axis],
            radiusDiameter: currentRadDia === 'radius' ? 'diameter' : 'radius',
          },
        },
      };
      break;

    case 'CALIB':
      if (!axis) break;
      const currentCalib =
        currentConfig.axisConfig?.[axis]?.errorCompensationEnabled ?? false;
      newTempConfig = {
        ...newTempConfig,
        axisConfig: {
          ...currentConfig.axisConfig,
          [axis]: {
            ...currentConfig.axisConfig[axis],
            errorCompensationEnabled: !currentCalib,
          },
        },
      };
      break;

    case 'ZERO_AP':
      newTempConfig = {
        ...newTempConfig,
        zeroApproachEnabled: !currentConfig.zeroApproachEnabled,
      };
      break;

    case 'BEEP':
      newTempConfig = {
        ...newTempConfig,
        beepEnabled: !currentConfig.beepEnabled,
      };
      break;

    // For numeric values, would need input buffer handling
    // For now, just cycle through common values
    case 'SC':
      if (!axis) break;
      const currentSC = currentConfig.axisConfig?.[axis]?.scaleResolution ?? 5;
      const scaleValues = [1, 2, 5, 10, 20];
      const scIndex = scaleValues.indexOf(currentSC);
      const nextSC =
        scIndex === -1 ? 5 : scaleValues[(scIndex + 1) % scaleValues.length];
      newTempConfig = {
        ...newTempConfig,
        axisConfig: {
          ...currentConfig.axisConfig,
          [axis]: {
            ...currentConfig.axisConfig[axis],
            scaleResolution: nextSC ?? 5,
          },
        },
      };
      break;

    case 'DP':
      if (!axis) break;
      const currentDP = currentConfig.axisConfig?.[axis]?.displayResolution ?? 5;
      const dpValues = [1, 2, 5, 10, 50];
      const dpIndex = dpValues.indexOf(currentDP);
      const nextDP =
        dpIndex === -1 ? 5 : dpValues[(dpIndex + 1) % dpValues.length];
      newTempConfig = {
        ...newTempConfig,
        axisConfig: {
          ...currentConfig.axisConfig,
          [axis]: {
            ...currentConfig.axisConfig[axis],
            displayResolution: nextDP ?? 5,
          },
        },
      };
      break;

    case 'SLEEP_T':
      const currentSleep = currentConfig.sleepTimer ?? 0;
      const sleepValues = [0, 5, 10, 15, 30, 60, 120];
      const sleepIndex = sleepValues.indexOf(currentSleep);
      const nextSleep =
        sleepIndex === -1 ? 0 : sleepValues[(sleepIndex + 1) % sleepValues.length];
      newTempConfig = {
        ...newTempConfig,
        sleepTimer: nextSleep ?? 0,
      };
      break;

    // SAV_CHG, RST_DEF, END handled separately
    default:
      break;
  }

  return {
    ...data,
    tempConfig: newTempConfig,
  };
}

/**
 * Settings menu reducer
 */
export const settingsReducer: FeatureReducer = (current, event, context) => {
  const { stateName: state, stateData: data, vMem } = current;

  // Handle BTN_WRENCH from idle state
  if (event.eventName === 'BTN_WRENCH' && state === 'idle') {
    return {
      stateName: 'settings-select-axis',
      stateData: INITIAL_SETTINGS_DATA,
      vMem,
      display: computeSelectAxisDisplay(),
    };
  }

  // Handle settings-select-axis state
  if (state === 'settings-select-axis') {
    // Select axis with BTN_SELECT_X/Y/Z
    if (
      event.eventName === 'BTN_SELECT_X' ||
      event.eventName === 'BTN_SELECT_Y' ||
      event.eventName === 'BTN_SELECT_Z'
    ) {
      const axis: Axis =
        event.eventName === 'BTN_SELECT_X'
          ? 'X'
          : event.eventName === 'BTN_SELECT_Y'
            ? 'Y'
            : 'Z';

      const settingsData: SettingsData = {
        stateDataType: 'settings',
        selectedAxis: axis,
        currentParameter: 'SCALE_TYPE',
        parameterIndex: 0,
        tempConfig: {},
      };

      return {
        stateName: 'settings-menu',
        stateData: settingsData,
        vMem,
        display: computeSettingsMenuDisplay(settingsData, context),
      };
    }

    // Exit with C key
    if (event.eventName === 'KEY_CLEAR') {
      return {
        stateName: 'idle',
        stateData: INITIAL_DRO_STATE_DATA,
        vMem,
        display: computeNormalDisplay(vMem, context),
      };
    }

    return null;
  }

  // Handle settings-menu state
  if (state === 'settings-menu' && data.stateDataType === 'settings') {
    // Navigate down (KEY_2_DOWN)
    if (event.eventName === 'KEY_2_DOWN') {
      const newData = navigateDown(data);
      return {
        stateName: state,
        stateData: newData,
        vMem,
        display: computeSettingsMenuDisplay(newData, context),
      };
    }

    // Navigate up (KEY_8_UP)
    if (event.eventName === 'KEY_8_UP') {
      const newData = navigateUp(data);
      return {
        stateName: state,
        stateData: newData,
        vMem,
        display: computeSettingsMenuDisplay(newData, context),
      };
    }

    // Modify parameter (KEY_6_RIGHT or KEY_ENTER for toggles)
    if (event.eventName === 'KEY_6_RIGHT' || event.eventName === 'KEY_ENTER') {
      // Handle special actions
      if (data.currentParameter === 'SAV_CHG') {
        // Save changes to nvMem (this would trigger a context action)
        // For now, just exit to idle
        // TODO: Implement save to localStorage via context callback
        return {
          stateName: 'idle',
          stateData: INITIAL_DRO_STATE_DATA,
          vMem,
          display: computeNormalDisplay(vMem, context),
        };
      }

      if (data.currentParameter === 'RST_DEF') {
        // Restore defaults
        // TODO: Implement restore defaults with password prompt
        return {
          stateName: 'idle',
          stateData: INITIAL_DRO_STATE_DATA,
          vMem,
          display: computeNormalDisplay(vMem, context),
        };
      }

      if (data.currentParameter === 'END') {
        // Exit without saving
        return {
          stateName: 'idle',
          stateData: INITIAL_DRO_STATE_DATA,
          vMem,
          display: computeNormalDisplay(vMem, context),
        };
      }

      // For other parameters, modify the value
      const newData = modifyParameter(data, context);
      return {
        stateName: state,
        stateData: newData,
        vMem,
        display: computeSettingsMenuDisplay(newData, context),
      };
    }

    // Exit with C key (discard changes)
    if (event.eventName === 'KEY_CLEAR') {
      return {
        stateName: 'idle',
        stateData: INITIAL_DRO_STATE_DATA,
        vMem,
        display: computeNormalDisplay(vMem, context),
      };
    }

    return null;
  }

  return null;
};

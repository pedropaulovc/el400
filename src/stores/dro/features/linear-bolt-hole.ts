/**
 * Linear Bolt Hole Feature Reducer (US-029)
 *
 * Implements the EL400 Linear Bolt Hole macro (manual §9.1.6): an equally
 * spaced pattern of holes along a single axis.
 *
 * Flow:
 * 1. Select the axis along which the pattern is generated (X, Y or Z).
 * 2. Selecting the axis resets (zeroes) it and switches to INC mode.
 * 3. Enter the pitch (spacing between holes) and confirm.
 * 4. The DRO returns to counting mode showing distance-to-go to the first
 *    hole. Pressing 6 (right) advances indefinitely; 4 clamps at hole one.
 * 5. Pressing C exits the macro back to idle/ABS.
 */

import type { FeatureReducer, DROReducerContext } from '../types';
import type { DROStateName, LinearBoltHoleData } from '../droStateMachine';
import {
  INITIAL_DRO_STATE_DATA,
  INITIAL_LINEAR_BOLT_HOLE_DATA,
  isLinearBoltHoleActive,
} from '../droStateMachine';
import type { Axis, VolatileMemoryState } from '../../../types/volatileMemory';
import {
  getBufferValue,
  appendDigit,
  appendDecimal,
  toggleSign,
  removeLastChar,
  KEY_TO_DIGIT,
} from './buffer-utils';
import {
  computeMachinePositionMm,
  computeNormalDisplay,
  createDisplay,
  type DisplayState,
} from '../utils/displayComputation';
import { fromMmToAnyUnit, fromAnyUnitToMm } from '../../../utils/unitConversion';

/** Prompt text shown for the axis-selection and parameter-entry states. */
const AXIS_PROMPT = 'AXIS';
const PITCH_PROMPT = 'PitCh';

/** The pitch state accepts numeric input. */
const PARAMETER_ENTRY_STATES: DROStateName[] = ['linear-bolt-hole-pitch'];

function isParameterEntryState(state: DROStateName): boolean {
  return PARAMETER_ENTRY_STATES.includes(state);
}

/** The axis used to show a prompt while the selected axis shows the value. */
function promptAxisFor(selected: Axis | null): Axis {
  // Show the prompt on X unless X is the value axis, then use Y.
  return selected === 'X' ? 'Y' : 'X';
}

/**
 * Format buffer value for display.
 * Empty/partial buffers show 0; otherwise the parsed numeric value.
 */
function formatBufferForDisplay(buffer: string): number {
  if (!buffer || buffer === '-' || buffer === '.' || buffer === '-.') {
    return 0;
  }
  const value = parseFloat(buffer);
  return Number.isFinite(value) ? value : 0;
}

/**
 * Display for the axis-selection state: X shows the "AXIS" prompt, others blank.
 */
export function computeLinearAxisSelectDisplay(): DisplayState {
  return createDisplay(AXIS_PROMPT, '', '');
}

/**
 * Display for pitch entry. The selected axis shows the live buffer value and
 * another axis shows the prompt.
 */
function computeParameterEntryDisplay(
  data: LinearBoltHoleData,
  vMem: VolatileMemoryState
): DisplayState {
  const value = formatBufferForDisplay(vMem.inputBuffer);
  const valueAxis = data.axis ?? 'X';

  const cellFor = (axis: Axis): number | string => {
    if (axis === valueAxis) return value;
    if (axis === promptAxisFor(data.axis)) return PITCH_PROMPT;
    return '';
  };
  return createDisplay(cellFor('X'), cellFor('Y'), cellFor('Z'));
}

/**
 * Distance-to-go for one axis (in mm) using the ABS position frame, so the
 * value tracks encoder movement in connected mode. Hole N sits at
 * (N-1)*pitch from the reset point (the ABS origin after reset).
 */
function distanceToGoMm(
  axis: Axis,
  data: LinearBoltHoleData,
  vMem: VolatileMemoryState,
  context: DROReducerContext
): number {
  const pitch = data.pitch ?? 0;
  const holePositionMm = (data.currentHole - 1) * pitch;
  const currentMm = context.millState.connected
    ? computeMachinePositionMm(axis, vMem, context) - vMem.workOffsets[axis]
    : vMem.manualAbsoluteValues[axis];
  return holePositionMm - currentMm;
}

/**
 * Compute distance-to-go display for the navigate state.
 * The selected axis shows the distance to the current hole; the other axes
 * show their normal position. All values use the ABS frame so they track
 * encoder movement after reset.
 */
function computeLinearNavigateDisplay(
  data: LinearBoltHoleData,
  vMem: VolatileMemoryState,
  context: DROReducerContext
): DisplayState {
  // Compute the base display in ABS so non-selected axes track position too.
  const absVMem = { ...vMem, mode: 'abs' as const };
  const base = computeNormalDisplay(absVMem, context);
  const { axis, pitch } = data;
  if (axis === null || pitch === null) {
    return base;
  }
  const unit = context.nvMem.defaultUnit;
  const distance = fromMmToAnyUnit(distanceToGoMm(axis, data, vMem, context), unit);
  return { ...base, [axis]: distance };
}

/**
 * Reset (zero) the selected axis in the ABS frame so the reset point becomes
 * the pattern origin. Mirrors how zeroing an axis works in idle.
 */
function resetAxis(
  vMem: VolatileMemoryState,
  axis: Axis,
  context: DROReducerContext
): VolatileMemoryState {
  if (context.millState.connected) {
    const machinePos = computeMachinePositionMm(axis, vMem, context);
    return { ...vMem, workOffsets: { ...vMem.workOffsets, [axis]: machinePos } };
  }
  return { ...vMem, manualAbsoluteValues: { ...vMem.manualAbsoluteValues, [axis]: 0 } };
}

export const linearBoltHoleReducer: FeatureReducer = (statePayload, eventPayload, context) => {
  const { stateName: state, stateData: data, vMem } = statePayload;
  const { eventName } = eventPayload;

  if (!isLinearBoltHoleActive(state)) return null;

  const linearData =
    data.stateDataType === 'linear-bolt-hole' ? data : INITIAL_LINEAR_BOLT_HOLE_DATA;

  // Keep the display live as the mill position changes.
  if (eventName === 'MILL_STATE_CHANGED') {
    if (state === 'linear-bolt-hole-navigate') {
      return {
        ...statePayload,
        display: computeLinearNavigateDisplay(linearData, vMem, context),
      };
    }
    return statePayload;
  }

  // KEY_CLEAR: backspace while typing, otherwise exit to idle/ABS.
  if (eventName === 'KEY_CLEAR') {
    if (vMem.inputBuffer !== '') {
      const newBuffer = removeLastChar(vMem.inputBuffer);
      const newVMem = { ...vMem, inputBuffer: newBuffer };
      return {
        ...statePayload,
        vMem: newVMem,
        display: isParameterEntryState(state)
          ? computeParameterEntryDisplay(linearData, newVMem)
          : statePayload.display,
      };
    }
    const restoredVMem = { ...vMem, mode: 'abs' as const, inputBuffer: '' };
    return {
      stateName: 'idle',
      stateData: INITIAL_DRO_STATE_DATA,
      vMem: restoredVMem,
      display: computeNormalDisplay(restoredVMem, context),
    };
  }

  // Numeric input only matters in parameter-entry states.
  if (isParameterEntryState(state)) {
    const digit = KEY_TO_DIGIT[eventName];
    if (digit !== undefined) {
      const newVMem = { ...vMem, inputBuffer: appendDigit(vMem.inputBuffer, digit) };
      return {
        ...statePayload,
        vMem: newVMem,
        display: computeParameterEntryDisplay(linearData, newVMem),
      };
    }
    if (eventName === 'KEY_DECIMAL') {
      const newVMem = { ...vMem, inputBuffer: appendDecimal(vMem.inputBuffer) };
      return {
        ...statePayload,
        vMem: newVMem,
        display: computeParameterEntryDisplay(linearData, newVMem),
      };
    }
    if (eventName === 'KEY_SIGN') {
      const newVMem = { ...vMem, inputBuffer: toggleSign(vMem.inputBuffer) };
      return {
        ...statePayload,
        vMem: newVMem,
        display: computeParameterEntryDisplay(linearData, newVMem),
      };
    }
  }

  switch (state) {
    case 'linear-bolt-hole-axis': {
      // Select the pattern axis. Selecting resets that axis and switches to INC.
      const axisFromEvent: Axis | null =
        eventName === 'BTN_SELECT_X'
          ? 'X'
          : eventName === 'BTN_SELECT_Y'
            ? 'Y'
            : eventName === 'BTN_SELECT_Z'
              ? 'Z'
              : null;
      if (axisFromEvent === null) return null;

      const newData: LinearBoltHoleData = {
        ...linearData,
        axis: axisFromEvent,
        currentHole: 1,
      };
      const resetVMem = {
        ...resetAxis(vMem, axisFromEvent, context),
        mode: 'inc' as const,
        inputBuffer: '',
      };
      return {
        stateName: 'linear-bolt-hole-pitch',
        stateData: newData,
        vMem: resetVMem,
        display: computeParameterEntryDisplay(newData, resetVMem),
      };
    }

    case 'linear-bolt-hole-pitch': {
      if (eventName === 'KEY_ENTER') {
        const value = getBufferValue(vMem.inputBuffer);
        if (value === null || !Number.isFinite(value) || value <= 0) return null;
        const pitchMm = fromAnyUnitToMm(value, context.nvMem.defaultUnit);
        if (!Number.isFinite(pitchMm) || pitchMm <= 0) return null;
        const newData: LinearBoltHoleData = {
          ...linearData,
          pitch: pitchMm,
          currentHole: 1,
        };
        const newVMem = { ...vMem, inputBuffer: '' };
        return {
          stateName: 'linear-bolt-hole-navigate',
          stateData: newData,
          vMem: newVMem,
          display: computeLinearNavigateDisplay(newData, newVMem, context),
        };
      }
      return null;
    }

    case 'linear-bolt-hole-navigate': {
      const { axis, pitch, currentHole } = linearData;
      if (
        axis === null ||
        pitch === null ||
        !Number.isFinite(pitch) ||
        pitch <= 0 ||
        !Number.isSafeInteger(currentHole) ||
        currentHole < 1
      ) {
        return {
          stateName: 'idle',
          stateData: INITIAL_DRO_STATE_DATA,
          vMem,
          display: computeNormalDisplay(vMem, context),
        };
      }

      // The manual defines no terminal count. Advance while both the ordinal
      // and its generated target remain numerically safe.
      if (eventName === 'KEY_6_RIGHT') {
        const nextHole = currentHole + 1;
        const nextPositionMm = (nextHole - 1) * pitch;
        if (!Number.isSafeInteger(nextHole) || !Number.isFinite(nextPositionMm)) {
          return null;
        }
        const newData: LinearBoltHoleData = { ...linearData, currentHole: nextHole };
        return {
          stateName: 'linear-bolt-hole-navigate',
          stateData: newData,
          vMem,
          display: computeLinearNavigateDisplay(newData, vMem, context),
        };
      }

      // There is no upper-count wrap. At the first hole, previous remains at
      // the reset origin.
      if (eventName === 'KEY_4_LEFT') {
        const prevHole = currentHole > 1 ? currentHole - 1 : 1;
        const newData: LinearBoltHoleData = { ...linearData, currentHole: prevHole };
        return {
          stateName: 'linear-bolt-hole-navigate',
          stateData: newData,
          vMem,
          display: computeLinearNavigateDisplay(newData, vMem, context),
        };
      }

      return null;
    }

    default:
      return null;
  }
};

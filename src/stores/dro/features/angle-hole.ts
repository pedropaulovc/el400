/**
 * Angle Hole (Linear Hole Pattern) Feature Reducer
 *
 * Handles linear hole pattern generation (manual §9.1.4 "Angle Hole Function").
 * Holes are placed evenly along a straight line at an arbitrary angle.
 * Supports:
 * - Parameter entry: start X/Y, pitch (hole spacing), line angle, hole count
 * - End point is derived automatically (not entered)
 * - Distance-to-go navigation between holes
 * - Hole navigation: 6=next, 4=prev, 8=show current, 2=jump to specific
 *
 * Angle convention (manual): 0° = +X (horizontal right), 90° = +Y (vertical up),
 * measured counter-clockwise.
 */

import { useEffect, type Dispatch } from 'react';
import type { FeatureReducer, DROReducerContext } from '../types';
import type { DROStateName, AngleHoleData, DROEventPayload } from '../droStateMachine';
import {
  INITIAL_DRO_STATE_DATA,
  INITIAL_ANGLE_HOLE_DATA,
  isAngleHoleActive,
} from '../droStateMachine';
import type { VolatileMemoryState } from '../../../types/volatileMemory';
import {
  getBufferValue,
  appendDigit,
  appendDecimal,
  toggleSign,
  removeLastChar,
  KEY_TO_DIGIT,
} from './buffer-utils';
import {
  computeNormalDisplay,
  createDisplay,
  type DisplayState,
} from '../utils/displayComputation';
import { fromMmToAnyUnit, fromAnyUnitToMm } from '../../../utils/unitConversion';

/**
 * Duration in milliseconds for the angle hole intro message ("AnGhoLE") before auto-advancing.
 */
export const ANGLE_HOLE_INTRO_DURATION_MS = 1000;

/** Display text for angle hole states (matches manual abbreviations) */
const ANGLE_HOLE_DISPLAY_TEXT: Record<string, string> = {
  'angle-hole-intro': 'AnGhoLE',
  'angle-hole-start-x': 'EntCnt0',
  'angle-hole-start-y': 'EntCnt1',
  'angle-hole-pitch': 'P itCh',
  'angle-hole-angle': 'AnGLE',
  'angle-hole-holes': 'hoLES',
};

/** States that accept numeric input for parameter entry */
const PARAMETER_ENTRY_STATES: DROStateName[] = [
  'angle-hole-start-x',
  'angle-hole-start-y',
  'angle-hole-pitch',
  'angle-hole-angle',
  'angle-hole-holes',
];

/** Check if current state accepts numeric input */
function isParameterEntryState(state: DROStateName): boolean {
  return PARAMETER_ENTRY_STATES.includes(state);
}

/**
 * Calculate the position of a specific hole on the line.
 * @param angleData - Angle hole configuration
 * @param holeNumber - 1-indexed hole number
 * @returns Position {x, y} in mm
 */
function calculateHolePosition(
  angleData: AngleHoleData,
  holeNumber: number
): { x: number; y: number } {
  const { startX, startY, pitch, lineAngle, holeCount } = angleData;
  if (
    startX === null ||
    startY === null ||
    pitch === null ||
    lineAngle === null ||
    holeCount === null
  ) {
    return { x: 0, y: 0 };
  }

  // Holes are 0-indexed from the start point along the line.
  const distance = (holeNumber - 1) * pitch;
  const angleRad = (lineAngle * Math.PI) / 180;

  return {
    x: startX + distance * Math.cos(angleRad),
    y: startY + distance * Math.sin(angleRad),
  };
}

/**
 * Compute display showing distance-to-go to current hole.
 * Shows (holePosition - currentPosition) in user's preferred unit.
 */
function computeAngleHoleNavigateDisplay(
  angleData: AngleHoleData,
  vMem: VolatileMemoryState,
  context: DROReducerContext
): DisplayState {
  const holePos = calculateHolePosition(angleData, angleData.currentHole);

  // Always use absolute position for distance-to-go calculation (not mode-dependent)
  const { millState } = context;
  const currentX = millState.connected
    ? millState.position.x - vMem.workOffsets.X
    : vMem.manualAbsoluteValues.X;
  const currentY = millState.connected
    ? millState.position.y - vMem.workOffsets.Y
    : vMem.manualAbsoluteValues.Y;

  const unit = context.nvMem.defaultUnit;

  return createDisplay(
    fromMmToAnyUnit(holePos.x - currentX, unit),
    fromMmToAnyUnit(holePos.y - currentY, unit),
    computeNormalDisplay(vMem, context).Z
  );
}

/**
 * Format buffer value for display.
 * - Empty/partial buffer: shows 0
 * - Otherwise the parsed numeric value (display formatting handles precision)
 */
function formatBufferForDisplay(buffer: string): number {
  if (!buffer || buffer === '-' || buffer === '.' || buffer === '-.') {
    return 0;
  }
  const value = parseFloat(buffer);
  if (isNaN(value)) {
    return 0;
  }
  return value;
}

/**
 * Compute display for parameter entry states.
 * For start-x: X shows buffer value, Y shows prompt text
 * For all others: X shows prompt text, Y shows buffer value
 * Z always shows empty string
 */
function computeParameterEntryDisplay(
  state: DROStateName,
  vMem: VolatileMemoryState
): DisplayState {
  const promptText = ANGLE_HOLE_DISPLAY_TEXT[state] ?? '';
  const bufferValue = formatBufferForDisplay(vMem.inputBuffer);

  // For start-x, swap X and Y: X shows value, Y shows prompt
  if (state === 'angle-hole-start-x') {
    return createDisplay(bufferValue, promptText, '');
  }

  // For all others: X shows prompt, Y shows value
  return createDisplay(promptText, bufferValue, '');
}

export const angleHoleReducer: FeatureReducer = (statePayload, eventPayload, context) => {
  const { stateName: state, stateData: data, vMem } = statePayload;
  const { eventName } = eventPayload;

  // Handle angle hole states (entry is handled by idleReducer)
  if (!isAngleHoleActive(state)) return null;

  const angleData = data.stateDataType === 'angle-hole' ? data : INITIAL_ANGLE_HOLE_DATA;

  // Handle MILL_STATE_CHANGED - update display when position changes
  if (eventName === 'MILL_STATE_CHANGED') {
    if (state === 'angle-hole-navigate') {
      return {
        ...statePayload,
        display: computeAngleHoleNavigateDisplay(angleData, vMem, context),
      };
    }
    if (isParameterEntryState(state)) {
      return {
        ...statePayload,
        display: computeParameterEntryDisplay(state, vMem),
      };
    }
    return statePayload;
  }

  // KEY_CLEAR exits the macro at any point (unless buffer has content - then it erases)
  if (eventName === 'KEY_CLEAR') {
    // If buffer has content, erase last character (backspace)
    if (vMem.inputBuffer !== '') {
      const newBuffer = removeLastChar(vMem.inputBuffer);
      return {
        ...statePayload,
        vMem: { ...vMem, inputBuffer: newBuffer },
        display: isParameterEntryState(state)
          ? computeParameterEntryDisplay(state, { ...vMem, inputBuffer: newBuffer })
          : statePayload.display,
      };
    }
    // If buffer is empty, exit to idle and restore ABS mode
    const restoredVMem = { ...vMem, mode: 'abs' as const };
    return {
      stateName: 'idle',
      stateData: INITIAL_DRO_STATE_DATA,
      vMem: restoredVMem,
      display: computeNormalDisplay(restoredVMem, context),
    };
  }

  // Handle digit/decimal/sign input in parameter entry states only
  if (isParameterEntryState(state)) {
    const digit = KEY_TO_DIGIT[eventName];
    if (digit !== undefined) {
      const newBuffer = appendDigit(vMem.inputBuffer, digit);
      return {
        ...statePayload,
        vMem: { ...vMem, inputBuffer: newBuffer },
        display: computeParameterEntryDisplay(state, { ...vMem, inputBuffer: newBuffer }),
      };
    }

    if (eventName === 'KEY_DECIMAL') {
      const newBuffer = appendDecimal(vMem.inputBuffer);
      return {
        ...statePayload,
        vMem: { ...vMem, inputBuffer: newBuffer },
        display: computeParameterEntryDisplay(state, { ...vMem, inputBuffer: newBuffer }),
      };
    }

    if (eventName === 'KEY_SIGN') {
      const newBuffer = toggleSign(vMem.inputBuffer);
      return {
        ...statePayload,
        vMem: { ...vMem, inputBuffer: newBuffer },
        display: computeParameterEntryDisplay(state, { ...vMem, inputBuffer: newBuffer }),
      };
    }
  }

  switch (state) {
    case 'angle-hole-intro': {
      // Timed intro state - shows "AnGhoLE" for 1 second, then advances to start-x entry
      if (eventName === 'ANGLE_HOLE_INTRO_TIMEOUT') {
        const newVMem = { ...vMem, inputBuffer: '' };
        return {
          stateName: 'angle-hole-start-x',
          stateData: angleData,
          vMem: newVMem,
          display: computeParameterEntryDisplay('angle-hole-start-x', newVMem),
        };
      }
      return statePayload;
    }

    case 'angle-hole-start-x': {
      if (eventName === 'KEY_ENTER') {
        const value = getBufferValue(vMem.inputBuffer);
        if (value === null) return null;
        const valueMm = fromAnyUnitToMm(value, context.nvMem.defaultUnit);
        const newData = { ...angleData, startX: valueMm };
        const newVMem = { ...vMem, inputBuffer: '' };
        return {
          stateName: 'angle-hole-start-y',
          stateData: newData,
          vMem: newVMem,
          display: computeParameterEntryDisplay('angle-hole-start-y', newVMem),
        };
      }
      return null;
    }

    case 'angle-hole-start-y': {
      if (eventName === 'KEY_ENTER') {
        const value = getBufferValue(vMem.inputBuffer);
        if (value === null) return null;
        const valueMm = fromAnyUnitToMm(value, context.nvMem.defaultUnit);
        const newData = { ...angleData, startY: valueMm };
        const newVMem = { ...vMem, inputBuffer: '' };
        return {
          stateName: 'angle-hole-pitch',
          stateData: newData,
          vMem: newVMem,
          display: computeParameterEntryDisplay('angle-hole-pitch', newVMem),
        };
      }
      return null;
    }

    case 'angle-hole-pitch': {
      if (eventName === 'KEY_ENTER') {
        const value = getBufferValue(vMem.inputBuffer);
        // Pitch must be a positive spacing distance
        if (value === null || value <= 0) return null;
        const valueMm = fromAnyUnitToMm(value, context.nvMem.defaultUnit);
        const newData = { ...angleData, pitch: valueMm };
        const newVMem = { ...vMem, inputBuffer: '' };
        return {
          stateName: 'angle-hole-angle',
          stateData: newData,
          vMem: newVMem,
          display: computeParameterEntryDisplay('angle-hole-angle', newVMem),
        };
      }
      return null;
    }

    case 'angle-hole-angle': {
      if (eventName === 'KEY_ENTER') {
        const value = getBufferValue(vMem.inputBuffer);
        if (value === null) return null;
        // Normalize angle to 0-359 range (angle is unitless degrees, no conversion)
        const normalizedAngle = ((value % 360) + 360) % 360;
        const newData = { ...angleData, lineAngle: normalizedAngle };
        const newVMem = { ...vMem, inputBuffer: '' };
        return {
          stateName: 'angle-hole-holes',
          stateData: newData,
          vMem: newVMem,
          display: computeParameterEntryDisplay('angle-hole-holes', newVMem),
        };
      }
      return null;
    }

    case 'angle-hole-holes': {
      if (eventName === 'KEY_ENTER') {
        const value = getBufferValue(vMem.inputBuffer);
        if (value === null || value < 2 || value > 999) return null;

        const newData: AngleHoleData = {
          ...angleData,
          holeCount: Math.floor(value),
          currentHole: 1,
        };
        // Switch to INC mode for distance-to-go display
        const newVMem = {
          ...vMem,
          mode: 'inc' as const,
          inputBuffer: '',
        };

        return {
          stateName: 'angle-hole-navigate',
          stateData: newData,
          vMem: newVMem,
          display: computeAngleHoleNavigateDisplay(newData, newVMem, context),
        };
      }
      return null;
    }

    case 'angle-hole-navigate': {
      const { holeCount, currentHole } = angleData;

      if (holeCount === null) {
        return {
          stateName: 'idle',
          stateData: INITIAL_DRO_STATE_DATA,
          vMem,
          display: computeNormalDisplay(vMem, context),
        };
      }

      // Key 6: Advance to next hole
      if (eventName === 'KEY_6_RIGHT') {
        const nextHole = currentHole >= holeCount ? 1 : currentHole + 1;
        const newData = { ...angleData, currentHole: nextHole };
        return {
          stateName: 'angle-hole-navigate',
          stateData: newData,
          vMem: { ...vMem, inputBuffer: '' },
          display: computeAngleHoleNavigateDisplay(newData, vMem, context),
        };
      }

      // Key 4: Go to previous hole
      if (eventName === 'KEY_4_LEFT') {
        const prevHole = currentHole <= 1 ? holeCount : currentHole - 1;
        const newData = { ...angleData, currentHole: prevHole };
        return {
          stateName: 'angle-hole-navigate',
          stateData: newData,
          vMem: { ...vMem, inputBuffer: '' },
          display: computeAngleHoleNavigateDisplay(newData, vMem, context),
        };
      }

      // Key 8: Show current hole number by putting it in inputBuffer
      if (eventName === 'KEY_8_UP') {
        return {
          ...statePayload,
          vMem: { ...vMem, inputBuffer: String(currentHole) },
        };
      }

      // Key 2: Jump to specific hole - clear buffer for input
      if (eventName === 'KEY_2_DOWN') {
        return {
          ...statePayload,
          vMem: { ...vMem, inputBuffer: '' },
        };
      }

      // If there's a number in the buffer and user presses ENTER, jump to that hole
      if (eventName === 'KEY_ENTER' && vMem.inputBuffer !== '') {
        const targetHole = getBufferValue(vMem.inputBuffer);
        if (targetHole !== null && targetHole >= 1 && targetHole <= holeCount) {
          const newData = { ...angleData, currentHole: Math.floor(targetHole) };
          return {
            stateName: 'angle-hole-navigate',
            stateData: newData,
            vMem: { ...vMem, inputBuffer: '' },
            display: computeAngleHoleNavigateDisplay(newData, vMem, context),
          };
        }
        return null;
      }

      // Handle digit input for hole number entry (after arrow keys processed)
      // Only non-arrow digit keys: 0, 1, 3, 5, 7, 9
      const digit = KEY_TO_DIGIT[eventName];
      if (digit !== undefined) {
        return {
          ...statePayload,
          vMem: {
            ...vMem,
            inputBuffer: appendDigit(vMem.inputBuffer, digit),
          },
        };
      }

      return null;
    }

    default:
      return null;
  }
};

/**
 * Hook to manage angle hole intro timing.
 * Auto-advances from intro state after ANGLE_HOLE_INTRO_DURATION_MS.
 *
 * @param dispatch - DRO state machine dispatch function
 * @param droState - Current DRO state
 */
export function useAngleHoleIntro(
  dispatch: Dispatch<DROEventPayload>,
  droState: DROStateName
) {
  useEffect(() => {
    if (droState === 'angle-hole-intro') {
      const timer = setTimeout(() => {
        dispatch({ eventName: 'ANGLE_HOLE_INTRO_TIMEOUT' });
      }, ANGLE_HOLE_INTRO_DURATION_MS);
      return () => { clearTimeout(timer); };
    }
    return undefined;
  }, [droState, dispatch]);
}

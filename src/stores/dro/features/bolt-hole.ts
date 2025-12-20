/**
 * Bolt Hole Circle Feature Reducer
 *
 * Handles bolt hole drilling pattern generation for full circles.
 * Supports:
 * - CIRCLE/ARC mode selection (toggle with key 6)
 * - Parameter entry: center X/Y, radius, angle, hole count
 * - Distance-to-go navigation between holes
 * - Hole navigation: 6=next, 4=prev, 8=show current, 2=jump to specific
 */

import { useEffect, type Dispatch } from 'react';
import type { FeatureReducer, DROReducerContext } from '../types';
import type { DROStateName, BoltHoleData, DROEventPayload } from '../droStateMachine';
import {
  INITIAL_DRO_STATE_DATA,
  INITIAL_BOLT_HOLE_DATA,
  isBoltHoleActive,
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
  computeAxisPositionMm,
  createDisplay,
  type DisplayState,
} from '../utils/displayComputation';
import { fromMmToAnyUnit } from '../../../utils/unitConversion';

/**
 * Duration in milliseconds for the bolt hole intro message ("b hoLE") before auto-advancing.
 */
export const BOLT_HOLE_INTRO_DURATION_MS = 1000;

/** Display text for bolt hole states */
const BOLT_HOLE_DISPLAY_TEXT: Record<string, string> = {
  'bolt-hole-intro': 'b hoLE',
  'bolt-hole-menu-select-CIRCLE': 'CirCLE',
  'bolt-hole-menu-select-ARC': 'ArC',
  'bolt-hole-circle-center-x': 'Cnt X',
  'bolt-hole-circle-center-y': 'Cnt Y',
  'bolt-hole-circle-radius': 'rAdiUS',
  'bolt-hole-circle-angle': 'AnGLE',
  'bolt-hole-circle-holes': 'hoLES',
};

/** States that accept numeric input for parameter entry */
const PARAMETER_ENTRY_STATES: DROStateName[] = [
  'bolt-hole-circle-center-x',
  'bolt-hole-circle-center-y',
  'bolt-hole-circle-radius',
  'bolt-hole-circle-angle',
  'bolt-hole-circle-holes',
];

/** Check if current state accepts numeric input */
function isParameterEntryState(state: DROStateName): boolean {
  return PARAMETER_ENTRY_STATES.includes(state);
}

/**
 * Calculate the position of a specific hole on the bolt circle.
 * @param boltData - Bolt hole configuration
 * @param holeNumber - 1-indexed hole number
 * @returns Position {x, y} in mm
 */
function calculateHolePosition(
  boltData: BoltHoleData,
  holeNumber: number
): { x: number; y: number } {
  const { centerX, centerY, radius, startAngle, holeCount } = boltData;
  if (
    centerX === null ||
    centerY === null ||
    radius === null ||
    startAngle === null ||
    holeCount === null
  ) {
    return { x: 0, y: 0 };
  }

  // Calculate angle for this hole (0-indexed internally)
  const angleSpacing = 360 / holeCount;
  const holeAngle = startAngle + (holeNumber - 1) * angleSpacing;
  const angleRad = (holeAngle * Math.PI) / 180;

  return {
    x: centerX + radius * Math.cos(angleRad),
    y: centerY + radius * Math.sin(angleRad),
  };
}

/**
 * Compute display showing distance-to-go to current hole.
 * Shows (holePosition - currentPosition) in user's preferred unit.
 */
function computeBoltHoleNavigateDisplay(
  boltData: BoltHoleData,
  vMem: VolatileMemoryState,
  context: DROReducerContext
): DisplayState {
  const holePos = calculateHolePosition(boltData, boltData.currentHole);
  const currentX = computeAxisPositionMm('X', vMem, context);
  const currentY = computeAxisPositionMm('Y', vMem, context);
  const unit = context.nvMem.defaultUnit;

  return createDisplay(
    fromMmToAnyUnit(holePos.x - currentX, unit),
    fromMmToAnyUnit(holePos.y - currentY, unit),
    computeNormalDisplay(vMem, context).Z
  );
}

/**
 * Format buffer value for display.
 * - Empty buffer: shows 0
 * - Integers: show without decimals (e.g., "6")
 * - Decimals: show with 4 decimal precision (e.g., "1.7500")
 */
function formatBufferForDisplay(buffer: string): number {
  if (!buffer || buffer === '-' || buffer === '.' || buffer === '-.') {
    return 0;
  }
  const value = parseFloat(buffer);
  if (isNaN(value)) {
    return 0;
  }
  // Return the numeric value - display formatting handles precision
  return value;
}

/**
 * Compute display for parameter entry states.
 * X shows prompt text, Y shows buffer value with proper precision, Z shows normal position.
 */
function computeParameterEntryDisplay(
  state: DROStateName,
  vMem: VolatileMemoryState,
  context: DROReducerContext
): DisplayState {
  const promptText = BOLT_HOLE_DISPLAY_TEXT[state] ?? '';
  const bufferValue = formatBufferForDisplay(vMem.inputBuffer);
  return createDisplay(promptText, bufferValue, computeNormalDisplay(vMem, context).Z);
}

/**
 * Compute display for menu select state.
 */
function computeMenuSelectDisplay(boltData: BoltHoleData): DisplayState {
  const key = `bolt-hole-menu-select-${boltData.boltHoleMode}`;
  const text = BOLT_HOLE_DISPLAY_TEXT[key] ?? '';
  return createDisplay(text, '', '');
}

export const boltHoleReducer: FeatureReducer = (statePayload, eventPayload, context) => {
  const { stateName: state, stateData: data, vMem } = statePayload;
  const { eventName } = eventPayload;

  // Handle bolt hole states (entry is handled by idleReducer)
  if (!isBoltHoleActive(state)) return null;

  const boltData = data.stateDataType === 'bolt-hole' ? data : INITIAL_BOLT_HOLE_DATA;

  // Handle MILL_STATE_CHANGED - update display when position changes
  if (eventName === 'MILL_STATE_CHANGED') {
    if (state === 'bolt-hole-circle-navigate') {
      return {
        ...statePayload,
        display: computeBoltHoleNavigateDisplay(boltData, vMem, context),
      };
    }
    if (isParameterEntryState(state)) {
      return {
        ...statePayload,
        display: computeParameterEntryDisplay(state, vMem, context),
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
          ? computeParameterEntryDisplay(state, { ...vMem, inputBuffer: newBuffer }, context)
          : statePayload.display,
      };
    }
    // If buffer is empty, exit to idle
    return {
      stateName: 'idle',
      stateData: INITIAL_DRO_STATE_DATA,
      vMem,
      display: computeNormalDisplay(vMem, context),
    };
  }

  // Handle digit input in parameter entry states only
  if (isParameterEntryState(state)) {
    const digit = KEY_TO_DIGIT[eventName];
    if (digit !== undefined) {
      const newBuffer = appendDigit(vMem.inputBuffer, digit);
      return {
        ...statePayload,
        vMem: { ...vMem, inputBuffer: newBuffer },
        display: computeParameterEntryDisplay(state, { ...vMem, inputBuffer: newBuffer }, context),
      };
    }

    if (eventName === 'KEY_DECIMAL') {
      const newBuffer = appendDecimal(vMem.inputBuffer);
      return {
        ...statePayload,
        vMem: { ...vMem, inputBuffer: newBuffer },
        display: computeParameterEntryDisplay(state, { ...vMem, inputBuffer: newBuffer }, context),
      };
    }

    if (eventName === 'KEY_SIGN') {
      const newBuffer = toggleSign(vMem.inputBuffer);
      return {
        ...statePayload,
        vMem: { ...vMem, inputBuffer: newBuffer },
        display: computeParameterEntryDisplay(state, { ...vMem, inputBuffer: newBuffer }, context),
      };
    }
  }

  switch (state) {
    case 'bolt-hole-intro': {
      // Timed intro state - shows "b hoLE" for 1 second, then advances to menu
      if (eventName === 'BOLT_HOLE_INTRO_TIMEOUT') {
        return {
          stateName: 'bolt-hole-menu-select',
          stateData: boltData,
          vMem,
          display: computeMenuSelectDisplay(boltData),
        };
      }
      return statePayload;
    }

    case 'bolt-hole-menu-select': {
      // Toggle between CIRCLE and ARC with key 6
      if (eventName === 'KEY_6_RIGHT') {
        const newMode = boltData.boltHoleMode === 'CIRCLE' ? 'ARC' : 'CIRCLE';
        const newData = { ...boltData, boltHoleMode: newMode } as BoltHoleData;
        return {
          stateName: 'bolt-hole-menu-select',
          stateData: newData,
          vMem,
          display: computeMenuSelectDisplay(newData),
        };
      }
      // Press ENT to confirm selection
      if (eventName === 'KEY_ENTER') {
        if (boltData.boltHoleMode === 'CIRCLE') {
          const newVMem = { ...vMem, inputBuffer: '' };
          return {
            stateName: 'bolt-hole-circle-center-x',
            stateData: boltData,
            vMem: newVMem,
            display: computeParameterEntryDisplay('bolt-hole-circle-center-x', newVMem, context),
          };
        }
        // ARC mode not yet implemented
        return {
          stateName: 'idle',
          stateData: INITIAL_DRO_STATE_DATA,
          vMem,
          display: computeNormalDisplay(vMem, context),
        };
      }
      return null;
    }

    case 'bolt-hole-circle-center-x': {
      if (eventName === 'KEY_ENTER') {
        const value = getBufferValue(vMem.inputBuffer);
        if (value === null) return null;
        const newData = { ...boltData, centerX: value };
        const newVMem = { ...vMem, inputBuffer: '' };
        return {
          stateName: 'bolt-hole-circle-center-y',
          stateData: newData,
          vMem: newVMem,
          display: computeParameterEntryDisplay('bolt-hole-circle-center-y', newVMem, context),
        };
      }
      return null;
    }

    case 'bolt-hole-circle-center-y': {
      if (eventName === 'KEY_ENTER') {
        const value = getBufferValue(vMem.inputBuffer);
        if (value === null) return null;
        const newData = { ...boltData, centerY: value };
        const newVMem = { ...vMem, inputBuffer: '' };
        return {
          stateName: 'bolt-hole-circle-radius',
          stateData: newData,
          vMem: newVMem,
          display: computeParameterEntryDisplay('bolt-hole-circle-radius', newVMem, context),
        };
      }
      return null;
    }

    case 'bolt-hole-circle-radius': {
      if (eventName === 'KEY_ENTER') {
        const value = getBufferValue(vMem.inputBuffer);
        if (value === null || value <= 0) return null;
        const newData = { ...boltData, radius: value };
        const newVMem = { ...vMem, inputBuffer: '' };
        return {
          stateName: 'bolt-hole-circle-angle',
          stateData: newData,
          vMem: newVMem,
          display: computeParameterEntryDisplay('bolt-hole-circle-angle', newVMem, context),
        };
      }
      return null;
    }

    case 'bolt-hole-circle-angle': {
      if (eventName === 'KEY_ENTER') {
        const value = getBufferValue(vMem.inputBuffer);
        if (value === null) return null;
        // Normalize angle to 0-359 range
        const normalizedAngle = ((value % 360) + 360) % 360;
        const newData = { ...boltData, startAngle: normalizedAngle };
        const newVMem = { ...vMem, inputBuffer: '' };
        return {
          stateName: 'bolt-hole-circle-holes',
          stateData: newData,
          vMem: newVMem,
          display: computeParameterEntryDisplay('bolt-hole-circle-holes', newVMem, context),
        };
      }
      return null;
    }

    case 'bolt-hole-circle-holes': {
      if (eventName === 'KEY_ENTER') {
        const value = getBufferValue(vMem.inputBuffer);
        if (value === null || value < 2 || value > 999) return null;

        const newData: BoltHoleData = {
          ...boltData,
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
          stateName: 'bolt-hole-circle-navigate',
          stateData: newData,
          vMem: newVMem,
          display: computeBoltHoleNavigateDisplay(newData, newVMem, context),
        };
      }
      return null;
    }

    case 'bolt-hole-circle-navigate': {
      const { holeCount, currentHole } = boltData;

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
        const newData = { ...boltData, currentHole: nextHole };
        return {
          stateName: 'bolt-hole-circle-navigate',
          stateData: newData,
          vMem: { ...vMem, inputBuffer: '' },
          display: computeBoltHoleNavigateDisplay(newData, vMem, context),
        };
      }

      // Key 4: Go to previous hole
      if (eventName === 'KEY_4_LEFT') {
        const prevHole = currentHole <= 1 ? holeCount : currentHole - 1;
        const newData = { ...boltData, currentHole: prevHole };
        return {
          stateName: 'bolt-hole-circle-navigate',
          stateData: newData,
          vMem: { ...vMem, inputBuffer: '' },
          display: computeBoltHoleNavigateDisplay(newData, vMem, context),
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
          const newData = { ...boltData, currentHole: Math.floor(targetHole) };
          return {
            stateName: 'bolt-hole-circle-navigate',
            stateData: newData,
            vMem: { ...vMem, inputBuffer: '' },
            display: computeBoltHoleNavigateDisplay(newData, vMem, context),
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
 * Hook to manage bolt hole intro timing.
 * Auto-advances from intro state after BOLT_HOLE_INTRO_DURATION_MS.
 *
 * @param dispatch - DRO state machine dispatch function
 * @param droState - Current DRO state
 */
export function useBoltHoleIntro(
  dispatch: Dispatch<DROEventPayload>,
  droState: DROStateName
) {
  useEffect(() => {
    if (droState === 'bolt-hole-intro') {
      const timer = setTimeout(() => {
        dispatch({ eventName: 'BOLT_HOLE_INTRO_TIMEOUT' });
      }, BOLT_HOLE_INTRO_DURATION_MS);
      return () => { clearTimeout(timer); };
    }
    return undefined;
  }, [droState, dispatch]);
}

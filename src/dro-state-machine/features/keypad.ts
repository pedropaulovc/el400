/**
 * Keypad Feature Reducer
 *
 * Handles numeric keypad input and input buffer management.
 * Updates the inputBuffer in vMem based on key presses.
 */

import type { FeatureReducer, DROStatePayload } from '../types';
import type { DROEventPayload } from '../droStateMachine';

/**
 * Append a digit to the input buffer.
 */
function appendDigit(buffer: string, digit: string): string {
  return buffer + digit;
}

/**
 * Append a decimal point (if not already present).
 */
function appendDecimal(buffer: string): string {
  if (buffer.includes('.')) {
    return buffer; // Already has a decimal point
  }
  return buffer + '.';
}

/**
 * Toggle the sign (positive/negative).
 */
function toggleSign(buffer: string): string {
  if (buffer.startsWith('-')) {
    return buffer.slice(1);
  }
  return '-' + buffer;
}

/**
 * Get the buffer value as a number (or null if empty/invalid).
 */
export function getBufferValue(buffer: string): number | null {
  if (!buffer || buffer === '-' || buffer === '.') {
    return null;
  }
  const value = parseFloat(buffer);
  return isNaN(value) ? null : value;
}

/**
 * Map key event names to their digit values.
 */
const KEY_TO_DIGIT: Record<string, string> = {
  KEY_0: '0',
  KEY_1: '1',
  KEY_2_DOWN: '2',
  KEY_3: '3',
  KEY_4_LEFT: '4',
  KEY_5: '5',
  KEY_6_RIGHT: '6',
  KEY_7: '7',
  KEY_8_UP: '8',
  KEY_9: '9',
};

/**
 * Keypad reducer - handles input buffer operations.
 * Operates in idle state and calculator states.
 */
export const keypadReducer: FeatureReducer = (
  state: DROStatePayload,
  event: DROEventPayload,
  _context
): DROStatePayload | null => {
  // Handle keypad input in idle state and calculator states
  if (state.stateName !== 'idle' && !state.stateName.startsWith('calculator-')) {
    return null;
  }

  const { vMem } = state;

  // Handle digit keys
  const digit = KEY_TO_DIGIT[event.eventName];
  if (digit !== undefined) {
    return {
      ...state,
      vMem: {
        ...vMem,
        inputBuffer: appendDigit(vMem.inputBuffer, digit),
      },
    };
  }

  switch (event.eventName) {
    case 'KEY_DECIMAL':
      return {
        ...state,
        vMem: {
          ...vMem,
          inputBuffer: appendDecimal(vMem.inputBuffer),
        },
      };

    case 'KEY_SIGN':
      return {
        ...state,
        vMem: {
          ...vMem,
          inputBuffer: toggleSign(vMem.inputBuffer),
        },
      };

    case 'KEY_CLEAR':
      // Clear input buffer only (not axis selection)
      if (vMem.inputBuffer !== '') {
        return {
          ...state,
          vMem: {
            ...vMem,
            inputBuffer: '',
          },
        };
      }
      // If buffer already empty, clear active axis selection
      if (vMem.activeAxis !== null) {
        return {
          ...state,
          vMem: {
            ...vMem,
            activeAxis: null,
          },
        };
      }
      return state;

    default:
      return null;
  }
};

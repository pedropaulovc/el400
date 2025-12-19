/**
 * Keypad Feature Reducer
 *
 * Handles numeric keypad input and input buffer management in idle state.
 * Buffer operations in calculator state are handled by calculatorReducer.
 * Calculator state has complete ownership of digit input to support operation cycling.
 */

import type { FeatureReducer, DROStatePayload } from '../types';
import type { DROEventPayload } from '../droStateMachine';
import { appendDigit, appendDecimal, toggleSign, KEY_TO_DIGIT } from './buffer-utils';

/**
 * Keypad reducer - handles input buffer operations in idle state only.
 * All buffer operations in calculator state are handled by calculatorReducer.
 */
export const keypadReducer: FeatureReducer = (
  state: DROStatePayload,
  event: DROEventPayload,
  _context
): DROStatePayload | null => {
  // Only handle idle state - calculatorReducer owns calculator state entirely
  if (state.stateName !== 'idle') {
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

    case 'SET_INPUT_BUFFER':
      // Programmatic buffer set - used by API (e.g., setAxisValue)
      return {
        ...state,
        vMem: {
          ...vMem,
          inputBuffer: event.value,
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

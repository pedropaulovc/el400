/**
 * Calculator Feature Reducer
 *
 * Handles basic calculator functions (ADD, SUB, MULTI, DIV).
 * Supports sign toggle and result display.
 * Parses values from vMem.inputBuffer on KEY_ENTER.
 * Owns all input buffer operations in calculator state to support operation cycling.
 */

import type { FeatureReducer } from '../types';
import type { CalculatorData, DROStateName } from '../droStateMachine';
import {
  INITIAL_DRO_STATE_DATA,
  INITIAL_CALCULATOR_DATA,
  isCalculatorActive,
} from '../droStateMachine';
import { appendDigit, appendDecimal, toggleSign, getBufferValue, KEY_TO_DIGIT } from './buffer-utils';
import { createDisplay, computeNormalDisplay, type AxisDisplayValue } from '../utils/displayComputation';

/** Calculator operation text displayed in Y window */
const CALC_OPERATION_MAP: Record<string, string> = {
  'calculator-idle': '',
  'calculator-add': 'Add',
  'calculator-sub': 'SUb',
  'calculator-multi': 'mULtI',
  'calculator-div': 'dIv',
};

/** Compute calculator display: X=currentValue, Y=operation text, Z=blank */
function computeCalculatorDisplay(stateName: DROStateName, calcData: CalculatorData): ReturnType<typeof createDisplay> {
  return createDisplay(
    calcData.currentValue as AxisDisplayValue,
    CALC_OPERATION_MAP[stateName] ?? '',
    ''
  );
}

/**
 * Calculator operations cycle: ADD -> SUB -> MULTI -> DIV -> ADD
 */
const OPERATION_CYCLE: ('ADD' | 'SUB' | 'MULTI' | 'DIV')[] = ['ADD', 'SUB', 'MULTI', 'DIV'];

function getNextOperation(current: 'ADD' | 'SUB' | 'MULTI' | 'DIV' | null): 'ADD' | 'SUB' | 'MULTI' | 'DIV' {
  if (current === null) return 'ADD';
  const idx = OPERATION_CYCLE.indexOf(current);
  const nextIdx = (idx + 1) % OPERATION_CYCLE.length;
  return OPERATION_CYCLE[nextIdx] ?? 'ADD';
}

function performCalculation(first: number, second: number, operation: 'ADD' | 'SUB' | 'MULTI' | 'DIV'): number | string {
  switch (operation) {
    case 'ADD':
      return first + second;
    case 'SUB':
      return first - second;
    case 'MULTI':
      return first * second;
    case 'DIV':
      return second !== 0 ? first / second : 'inF vAL'; // Division by zero shows error
    default:
      return 0;
  }
}

export const calculatorReducer: FeatureReducer = (statePayload, eventPayload, context) => {
  const { stateName: state, stateData: data, vMem } = statePayload;
  const { eventName } = eventPayload;

  // Handle entering calculator mode from idle
  if (state === 'idle' && eventName === 'BTN_CALCULATOR') {
    return {
      stateName: 'calculator-idle',
      stateData: INITIAL_CALCULATOR_DATA,
      vMem,
      display: computeCalculatorDisplay('calculator-idle', INITIAL_CALCULATOR_DATA),
    };
  }

  // Handle calculator states
  if (!isCalculatorActive(state)) return null;

  const calcData = data.stateDataType === 'calculator' ? data : INITIAL_CALCULATOR_DATA;

  // Handle digit keys - calculatorReducer owns all digit input in calculator state
  // Display doesn't change on digit input (inputBuffer not shown in calculator mode)
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

  switch (eventName) {
    case 'BTN_CALCULATOR':
      // Exit calculator mode
      return {
        stateName: 'idle',
        stateData: INITIAL_DRO_STATE_DATA,
        vMem,
        display: computeNormalDisplay(vMem, context),
      };

    case 'BTN_SELECT_Y': {
      // Y button in calculator mode cycles through operations
      const nextOp = getNextOperation(calcData.operation);
      const nextState: CalculatorData = {
        ...calcData,
        operation: nextOp,
      };
      const nextStateName = `calculator-${nextOp.toLowerCase()}` as 'calculator-add' | 'calculator-sub' | 'calculator-multi' | 'calculator-div';
      return {
        stateName: nextStateName,
        stateData: nextState,
        vMem,
        display: computeCalculatorDisplay(nextStateName, nextState),
      };
    }

    case 'BTN_SELECT_X':
    case 'BTN_SELECT_Z':
      // X and Z buttons don't do anything in calculator mode
      return null;

    case 'KEY_DECIMAL':
      // Display doesn't change on decimal input
      return {
        ...statePayload,
        vMem: {
          ...vMem,
          inputBuffer: appendDecimal(vMem.inputBuffer),
        },
      };

    case 'KEY_SIGN':
      // Display doesn't change on sign input
      return {
        ...statePayload,
        vMem: {
          ...vMem,
          inputBuffer: toggleSign(vMem.inputBuffer),
        },
      };

    case 'KEY_CLEAR': {
      // Clear calculator and input buffer but stay in calculator mode
      return {
        stateName: 'calculator-idle',
        stateData: INITIAL_CALCULATOR_DATA,
        vMem: { ...vMem, inputBuffer: '' },
        display: computeCalculatorDisplay('calculator-idle', INITIAL_CALCULATOR_DATA),
      };
    }

    case 'KEY_ENTER': {
      // Parse value from input buffer
      const newValue = getBufferValue(vMem.inputBuffer);
      if (newValue === null) {
        return null; // No valid value in buffer
      }

      if (calcData.operation === null) {
        // First value - store as first value and current value
        const newCalcData: CalculatorData = {
          ...calcData,
          firstValue: newValue,
          currentValue: newValue,
        };
        return {
          stateName: state,
          stateData: newCalcData,
          vMem: { ...vMem, inputBuffer: '' },
          display: computeCalculatorDisplay(state, newCalcData),
        };
      } else {
        // Second value - store and immediately calculate
        if (calcData.firstValue === null) {
          // Reset to idle with the new value if invariant violated
          const resetCalcData: CalculatorData = {
            ...INITIAL_CALCULATOR_DATA,
            currentValue: newValue,
          };
          return {
            stateName: 'calculator-idle',
            stateData: resetCalcData,
            vMem: { ...vMem, inputBuffer: '' },
            display: computeCalculatorDisplay('calculator-idle', resetCalcData),
          };
        }
        const result = performCalculation(calcData.firstValue, newValue, calcData.operation);
        const resultCalcData: CalculatorData = {
          ...calcData,
          firstValue: null,
          operation: null,
          currentValue: result,
        };
        return {
          stateName: 'calculator-idle',
          stateData: resultCalcData,
          vMem: { ...vMem, inputBuffer: '' },
          display: computeCalculatorDisplay('calculator-idle', resultCalcData),
        };
      }
    }

    default:
      return null;
  }
};

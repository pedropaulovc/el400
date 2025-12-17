/**
 * Calculator Feature Reducer
 *
 * Handles basic calculator functions (ADD, SUB, MULTI, DIV).
 * Supports sign toggle and result display.
 */

import type { FeatureReducer } from '../types';
import type { CalculatorData } from '../droStateMachine';
import {
  INITIAL_DRO_STATE_DATA,
  INITIAL_CALCULATOR_DATA,
  isCalculatorActive,
} from '../droStateMachine';

/**
 * Calculator operations cycle: ADD -> SUB -> MULTI -> DIV -> ADD
 */
const OPERATION_CYCLE: Array<'ADD' | 'SUB' | 'MULTI' | 'DIV'> = ['ADD', 'SUB', 'MULTI', 'DIV'];

function getNextOperation(current: 'ADD' | 'SUB' | 'MULTI' | 'DIV' | null): 'ADD' | 'SUB' | 'MULTI' | 'DIV' {
  if (current === null) return 'ADD';
  const idx = OPERATION_CYCLE.indexOf(current);
  const nextIdx = (idx + 1) % OPERATION_CYCLE.length;
  return OPERATION_CYCLE[nextIdx] ?? 'ADD';
}

function performCalculation(first: number, second: number, operation: 'ADD' | 'SUB' | 'MULTI' | 'DIV'): number {
  switch (operation) {
    case 'ADD':
      return first + second;
    case 'SUB':
      return first - second;
    case 'MULTI':
      return first * second;
    case 'DIV':
      return second !== 0 ? first / second : 0; // Division by zero returns 0
    default:
      return 0;
  }
}

export const calculatorReducer: FeatureReducer = (statePayload, eventPayload) => {
  const { stateName: state, stateData: data } = statePayload;
  const { eventName } = eventPayload;

  // Handle entering calculator mode from idle
  if (state === 'idle' && eventName === 'BTN_CALCULATOR') {
    return {
      stateName: 'calculator-idle',
      stateData: INITIAL_CALCULATOR_DATA,
    };
  }

  // Handle calculator states
  if (!isCalculatorActive(state)) return null;

  const calcData = data.stateDataType === 'calculator' ? data : INITIAL_CALCULATOR_DATA;

  switch (eventName) {
    case 'BTN_CALCULATOR':
      // Exit calculator mode
      return { stateName: 'idle', stateData: INITIAL_DRO_STATE_DATA };

    case 'KEY_CLEAR':
      // Clear calculator but stay in calculator mode
      return { 
        stateName: 'calculator-idle', 
        stateData: INITIAL_CALCULATOR_DATA 
      };

    case 'CALC_Y_CYCLE':
      // Cycle through operations
      const nextOp = getNextOperation(calcData.operation);
      const nextState: CalculatorData = {
        ...calcData,
        operation: nextOp,
      };
      const nextStateName = `calculator-${nextOp.toLowerCase()}` as 'calculator-add' | 'calculator-sub' | 'calculator-multi' | 'calculator-div';
      return {
        stateName: nextStateName,
        stateData: nextState,
      };

    case 'KEY_ENTER':
      // Handle value entry and calculation
      if (eventPayload.eventName === 'KEY_ENTER' && eventPayload.value !== undefined) {
        const newValue = eventPayload.value;
        if (calcData.operation === null) {
          // First value - store as first value and current value
          return {
            stateName: state,
            stateData: {
              ...calcData,
              firstValue: newValue,
              currentValue: newValue,
            },
          };
        } else {
          // Second value - store and immediately calculate
          if (calcData.firstValue === null) {
            // Reset to idle with the new value if invariant violated
            return {
              stateName: 'calculator-idle',
              stateData: {
                ...INITIAL_CALCULATOR_DATA,
                currentValue: newValue,
              },
            };
          }
          const result = performCalculation(calcData.firstValue, newValue, calcData.operation);
          return {
            stateName: 'calculator-idle',
            stateData: {
              ...calcData,
              firstValue: null,
              operation: null,
              currentValue: result,
            },
          };
        }
      }
      return statePayload;

    default:
      return statePayload;
  }
};

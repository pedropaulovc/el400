/**
 * Calculator Feature Reducer
 *
 * Handles basic calculator functions (ADD, SUB, MULTI, DIV).
 * Supports sign toggle and result display.
 * Parses values from vMem.inputBuffer on KEY_ENTER.
 * Owns all input buffer operations in calculator state to support operation cycling.
 */

import type { FeatureReducer } from '../types';
import type {
  CalculatorData,
  DROStateName,
  CalculatorOperation,
  CalculatorBinaryOperation,
  CalculatorTrigOperation,
} from '../droStateMachine';
import {
  INITIAL_DRO_STATE_DATA,
  INITIAL_CALCULATOR_DATA,
  isCalculatorActive,
} from '../droStateMachine';
import { appendDigit, appendDecimal, toggleSign, getBufferValue, KEY_TO_DIGIT } from './buffer-utils';
import { createDisplay, computeNormalDisplay, type DisplayState } from '../utils/displayComputation';

/** Calculator operation text displayed in Y window */
const CALC_OPERATION_MAP: Record<string, string> = {
  'calculator-idle': '',
  'calculator-add': 'Add',
  'calculator-sub': 'SUb',
  'calculator-multi': 'mULtI',
  'calculator-div': 'dIv',
  // Trig labels match the EL400 seven-segment glyphs from the manual
  'calculator-sin': 'S in',
  'calculator-cos': 'CoS',
  'calculator-tan': 'tAn',
  'calculator-asin': 'AS in',
  'calculator-acos': 'ACoS',
  'calculator-atan': 'AtAn',
};

/** Compute calculator display: pending entry is literal; committed values are normalized. */
function computeCalculatorDisplay(
  stateName: DROStateName,
  calcData: CalculatorData,
  inputBuffer = ''
): DisplayState {
  return createDisplay(
    inputBuffer || normalizeCalculatorValue(calcData.currentValue),
    CALC_OPERATION_MAP[stateName] ?? '',
    ''
  );
}

/** Error string shown for domain errors and infinite results (matches US-013) */
const INFINITE_VALUE = 'inF vAL';

/** Maximum magnitude that fits the seven calculator digits at four decimals. */
const MAX_CALCULATOR_MAGNITUDE = 999.9999;
const CALCULATOR_SCALE = 10_000;

/**
 * The calculator is a fixed four-decimal display. Reject a value when rounding
 * it for that display would require an eighth numeric cell, rather than showing
 * a truncated or IEEE-754-inaccurate result.
 */
function normalizeCalculatorValue(value: number | string): number | string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return typeof value === 'number' ? INFINITE_VALUE : value;
  }

  const roundedMagnitude =
    Math.round(Math.abs(value) * CALCULATOR_SCALE) / CALCULATOR_SCALE;
  return roundedMagnitude > MAX_CALCULATOR_MAGNITUDE ? INFINITE_VALUE : value;
}

/**
 * Calculator operations cycle (Y key), per manual function list:
 * ADD -> SUB -> MULTI -> DIV -> SIN -> COS -> TAN -> ASIN -> ACOS -> ATAN -> ADD
 */
const OPERATION_CYCLE: CalculatorOperation[] = [
  'ADD', 'SUB', 'MULTI', 'DIV',
  'SIN', 'COS', 'TAN', 'ASIN', 'ACOS', 'ATAN',
];

const TRIG_OPERATIONS: ReadonlySet<CalculatorOperation> = new Set<CalculatorOperation>([
  'SIN', 'COS', 'TAN', 'ASIN', 'ACOS', 'ATAN',
]);

function isTrigOperation(op: CalculatorOperation): op is CalculatorTrigOperation {
  return TRIG_OPERATIONS.has(op);
}

function getNextOperation(current: CalculatorOperation | null): CalculatorOperation {
  if (current === null) return 'ADD';
  const idx = OPERATION_CYCLE.indexOf(current);
  const nextIdx = (idx + 1) % OPERATION_CYCLE.length;
  return OPERATION_CYCLE[nextIdx] ?? 'ADD';
}

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Round away floating-point noise (e.g. cos(90) = 6.12e-17 -> 0) while
 * keeping well within the display's 4-decimal precision.
 */
function cleanResult(value: number): number {
  return Math.round(value * 1e10) / 1e10;
}

function performBinaryCalculation(first: number, second: number, operation: CalculatorBinaryOperation): number | string {
  switch (operation) {
    case 'ADD':
      return first + second;
    case 'SUB':
      return first - second;
    case 'MULTI':
      return first * second;
    case 'DIV':
      return second !== 0 ? first / second : INFINITE_VALUE; // Division by zero shows error
    default:
      return 0;
  }
}

/**
 * Apply a unary trig function. Direct functions take degrees and return a
 * ratio; inverse functions take a ratio and return degrees. Domain errors
 * (asin/acos out of [-1, 1]) and tangent asymptotes return the error string.
 */
function performTrigCalculation(value: number, operation: CalculatorTrigOperation): number | string {
  switch (operation) {
    case 'SIN':
      return cleanResult(Math.sin(value * DEG_TO_RAD));
    case 'COS':
      return cleanResult(Math.cos(value * DEG_TO_RAD));
    case 'TAN': {
      // Tangent is undefined at 90 deg + k*180 deg
      const normalized = ((value % 180) + 180) % 180;
      if (Math.abs(normalized - 90) < 1e-9) return INFINITE_VALUE;
      return cleanResult(Math.tan(value * DEG_TO_RAD));
    }
    case 'ASIN':
      if (value < -1 || value > 1) return INFINITE_VALUE;
      return cleanResult(Math.asin(value) * RAD_TO_DEG);
    case 'ACOS':
      if (value < -1 || value > 1) return INFINITE_VALUE;
      return cleanResult(Math.acos(value) * RAD_TO_DEG);
    case 'ATAN':
      return cleanResult(Math.atan(value) * RAD_TO_DEG);
    default:
      return 0;
  }
}

export const calculatorReducer: FeatureReducer = (statePayload, eventPayload, context) => {
  const { stateName: state, stateData: data, vMem } = statePayload;
  const { eventName } = eventPayload;

  // Handle entering calculator mode from idle. A calculator session always
  // starts with a clean entry, regardless of input abandoned in normal mode.
  if (state === 'idle' && eventName === 'BTN_CALCULATOR') {
    const nextVMem = { ...vMem, inputBuffer: '' };
    return {
      stateName: 'calculator-idle',
      stateData: INITIAL_CALCULATOR_DATA,
      vMem: nextVMem,
      display: computeCalculatorDisplay('calculator-idle', INITIAL_CALCULATOR_DATA),
    };
  }

  // Handle calculator states
  if (!isCalculatorActive(state)) return null;

  const calcData = data.stateDataType === 'calculator' ? data : INITIAL_CALCULATOR_DATA;

  // Calculator entry is rendered literally so decimal points, signs, and
  // significant zeroes remain visible until ENT commits the numeric value.
  const digit = KEY_TO_DIGIT[eventName];
  if (digit !== undefined) {
    const inputBuffer = appendDigit(vMem.inputBuffer, digit);
    return {
      ...statePayload,
      vMem: {
        ...vMem,
        inputBuffer,
      },
      display: computeCalculatorDisplay(state, calcData, inputBuffer),
    };
  }

  switch (eventName) {
    case 'BTN_CALCULATOR': {
      // Exit calculator mode without leaking an unfinished calculator entry
      // into normal axis input.
      const nextVMem = { ...vMem, inputBuffer: '' };
      return {
        stateName: 'idle',
        stateData: INITIAL_DRO_STATE_DATA,
        vMem: nextVMem,
        display: computeNormalDisplay(nextVMem, context),
      };
    }

    case 'BTN_SELECT_Y': {
      // Y button in calculator mode cycles through operations.
      // US-013 (manual §7.6.1): if the operator follows a typed-but-not-ENTERed
      // value (e.g. `12 Y 8 ENT`), commit that pending buffer as the first
      // operand and clear the buffer, so the next ENT computes the result.
      const pendingValue = getBufferValue(vMem.inputBuffer);
      const shouldCommitBuffer = pendingValue !== null && calcData.firstValue === null;
      const nextOp = getNextOperation(calcData.operation);
      const nextState: CalculatorData = {
        ...calcData,
        operation: nextOp,
        ...(shouldCommitBuffer ? { firstValue: pendingValue, currentValue: pendingValue } : {}),
      };
      const nextStateName = `calculator-${nextOp.toLowerCase()}` as DROStateName;
      const nextVMem = shouldCommitBuffer ? { ...vMem, inputBuffer: '' } : vMem;
      return {
        stateName: nextStateName,
        stateData: nextState,
        vMem: nextVMem,
        display: computeCalculatorDisplay(nextStateName, nextState, nextVMem.inputBuffer),
      };
    }

    case 'BTN_SELECT_X':
    case 'BTN_SELECT_Z':
      // X and Z buttons don't do anything in calculator mode
      return null;

    case 'KEY_DECIMAL': {
      const inputBuffer = appendDecimal(vMem.inputBuffer);
      return {
        ...statePayload,
        vMem: {
          ...vMem,
          inputBuffer,
        },
        display: computeCalculatorDisplay(state, calcData, inputBuffer),
      };
    }

    case 'KEY_SIGN': {
      const inputBuffer = toggleSign(vMem.inputBuffer);
      return {
        ...statePayload,
        vMem: {
          ...vMem,
          inputBuffer,
        },
        display: computeCalculatorDisplay(state, calcData, inputBuffer),
      };
    }

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
      // Trig functions are unary: operate on the buffer value (or the current
      // value when the buffer is empty, allowing chaining on a prior result).
      if (calcData.operation !== null && isTrigOperation(calcData.operation)) {
        const bufferValue = getBufferValue(vMem.inputBuffer);
        const operand = bufferValue ?? (typeof calcData.currentValue === 'number' ? calcData.currentValue : null);
        if (operand === null) {
          return null; // Nothing to operate on
        }
        const trigResult = normalizeCalculatorValue(
          performTrigCalculation(operand, calcData.operation)
        );
        const trigCalcData: CalculatorData = {
          ...calcData,
          firstValue: typeof trigResult === 'number' ? trigResult : null,
          operation: null,
          currentValue: trigResult,
        };
        return {
          stateName: 'calculator-idle',
          stateData: trigCalcData,
          vMem: { ...vMem, inputBuffer: '' },
          display: computeCalculatorDisplay('calculator-idle', trigCalcData),
        };
      }

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
        // Operation already chosen.
        if (calcData.firstValue === null) {
          // US-013 (manual §7.6.1, operation-first): the operator was picked
          // before any operand. This ENT records the FIRST operand and stays
          // in the operation state; the NEXT ENT computes the result.
          const firstOperandCalcData: CalculatorData = {
            ...calcData,
            firstValue: newValue,
            currentValue: newValue,
          };
          return {
            stateName: state,
            stateData: firstOperandCalcData,
            vMem: { ...vMem, inputBuffer: '' },
            display: computeCalculatorDisplay(state, firstOperandCalcData),
          };
        }
        // Second value - store and immediately calculate
        const result = normalizeCalculatorValue(
          performBinaryCalculation(calcData.firstValue, newValue, calcData.operation)
        );
        const resultCalcData: CalculatorData = {
          ...calcData,
          firstValue: typeof result === 'number' ? result : null,
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

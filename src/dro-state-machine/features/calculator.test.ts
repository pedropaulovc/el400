/**
 * Calculator Feature Reducer Tests
 *
 * Tests for calculator operations (ADD, SUB, MULTI, DIV).
 */

import { describe, it, expect } from 'vitest';
import { calculatorReducer } from './calculator';
import type { DROStatePayload } from '../types';
import { INITIAL_DRO_STATE_DATA, INITIAL_CALCULATOR_DATA } from '../droStateMachine';
import type { CalculatorData } from '../droStateMachine';
import { createTestState, DEFAULT_TEST_CONTEXT } from '../test-utils';
import { INITIAL_VOLATILE_MEMORY_STATE } from '../../types/volatileMemory';

/** Helper to create state with input buffer for testing KEY_ENTER */
function stateWithBuffer(
  stateName: DROStatePayload['stateName'],
  stateData: DROStatePayload['stateData'],
  inputBuffer: string
): DROStatePayload {
  return {
    stateName,
    stateData,
    vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer },
  };
}

describe('calculatorReducer', () => {
  describe('entering calculator mode', () => {
    it('should transition from idle to calculator-idle on BTN_CALCULATOR', () => {
      const state = createTestState('idle');
      const result = calculatorReducer(state, { eventName: 'BTN_CALCULATOR' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('calculator-idle');
      expect(result?.stateData).toEqual(INITIAL_CALCULATOR_DATA);
    });

    it('should return null for non-calculator states', () => {
      const state = stateWithBuffer('boot', INITIAL_DRO_STATE_DATA, '5');
      const result = calculatorReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);
      expect(result).toBeNull();
    });
  });

  describe('exiting calculator mode', () => {
    it('should exit to idle on BTN_CALCULATOR', () => {
      const state = createTestState('calculator-idle', INITIAL_CALCULATOR_DATA);
      const result = calculatorReducer(state, { eventName: 'BTN_CALCULATOR' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('idle');
      expect(result?.stateData).toEqual(INITIAL_DRO_STATE_DATA);
    });
  });

  describe('clearing calculator', () => {
    it('should reset to calculator-idle on KEY_CLEAR without exiting', () => {
      const state: DROStatePayload = {
        stateName: 'calculator-add',
        stateData: {
          stateDataType: 'calculator',
          firstValue: 10,
          operation: 'ADD',
          currentValue: 10,
        },
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
      };

      const result = calculatorReducer(state, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('calculator-idle');
      expect(result?.stateData).toEqual(INITIAL_CALCULATOR_DATA);
    });
  });

  describe('operation cycling', () => {
    it('should cycle from null to ADD on BTN_SELECT_Y', () => {
      const state = createTestState('calculator-idle', INITIAL_CALCULATOR_DATA);
      const result = calculatorReducer(state, { eventName: 'BTN_SELECT_Y' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('calculator-add');
      expect((result?.stateData as CalculatorData).operation).toBe('ADD');
    });

    it('should cycle ADD -> SUB -> MULTI -> DIV -> ADD on BTN_SELECT_Y', () => {
      const operations: { from: 'ADD' | 'SUB' | 'MULTI' | 'DIV', to: 'SUB' | 'MULTI' | 'DIV' | 'ADD' }[] = [
        { from: 'ADD', to: 'SUB' },
        { from: 'SUB', to: 'MULTI' },
        { from: 'MULTI', to: 'DIV' },
        { from: 'DIV', to: 'ADD' },
      ];

      for (const { from, to } of operations) {
        const state: DROStatePayload = {
          stateName: `calculator-${from.toLowerCase()}` as 'calculator-add' | 'calculator-sub' | 'calculator-multi' | 'calculator-div',
          stateData: {
            stateDataType: 'calculator',
            firstValue: 5,
            operation: from,
            currentValue: 5,
          },
          vMem: INITIAL_VOLATILE_MEMORY_STATE,
        };

        const result = calculatorReducer(state, { eventName: 'BTN_SELECT_Y' }, DEFAULT_TEST_CONTEXT);

        expect(result?.stateName).toBe(`calculator-${to.toLowerCase()}`);
        expect((result?.stateData as CalculatorData).operation).toBe(to);
      }
    });
  });

  describe('value entry and calculation', () => {
    it('should store first value', () => {
      const state = stateWithBuffer('calculator-idle', INITIAL_CALCULATOR_DATA, '2.5');
      const result = calculatorReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('calculator-idle');
      const calcData = result?.stateData as CalculatorData;
      expect(calcData.firstValue).toBe(2.5);
      expect(calcData.currentValue).toBe(2.5);
      expect(calcData.operation).toBeNull();
    });

    it('should calculate ADD: 2.5 + 3.75 = 6.25', () => {
      const state = stateWithBuffer(
        'calculator-add',
        {
          stateDataType: 'calculator',
          firstValue: 2.5,
          operation: 'ADD',
          currentValue: 2.5,
        },
        '3.75'
      );

      const result = calculatorReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('calculator-idle');
      const calcData = result?.stateData as CalculatorData;
      expect(calcData.currentValue).toBe(6.25);
      expect(calcData.firstValue).toBeNull();
      expect(calcData.operation).toBeNull();
    });

    it('should calculate SUB: 10 - 3.5 = 6.5', () => {
      const state = stateWithBuffer(
        'calculator-sub',
        {
          stateDataType: 'calculator',
          firstValue: 10,
          operation: 'SUB',
          currentValue: 10,
        },
        '3.5'
      );

      const result = calculatorReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('calculator-idle');
      const calcData = result?.stateData as CalculatorData;
      expect(calcData.currentValue).toBe(6.5);
    });

    it('should calculate MULTI: 2.5 * 4 = 10', () => {
      const state = stateWithBuffer(
        'calculator-multi',
        {
          stateDataType: 'calculator',
          firstValue: 2.5,
          operation: 'MULTI',
          currentValue: 2.5,
        },
        '4'
      );

      const result = calculatorReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('calculator-idle');
      const calcData = result?.stateData as CalculatorData;
      expect(calcData.currentValue).toBe(10);
    });

    it('should calculate DIV: 10 / 4 = 2.5', () => {
      const state = stateWithBuffer(
        'calculator-div',
        {
          stateDataType: 'calculator',
          firstValue: 10,
          operation: 'DIV',
          currentValue: 10,
        },
        '4'
      );

      const result = calculatorReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('calculator-idle');
      const calcData = result?.stateData as CalculatorData;
      expect(calcData.currentValue).toBe(2.5);
    });

    it('should handle division by zero: 10 / 0 = "inF vAL"', () => {
      const state = stateWithBuffer(
        'calculator-div',
        {
          stateDataType: 'calculator',
          firstValue: 10,
          operation: 'DIV',
          currentValue: 10,
        },
        '0'
      );

      const result = calculatorReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('calculator-idle');
      const calcData = result?.stateData as CalculatorData;
      expect(calcData.currentValue).toBe('inF vAL');
    });
  });

  describe('edge cases', () => {
    it('should return null for KEY_ENTER without value in buffer', () => {
      const state = createTestState('calculator-idle', INITIAL_CALCULATOR_DATA);
      const result = calculatorReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);
      expect(result).toBeNull();
    });

    it('should reset to idle if firstValue is null when operation is set', () => {
      const state = stateWithBuffer(
        'calculator-add',
        {
          stateDataType: 'calculator',
          firstValue: null,
          operation: 'ADD',
          currentValue: 0,
        },
        '5'
      );

      const result = calculatorReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('calculator-idle');
      const calcData = result?.stateData as CalculatorData;
      expect(calcData.currentValue).toBe(5);
      expect(calcData.firstValue).toBeNull();
      expect(calcData.operation).toBeNull();
    });

    it('should handle digit input in calculator state (calculatorReducer owns digits)', () => {
      const state = createTestState('calculator-idle', INITIAL_CALCULATOR_DATA);
      const result = calculatorReducer(state, { eventName: 'KEY_5' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('calculator-idle');
      expect(result?.vMem.inputBuffer).toBe('5');
    });

    it('should append digit 6 (KEY_6_RIGHT is just a digit, not operation cycling)', () => {
      const state = createTestState('calculator-idle', INITIAL_CALCULATOR_DATA);
      const result = calculatorReducer(state, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('calculator-idle');
      expect(result?.vMem.inputBuffer).toBe('6');
    });
  });

  describe('data preservation', () => {
    it('should preserve currentValue when cycling operations', () => {
      const state: DROStatePayload = {
        stateName: 'calculator-idle',
        stateData: {
          stateDataType: 'calculator',
          firstValue: 10,
          operation: null,
          currentValue: 10,
        },
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
      };

      const result = calculatorReducer(state, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);

      const calcData = result?.stateData as CalculatorData;
      expect(calcData.currentValue).toBe(10);
      expect(calcData.firstValue).toBe(10);
    });

    it('should use correct calculator data type', () => {
      const state = stateWithBuffer('calculator-idle', INITIAL_DRO_STATE_DATA, '5');

      const result = calculatorReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      const calcData = result?.stateData as CalculatorData;
      expect(calcData.stateDataType).toBe('calculator');
      expect(calcData.currentValue).toBe(5);
    });
  });
});

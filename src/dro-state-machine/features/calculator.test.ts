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

describe('calculatorReducer', () => {
  describe('entering calculator mode', () => {
    it('should transition from idle to calculator-idle on BTN_CALCULATOR', () => {
      const state: DROStatePayload = {
        stateName: 'idle',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      const result = calculatorReducer(state, { eventName: 'BTN_CALCULATOR' });

      expect(result?.stateName).toBe('calculator-idle');
      expect(result?.stateData).toEqual(INITIAL_CALCULATOR_DATA);
    });

    it('should return null for non-calculator states', () => {
      const state: DROStatePayload = {
        stateName: 'boot',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      const result = calculatorReducer(state, { eventName: 'KEY_ENTER', value: 5 });

      expect(result).toBeNull();
    });
  });

  describe('exiting calculator mode', () => {
    it('should exit to idle on BTN_CALCULATOR', () => {
      const state: DROStatePayload = {
        stateName: 'calculator-idle',
        stateData: INITIAL_CALCULATOR_DATA,
      };

      const result = calculatorReducer(state, { eventName: 'BTN_CALCULATOR' });

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
      };

      const result = calculatorReducer(state, { eventName: 'KEY_CLEAR' });

      expect(result?.stateName).toBe('calculator-idle');
      expect(result?.stateData).toEqual(INITIAL_CALCULATOR_DATA);
    });
  });

  describe('operation cycling', () => {
    it('should cycle from null to ADD', () => {
      const state: DROStatePayload = {
        stateName: 'calculator-idle',
        stateData: INITIAL_CALCULATOR_DATA,
      };

      const result = calculatorReducer(state, { eventName: 'CALC_Y_CYCLE' });

      expect(result?.stateName).toBe('calculator-add');
      expect((result?.stateData as CalculatorData).operation).toBe('ADD');
    });

    it('should cycle ADD -> SUB -> MULTI -> DIV -> ADD', () => {
      const operations: Array<{ from: 'ADD' | 'SUB' | 'MULTI' | 'DIV', to: 'SUB' | 'MULTI' | 'DIV' | 'ADD' }> = [
        { from: 'ADD', to: 'SUB' },
        { from: 'SUB', to: 'MULTI' },
        { from: 'MULTI', to: 'DIV' },
        { from: 'DIV', to: 'ADD' },
      ];

      for (const { from, to } of operations) {
        const state: DROStatePayload = {
          stateName: `calculator-${from.toLowerCase()}` as any,
          stateData: {
            stateDataType: 'calculator',
            firstValue: 5,
            operation: from,
            currentValue: 5,
          },
        };

        const result = calculatorReducer(state, { eventName: 'CALC_Y_CYCLE' });

        expect(result?.stateName).toBe(`calculator-${to.toLowerCase()}`);
        expect((result?.stateData as CalculatorData).operation).toBe(to);
      }
    });
  });

  describe('value entry and calculation', () => {
    it('should store first value', () => {
      const state: DROStatePayload = {
        stateName: 'calculator-idle',
        stateData: INITIAL_CALCULATOR_DATA,
      };

      const result = calculatorReducer(state, { eventName: 'KEY_ENTER', value: 2.5 });

      expect(result?.stateName).toBe('calculator-idle');
      const calcData = result?.stateData as CalculatorData;
      expect(calcData.firstValue).toBe(2.5);
      expect(calcData.currentValue).toBe(2.5);
      expect(calcData.operation).toBeNull();
    });

    it('should calculate ADD: 2.5 + 3.75 = 6.25', () => {
      const state: DROStatePayload = {
        stateName: 'calculator-add',
        stateData: {
          stateDataType: 'calculator',
          firstValue: 2.5,
          operation: 'ADD',
          currentValue: 2.5,
        },
      };

      const result = calculatorReducer(state, { eventName: 'KEY_ENTER', value: 3.75 });

      expect(result?.stateName).toBe('calculator-idle');
      const calcData = result?.stateData as CalculatorData;
      expect(calcData.currentValue).toBe(6.25);
      expect(calcData.firstValue).toBeNull();
      expect(calcData.operation).toBeNull();
    });

    it('should calculate SUB: 10 - 3.5 = 6.5', () => {
      const state: DROStatePayload = {
        stateName: 'calculator-sub',
        stateData: {
          stateDataType: 'calculator',
          firstValue: 10,
          operation: 'SUB',
          currentValue: 10,
        },
      };

      const result = calculatorReducer(state, { eventName: 'KEY_ENTER', value: 3.5 });

      expect(result?.stateName).toBe('calculator-idle');
      const calcData = result?.stateData as CalculatorData;
      expect(calcData.currentValue).toBe(6.5);
    });

    it('should calculate MULTI: 2.5 × 4 = 10', () => {
      const state: DROStatePayload = {
        stateName: 'calculator-multi',
        stateData: {
          stateDataType: 'calculator',
          firstValue: 2.5,
          operation: 'MULTI',
          currentValue: 2.5,
        },
      };

      const result = calculatorReducer(state, { eventName: 'KEY_ENTER', value: 4 });

      expect(result?.stateName).toBe('calculator-idle');
      const calcData = result?.stateData as CalculatorData;
      expect(calcData.currentValue).toBe(10);
    });

    it('should calculate DIV: 10 ÷ 4 = 2.5', () => {
      const state: DROStatePayload = {
        stateName: 'calculator-div',
        stateData: {
          stateDataType: 'calculator',
          firstValue: 10,
          operation: 'DIV',
          currentValue: 10,
        },
      };

      const result = calculatorReducer(state, { eventName: 'KEY_ENTER', value: 4 });

      expect(result?.stateName).toBe('calculator-idle');
      const calcData = result?.stateData as CalculatorData;
      expect(calcData.currentValue).toBe(2.5);
    });

    it('should handle division by zero: 10 ÷ 0 = 0', () => {
      const state: DROStatePayload = {
        stateName: 'calculator-div',
        stateData: {
          stateDataType: 'calculator',
          firstValue: 10,
          operation: 'DIV',
          currentValue: 10,
        },
      };

      const result = calculatorReducer(state, { eventName: 'KEY_ENTER', value: 0 });

      expect(result?.stateName).toBe('calculator-idle');
      const calcData = result?.stateData as CalculatorData;
      expect(calcData.currentValue).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle KEY_ENTER without value', () => {
      const state: DROStatePayload = {
        stateName: 'calculator-idle',
        stateData: INITIAL_CALCULATOR_DATA,
      };

      const result = calculatorReducer(state, { eventName: 'KEY_ENTER' });

      expect(result).toBe(state);
    });

    it('should reset to idle if firstValue is null when operation is set', () => {
      const state: DROStatePayload = {
        stateName: 'calculator-add',
        stateData: {
          stateDataType: 'calculator',
          firstValue: null,
          operation: 'ADD',
          currentValue: 0,
        },
      };

      const result = calculatorReducer(state, { eventName: 'KEY_ENTER', value: 5 });

      expect(result?.stateName).toBe('calculator-idle');
      const calcData = result?.stateData as CalculatorData;
      expect(calcData.currentValue).toBe(5);
      expect(calcData.firstValue).toBeNull();
      expect(calcData.operation).toBeNull();
    });

    it('should return current state for unhandled events', () => {
      const state: DROStatePayload = {
        stateName: 'calculator-idle',
        stateData: INITIAL_CALCULATOR_DATA,
      };

      const result = calculatorReducer(state, { eventName: 'KEY_5' });

      expect(result).toBe(state);
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
      };

      const result = calculatorReducer(state, { eventName: 'CALC_Y_CYCLE' });

      const calcData = result?.stateData as CalculatorData;
      expect(calcData.currentValue).toBe(10);
      expect(calcData.firstValue).toBe(10);
    });

    it('should use correct calculator data type', () => {
      const state: DROStatePayload = {
        stateName: 'calculator-idle',
        stateData: INITIAL_DRO_STATE_DATA, // Wrong data type
      };

      const result = calculatorReducer(state, { eventName: 'KEY_ENTER', value: 5 });

      const calcData = result?.stateData as CalculatorData;
      expect(calcData.stateDataType).toBe('calculator');
      expect(calcData.currentValue).toBe(5);
    });
  });
});

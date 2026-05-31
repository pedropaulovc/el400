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
import { INITIAL_VOLATILE_MEMORY_STATE } from '../../../types/volatileMemory';
import { INITIAL_DISPLAY_STATE } from '../utils/displayComputation';

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
    display: INITIAL_DISPLAY_STATE,
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
        display: INITIAL_DISPLAY_STATE,
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

    it('should cycle ADD -> SUB -> MULTI -> DIV on BTN_SELECT_Y', () => {
      // US-014 extends the cycle past DIV into the trig operations, so DIV now
      // advances to SIN (see the dedicated trig cycling test for the rest).
      const operations: { from: 'ADD' | 'SUB' | 'MULTI' | 'DIV', to: 'SUB' | 'MULTI' | 'DIV' | 'SIN' }[] = [
        { from: 'ADD', to: 'SUB' },
        { from: 'SUB', to: 'MULTI' },
        { from: 'MULTI', to: 'DIV' },
        { from: 'DIV', to: 'SIN' },
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
          display: INITIAL_DISPLAY_STATE,
        };

        const result = calculatorReducer(state, { eventName: 'BTN_SELECT_Y' }, DEFAULT_TEST_CONTEXT);

        expect(result?.stateName).toBe(`calculator-${to.toLowerCase()}`);
        expect((result?.stateData as CalculatorData).operation).toBe(to);
      }
    });

    it('should ignore BTN_SELECT_X in calculator mode (returns null)', () => {
      const state = createTestState('calculator-idle', INITIAL_CALCULATOR_DATA);
      const result = calculatorReducer(state, { eventName: 'BTN_SELECT_X' }, DEFAULT_TEST_CONTEXT);
      expect(result).toBeNull();
    });

    it('should ignore BTN_SELECT_Z in calculator mode (returns null)', () => {
      const state = createTestState('calculator-idle', INITIAL_CALCULATOR_DATA);
      const result = calculatorReducer(state, { eventName: 'BTN_SELECT_Z' }, DEFAULT_TEST_CONTEXT);
      expect(result).toBeNull();
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
        display: INITIAL_DISPLAY_STATE,
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

  // ──────────────────────────────────────────────────────────────
  // US-014: Trigonometric Calculator Functions
  // ──────────────────────────────────────────────────────────────
  describe('trig operation cycling', () => {
    it('should cycle DIV -> SIN -> COS -> TAN -> ASIN -> ACOS -> ATAN -> ADD on BTN_SELECT_Y', () => {
      const transitions: { from: CalculatorData['operation']; to: string }[] = [
        { from: 'DIV', to: 'calculator-sin' },
        { from: 'SIN', to: 'calculator-cos' },
        { from: 'COS', to: 'calculator-tan' },
        { from: 'TAN', to: 'calculator-asin' },
        { from: 'ASIN', to: 'calculator-acos' },
        { from: 'ACOS', to: 'calculator-atan' },
        { from: 'ATAN', to: 'calculator-add' },
      ];

      for (const { from, to } of transitions) {
        const state: DROStatePayload = {
          stateName: `calculator-${(from as string).toLowerCase()}` as DROStatePayload['stateName'],
          stateData: { stateDataType: 'calculator', firstValue: null, operation: from, currentValue: 0 },
          vMem: INITIAL_VOLATILE_MEMORY_STATE,
          display: INITIAL_DISPLAY_STATE,
        };
        const result = calculatorReducer(state, { eventName: 'BTN_SELECT_Y' }, DEFAULT_TEST_CONTEXT);
        expect(result?.stateName).toBe(to);
      }
    });

    it('should display the correct seven-segment label for each trig operation in Y window', () => {
      const labels: { stateName: string; prev: CalculatorData['operation']; label: string }[] = [
        { stateName: 'calculator-sin', prev: 'DIV', label: 'S in' },
        { stateName: 'calculator-cos', prev: 'SIN', label: 'CoS' },
        { stateName: 'calculator-tan', prev: 'COS', label: 'tAn' },
        { stateName: 'calculator-asin', prev: 'TAN', label: 'AS in' },
        { stateName: 'calculator-acos', prev: 'ASIN', label: 'ACoS' },
        { stateName: 'calculator-atan', prev: 'ACOS', label: 'AtAn' },
      ];

      for (const { stateName, prev, label } of labels) {
        const prevState: DROStatePayload = {
          stateName: 'calculator-idle',
          stateData: { stateDataType: 'calculator', firstValue: null, operation: prev, currentValue: 0 },
          vMem: INITIAL_VOLATILE_MEMORY_STATE,
          display: INITIAL_DISPLAY_STATE,
        };
        const cycled = calculatorReducer(prevState, { eventName: 'BTN_SELECT_Y' }, DEFAULT_TEST_CONTEXT);
        expect(cycled?.stateName).toBe(stateName);
        expect(cycled?.display.Y).toBe(label);
      }
    });
  });

  describe('trig calculations (degrees)', () => {
    function computeTrig(stateName: DROStatePayload['stateName'], operation: CalculatorData['operation'], buffer: string) {
      const state = stateWithBuffer(
        stateName,
        { stateDataType: 'calculator', firstValue: null, operation, currentValue: 0 },
        buffer
      );
      return calculatorReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);
    }

    it('AC14.1: sin(30) = 0.5', () => {
      const result = computeTrig('calculator-sin', 'SIN', '30');
      expect(result?.stateName).toBe('calculator-idle');
      expect((result?.stateData as CalculatorData).currentValue).toBeCloseTo(0.5, 4);
    });

    it('AC14.2: cos(60) = 0.5', () => {
      const result = computeTrig('calculator-cos', 'COS', '60');
      expect((result?.stateData as CalculatorData).currentValue).toBeCloseTo(0.5, 4);
    });

    it('AC14.3: tan(45) = 1.0', () => {
      const result = computeTrig('calculator-tan', 'TAN', '45');
      expect((result?.stateData as CalculatorData).currentValue).toBeCloseTo(1.0, 4);
    });

    it('AC14.4: asin(0.5) = 30 degrees', () => {
      const result = computeTrig('calculator-asin', 'ASIN', '0.5');
      expect((result?.stateData as CalculatorData).currentValue).toBeCloseTo(30, 4);
    });

    it('AC14.5: acos(0.5) = 60 degrees', () => {
      const result = computeTrig('calculator-acos', 'ACOS', '0.5');
      expect((result?.stateData as CalculatorData).currentValue).toBeCloseTo(60, 4);
    });

    it('AC14.6: atan(1) = 45 degrees', () => {
      const result = computeTrig('calculator-atan', 'ATAN', '1');
      expect((result?.stateData as CalculatorData).currentValue).toBeCloseTo(45, 4);
    });

    it('cos(90) should be exactly 0 (float noise eliminated)', () => {
      const result = computeTrig('calculator-cos', 'COS', '90');
      expect((result?.stateData as CalculatorData).currentValue).toBe(0);
    });

    it('sin(0) = 0', () => {
      const result = computeTrig('calculator-sin', 'SIN', '0');
      expect((result?.stateData as CalculatorData).currentValue).toBe(0);
    });

    it('should clear operation and firstValue after computing', () => {
      const result = computeTrig('calculator-sin', 'SIN', '30');
      const calcData = result?.stateData as CalculatorData;
      expect(calcData.operation).toBeNull();
      expect(calcData.firstValue).toBeNull();
    });

    it('should use currentValue when buffer empty (chain on previous result)', () => {
      const state: DROStatePayload = {
        stateName: 'calculator-sin',
        stateData: { stateDataType: 'calculator', firstValue: null, operation: 'SIN', currentValue: 30 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '' },
        display: INITIAL_DISPLAY_STATE,
      };
      const result = calculatorReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);
      expect((result?.stateData as CalculatorData).currentValue).toBeCloseTo(0.5, 4);
    });
  });

  describe('trig domain errors', () => {
    function computeTrig(stateName: DROStatePayload['stateName'], operation: CalculatorData['operation'], buffer: string) {
      const state = stateWithBuffer(
        stateName,
        { stateDataType: 'calculator', firstValue: null, operation, currentValue: 0 },
        buffer
      );
      return calculatorReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);
    }

    it('asin(2) shows "inF vAL" (out of domain)', () => {
      const result = computeTrig('calculator-asin', 'ASIN', '2');
      expect((result?.stateData as CalculatorData).currentValue).toBe('inF vAL');
    });

    it('acos(-1.5) shows "inF vAL" (out of domain)', () => {
      const result = computeTrig('calculator-acos', 'ACOS', '-1.5');
      expect((result?.stateData as CalculatorData).currentValue).toBe('inF vAL');
    });

    it('tan(90) shows "inF vAL" (asymptote)', () => {
      const result = computeTrig('calculator-tan', 'TAN', '90');
      expect((result?.stateData as CalculatorData).currentValue).toBe('inF vAL');
    });

    it('tan(270) shows "inF vAL" (asymptote)', () => {
      const result = computeTrig('calculator-tan', 'TAN', '270');
      expect((result?.stateData as CalculatorData).currentValue).toBe('inF vAL');
    });
  });

});

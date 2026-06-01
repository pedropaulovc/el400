import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderSimulator,
  getAxisDisplayPureTextValue,
  getAxisDisplayPureNumberValue,
  typeValue,
  pressEnter,
} from '../../../tests/helpers/integration-test-utils';

describe('Calculator Integration', () => {

  describe('Sign Toggle', () => {
    it('toggles sign immediately after pressing +/- button', async () => {
      const { user } = await renderSimulator();

      // Activate calculator
      await user.click(screen.getByTestId('btn-calculator'));

      // Enter positive value
      await user.click(screen.getByTestId('key-5'));
      await user.click(screen.getByTestId('key-decimal'));
      await user.click(screen.getByTestId('key-5'));

      // Toggle sign
      await user.click(screen.getByTestId('key-sign'));

      // Enter the toggled value
      await user.click(screen.getByTestId('key-enter'));

      // Should show -5.5 in X display
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(-5.5, 4);
    });

    it('can toggle sign multiple times', async () => {
      const { user } = await renderSimulator();

      await user.click(screen.getByTestId('btn-calculator'));

      // Enter value
      await user.click(screen.getByTestId('key-3'));

      // Toggle to negative
      await user.click(screen.getByTestId('key-sign'));
      await user.click(screen.getByTestId('key-enter'));
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(-3, 4);

      // Clear and enter new value
      await user.click(screen.getByTestId('key-clear'));
      await user.click(screen.getByTestId('key-7'));

      // Toggle to negative
      await user.click(screen.getByTestId('key-sign'));

      // Toggle back to positive
      await user.click(screen.getByTestId('key-sign'));

      await user.click(screen.getByTestId('key-enter'));
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(7, 4);
    });
  });

  describe('Operations', () => {
    it('performs subtraction correctly', async () => {
      const { user } = await renderSimulator();

      await user.click(screen.getByTestId('btn-calculator'));

      // Enter first value: 10
      await user.click(screen.getByTestId('key-1'));
      await user.click(screen.getByTestId('key-0'));
      await user.click(screen.getByTestId('key-enter'));

      // Cycle to SUB
      await user.click(screen.getByTestId('axis-select-y'));
      await user.click(screen.getByTestId('axis-select-y'));
      expect(getAxisDisplayPureTextValue('Y')).toBe('SUb');

      // Enter second value: 3.5
      await user.click(screen.getByTestId('key-3'));
      await user.click(screen.getByTestId('key-decimal'));
      await user.click(screen.getByTestId('key-5'));
      await user.click(screen.getByTestId('key-enter'));

      // Result should be 6.5
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(6.5, 4);
    });

    it('performs multiplication correctly', async () => {
      const { user } = await renderSimulator();

      await user.click(screen.getByTestId('btn-calculator'));

      // Enter first value: 2.5
      await user.click(screen.getByTestId('key-2'));
      await user.click(screen.getByTestId('key-decimal'));
      await user.click(screen.getByTestId('key-5'));
      await user.click(screen.getByTestId('key-enter'));

      // Cycle to MULTI
      await user.click(screen.getByTestId('axis-select-y'));
      await user.click(screen.getByTestId('axis-select-y'));
      await user.click(screen.getByTestId('axis-select-y'));
      expect(getAxisDisplayPureTextValue('Y')).toBe('mULtI');

      // Enter second value: 4
      await user.click(screen.getByTestId('key-4'));
      await user.click(screen.getByTestId('key-enter'));

      // Result should be 10
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(10, 4);
    });

    it('performs division correctly', async () => {
      const { user } = await renderSimulator();

      await user.click(screen.getByTestId('btn-calculator'));

      // Enter first value: 10
      await user.click(screen.getByTestId('key-1'));
      await user.click(screen.getByTestId('key-0'));
      await user.click(screen.getByTestId('key-enter'));

      // Cycle to DIV
      await user.click(screen.getByTestId('axis-select-y'));
      await user.click(screen.getByTestId('axis-select-y'));
      await user.click(screen.getByTestId('axis-select-y'));
      await user.click(screen.getByTestId('axis-select-y'));
      expect(getAxisDisplayPureTextValue('Y')).toBe('dIv');

      // Enter second value: 4
      await user.click(screen.getByTestId('key-4'));
      await user.click(screen.getByTestId('key-enter'));

      // Result should be 2.5
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(2.5, 4);
    });

    it('shows "inF vAL" for division by zero', async () => {
      const { user } = await renderSimulator();

      await user.click(screen.getByTestId('btn-calculator'));

      // Enter first value: 10
      await user.click(screen.getByTestId('key-1'));
      await user.click(screen.getByTestId('key-0'));
      await user.click(screen.getByTestId('key-enter'));

      // Cycle to DIV
      await user.click(screen.getByTestId('axis-select-y'));
      await user.click(screen.getByTestId('axis-select-y'));
      await user.click(screen.getByTestId('axis-select-y'));
      await user.click(screen.getByTestId('axis-select-y'));

      // Enter second value: 0
      await user.click(screen.getByTestId('key-0'));
      await user.click(screen.getByTestId('key-enter'));

      // Should show error message
      expect(getAxisDisplayPureTextValue('X')).toBe('inF vAL');
    });
  });

  describe('Clear Key', () => {
    it('clears calculator but stays in calculator mode', async () => {
      const { user } = await renderSimulator();

      await user.click(screen.getByTestId('btn-calculator'));

      // Enter value and operation
      await user.click(screen.getByTestId('key-5'));
      await user.click(screen.getByTestId('key-enter'));
      await user.click(screen.getByTestId('axis-select-y'));
      expect(getAxisDisplayPureTextValue('Y')).toBe('Add');

      // Clear
      await user.click(screen.getByTestId('key-clear'));

      // Should still be in calculator mode (Y and Z blank)
      expect(getAxisDisplayPureTextValue('Y')).toBe('');
      expect(getAxisDisplayPureTextValue('Z')).toBe('');

      // Should be able to continue using calculator
      await user.click(screen.getByTestId('key-3'));
      await user.click(screen.getByTestId('key-enter'));
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(3, 4);
    });
  });

  describe('Operation Cycling', () => {
    it('cycles through operations in correct order', async () => {
      const { user } = await renderSimulator();

      await user.click(screen.getByTestId('btn-calculator'));

      // Enter a value first
      await user.click(screen.getByTestId('key-5'));
      await user.click(screen.getByTestId('key-enter'));

      // Cycle through operations
      await user.click(screen.getByTestId('axis-select-y'));
      expect(getAxisDisplayPureTextValue('Y')).toBe('Add');

      await user.click(screen.getByTestId('axis-select-y'));
      expect(getAxisDisplayPureTextValue('Y')).toBe('SUb');

      await user.click(screen.getByTestId('axis-select-y'));
      expect(getAxisDisplayPureTextValue('Y')).toBe('mULtI');

      await user.click(screen.getByTestId('axis-select-y'));
      expect(getAxisDisplayPureTextValue('Y')).toBe('dIv');

      // US-014: DIV now advances into the trig functions (SIN..ATAN) before
      // wrapping back to ADD.
      await user.click(screen.getByTestId('axis-select-y'));
      expect(getAxisDisplayPureTextValue('Y')).toBe('S in');

      await user.click(screen.getByTestId('axis-select-y'));
      expect(getAxisDisplayPureTextValue('Y')).toBe('CoS');

      await user.click(screen.getByTestId('axis-select-y'));
      expect(getAxisDisplayPureTextValue('Y')).toBe('tAn');

      await user.click(screen.getByTestId('axis-select-y'));
      expect(getAxisDisplayPureTextValue('Y')).toBe('AS in');

      await user.click(screen.getByTestId('axis-select-y'));
      expect(getAxisDisplayPureTextValue('Y')).toBe('ACoS');

      await user.click(screen.getByTestId('axis-select-y'));
      expect(getAxisDisplayPureTextValue('Y')).toBe('AtAn');

      // Wrap back to ADD after the final trig function
      await user.click(screen.getByTestId('axis-select-y'));
      expect(getAxisDisplayPureTextValue('Y')).toBe('Add');
    });

    it('KEY_6 appends digit 6, Y button cycles operations in all calculator states', async () => {
      const { user } = await renderSimulator();

      await user.click(screen.getByTestId('btn-calculator'));

      // In calculator-idle, KEY_6 appends to input buffer
      await user.click(screen.getByTestId('key-6'));
      await user.click(screen.getByTestId('key-6'));
      await user.click(screen.getByTestId('key-enter'));
      // Should store 66 as first value
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(66, 4);

      // Y button cycles operations regardless of state
      await user.click(screen.getByTestId('axis-select-y'));
      expect(getAxisDisplayPureTextValue('Y')).toBe('Add');

      // After operator chosen, KEY_6 still appends as digit for second operand
      await user.click(screen.getByTestId('key-6'));
      await user.click(screen.getByTestId('key-3'));
      await user.click(screen.getByTestId('key-enter'));

      // Should calculate: 66 + 63 = 129
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(129, 4);
    });
  });

  // US-013: operand order per el400 operation manual §7.6.1.
  // The manual is operation-first: "Press Y key to select the mathematical
  // functions... After selecting desired operation, enter values and press
  // enter. Result will be displayed on X axis." All three natural orderings
  // must produce the same result.
  describe('US-013: operand order (manual §7.6.1)', () => {
    it('operation-first: ADD then 12 ENT then 8 ENT = 20', async () => {
      const { user } = await renderSimulator();

      await user.click(screen.getByTestId('btn-calculator'));

      // Select operation first (Y -> Add)
      await user.click(screen.getByTestId('axis-select-y'));
      expect(getAxisDisplayPureTextValue('Y')).toBe('Add');

      // Enter first operand: 12, ENT
      await user.click(screen.getByTestId('key-1'));
      await user.click(screen.getByTestId('key-2'));
      await user.click(screen.getByTestId('key-enter'));

      // Enter second operand: 8, ENT
      await user.click(screen.getByTestId('key-8'));
      await user.click(screen.getByTestId('key-enter'));

      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(20, 4);
    });

    it('value-then-op-no-ENT: 12 Y 8 ENT = 20 (ADD)', async () => {
      const { user } = await renderSimulator();

      await user.click(screen.getByTestId('btn-calculator'));

      // Enter first operand without pressing ENT: 12
      await user.click(screen.getByTestId('key-1'));
      await user.click(screen.getByTestId('key-2'));

      // Select operation (Y -> Add); pending buffer commits to first value
      await user.click(screen.getByTestId('axis-select-y'));
      expect(getAxisDisplayPureTextValue('Y')).toBe('Add');

      // Second operand: 8, ENT
      await user.click(screen.getByTestId('key-8'));
      await user.click(screen.getByTestId('key-enter'));

      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(20, 4);
    });

    it('value-ENT-op: 12 ENT Y 8 ENT = 20 (ADD, existing flow)', async () => {
      const { user } = await renderSimulator();

      await user.click(screen.getByTestId('btn-calculator'));

      // First operand with ENT
      await user.click(screen.getByTestId('key-1'));
      await user.click(screen.getByTestId('key-2'));
      await user.click(screen.getByTestId('key-enter'));

      // Operation
      await user.click(screen.getByTestId('axis-select-y'));
      expect(getAxisDisplayPureTextValue('Y')).toBe('Add');

      // Second operand
      await user.click(screen.getByTestId('key-8'));
      await user.click(screen.getByTestId('key-enter'));

      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(20, 4);
    });

    it('operation-first SUB: SUB then 10 ENT then 3 ENT = 7', async () => {
      const { user } = await renderSimulator();

      await user.click(screen.getByTestId('btn-calculator'));

      // Y x2 -> SUB
      await user.click(screen.getByTestId('axis-select-y'));
      await user.click(screen.getByTestId('axis-select-y'));
      expect(getAxisDisplayPureTextValue('Y')).toBe('SUb');

      await user.click(screen.getByTestId('key-1'));
      await user.click(screen.getByTestId('key-0'));
      await user.click(screen.getByTestId('key-enter'));

      await user.click(screen.getByTestId('key-3'));
      await user.click(screen.getByTestId('key-enter'));

      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(7, 4);
    });

    it('value-then-op-no-ENT SUB: 10 Y Y 3 ENT = 7', async () => {
      const { user } = await renderSimulator();

      await user.click(screen.getByTestId('btn-calculator'));

      // Enter 10 without ENT
      await user.click(screen.getByTestId('key-1'));
      await user.click(screen.getByTestId('key-0'));

      // Cycle to SUB; first Y commits buffer to firstValue, both Y presses cycle
      await user.click(screen.getByTestId('axis-select-y'));
      await user.click(screen.getByTestId('axis-select-y'));
      expect(getAxisDisplayPureTextValue('Y')).toBe('SUb');

      await user.click(screen.getByTestId('key-3'));
      await user.click(screen.getByTestId('key-enter'));

      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(7, 4);
    });
  });

  describe('US-014: Trigonometric Functions', () => {
    async function calcTrig(
      user: ReturnType<typeof userEvent.setup>,
      value: string,
      cyclesToOperation: number
    ) {
      await user.click(screen.getByTestId('btn-calculator'));
      await typeValue(user, value);
      await pressEnter(user);
      for (let i = 0; i < cyclesToOperation; i++) {
        await user.click(screen.getByTestId('axis-select-y'));
      }
    }

    it('AC14.1: sin(30) = 0.5000 shown on X', async () => {
      const { user } = await renderSimulator();
      // ADD,SUB,MULTI,DIV,SIN -> 5 cycles to reach SIN
      await calcTrig(user, '30', 5);
      expect(getAxisDisplayPureTextValue('Y')).toBe('S in');
      await user.click(screen.getByTestId('key-enter'));
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(0.5, 4);
    });

    it('AC14.2: cos(60) = 0.5000 shown on X', async () => {
      const { user } = await renderSimulator();
      await calcTrig(user, '60', 6); // ...,COS
      expect(getAxisDisplayPureTextValue('Y')).toBe('CoS');
      await user.click(screen.getByTestId('key-enter'));
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(0.5, 4);
    });

    it('AC14.3: tan(45) = 1.0000 shown on X', async () => {
      const { user } = await renderSimulator();
      await calcTrig(user, '45', 7); // ...,TAN
      expect(getAxisDisplayPureTextValue('Y')).toBe('tAn');
      await user.click(screen.getByTestId('key-enter'));
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(1.0, 4);
    });

    it('AC14.4/AC14.8: asin(0.5) = 30 degrees shown on X', async () => {
      const { user } = await renderSimulator();
      await calcTrig(user, '0.5', 8); // ...,ASIN
      expect(getAxisDisplayPureTextValue('Y')).toBe('AS in');
      await user.click(screen.getByTestId('key-enter'));
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(30, 4);
    });

    it('AC14.5: acos(0.5) = 60 degrees shown on X', async () => {
      const { user } = await renderSimulator();
      await calcTrig(user, '0.5', 9); // ...,ACOS
      expect(getAxisDisplayPureTextValue('Y')).toBe('ACoS');
      await user.click(screen.getByTestId('key-enter'));
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(60, 4);
    });

    it('AC14.6: atan(1) = 45 degrees shown on X', async () => {
      const { user } = await renderSimulator();
      await calcTrig(user, '1', 10); // ...,ATAN
      expect(getAxisDisplayPureTextValue('Y')).toBe('AtAn');
      await user.click(screen.getByTestId('key-enter'));
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(45, 4);
    });

    it('domain error: asin(2) shows "inF vAL"', async () => {
      const { user } = await renderSimulator();
      await calcTrig(user, '2', 8); // ASIN
      await user.click(screen.getByTestId('key-enter'));
      expect(getAxisDisplayPureTextValue('X')).toBe('inF vAL');
    });
  });

});

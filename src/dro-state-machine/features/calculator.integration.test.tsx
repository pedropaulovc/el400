import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderSimulator,
  getAxisDisplayPureTextValue,
  getAxisDisplayPureNumberValue,
} from '../../tests/helpers/integration-test-utils';

describe('Calculator Integration', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.clear();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('Sign Toggle', () => {
    it('toggles sign immediately after pressing +/- button', async () => {
      const user = userEvent.setup();
      renderSimulator();

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
      const user = userEvent.setup();
      renderSimulator();

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
      const user = userEvent.setup();
      renderSimulator();

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
      const user = userEvent.setup();
      renderSimulator();

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
      const user = userEvent.setup();
      renderSimulator();

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
      const user = userEvent.setup();
      renderSimulator();

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
      const user = userEvent.setup();
      renderSimulator();

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
      const user = userEvent.setup();
      renderSimulator();

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

      // Should wrap around
      await user.click(screen.getByTestId('axis-select-y'));
      expect(getAxisDisplayPureTextValue('Y')).toBe('Add');
    });

    it('KEY_6 appends digit 6, Y button cycles operations in all calculator states', async () => {
      const user = userEvent.setup();
      renderSimulator();

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
});

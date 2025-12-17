import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderSimulator,
  getAxisDisplayValue,
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
      await user.click(screen.getByTestId('key-minus'));

      // Enter the toggled value
      await user.click(screen.getByTestId('key-enter'));

      // Should show -5.5 in X display
      const xValue = getAxisDisplayValue('X');
      expect(xValue).toBe('-5.5');
    });

    it('can toggle sign multiple times', async () => {
      const user = userEvent.setup();
      renderSimulator();

      await user.click(screen.getByTestId('btn-calculator'));

      // Enter value
      await user.click(screen.getByTestId('key-3'));

      // Toggle to negative
      await user.click(screen.getByTestId('key-minus'));
      await user.click(screen.getByTestId('key-enter'));
      expect(getAxisDisplayValue('X')).toBe('-3');

      // Clear and enter new value
      await user.click(screen.getByTestId('key-clear'));
      await user.click(screen.getByTestId('key-7'));

      // Toggle to negative
      await user.click(screen.getByTestId('key-minus'));

      // Toggle back to positive
      await user.click(screen.getByTestId('key-minus'));

      await user.click(screen.getByTestId('key-enter'));
      expect(getAxisDisplayValue('X')).toBe('7');
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
      expect(getAxisDisplayValue('Y')).toBe('SUB');

      // Enter second value: 3.5
      await user.click(screen.getByTestId('key-3'));
      await user.click(screen.getByTestId('key-decimal'));
      await user.click(screen.getByTestId('key-5'));
      await user.click(screen.getByTestId('key-enter'));

      // Result should be 6.5
      expect(getAxisDisplayValue('X')).toBe('6.5');
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
      expect(getAxisDisplayValue('Y')).toBe('MULTI');

      // Enter second value: 4
      await user.click(screen.getByTestId('key-4'));
      await user.click(screen.getByTestId('key-enter'));

      // Result should be 10
      expect(getAxisDisplayValue('X')).toBe('10');
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
      expect(getAxisDisplayValue('Y')).toBe('DIV');

      // Enter second value: 4
      await user.click(screen.getByTestId('key-4'));
      await user.click(screen.getByTestId('key-enter'));

      // Result should be 2.5
      expect(getAxisDisplayValue('X')).toBe('2.5');
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
      expect(getAxisDisplayValue('X')).toBe('inF vAL');
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
      expect(getAxisDisplayValue('Y')).toBe('ADD');

      // Clear
      await user.click(screen.getByTestId('key-clear'));

      // Should still be in calculator mode (Y and Z blank)
      expect(getAxisDisplayValue('Y')).toBe('');
      expect(getAxisDisplayValue('Z')).toBe('');

      // Should be able to continue using calculator
      await user.click(screen.getByTestId('key-3'));
      await user.click(screen.getByTestId('key-enter'));
      expect(getAxisDisplayValue('X')).toBe('3');
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
      expect(getAxisDisplayValue('Y')).toBe('ADD');

      await user.click(screen.getByTestId('axis-select-y'));
      expect(getAxisDisplayValue('Y')).toBe('SUB');

      await user.click(screen.getByTestId('axis-select-y'));
      expect(getAxisDisplayValue('Y')).toBe('MULTI');

      await user.click(screen.getByTestId('axis-select-y'));
      expect(getAxisDisplayValue('Y')).toBe('DIV');

      // Should wrap around
      await user.click(screen.getByTestId('axis-select-y'));
      expect(getAxisDisplayValue('Y')).toBe('ADD');
    });
  });
});

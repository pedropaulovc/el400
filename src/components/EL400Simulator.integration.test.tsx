import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderSimulator,
  getAxisDisplayValue,
  enterValue,
} from '../tests/helpers/simulator-test-utils';

/**
 * Integration tests for EL400Simulator
 * Tests that UI buttons are properly wired to state changes
 */
describe('EL400Simulator Integration', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Suppress console warnings about missing providers
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.clear();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('Zero Axis Button', () => {
    it('zeros the X axis when zero button is clicked', async () => {
      const user = userEvent.setup();
      renderSimulator();

      // Select X axis
      await user.click(screen.getByTestId('axis-select-x'));

      // Enter a value: 12.5
      await enterValue(user, '12.5');

      // Verify value was set
      expect(getAxisDisplayValue('X')).toBeCloseTo(12.5, 4);

      // Click zero button for X axis
      await user.click(screen.getByTestId('axis-zero-x'));

      // Verify X axis is now zero
      expect(getAxisDisplayValue('X')).toBeCloseTo(0, 4);
    });

    it('zeros the Y axis when zero button is clicked', async () => {
      const user = userEvent.setup();
      renderSimulator();

      // Select Y axis and enter value
      await user.click(screen.getByTestId('axis-select-y'));
      await enterValue(user, '25.75');

      expect(getAxisDisplayValue('Y')).toBeCloseTo(25.75, 4);

      // Zero Y axis
      await user.click(screen.getByTestId('axis-zero-y'));
      expect(getAxisDisplayValue('Y')).toBeCloseTo(0, 4);
    });

    it('zeros the Z axis when zero button is clicked', async () => {
      const user = userEvent.setup();
      renderSimulator();

      // Select Z axis and enter value
      await user.click(screen.getByTestId('axis-select-z'));
      await enterValue(user, '5.123');

      expect(getAxisDisplayValue('Z')).toBeCloseTo(5.123, 4);

      // Zero Z axis
      await user.click(screen.getByTestId('axis-zero-z'));
      expect(getAxisDisplayValue('Z')).toBeCloseTo(0, 4);
    });

    it('only zeros the specified axis, leaving others unchanged', async () => {
      const user = userEvent.setup();
      renderSimulator();

      // Set values on all axes
      await user.click(screen.getByTestId('axis-select-x'));
      await enterValue(user, '10');

      await user.click(screen.getByTestId('axis-select-y'));
      await enterValue(user, '20');

      await user.click(screen.getByTestId('axis-select-z'));
      await enterValue(user, '30');

      // Zero only Y axis
      await user.click(screen.getByTestId('axis-zero-y'));

      // Verify only Y is zeroed
      expect(getAxisDisplayValue('X')).toBeCloseTo(10, 4);
      expect(getAxisDisplayValue('Y')).toBeCloseTo(0, 4);
      expect(getAxisDisplayValue('Z')).toBeCloseTo(30, 4);
    });
  });

  describe('Half Button', () => {
    it('halves the value of the selected axis', async () => {
      const user = userEvent.setup();
      renderSimulator();

      // Select X axis and set value
      await user.click(screen.getByTestId('axis-select-x'));
      await enterValue(user, '100');

      expect(getAxisDisplayValue('X')).toBeCloseTo(100, 4);

      // Click half button
      await user.click(screen.getByTestId('btn-half'));

      // Verify value is halved
      expect(getAxisDisplayValue('X')).toBeCloseTo(50, 4);
    });

    it('halves negative values correctly', async () => {
      const user = userEvent.setup();
      renderSimulator();

      // Select Y axis and set negative value
      await user.click(screen.getByTestId('axis-select-y'));
      await enterValue(user, '-80');

      expect(getAxisDisplayValue('Y')).toBeCloseTo(-80, 4);

      // Click half button
      await user.click(screen.getByTestId('btn-half'));

      // Verify value is halved
      expect(getAxisDisplayValue('Y')).toBeCloseTo(-40, 4);
    });

    it('halves decimal values correctly', async () => {
      const user = userEvent.setup();
      renderSimulator();

      // Select Z axis and set decimal value
      await user.click(screen.getByTestId('axis-select-z'));
      await enterValue(user, '12.5');

      expect(getAxisDisplayValue('Z')).toBeCloseTo(12.5, 4);

      // Click half button
      await user.click(screen.getByTestId('btn-half'));

      // Verify value is halved
      expect(getAxisDisplayValue('Z')).toBeCloseTo(6.25, 4);
    });

    it('can be applied multiple times', async () => {
      const user = userEvent.setup();
      renderSimulator();

      // Select X axis and set value
      await user.click(screen.getByTestId('axis-select-x'));
      await enterValue(user, '200');

      // Apply half three times: 200 -> 100 -> 50 -> 25
      await user.click(screen.getByTestId('btn-half'));
      expect(getAxisDisplayValue('X')).toBeCloseTo(100, 4);

      await user.click(screen.getByTestId('btn-half'));
      expect(getAxisDisplayValue('X')).toBeCloseTo(50, 4);

      await user.click(screen.getByTestId('btn-half'));
      expect(getAxisDisplayValue('X')).toBeCloseTo(25, 4);
    });

  });

  describe('ABS/INC Toggle', () => {
    it('starts in ABS mode', () => {
      renderSimulator();

      // Check that ABS LED is on and INC LED is off
      const absLed = screen.getByTestId('led-abs');
      const incLed = screen.getByTestId('led-inc');

      // The LEDs use aria-checked for interactive indicators
      expect(absLed).toHaveAttribute('aria-checked', 'true');
      expect(incLed).toHaveAttribute('aria-checked', 'false');
    });

    it('toggles to INC mode when ABS/INC button is clicked', async () => {
      const user = userEvent.setup();
      renderSimulator();

      // Click the ABS/INC toggle button
      await user.click(screen.getByTestId('btn-abs-inc'));

      // Check that INC LED is now on and ABS LED is off
      const absLed = screen.getByTestId('led-abs');
      const incLed = screen.getByTestId('led-inc');

      expect(absLed).toHaveAttribute('aria-checked', 'false');
      expect(incLed).toHaveAttribute('aria-checked', 'true');
    });

    it('toggles back to ABS mode when clicked again', async () => {
      const user = userEvent.setup();
      renderSimulator();

      // Toggle to INC
      await user.click(screen.getByTestId('btn-abs-inc'));

      // Toggle back to ABS
      await user.click(screen.getByTestId('btn-abs-inc'));

      const absLed = screen.getByTestId('led-abs');
      const incLed = screen.getByTestId('led-inc');

      expect(absLed).toHaveAttribute('aria-checked', 'true');
      expect(incLed).toHaveAttribute('aria-checked', 'false');
    });

    it('maintains separate values for ABS and INC modes', async () => {
      const user = userEvent.setup();
      renderSimulator();

      // Set value in ABS mode
      await user.click(screen.getByTestId('axis-select-x'));
      await enterValue(user, '100');
      expect(getAxisDisplayValue('X')).toBeCloseTo(100, 4);

      // Switch to INC mode
      await user.click(screen.getByTestId('btn-abs-inc'));

      // INC mode should start at 0
      expect(getAxisDisplayValue('X')).toBeCloseTo(0, 4);

      // Set a different value in INC mode
      await user.click(screen.getByTestId('axis-select-x'));
      await enterValue(user, '50');
      expect(getAxisDisplayValue('X')).toBeCloseTo(50, 4);

      // Switch back to ABS mode
      await user.click(screen.getByTestId('btn-abs-inc'));

      // ABS value should be preserved
      expect(getAxisDisplayValue('X')).toBeCloseTo(100, 4);

      // Switch to INC again
      await user.click(screen.getByTestId('btn-abs-inc'));

      // INC value should be preserved
      expect(getAxisDisplayValue('X')).toBeCloseTo(50, 4);
    });

    it('can toggle mode by clicking the LED indicators', async () => {
      const user = userEvent.setup();
      renderSimulator();

      // Click on INC LED to switch to INC mode
      await user.click(screen.getByTestId('led-inc'));

      expect(screen.getByTestId('led-abs')).toHaveAttribute('aria-checked', 'false');
      expect(screen.getByTestId('led-inc')).toHaveAttribute('aria-checked', 'true');

      // Click on ABS LED to switch back
      await user.click(screen.getByTestId('led-abs'));

      expect(screen.getByTestId('led-abs')).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByTestId('led-inc')).toHaveAttribute('aria-checked', 'false');
    });

    it('zeros the correct mode values when zeroing in different modes', async () => {
      const user = userEvent.setup();
      renderSimulator();

      // Set value in ABS mode
      await user.click(screen.getByTestId('axis-select-x'));
      await enterValue(user, '100');

      // Switch to INC and set value
      await user.click(screen.getByTestId('btn-abs-inc'));
      await user.click(screen.getByTestId('axis-select-x'));
      await enterValue(user, '50');

      // Zero in INC mode
      await user.click(screen.getByTestId('axis-zero-x'));
      expect(getAxisDisplayValue('X')).toBeCloseTo(0, 4);

      // Switch back to ABS - value should still be 100
      await user.click(screen.getByTestId('btn-abs-inc'));
      expect(getAxisDisplayValue('X')).toBeCloseTo(100, 4);
    });
  });
});

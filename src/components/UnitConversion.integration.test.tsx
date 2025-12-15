import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderSimulator,
  getAxisDisplayPureNumberValue,
  enterValue,
  setBootMessageMode,
} from '../tests/helpers/integration-test-utils';

describe('Unit Conversion Integration', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.clear();
    setBootMessageMode('skip');
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('Basic Conversion', () => {
    it('should convert multiple axis values correctly', async () => {
      const user = userEvent.setup();
      renderSimulator();

      // Enter values in inch mode
      await user.click(screen.getByTestId('axis-select-x'));
      await enterValue(user, '2.5');
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(2.5, 4);

      await user.click(screen.getByTestId('axis-select-y'));
      await enterValue(user, '0.5');
      expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(0.5, 4);

      await user.click(screen.getByTestId('axis-select-z'));
      await enterValue(user, '1');
      expect(getAxisDisplayPureNumberValue('Z')).toBeCloseTo(1, 4);

      // Toggle to mm
      await user.click(screen.getByTestId('btn-toggle-unit'));

      // Verify conversions
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(63.5, 3); // 2.5 * 25.4
      expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(12.7, 3); // 0.5 * 25.4
      expect(getAxisDisplayPureNumberValue('Z')).toBeCloseTo(25.4, 3); // 1 * 25.4
    });

    it('should handle value entry in mm mode', async () => {
      const user = userEvent.setup();
      renderSimulator();

      // Toggle to mm mode first
      await user.click(screen.getByTestId('btn-toggle-unit'));
      expect(screen.getByTestId('led-mm').querySelector('input')).toBeChecked();

      // Enter 50.8 mm
      await user.click(screen.getByTestId('axis-select-x'));
      await enterValue(user, '50.8');
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(50.8, 3);

      // Toggle to inch - should show 2 inches
      await user.click(screen.getByTestId('btn-toggle-unit'));
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(2, 4);
    });

    it('should convert negative values correctly', async () => {
      const user = userEvent.setup();
      renderSimulator();

      // Enter negative value in inch mode
      await user.click(screen.getByTestId('axis-select-x'));
      await enterValue(user, '-1.5');
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(-1.5, 4);

      // Toggle to mm
      await user.click(screen.getByTestId('btn-toggle-unit'));
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(-38.1, 3); // -1.5 * 25.4
    });
  });

  describe('Integration with Other Functions', () => {
    it('should work correctly with half function', async () => {
      const user = userEvent.setup();
      renderSimulator();

      // Enter 2 inches
      await user.click(screen.getByTestId('axis-select-x'));
      await enterValue(user, '2');
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(2, 4);

      // Half it to 1 inch
      await user.click(screen.getByTestId('btn-half'));
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(1, 4);

      // Toggle to mm - should show 25.4 mm
      await user.click(screen.getByTestId('btn-toggle-unit'));
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(25.4, 3);

      // Half in mm mode - should show 12.7 mm
      await user.click(screen.getByTestId('btn-half'));
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(12.7, 3);

      // Toggle back to inch - should show 0.5 inches
      await user.click(screen.getByTestId('btn-toggle-unit'));
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(0.5, 4);
    });

    it('should work with zero function', async () => {
      const user = userEvent.setup();
      renderSimulator();

      // Enter value in inch mode
      await user.click(screen.getByTestId('axis-select-x'));
      await enterValue(user, '5');
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(5, 4);

      // Toggle to mm
      await user.click(screen.getByTestId('btn-toggle-unit'));
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(127, 3); // 5 * 25.4

      // Zero the axis
      await user.click(screen.getByTestId('axis-zero-x'));
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(0, 4);

      // Toggle back to inch - should still be 0
      await user.click(screen.getByTestId('btn-toggle-unit'));
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(0, 4);
    });

    it('should maintain conversion across ABS/INC mode changes', async () => {
      const user = userEvent.setup();
      renderSimulator();

      // Enter value in ABS inch mode
      await user.click(screen.getByTestId('axis-select-x'));
      await enterValue(user, '3');
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(3, 4);

      // Toggle to mm
      await user.click(screen.getByTestId('btn-toggle-unit'));
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(76.2, 3); // 3 * 25.4

      // Switch to INC mode
      await user.click(screen.getByTestId('btn-abs-inc'));
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(0, 4);

      // Enter value in INC mm mode
      await enterValue(user, '10');
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(10, 3);

      // Toggle to inch in INC mode
      await user.click(screen.getByTestId('btn-toggle-unit'));
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(0.3937, 4); // 10 / 25.4

      // Switch back to ABS mode
      await user.click(screen.getByTestId('btn-abs-inc'));
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(3, 4); // Original value still there
    });
  });
});

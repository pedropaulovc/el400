/**
 * Function Menu Integration Tests
 *
 * Tests for function menu display behavior, including:
 * - Display shows menu text when in function menu
 * - Display returns to position values after exiting function menu
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderSimulator,
  getAxisDisplayPureNumberValue,
  getAxisDisplayPureTextValue,
  enterValue,
} from '../tests/helpers/integration-test-utils';

describe('Function Menu Integration', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.clear();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('Display after exiting function menu', () => {
    it('should restore position display after exiting function menu with CLEAR', async () => {
      const user = userEvent.setup();
      renderSimulator();

      // Enter values for all axes
      await user.click(screen.getByTestId('axis-select-x'));
      await enterValue(user, '1.5');
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(1.5, 4);

      await user.click(screen.getByTestId('axis-select-y'));
      await enterValue(user, '2.5');
      expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(2.5, 4);

      await user.click(screen.getByTestId('axis-select-z'));
      await enterValue(user, '3.5');
      expect(getAxisDisplayPureNumberValue('Z')).toBeCloseTo(3.5, 4);

      // Enter function menu
      await user.click(screen.getByTestId('btn-function'));

      // Display should show menu text
      expect(getAxisDisplayPureTextValue('X')).toBe('CEntrE');

      // Exit function menu with CLEAR
      await user.click(screen.getByTestId('key-clear'));

      // Display should restore to position values
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(1.5, 4);
      expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(2.5, 4);
      expect(getAxisDisplayPureNumberValue('Z')).toBeCloseTo(3.5, 4);
    });

    it('should restore position display after navigating in menu and exiting', async () => {
      const user = userEvent.setup();
      renderSimulator();

      // Set X to a value
      await user.click(screen.getByTestId('axis-select-x'));
      await enterValue(user, '10');
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(10, 4);

      // Enter function menu
      await user.click(screen.getByTestId('btn-function'));
      expect(getAxisDisplayPureTextValue('X')).toBe('CEntrE');

      // Navigate forward in menu
      await user.click(screen.getByTestId('key-6'));
      expect(getAxisDisplayPureTextValue('X')).toBe('CirCLE');

      // Navigate forward again
      await user.click(screen.getByTestId('key-6'));
      expect(getAxisDisplayPureTextValue('X')).toBe('LinE');

      // Exit with CLEAR
      await user.click(screen.getByTestId('key-clear'));

      // Display should restore to position values
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(10, 4);
    });

    it('should respect unit setting when restoring display after function menu', async () => {
      const user = userEvent.setup();
      renderSimulator();

      // Toggle to mm mode
      await user.click(screen.getByTestId('btn-toggle-unit'));

      // Enter value in mm
      await user.click(screen.getByTestId('axis-select-x'));
      await enterValue(user, '25.4');
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(25.4, 3);

      // Enter function menu
      await user.click(screen.getByTestId('btn-function'));
      expect(getAxisDisplayPureTextValue('X')).toBe('CEntrE');

      // Exit with CLEAR
      await user.click(screen.getByTestId('key-clear'));

      // Display should show value in mm
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(25.4, 3);

      // Toggle to inch
      await user.click(screen.getByTestId('btn-toggle-unit'));
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(1, 4); // 25.4mm = 1"
    });
  });

  describe('Function menu display', () => {
    it('should show CEntrE text when entering function menu', async () => {
      const user = userEvent.setup();
      renderSimulator();

      // Enter function menu
      await user.click(screen.getByTestId('btn-function'));

      expect(getAxisDisplayPureTextValue('X')).toBe('CEntrE');
    });

    it('should update display when navigating menu items', async () => {
      const user = userEvent.setup();
      renderSimulator();

      // Enter function menu
      await user.click(screen.getByTestId('btn-function'));
      expect(getAxisDisplayPureTextValue('X')).toBe('CEntrE');

      // Navigate forward through menu items
      await user.click(screen.getByTestId('key-6'));
      expect(getAxisDisplayPureTextValue('X')).toBe('CirCLE');

      await user.click(screen.getByTestId('key-6'));
      expect(getAxisDisplayPureTextValue('X')).toBe('LinE');

      await user.click(screen.getByTestId('key-6'));
      expect(getAxisDisplayPureTextValue('X')).toBe('LinEAr');

      // Navigate backward
      await user.click(screen.getByTestId('key-4'));
      expect(getAxisDisplayPureTextValue('X')).toBe('LinE');

      await user.click(screen.getByTestId('key-4'));
      expect(getAxisDisplayPureTextValue('X')).toBe('CirCLE');

      await user.click(screen.getByTestId('key-4'));
      expect(getAxisDisplayPureTextValue('X')).toBe('CEntrE');
    });
  });
});

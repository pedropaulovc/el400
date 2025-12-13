import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderSimulator,
  getAxisDisplayValue,
  enterValue,
} from '../tests/helpers/integration-test-utils';

describe('PrimaryFunctionButtons Integration', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.clear();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('ABS/INC Toggle', () => {
    it('starts in ABS mode', () => {
      renderSimulator();

      expect(screen.getByTestId('led-abs')).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByTestId('led-inc')).toHaveAttribute('aria-checked', 'false');
    });

    it('toggles to INC mode when ABS/INC button is clicked', async () => {
      const user = userEvent.setup();
      renderSimulator();

      await user.click(screen.getByTestId('btn-abs-inc'));

      expect(screen.getByTestId('led-abs')).toHaveAttribute('aria-checked', 'false');
      expect(screen.getByTestId('led-inc')).toHaveAttribute('aria-checked', 'true');
    });

    it('toggles back to ABS mode when clicked again', async () => {
      const user = userEvent.setup();
      renderSimulator();

      await user.click(screen.getByTestId('btn-abs-inc'));
      await user.click(screen.getByTestId('btn-abs-inc'));

      expect(screen.getByTestId('led-abs')).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByTestId('led-inc')).toHaveAttribute('aria-checked', 'false');
    });

    it('maintains separate values for ABS and INC modes', async () => {
      const user = userEvent.setup();
      renderSimulator();

      await user.click(screen.getByTestId('axis-select-x'));
      await enterValue(user, '100');
      expect(getAxisDisplayValue('X')).toBeCloseTo(100, 4);

      await user.click(screen.getByTestId('btn-abs-inc'));
      expect(getAxisDisplayValue('X')).toBeCloseTo(0, 4);

      await user.click(screen.getByTestId('axis-select-x'));
      await enterValue(user, '50');
      expect(getAxisDisplayValue('X')).toBeCloseTo(50, 4);

      await user.click(screen.getByTestId('btn-abs-inc'));
      expect(getAxisDisplayValue('X')).toBeCloseTo(100, 4);

      await user.click(screen.getByTestId('btn-abs-inc'));
      expect(getAxisDisplayValue('X')).toBeCloseTo(50, 4);
    });

    it('can toggle mode by clicking the LED indicators', async () => {
      const user = userEvent.setup();
      renderSimulator();

      await user.click(screen.getByTestId('led-inc'));
      expect(screen.getByTestId('led-abs')).toHaveAttribute('aria-checked', 'false');
      expect(screen.getByTestId('led-inc')).toHaveAttribute('aria-checked', 'true');

      await user.click(screen.getByTestId('led-abs'));
      expect(screen.getByTestId('led-abs')).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByTestId('led-inc')).toHaveAttribute('aria-checked', 'false');
    });

    it('zeros the correct mode values when zeroing in different modes', async () => {
      const user = userEvent.setup();
      renderSimulator();

      await user.click(screen.getByTestId('axis-select-x'));
      await enterValue(user, '100');

      await user.click(screen.getByTestId('btn-abs-inc'));
      await user.click(screen.getByTestId('axis-select-x'));
      await enterValue(user, '50');

      await user.click(screen.getByTestId('axis-zero-x'));
      expect(getAxisDisplayValue('X')).toBeCloseTo(0, 4);

      await user.click(screen.getByTestId('btn-abs-inc'));
      expect(getAxisDisplayValue('X')).toBeCloseTo(100, 4);
    });
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import {
  renderSimulator,
  getAxisDisplayPureNumberValue,
  typeValue,
  pressEnter,
} from '../tests/helpers/integration-test-utils';

describe('PrimaryFunctionSection Integration', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.clear();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('ABS/INC Toggle', () => {
    it('starts in ABS mode', async () => {
      await renderSimulator();

      expect(screen.getByTestId('led-abs').querySelector('input')).toBeChecked();
      expect(screen.getByTestId('led-inc').querySelector('input')).not.toBeChecked();
    });

    it('toggles to INC mode when ABS/INC button is clicked', async () => {
      const { user } = await renderSimulator();

      await user.click(screen.getByTestId('btn-abs-inc'));

      expect(screen.getByTestId('led-abs').querySelector('input')).not.toBeChecked();
      expect(screen.getByTestId('led-inc').querySelector('input')).toBeChecked();
    });

    it('toggles back to ABS mode when clicked again', async () => {
      const { user } = await renderSimulator();

      await user.click(screen.getByTestId('btn-abs-inc'));
      await user.click(screen.getByTestId('btn-abs-inc'));

      expect(screen.getByTestId('led-abs').querySelector('input')).toBeChecked();
      expect(screen.getByTestId('led-inc').querySelector('input')).not.toBeChecked();
    });

    it('maintains separate values for ABS and INC modes', async () => {
      const { user } = await renderSimulator();

      await user.click(screen.getByTestId('axis-select-x'));
      await typeValue(user, '100');
      await pressEnter(user);
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(100, 4);

      await user.click(screen.getByTestId('btn-abs-inc'));
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(0, 4);

      await user.click(screen.getByTestId('axis-select-x'));
      await typeValue(user, '50');
      await pressEnter(user);
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(50, 4);

      await user.click(screen.getByTestId('btn-abs-inc'));
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(100, 4);

      await user.click(screen.getByTestId('btn-abs-inc'));
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(50, 4);
    });

    it('zeros the correct mode values when zeroing in different modes', async () => {
      const { user } = await renderSimulator();

      await user.click(screen.getByTestId('axis-select-x'));
      await typeValue(user, '100');
      await pressEnter(user);

      await user.click(screen.getByTestId('btn-abs-inc'));
      await user.click(screen.getByTestId('axis-select-x'));
      await typeValue(user, '50');
      await pressEnter(user);

      await user.click(screen.getByTestId('axis-zero-x'));
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(0, 4);

      await user.click(screen.getByTestId('btn-abs-inc'));
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(100, 4);
    });
  });
});

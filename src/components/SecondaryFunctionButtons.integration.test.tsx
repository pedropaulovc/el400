import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderSimulator,
  getAxisDisplayValue,
  enterValue,
} from '../tests/helpers/integration-test-utils';

describe('SecondaryFunctionButtons Integration', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.clear();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('Half Button', () => {
    it('halves the value of the selected axis', async () => {
      const user = userEvent.setup();
      renderSimulator();

      await user.click(screen.getByTestId('axis-select-x'));
      await enterValue(user, '100');
      expect(getAxisDisplayValue('X')).toBeCloseTo(100, 4);

      await user.click(screen.getByTestId('btn-half'));
      expect(getAxisDisplayValue('X')).toBeCloseTo(50, 4);
    });

    it('halves negative values correctly', async () => {
      const user = userEvent.setup();
      renderSimulator();

      await user.click(screen.getByTestId('axis-select-y'));
      await enterValue(user, '-80');
      expect(getAxisDisplayValue('Y')).toBeCloseTo(-80, 4);

      await user.click(screen.getByTestId('btn-half'));
      expect(getAxisDisplayValue('Y')).toBeCloseTo(-40, 4);
    });

    it('halves decimal values correctly', async () => {
      const user = userEvent.setup();
      renderSimulator();

      await user.click(screen.getByTestId('axis-select-z'));
      await enterValue(user, '12.5');
      expect(getAxisDisplayValue('Z')).toBeCloseTo(12.5, 4);

      await user.click(screen.getByTestId('btn-half'));
      expect(getAxisDisplayValue('Z')).toBeCloseTo(6.25, 4);
    });

    it('can be applied multiple times', async () => {
      const user = userEvent.setup();
      renderSimulator();

      await user.click(screen.getByTestId('axis-select-x'));
      await enterValue(user, '200');

      await user.click(screen.getByTestId('btn-half'));
      expect(getAxisDisplayValue('X')).toBeCloseTo(100, 4);

      await user.click(screen.getByTestId('btn-half'));
      expect(getAxisDisplayValue('X')).toBeCloseTo(50, 4);

      await user.click(screen.getByTestId('btn-half'));
      expect(getAxisDisplayValue('X')).toBeCloseTo(25, 4);
    });
  });
});

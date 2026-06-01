import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import {
  renderSimulator,
  getAxisDisplayPureNumberValue,
  typeValue,
  pressEnter,
} from '../tests/helpers/integration-test-utils';

describe('SecondaryFunctionSection Integration', () => {
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
      const { user } = await renderSimulator();

      await user.click(screen.getByTestId('axis-select-x'));
      await typeValue(user, '100');
      await pressEnter(user);
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(100, 4);

      await user.click(screen.getByTestId('btn-half'));
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(50, 4);
    });

    it('halves negative values correctly', async () => {
      const { user } = await renderSimulator();

      await user.click(screen.getByTestId('axis-select-y'));
      await typeValue(user, '-80');
      await pressEnter(user);
      expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(-80, 4);

      await user.click(screen.getByTestId('btn-half'));
      expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(-40, 4);
    });

    it('halves decimal values correctly', async () => {
      const { user } = await renderSimulator();

      await user.click(screen.getByTestId('axis-select-z'));
      await typeValue(user, '12.5');
      await pressEnter(user);
      expect(getAxisDisplayPureNumberValue('Z')).toBeCloseTo(12.5, 4);

      await user.click(screen.getByTestId('btn-half'));
      expect(getAxisDisplayPureNumberValue('Z')).toBeCloseTo(6.25, 4);
    });

    it('can be applied multiple times', async () => {
      const { user } = await renderSimulator();

      await user.click(screen.getByTestId('axis-select-x'));
      await typeValue(user, '200');
      await pressEnter(user);

      await user.click(screen.getByTestId('btn-half'));
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(100, 4);

      await user.click(screen.getByTestId('btn-half'));
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(50, 4);

      await user.click(screen.getByTestId('btn-half'));
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(25, 4);
    });
  });
});

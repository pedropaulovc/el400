import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderSimulator,
  getAxisDisplayValue,
  enterValue,
} from '../tests/helpers/simulator-test-utils';

describe('AxisPanel Integration', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
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

      await user.click(screen.getByTestId('axis-select-x'));
      await enterValue(user, '12.5');
      expect(getAxisDisplayValue('X')).toBeCloseTo(12.5, 4);

      await user.click(screen.getByTestId('axis-zero-x'));
      expect(getAxisDisplayValue('X')).toBeCloseTo(0, 4);
    });

    it('zeros the Y axis when zero button is clicked', async () => {
      const user = userEvent.setup();
      renderSimulator();

      await user.click(screen.getByTestId('axis-select-y'));
      await enterValue(user, '25.75');
      expect(getAxisDisplayValue('Y')).toBeCloseTo(25.75, 4);

      await user.click(screen.getByTestId('axis-zero-y'));
      expect(getAxisDisplayValue('Y')).toBeCloseTo(0, 4);
    });

    it('zeros the Z axis when zero button is clicked', async () => {
      const user = userEvent.setup();
      renderSimulator();

      await user.click(screen.getByTestId('axis-select-z'));
      await enterValue(user, '5.123');
      expect(getAxisDisplayValue('Z')).toBeCloseTo(5.123, 4);

      await user.click(screen.getByTestId('axis-zero-z'));
      expect(getAxisDisplayValue('Z')).toBeCloseTo(0, 4);
    });

    it('only zeros the specified axis, leaving others unchanged', async () => {
      const user = userEvent.setup();
      renderSimulator();

      await user.click(screen.getByTestId('axis-select-x'));
      await enterValue(user, '10');

      await user.click(screen.getByTestId('axis-select-y'));
      await enterValue(user, '20');

      await user.click(screen.getByTestId('axis-select-z'));
      await enterValue(user, '30');

      await user.click(screen.getByTestId('axis-zero-y'));

      expect(getAxisDisplayValue('X')).toBeCloseTo(10, 4);
      expect(getAxisDisplayValue('Y')).toBeCloseTo(0, 4);
      expect(getAxisDisplayValue('Z')).toBeCloseTo(30, 4);
    });
  });
});

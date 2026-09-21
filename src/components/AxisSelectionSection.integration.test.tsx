import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import {
  renderSimulator,
  getAxisDisplayPureNumberValue,
  typeValue,
  pressEnter,
} from '../tests/helpers/integration-test-utils';

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
      const { user } = await renderSimulator();

      await user.click(screen.getByTestId('axis-select-x'));
      await typeValue(user, '12.5');
      await pressEnter(user);
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(12.5, 4);

      await user.click(screen.getByTestId('axis-zero-x'));
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(0, 4);
    });

    it('zeros the Y axis when zero button is clicked', async () => {
      const { user } = await renderSimulator();

      await user.click(screen.getByTestId('axis-select-y'));
      await typeValue(user, '25.75');
      await pressEnter(user);
      expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(25.75, 4);

      await user.click(screen.getByTestId('axis-zero-y'));
      expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(0, 4);
    });

    it('zeros the Z axis when zero button is clicked', async () => {
      const { user } = await renderSimulator();

      await user.click(screen.getByTestId('axis-select-z'));
      await typeValue(user, '5.123');
      await pressEnter(user);
      expect(getAxisDisplayPureNumberValue('Z')).toBeCloseTo(5.123, 4);

      await user.click(screen.getByTestId('axis-zero-z'));
      expect(getAxisDisplayPureNumberValue('Z')).toBeCloseTo(0, 4);
    });

    it('only zeros the specified axis, leaving others unchanged', async () => {
      const { user } = await renderSimulator();

      await user.click(screen.getByTestId('axis-select-x'));
      await typeValue(user, '10');
      await pressEnter(user);

      await user.click(screen.getByTestId('axis-select-y'));
      await typeValue(user, '20');
      await pressEnter(user);

      await user.click(screen.getByTestId('axis-select-z'));
      await typeValue(user, '30');
      await pressEnter(user);

      await user.click(screen.getByTestId('axis-zero-y'));

      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(10, 4);
      expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(0, 4);
      expect(getAxisDisplayPureNumberValue('Z')).toBeCloseTo(30, 4);
    });
  });

  describe('Clear Button', () => {
    it('backspaces numeric entry one character at a time', async () => {
      const { user } = await renderSimulator();

      // Set X to a known value.
      await user.click(screen.getByTestId('axis-select-x'));
      await typeValue(user, '50');
      await pressEnter(user);
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(50, 4);

      // One C removes only the final 9, so ENT commits the remaining 99.
      await user.click(screen.getByTestId('axis-select-x'));
      await typeValue(user, '999');
      await user.click(screen.getByTestId('key-clear'));
      await user.click(screen.getByTestId('key-enter'));

      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(99, 4);
    });

    it('clears a partial entry one character at a time and allows new entry', async () => {
      const { user } = await renderSimulator();

      await user.click(screen.getByTestId('axis-select-y'));

      // Remove the wrong value one character at a time.
      await typeValue(user, '123');
      await user.click(screen.getByTestId('key-clear'));
      await user.click(screen.getByTestId('key-clear'));
      await user.click(screen.getByTestId('key-clear'));

      await typeValue(user, '45.6');
      await pressEnter(user);

      expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(45.6, 4);
    });
  });
});

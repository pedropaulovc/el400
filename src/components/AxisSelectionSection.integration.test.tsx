import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderSimulator,
  getAxisDisplayPureNumberValue,
  enterValue,
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
      const user = userEvent.setup();
      renderSimulator();

      await user.click(screen.getByTestId('axis-select-x'));
      await enterValue(user, '12.5');
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(12.5, 4);

      await user.click(screen.getByTestId('axis-zero-x'));
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(0, 4);
    });

    it('zeros the Y axis when zero button is clicked', async () => {
      const user = userEvent.setup();
      renderSimulator();

      await user.click(screen.getByTestId('axis-select-y'));
      await enterValue(user, '25.75');
      expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(25.75, 4);

      await user.click(screen.getByTestId('axis-zero-y'));
      expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(0, 4);
    });

    it('zeros the Z axis when zero button is clicked', async () => {
      const user = userEvent.setup();
      renderSimulator();

      await user.click(screen.getByTestId('axis-select-z'));
      await enterValue(user, '5.123');
      expect(getAxisDisplayPureNumberValue('Z')).toBeCloseTo(5.123, 4);

      await user.click(screen.getByTestId('axis-zero-z'));
      expect(getAxisDisplayPureNumberValue('Z')).toBeCloseTo(0, 4);
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

      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(10, 4);
      expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(0, 4);
      expect(getAxisDisplayPureNumberValue('Z')).toBeCloseTo(30, 4);
    });
  });

  describe('Clear Button', () => {
    it('cancels numeric entry when clear button is pressed', async () => {
      const user = userEvent.setup();
      renderSimulator();

      // Set X to a known value
      await user.click(screen.getByTestId('axis-select-x'));
      await enterValue(user, '50');
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(50, 4);

      // Try to enter a new value but clear it
      await user.click(screen.getByTestId('axis-select-x'));
      await user.click(screen.getByTestId('key-9'));
      await user.click(screen.getByTestId('key-9'));
      await user.click(screen.getByTestId('key-9'));
      
      // Clear the entry
      await user.click(screen.getByTestId('key-clear'));
      
      // Press enter (should do nothing since buffer is empty)
      await user.click(screen.getByTestId('key-enter'));

      // Value should remain 50
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(50, 4);
    });

    it('clears partial entry and allows new entry', async () => {
      const user = userEvent.setup();
      renderSimulator();

      await user.click(screen.getByTestId('axis-select-y'));
      
      // Enter a wrong value
      await user.click(screen.getByTestId('key-1'));
      await user.click(screen.getByTestId('key-2'));
      await user.click(screen.getByTestId('key-3'));
      
      // Clear it
      await user.click(screen.getByTestId('key-clear'));
      
      // Enter the correct value
      await enterValue(user, '45.6');

      // Verify only the second value was set
      expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(45.6, 4);
    });
  });
});

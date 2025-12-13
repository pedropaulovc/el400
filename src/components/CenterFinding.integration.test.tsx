import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderSimulator,
  getAxisDisplayValue,
  enterValue,
} from '../tests/helpers/integration-test-utils';

describe('Center Finding Integration', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.clear();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('Center of Line', () => {
    it('should find center of line on Y axis', async () => {
      const user = userEvent.setup();
      renderSimulator();

      // Enter function menu
      await user.click(screen.getByTestId('btn-function'));
      
      // Select CEntrE
      await user.click(screen.getByTestId('key-enter'));
      
      // Select LinE (already selected by default)
      await user.click(screen.getByTestId('key-enter'));

      // Set Point 1 at Y=10
      await user.click(screen.getByTestId('axis-select-y'));
      await enterValue(user, '10');
      
      // Store Point 1
      await user.click(screen.getByTestId('axis-zero-y'));

      // Set Point 2 at Y=30
      await user.click(screen.getByTestId('axis-select-y'));
      await enterValue(user, '30');
      
      // Store Point 2
      await user.click(screen.getByTestId('axis-zero-y'));

      // Center should be at Y=20
      // Current position is 30, so distance to go is -10
      expect(getAxisDisplayValue('Y')).toBeCloseTo(-10, 1);
    });

    it('should handle negative coordinates in center of line', async () => {
      const user = userEvent.setup();
      renderSimulator();

      // Enter function menu and select Center of Line
      await user.click(screen.getByTestId('btn-function'));
      await user.click(screen.getByTestId('key-enter'));
      await user.click(screen.getByTestId('key-enter'));

      // Set Point 1 at X=-50
      await user.click(screen.getByTestId('axis-select-x'));
      await enterValue(user, '-50');
      await user.click(screen.getByTestId('axis-zero-x'));

      // Set Point 2 at X=50
      await user.click(screen.getByTestId('axis-select-x'));
      await enterValue(user, '50');
      await user.click(screen.getByTestId('axis-zero-x'));

      // Center should be at X=0
      // Current position is 50, so distance to go is -50
      expect(getAxisDisplayValue('X')).toBeCloseTo(-50, 1);
    });
  });
});

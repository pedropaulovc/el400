import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderSimulator,
  getAxisDisplayPureTextValue,
  getAxisDisplayPureNumberValue,
} from '../../../tests/helpers/integration-test-utils';
import { useDROStore } from '../../droStore';

describe('Distance-to-Go Integration', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.clear();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('AC 8.1: Pressing Distance-to-Go shows SELECT', () => {
    it('should show SELECT on all axes when pressing Distance-to-Go button', async () => {
      const user = userEvent.setup();
      renderSimulator();

      // Click Distance-to-Go button
      await user.click(screen.getByTestId('btn-distance-to-go'));

      // Should be in preset-select state
      expect(useDROStore.getState().stateName).toBe('preset-select');

      // All axes should show SELECT (rendered as 'SELECt' in seven-segment display)
      expect(getAxisDisplayPureTextValue('X')).toBe('SELECt');
      expect(getAxisDisplayPureTextValue('Y')).toBe('SELECt');
      expect(getAxisDisplayPureTextValue('Z')).toBe('SELECt');
    });

    it('should only be available in ABS mode', async () => {
      const user = userEvent.setup();
      renderSimulator();

      // Switch to INC mode
      await user.click(screen.getByTestId('btn-abs-inc'));
      expect(useDROStore.getState().vMem.mode).toBe('inc');

      // Try to enter distance-to-go - should not work
      await user.click(screen.getByTestId('btn-distance-to-go'));
      expect(useDROStore.getState().stateName).toBe('idle');

      // Switch back to ABS mode
      await user.click(screen.getByTestId('btn-abs-inc'));
      expect(useDROStore.getState().vMem.mode).toBe('abs');

      // Now it should work
      await user.click(screen.getByTestId('btn-distance-to-go'));
      expect(useDROStore.getState().stateName).toBe('preset-select');
    });
  });

  describe('AC 8.2: Entering preset values', () => {
    it('should allow entering preset value for X axis', async () => {
      const user = userEvent.setup();
      renderSimulator();

      // Enter preset mode
      await user.click(screen.getByTestId('btn-distance-to-go'));

      // Select X axis
      await user.click(screen.getByTestId('axis-select-x'));

      // Should be in preset-input-x state
      expect(useDROStore.getState().stateName).toBe('preset-input-x');

      // Enter value 100
      await user.click(screen.getByTestId('key-1'));
      await user.click(screen.getByTestId('key-0'));
      await user.click(screen.getByTestId('key-0'));

      // Verify display shows input buffer (integer value without precision)
      expect(getAxisDisplayPureNumberValue('X', 0)).toBe(100);

      // Press enter to store
      await user.click(screen.getByTestId('key-enter'));

      // Should return to preset-select state
      expect(useDROStore.getState().stateName).toBe('preset-select');

      // X should show stored value, Y and Z still SELECT
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(100, 0);
      expect(getAxisDisplayPureTextValue('Y')).toBe('SELECt');
      expect(getAxisDisplayPureTextValue('Z')).toBe('SELECt');
    });

    it('should allow entering negative preset values', async () => {
      const user = userEvent.setup();
      renderSimulator();

      await user.click(screen.getByTestId('btn-distance-to-go'));
      await user.click(screen.getByTestId('axis-select-x'));

      // Enter -50
      await user.click(screen.getByTestId('key-sign'));
      await user.click(screen.getByTestId('key-5'));
      await user.click(screen.getByTestId('key-0'));
      await user.click(screen.getByTestId('key-enter'));

      // Execute preset
      await user.click(screen.getByTestId('btn-distance-to-go'));

      // Should show -50 distance
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(-50, 0);
    });
  });

  describe('AC 8.2 + 8.3: Setting multiple axes', () => {
    it('should allow setting multiple axes before executing', async () => {
      const user = userEvent.setup();
      renderSimulator();

      await user.click(screen.getByTestId('btn-distance-to-go'));

      // Set X to 50
      await user.click(screen.getByTestId('axis-select-x'));
      await user.click(screen.getByTestId('key-5'));
      await user.click(screen.getByTestId('key-0'));
      await user.click(screen.getByTestId('key-enter'));

      // Set Y to 25
      await user.click(screen.getByTestId('axis-select-y'));
      await user.click(screen.getByTestId('key-2'));
      await user.click(screen.getByTestId('key-5'));
      await user.click(screen.getByTestId('key-enter'));

      // Execute by pressing Distance-to-Go again
      await user.click(screen.getByTestId('btn-distance-to-go'));

      // Should be in distance-to-go state
      expect(useDROStore.getState().stateName).toBe('distance-to-go');

      // Verify distances (current position is 0, so distance = preset)
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(50, 0);
      expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(25, 0);
      // Z should show 0 (no preset set, showing normal position)
      expect(getAxisDisplayPureNumberValue('Z')).toBeCloseTo(0, 0);
    });
  });

  describe('Canceling and exiting', () => {
    it('should cancel preset entry with Clear key', async () => {
      const user = userEvent.setup();
      renderSimulator();

      await user.click(screen.getByTestId('btn-distance-to-go'));
      expect(useDROStore.getState().stateName).toBe('preset-select');

      // Press Clear to exit
      await user.click(screen.getByTestId('key-clear'));

      // Should return to idle
      expect(useDROStore.getState().stateName).toBe('idle');
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(0, 0);
    });

    it('should exit distance-to-go mode with Clear key and restore ABS mode', async () => {
      const user = userEvent.setup();
      renderSimulator();

      // Set up and execute preset
      await user.click(screen.getByTestId('btn-distance-to-go'));
      await user.click(screen.getByTestId('axis-select-x'));
      await user.click(screen.getByTestId('key-1'));
      await user.click(screen.getByTestId('key-0'));
      await user.click(screen.getByTestId('key-0'));
      await user.click(screen.getByTestId('key-enter'));
      await user.click(screen.getByTestId('btn-distance-to-go'));

      expect(useDROStore.getState().stateName).toBe('distance-to-go');
      expect(useDROStore.getState().vMem.mode).toBe('inc'); // INC LED is on

      // Press Clear to exit
      await user.click(screen.getByTestId('key-clear'));

      // Should return to idle and restore ABS mode
      expect(useDROStore.getState().stateName).toBe('idle');
      expect(useDROStore.getState().vMem.mode).toBe('abs');
    });
  });

  describe('INC LED behavior', () => {
    it('should turn on INC LED when displaying distance-to-go', async () => {
      const user = userEvent.setup();
      renderSimulator();

      // Initially in ABS mode
      expect(useDROStore.getState().vMem.mode).toBe('abs');

      // Set up preset
      await user.click(screen.getByTestId('btn-distance-to-go'));
      await user.click(screen.getByTestId('axis-select-x'));
      await user.click(screen.getByTestId('key-5'));
      await user.click(screen.getByTestId('key-0'));
      await user.click(screen.getByTestId('key-enter'));

      // Still in ABS mode during setup
      expect(useDROStore.getState().vMem.mode).toBe('abs');

      // Execute to show distance-to-go
      await user.click(screen.getByTestId('btn-distance-to-go'));

      // INC LED should now be on
      expect(useDROStore.getState().stateName).toBe('distance-to-go');
      expect(useDROStore.getState().vMem.mode).toBe('inc');
    });

    it('should restore ABS mode when re-entering preset-select', async () => {
      const user = userEvent.setup();
      renderSimulator();

      // Set up and execute
      await user.click(screen.getByTestId('btn-distance-to-go'));
      await user.click(screen.getByTestId('axis-select-x'));
      await user.click(screen.getByTestId('key-5'));
      await user.click(screen.getByTestId('key-0'));
      await user.click(screen.getByTestId('key-enter'));
      await user.click(screen.getByTestId('btn-distance-to-go'));

      expect(useDROStore.getState().vMem.mode).toBe('inc');

      // Re-enter preset-select to modify targets
      await user.click(screen.getByTestId('btn-distance-to-go'));

      // Should restore ABS mode
      expect(useDROStore.getState().stateName).toBe('preset-select');
      expect(useDROStore.getState().vMem.mode).toBe('abs');
    });
  });

  describe('Modifying targets', () => {
    it('should allow re-entering preset mode to modify targets', async () => {
      const user = userEvent.setup();
      renderSimulator();

      // Set initial preset X=50
      await user.click(screen.getByTestId('btn-distance-to-go'));
      await user.click(screen.getByTestId('axis-select-x'));
      await user.click(screen.getByTestId('key-5'));
      await user.click(screen.getByTestId('key-0'));
      await user.click(screen.getByTestId('key-enter'));
      await user.click(screen.getByTestId('btn-distance-to-go'));

      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(50, 0);

      // Re-enter preset mode
      await user.click(screen.getByTestId('btn-distance-to-go'));
      expect(useDROStore.getState().stateName).toBe('preset-select');

      // Modify X to 100
      await user.click(screen.getByTestId('axis-select-x'));
      await user.click(screen.getByTestId('key-1'));
      await user.click(screen.getByTestId('key-0'));
      await user.click(screen.getByTestId('key-0'));
      await user.click(screen.getByTestId('key-enter'));

      // Execute again
      await user.click(screen.getByTestId('btn-distance-to-go'));

      // Should show new distance
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(100, 0);
    });
  });

  describe('State data preservation', () => {
    it('should preserve preset targets in stateData', async () => {
      const user = userEvent.setup();
      renderSimulator();

      await user.click(screen.getByTestId('btn-distance-to-go'));
      await user.click(screen.getByTestId('axis-select-x'));
      await user.click(screen.getByTestId('key-5'));
      await user.click(screen.getByTestId('key-0'));
      await user.click(screen.getByTestId('key-enter'));

      const stateData = useDROStore.getState().stateData;
      expect(stateData.stateDataType).toBe('preset');
      if (stateData.stateDataType === 'preset') {
        // Value is stored in mm (50 inches = 1270mm)
        expect(stateData.presetTargets.X).toBeCloseTo(1270, 0);
        expect(stateData.presetTargets.Y).toBeNull();
        expect(stateData.presetTargets.Z).toBeNull();
      }
    });
  });
});

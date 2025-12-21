import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderSimulator,
  enterValue,
  getAxisDisplayPureTextValue,
  getAxisDisplayPureNumberValue,
} from '../../../tests/helpers/integration-test-utils';
import { useDROStore } from '../../droStore';
import { BOLT_HOLE_INTRO_DURATION_MS } from './bolt-hole';

describe('Bolt Hole Circle Integration', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.clear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    vi.useRealTimers();
  });

  /** Helper to advance past the intro state */
  async function advancePastIntro() {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(BOLT_HOLE_INTRO_DURATION_MS + 10);
    });
  }

  /** Helper to enter bolt hole mode and advance past intro */
  async function enterBoltHoleMode(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByTestId('btn-bolt-circle'));
    await advancePastIntro();
  }

  describe('Entering Bolt Hole Mode', () => {
    it('enters bolt hole mode when button is pressed in ABS mode', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderSimulator();

      // Should start in ABS mode (idle state)
      expect(useDROStore.getState().vMem.mode).toBe('abs');

      // Click bolt hole button
      await user.click(screen.getByTestId('btn-bolt-circle'));

      // Should be in bolt-hole-intro state first
      expect(useDROStore.getState().stateName).toBe('bolt-hole-intro');

      // Display should show "b hoLE" intro message on X, 0 on Y, empty on Z
      expect(getAxisDisplayPureTextValue('X')).toBe('b hoLE');
      expect(getAxisDisplayPureNumberValue('Y')).toBe(0);
      expect(getAxisDisplayPureTextValue('Z')).toBe('');

      // Advance past intro
      await advancePastIntro();

      // Should now be in bolt-hole-menu-select state
      expect(useDROStore.getState().stateName).toBe('bolt-hole-menu-select');

      // Display should show "CirCLE" menu option
      expect(getAxisDisplayPureTextValue('X')).toBe('CirCLE');
    });

    it('does not enter bolt hole mode when in INC mode', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderSimulator();

      // Switch to INC mode
      await user.click(screen.getByTestId('btn-abs-inc'));
      expect(useDROStore.getState().vMem.mode).toBe('inc');

      // Click bolt hole button
      await user.click(screen.getByTestId('btn-bolt-circle'));

      // Should still be in idle state
      expect(useDROStore.getState().stateName).toBe('idle');
    });
  });

  describe('Mode Selection', () => {
    it('toggles between CIRCLE and ARC mode with key 6', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderSimulator();

      await enterBoltHoleMode(user);

      // Initially in CIRCLE mode
      const stateData = useDROStore.getState().stateData;
      expect(stateData.stateDataType).toBe('bolt-hole');
      if (stateData.stateDataType === 'bolt-hole') {
        expect(stateData.boltHoleMode).toBe('CIRCLE');
      }
      expect(getAxisDisplayPureTextValue('X')).toBe('CirCLE');

      // Press key 6 to toggle to ARC
      await user.click(screen.getByTestId('key-6'));
      const stateData2 = useDROStore.getState().stateData;
      if (stateData2.stateDataType === 'bolt-hole') {
        expect(stateData2.boltHoleMode).toBe('ARC');
      }
      expect(getAxisDisplayPureTextValue('X')).toBe('ArC');

      // Press key 6 again to toggle back to CIRCLE
      await user.click(screen.getByTestId('key-6'));
      const stateData3 = useDROStore.getState().stateData;
      if (stateData3.stateDataType === 'bolt-hole') {
        expect(stateData3.boltHoleMode).toBe('CIRCLE');
      }
      expect(getAxisDisplayPureTextValue('X')).toBe('CirCLE');
    });

    it('exits to idle when ARC mode is selected (not implemented)', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderSimulator();

      await enterBoltHoleMode(user);

      // Toggle to ARC mode
      await user.click(screen.getByTestId('key-6'));

      // Confirm ARC selection
      await user.click(screen.getByTestId('key-enter'));

      // Should exit to idle (ARC not implemented)
      expect(useDROStore.getState().stateName).toBe('idle');
    });
  });

  describe('Parameter Entry', () => {
    it('completes full parameter entry flow for bolt hole circle with display assertions', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderSimulator();

      // Enter bolt hole mode
      await enterBoltHoleMode(user);
      expect(useDROStore.getState().stateName).toBe('bolt-hole-menu-select');
      expect(getAxisDisplayPureTextValue('X')).toBe('CirCLE');

      // Confirm CIRCLE mode
      await user.click(screen.getByTestId('key-enter'));
      expect(useDROStore.getState().stateName).toBe('bolt-hole-circle-center-x');
      // For center-x: X shows buffer value, Y shows prompt
      expect(getAxisDisplayPureNumberValue('X')).toBe(0); // Empty buffer shows 0
      expect(getAxisDisplayPureTextValue('Y')).toBe('EntCnt0');
      expect(getAxisDisplayPureTextValue('Z')).toBe('');

      // Enter center X = 1.75 - type digits and check display (X shows numeric values for center-x)
      await user.click(screen.getByTestId('key-1'));
      expect(getAxisDisplayPureNumberValue('X')).toBe(1);
      await user.click(screen.getByTestId('key-decimal'));
      expect(getAxisDisplayPureNumberValue('X')).toBe(1); // "1." parses to 1
      await user.click(screen.getByTestId('key-7'));
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(1.7, 4);
      await user.click(screen.getByTestId('key-5'));
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(1.75, 4);
      await user.click(screen.getByTestId('key-enter'));
      expect(useDROStore.getState().stateName).toBe('bolt-hole-circle-center-y');
      // For center-y: X shows prompt, Y shows buffer value
      expect(getAxisDisplayPureTextValue('X')).toBe('EntCnt1');
      expect(getAxisDisplayPureNumberValue('Y')).toBe(0); // Empty buffer shows 0
      expect(getAxisDisplayPureTextValue('Z')).toBe('');

      // Enter center Y = 1.25
      await enterValue(user, '1.25');
      expect(useDROStore.getState().stateName).toBe('bolt-hole-circle-radius');
      expect(getAxisDisplayPureTextValue('X')).toBe('rAdiUS');
      expect(getAxisDisplayPureNumberValue('Y')).toBe(0); // Empty buffer shows 0
      expect(getAxisDisplayPureTextValue('Z')).toBe('');

      // Enter radius = 0.95
      await enterValue(user, '0.95');
      expect(useDROStore.getState().stateName).toBe('bolt-hole-circle-angle');
      expect(getAxisDisplayPureTextValue('X')).toBe('AnGLE');
      expect(getAxisDisplayPureNumberValue('Y')).toBe(0); // Empty buffer shows 0
      expect(getAxisDisplayPureTextValue('Z')).toBe('');

      // Enter starting angle = 20
      await enterValue(user, '20');
      expect(useDROStore.getState().stateName).toBe('bolt-hole-circle-holes');
      expect(getAxisDisplayPureTextValue('X')).toBe('hoLES');
      expect(getAxisDisplayPureNumberValue('Y')).toBe(0); // Empty buffer shows 0

      // Enter hole count = 6
      await user.click(screen.getByTestId('key-6'));
      expect(getAxisDisplayPureNumberValue('Y')).toBe(6);
      await user.click(screen.getByTestId('key-enter'));
      expect(useDROStore.getState().stateName).toBe('bolt-hole-circle-navigate');

      // Should switch to INC mode
      expect(useDROStore.getState().vMem.mode).toBe('inc');

      // Verify state data (stored in mm after conversion from inches)
      const stateData = useDROStore.getState().stateData;
      expect(stateData.stateDataType).toBe('bolt-hole');
      if (stateData.stateDataType === 'bolt-hole') {
        // 1.75 inches = 44.45mm
        expect(stateData.centerX).toBeCloseTo(44.45, 4);
        // 1.25 inches = 31.75mm
        expect(stateData.centerY).toBeCloseTo(31.75, 4);
        // 0.95 inches = 24.13mm
        expect(stateData.radius).toBeCloseTo(24.13, 4);
        expect(stateData.startAngle).toBe(20);
        expect(stateData.holeCount).toBe(6);
        expect(stateData.currentHole).toBe(1);
      }
    });

    it('rejects invalid radius (zero)', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderSimulator();

      await enterBoltHoleMode(user);
      await user.click(screen.getByTestId('key-enter')); // Confirm CIRCLE
      await enterValue(user, '1'); // Center X
      await enterValue(user, '1'); // Center Y

      // Try to enter zero radius
      await enterValue(user, '0');

      // Should still be on radius entry
      expect(useDROStore.getState().stateName).toBe('bolt-hole-circle-radius');
    });

    it('rejects invalid hole count (less than 2)', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderSimulator();

      await enterBoltHoleMode(user);
      await user.click(screen.getByTestId('key-enter'));
      await enterValue(user, '1');
      await enterValue(user, '1');
      await enterValue(user, '1');
      await enterValue(user, '0');

      // Try to enter 1 hole
      await enterValue(user, '1');

      // Should still be on hole count entry
      expect(useDROStore.getState().stateName).toBe('bolt-hole-circle-holes');
    });
  });

  describe('Hole Navigation', () => {
    async function setupNavigateState(user: ReturnType<typeof userEvent.setup>) {
      await enterBoltHoleMode(user);
      await user.click(screen.getByTestId('key-enter'));
      await enterValue(user, '0'); // Center X
      await enterValue(user, '0'); // Center Y
      await enterValue(user, '1'); // Radius
      await enterValue(user, '0'); // Start angle
      await enterValue(user, '6'); // 6 holes
    }

    it('navigates to next hole with key 6', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderSimulator();
      await setupNavigateState(user);

      expect(useDROStore.getState().stateName).toBe('bolt-hole-circle-navigate');

      // Start at hole 1
      let stateData = useDROStore.getState().stateData;
      if (stateData.stateDataType === 'bolt-hole') {
        expect(stateData.currentHole).toBe(1);
      }

      // Press key 6 to go to next hole
      await user.click(screen.getByTestId('key-6'));
      stateData = useDROStore.getState().stateData;
      if (stateData.stateDataType === 'bolt-hole') {
        expect(stateData.currentHole).toBe(2);
      }
    });

    it('navigates to previous hole with key 4', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderSimulator();
      await setupNavigateState(user);

      // Go to hole 2 first
      await user.click(screen.getByTestId('key-6'));

      // Press key 4 to go back
      await user.click(screen.getByTestId('key-4'));
      const stateData = useDROStore.getState().stateData;
      if (stateData.stateDataType === 'bolt-hole') {
        expect(stateData.currentHole).toBe(1);
      }
    });

    it('wraps from last hole to first with key 6', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderSimulator();
      await setupNavigateState(user);

      // Go to hole 6 (press key 6 five times)
      for (let i = 0; i < 5; i++) {
        await user.click(screen.getByTestId('key-6'));
      }

      let stateData = useDROStore.getState().stateData;
      if (stateData.stateDataType === 'bolt-hole') {
        expect(stateData.currentHole).toBe(6);
      }

      // Press key 6 again to wrap to hole 1
      await user.click(screen.getByTestId('key-6'));
      stateData = useDROStore.getState().stateData;
      if (stateData.stateDataType === 'bolt-hole') {
        expect(stateData.currentHole).toBe(1);
      }
    });

    it('wraps from first hole to last with key 4', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderSimulator();
      await setupNavigateState(user);

      // Start at hole 1, press key 4 to wrap to last hole
      await user.click(screen.getByTestId('key-4'));
      const stateData = useDROStore.getState().stateData;
      if (stateData.stateDataType === 'bolt-hole') {
        expect(stateData.currentHole).toBe(6);
      }
    });

    it('jumps to specific hole with number entry and enter', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderSimulator();
      await setupNavigateState(user);

      // Enter hole number 3 and press enter
      // Note: key-4 is left arrow (navigation), so use key-3 which is a digit-only key
      await user.click(screen.getByTestId('key-3'));
      await user.click(screen.getByTestId('key-enter'));

      const stateData = useDROStore.getState().stateData;
      if (stateData.stateDataType === 'bolt-hole') {
        expect(stateData.currentHole).toBe(3);
      }
    });

    it('shows current hole number with key 8', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderSimulator();
      await setupNavigateState(user);

      // Start at hole 1
      let stateData = useDROStore.getState().stateData;
      if (stateData.stateDataType === 'bolt-hole') {
        expect(stateData.currentHole).toBe(1);
      }

      // Press key 8 to show hole number - should put "1" in inputBuffer
      await user.click(screen.getByTestId('key-8'));
      expect(useDROStore.getState().vMem.inputBuffer).toBe('1');

      // Navigate to hole 3 and check key 8 again
      await user.click(screen.getByTestId('key-6')); // hole 2
      await user.click(screen.getByTestId('key-6')); // hole 3

      stateData = useDROStore.getState().stateData;
      if (stateData.stateDataType === 'bolt-hole') {
        expect(stateData.currentHole).toBe(3);
      }

      await user.click(screen.getByTestId('key-8'));
      expect(useDROStore.getState().vMem.inputBuffer).toBe('3');
    });
  });

  describe('Exiting Bolt Hole Mode', () => {
    it('exits to idle with clear key from menu select', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderSimulator();

      await enterBoltHoleMode(user);
      expect(useDROStore.getState().stateName).toBe('bolt-hole-menu-select');

      await user.click(screen.getByTestId('key-clear'));
      expect(useDROStore.getState().stateName).toBe('idle');
    });

    it('exits to idle with clear key from parameter entry', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderSimulator();

      await enterBoltHoleMode(user);
      await user.click(screen.getByTestId('key-enter'));
      await enterValue(user, '1');
      expect(useDROStore.getState().stateName).toBe('bolt-hole-circle-center-y');

      await user.click(screen.getByTestId('key-clear'));
      expect(useDROStore.getState().stateName).toBe('idle');
    });

    it('exits to idle with clear key from navigate state', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderSimulator();

      await enterBoltHoleMode(user);
      await user.click(screen.getByTestId('key-enter'));
      await enterValue(user, '0');
      await enterValue(user, '0');
      await enterValue(user, '1');
      await enterValue(user, '0');
      await enterValue(user, '6');
      expect(useDROStore.getState().stateName).toBe('bolt-hole-circle-navigate');

      await user.click(screen.getByTestId('key-clear'));
      expect(useDROStore.getState().stateName).toBe('idle');
    });
  });
});

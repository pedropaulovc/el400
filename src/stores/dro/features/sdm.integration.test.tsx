/**
 * Sub Datum Memory (SDM) Learn Mode — Integration Tests (US-009)
 *
 * Renders the full simulator and drives the SDM learn flow through the real
 * keypad/button components and Zustand store, asserting on the sr-only display
 * and the stored sub-datum points.
 *
 * Machine movement is simulated by writing vMem.manualAbsoluteValues (the
 * NoOp adapter reports a disconnected mill at the origin) and dispatching
 * MILL_STATE_CHANGED, which is how the reducer reads position when disconnected.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderSimulator,
  getAxisDisplayPureTextValue,
  getAxisDisplayPureNumberValue,
} from '../../../tests/helpers/integration-test-utils';
import { useDROStore } from '../../droStore';
import { SDM_INTRO_DURATION_MS } from './sdm';
import type { SdmData } from '../droStateMachine';

describe('SDM Learn Mode Integration (US-009)', () => {
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

  async function advancePastIntro() {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SDM_INTRO_DURATION_MS + 10);
    });
  }

  /** Simulate moving the machine to an absolute mm position. */
  function moveMachineTo(x: number, y: number, z: number) {
    act(() => {
      const store = useDROStore.getState();
      useDROStore.setState({
        vMem: { ...store.vMem, manualAbsoluteValues: { X: x, Y: y, Z: z } },
      });
      store.dispatch({ eventName: 'MILL_STATE_CHANGED' });
    });
  }

  function sdmData(): SdmData {
    return useDROStore.getState().stateData as SdmData;
  }

  /** Enter SDM, advance past intro, land on the Learn menu. */
  async function enterSdm(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByTestId('btn-sdm'));
    expect(useDROStore.getState().stateName).toBe('sdm-intro');
    await advancePastIntro();
    expect(useDROStore.getState().stateName).toBe('sdm-menu-learn');
  }

  describe('entering SDM and the menu (AC 9.1)', () => {
    it('shows the SdM intro then the Learn menu, with the SDM LED on', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderSimulator();

      await user.click(screen.getByTestId('btn-sdm'));
      expect(getAxisDisplayPureTextValue('X')).toBe('Sdm');

      await advancePastIntro();
      expect(getAxisDisplayPureTextValue('X')).toBe('LEArn');

      // SDM LED glows while in the function (manual §8.2).
      const sdmLed = screen.getByTestId('led-sdm').querySelector('span');
      expect(sdmLed?.className).toContain('text-red-400');
    });

    it('navigates the menu ring with the right arrow', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderSimulator();
      await enterSdm(user);

      await user.click(screen.getByTestId('key-6'));
      expect(getAxisDisplayPureTextValue('X')).toBe('rUn');
      await user.click(screen.getByTestId('key-6'));
      expect(getAxisDisplayPureTextValue('X')).toBe('ProGrAn');
      await user.click(screen.getByTestId('key-6'));
      expect(getAxisDisplayPureTextValue('X')).toBe('LEArn');
    });
  });

  describe('learn capture flow (AC 9.2 - AC 9.4)', () => {
    /** Confirm Learn, leaving the session at the step-entry prompt. */
    async function startLearn(user: ReturnType<typeof userEvent.setup>) {
      await enterSdm(user);
      await user.click(screen.getByTestId('key-enter'));
      expect(useDROStore.getState().stateName).toBe('sdm-learn-step');
    }

    it('confirms the default step 1 and captures the live position', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderSimulator();
      await startLearn(user);

      // Confirm step 1 (default, empty buffer).
      await user.click(screen.getByTestId('key-enter'));
      expect(useDROStore.getState().stateName).toBe('sdm-learn-position');
      expect(sdmData().currentStep).toBe(1);

      // Move the machine and capture: first X reveals the step, second stores.
      moveMachineTo(10, 5, 0);
      await user.click(screen.getByTestId('axis-select-x'));
      expect(getAxisDisplayPureNumberValue('Y')).toBe(1); // step shown
      expect(sdmData().points[1]).toBeUndefined();

      await user.click(screen.getByTestId('axis-select-x'));
      expect(sdmData().points[1]).toEqual({ X: 10, Y: 5, Z: 0 });
      // Advanced to step 2 (AC 9.4).
      expect(sdmData().currentStep).toBe(2);
    });

    it('lets the operator pick a starting step number on Y (AC 9.2)', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderSimulator();
      await startLearn(user);

      await user.click(screen.getByTestId('key-5'));
      expect(getAxisDisplayPureNumberValue('Y')).toBe(5);
      await user.click(screen.getByTestId('key-enter'));
      expect(sdmData().currentStep).toBe(5);
    });

    it('stores two consecutive steps and advances each time', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderSimulator();
      await startLearn(user);
      await user.click(screen.getByTestId('key-enter')); // step 1

      moveMachineTo(10, 0, 0);
      await user.click(screen.getByTestId('axis-select-x'));
      await user.click(screen.getByTestId('axis-select-x'));
      expect(sdmData().currentStep).toBe(2);

      moveMachineTo(20, 0, 0);
      await user.click(screen.getByTestId('axis-select-x'));
      await user.click(screen.getByTestId('axis-select-x'));

      expect(sdmData().points[1]).toEqual({ X: 10, Y: 0, Z: 0 });
      expect(sdmData().points[2]).toEqual({ X: 20, Y: 0, Z: 0 });
      expect(sdmData().currentStep).toBe(3);
    });

    it('exits to idle on clear (unhappy path)', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderSimulator();
      await startLearn(user);
      await user.click(screen.getByTestId('key-enter')); // at position state

      await user.click(screen.getByTestId('key-clear'));
      expect(useDROStore.getState().stateName).toBe('idle');
      // SDM LED off after exit.
      const sdmLed = screen.getByTestId('led-sdm').querySelector('span');
      expect(sdmLed?.className).not.toContain('text-red-400');
    });

    it('rejects an out-of-range step number (unhappy path)', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderSimulator();
      await startLearn(user);

      await user.click(screen.getByTestId('key-0'));
      await user.click(screen.getByTestId('key-enter'));
      // Stays on step-entry; did not advance to the position state.
      expect(useDROStore.getState().stateName).toBe('sdm-learn-step');
    });
  });

  // ──────────────────── Program / direct-entry (US-010) ───────────────
  describe('program direct-entry flow (US-010, AC 10.1 - AC 10.6)', () => {
    /** Confirm Program, leaving the session at the step prompt. */
    async function startProgram(user: ReturnType<typeof userEvent.setup>) {
      await enterSdm(user);
      // Navigate learn -> run -> program.
      await user.click(screen.getByTestId('key-6'));
      await user.click(screen.getByTestId('key-6'));
      expect(getAxisDisplayPureTextValue('X')).toBe('ProGrAn');
      await user.click(screen.getByTestId('key-enter'));
      expect(useDROStore.getState().stateName).toBe('sdm-program-step');
    }

    it('enters Program, shows the step prompt, and accepts X/Y/Z coordinates in mm (AC 10.1 - AC 10.3)', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderSimulator();
      // Work in mm so entered values map directly to stored mm.
      await user.click(screen.getByTestId('btn-toggle-unit'));
      await startProgram(user);

      // AC 10.2: step prompt with step number 1.
      expect(getAxisDisplayPureTextValue('X')).toBe('StEP');
      expect(getAxisDisplayPureNumberValue('Y')).toBe(1);

      // Confirm step 1 -> coordinate entry on X.
      await user.click(screen.getByTestId('key-enter'));
      expect(useDROStore.getState().stateName).toBe('sdm-program-input-x');

      // AC 10.3: enter X=50, Y=25, Z=10.
      await user.click(screen.getByTestId('key-5'));
      await user.click(screen.getByTestId('key-0'));
      await user.click(screen.getByTestId('key-enter'));
      expect(useDROStore.getState().stateName).toBe('sdm-program-input-y');

      await user.click(screen.getByTestId('key-2'));
      await user.click(screen.getByTestId('key-5'));
      await user.click(screen.getByTestId('key-enter'));
      expect(useDROStore.getState().stateName).toBe('sdm-program-input-z');

      await user.click(screen.getByTestId('key-1'));
      await user.click(screen.getByTestId('key-0'));
      await user.click(screen.getByTestId('key-enter'));

      // Back at the step view; coordinates stored (mm).
      expect(useDROStore.getState().stateName).toBe('sdm-program-step');
      expect(sdmData().points[1]).toEqual({ X: 50, Y: 25, Z: 10 });
    });

    it('saves and advances to the next step with 6► (AC 10.4)', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderSimulator();
      await user.click(screen.getByTestId('btn-toggle-unit'));
      await startProgram(user);

      // Program step 1 X only.
      await user.click(screen.getByTestId('key-enter')); // confirm step 1
      await user.click(screen.getByTestId('key-1'));
      await user.click(screen.getByTestId('key-0'));
      await user.click(screen.getByTestId('key-enter')); // X=10 -> Y
      await user.click(screen.getByTestId('key-enter')); // Y unchanged -> Z
      await user.click(screen.getByTestId('key-enter')); // Z unchanged -> step view

      // 6► advances to step 2.
      await user.click(screen.getByTestId('key-6'));
      expect(getAxisDisplayPureNumberValue('Y')).toBe(2);
      expect(sdmData().currentStep).toBe(2);
      // Step 1 coordinates preserved.
      expect(sdmData().points[1]?.X).toBe(10);
    });

    it('jumps directly to a step with Y + number + ent (AC 10.5)', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderSimulator();
      await startProgram(user);

      await user.click(screen.getByTestId('axis-select-y'));
      await user.click(screen.getByTestId('key-7'));
      await user.click(screen.getByTestId('key-enter'));
      expect(getAxisDisplayPureNumberValue('Y')).toBe(7);
      expect(sdmData().currentStep).toBe(7);
    });

    it('exits to idle on clear (AC 10.6, unhappy path)', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderSimulator();
      await startProgram(user);

      await user.click(screen.getByTestId('key-clear'));
      expect(useDROStore.getState().stateName).toBe('idle');
      const sdmLed = screen.getByTestId('led-sdm').querySelector('span');
      expect(sdmLed?.className).not.toContain('text-red-400');
    });
  });
});

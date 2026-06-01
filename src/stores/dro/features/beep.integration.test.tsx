import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderSimulator } from '../../../tests/helpers/integration-test-utils';
import { initializeDROMillConnection } from '../../droStore';
import { initializeMillStore } from '../../millStore';
import { MockMillAdapter } from '../../../adapters/MockMillAdapter';

/**
 * Integration tests: US-025 Keypad Beep (bEEP).
 *
 * Real-input discipline (mandatory):
 * - BEEP is toggled by clicking the actual setup buttons (btn-settings, the
 *   key-2 item-scroll key, the key-4/key-6 choice-cycle keys, End + key-enter),
 *   exactly as an operator would. No direct nvMem mutation drives the toggle.
 * - The beep is observed through the production playClickSound -> AudioContext
 *   path: a tracking AudioContext records every buffer-source start(). Pressing
 *   a real keypad button (DROButton onClick -> playClickSound) is what we count.
 *   No window hooks, no console-message sniffing (the story's e2e draft used
 *   `window.setDistanceToGo` + console 'beep' detection — both forbidden).
 *
 * Label contract (manual section 6.2 on/off convention, e.g. `EnF oFF`/`EnF on`,
 * `LoC off`/`LoC on`): the bEEP parameter renders `bEEP on` (default) and
 * `bEEP oFF`. These strings appear on no other parameter, so they uniquely
 * identify the bEEP item while scrolling.
 *
 * AC25.5 (zero-approach warning STILL beeps when keypad beep is off): driven
 * end-to-end here. With bEEP toggled OFF and the Near-Zero Warning (US-024)
 * enabled — both through the real setup menu — a real distance-to-go approach
 * (MockMillAdapter position moving toward the target via MILL_STATE_CHANGED)
 * still fires the warning's oscillator beep, while keypad presses stay silent.
 * The two paths are counted separately: buffer-source starts (playClickSound)
 * vs oscillator starts (playZeroApproachBeep).
 *
 * @see project/user-stories/06-configuration/US-025-keypad-beep.md
 * @see project/user-stories/06-configuration/US-024-zero-approach-warning.md
 */

/**
 * Tracking AudioContext: counts started nodes by source so the keypad click
 * (buffer source, playClickSound) and the zero-approach warning (oscillator,
 * playZeroApproachBeep — US-024) are observed independently. This lets AC25.5
 * assert the warning STILL beeps while keypad clicks are silenced.
 */
let beepCount = 0;
let warningBeepCount = 0;
class TrackingAudioContext {
  state = 'running';
  currentTime = 0;
  destination = {};
  createBufferSource() {
    return {
      buffer: null,
      connect: () => ({}),
      start: () => {
        beepCount += 1;
      },
      stop: () => undefined,
    };
  }
  createOscillator() {
    return {
      type: 'sine',
      frequency: { value: 0 },
      connect: () => ({}),
      start: () => {
        warningBeepCount += 1;
      },
      stop: () => undefined,
    };
  }
  createGain() {
    return {
      gain: {
        value: 1,
        setValueAtTime: () => undefined,
        linearRampToValueAtTime: () => undefined,
      },
      connect: () => ({}),
    };
  }
  decodeAudioData() {
    return Promise.resolve({});
  }
  resume() {
    return Promise.resolve();
  }
}

describe('Keypad beep — live key-press integration (US-025)', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let originalAudioContext: typeof AudioContext;
  let cleanup: (() => void) | null = null;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.clear();
    beepCount = 0;
    warningBeepCount = 0;
    originalAudioContext = global.AudioContext;
    global.AudioContext = TrackingAudioContext as unknown as typeof AudioContext;
  });

  afterEach(() => {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
    global.AudioContext = originalAudioContext;
    consoleWarnSpy.mockRestore();
  });

  async function connectMockMill(): Promise<MockMillAdapter> {
    initializeDROMillConnection();
    const mock = new MockMillAdapter();
    await act(async () => {
      cleanup = await initializeMillStore(mock);
    });
    return mock;
  }

  function rawAxisText(axis: 'X' | 'Y' | 'Z'): string {
    const el = screen.getByTestId(`axis-value-${axis.toLowerCase()}`);
    return (el.textContent || '').trim();
  }

  async function waitForAxisText(axis: 'X' | 'Y' | 'Z', expected: string) {
    await waitFor(() => {
      expect(rawAxisText(axis)).toBe(expected);
    });
  }

  function isBeepLabel(t: string): boolean {
    return t === 'bEEP on' || t === 'bEEP oFF';
  }

  /**
   * Drive the real setup menu to the bEEP parameter: open setup, select X (bEEP
   * is global but the shell still needs an axis chosen to enter the list),
   * scroll to the bEEP parameter, and leave it highlighted for the caller to
   * cycle and exit.
   */
  async function openBeepParameter(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByTestId('btn-settings'));
    await waitForAxisText('X', 'SELECt');
    await user.click(screen.getByTestId('axis-select-x'));

    let guard = 0;
    while (!isBeepLabel(rawAxisText('X'))) {
      await user.click(screen.getByTestId('key-2'));
      guard += 1;
      if (guard > 30) throw new Error('bEEP parameter not found in setup menu');
    }
  }

  /** Exit setup to idle via the terminal End item + ent. */
  async function exitSetup(user: ReturnType<typeof userEvent.setup>) {
    let guard = 0;
    while (rawAxisText('X') !== 'End') {
      await user.click(screen.getByTestId('key-2'));
      guard += 1;
      if (guard > 30) throw new Error('End item not found while exiting setup');
    }
    await user.click(screen.getByTestId('key-enter'));
    await waitFor(() => {
      expect(rawAxisText('X')).toMatch(/^-?\d/);
    });
  }

  async function emitPosition(mock: MockMillAdapter, x: number, y: number, z: number) {
    await act(async () => {
      mock.setPosition(x, y, z);
    });
  }

  /** ZERO AP (US-024) renders `bU22 on` / `bU22 oF`; unique to that parameter. */
  function isZeroApLabel(t: string): boolean {
    return t === 'bU22 on' || t === 'bU22 oF';
  }

  /**
   * In a SINGLE real setup session: turn bEEP OFF and the Near-Zero Warning ON,
   * then exit. Both are global commit-on-change params, so the order of visiting
   * them within the scroll does not matter.
   */
  async function setBeepOffAndWarningOn(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByTestId('btn-settings'));
    await waitForAxisText('X', 'SELECt');
    await user.click(screen.getByTestId('axis-select-x'));

    // bEEP -> oFF.
    let guard = 0;
    while (!isBeepLabel(rawAxisText('X'))) {
      await user.click(screen.getByTestId('key-2'));
      guard += 1;
      if (guard > 40) throw new Error('bEEP parameter not found in setup menu');
    }
    guard = 0;
    while (rawAxisText('X') !== 'bEEP oFF') {
      await user.click(screen.getByTestId('key-6'));
      guard += 1;
      if (guard > 4) throw new Error('bEEP oFF choice not reachable by cycling');
    }

    // ZERO AP -> on.
    guard = 0;
    while (!isZeroApLabel(rawAxisText('X'))) {
      await user.click(screen.getByTestId('key-2'));
      guard += 1;
      if (guard > 40) throw new Error('ZERO AP parameter not found in setup menu');
    }
    guard = 0;
    while (rawAxisText('X') !== 'bU22 on') {
      await user.click(screen.getByTestId('key-6'));
      guard += 1;
      if (guard > 4) throw new Error('bU22 on choice not reachable by cycling');
    }

    await exitSetup(user);
  }

  /**
   * Enter Distance-to-Go with an X target (mm) so the readout shows
   * (target - current X) and nears zero as the machine approaches (US-024 AC24.9
   * auto-enables the warning in this mode).
   */
  async function startDistanceToGoX(user: ReturnType<typeof userEvent.setup>, targetMm: string) {
    await user.click(screen.getByTestId('btn-distance-to-go'));
    await user.click(screen.getByTestId('axis-select-x'));
    for (const ch of targetMm) {
      if (ch === '.') await user.click(screen.getByTestId('key-decimal'));
      else await user.click(screen.getByTestId(`key-${ch}`));
    }
    await user.click(screen.getByTestId('key-enter'));
    await user.click(screen.getByTestId('btn-distance-to-go'));
  }

  it('navigates to the bEEP parameter showing its default ON (AC25.1, AC25.2)', async () => {
    const user = userEvent.setup();
    renderSimulator();
    await connectMockMill();

    await openBeepParameter(user);
    // Default is ON (AC25.2).
    expect(rawAxisText('X')).toBe('bEEP on');
  });

  it('toggles bEEP OFF with the 4 / 6 keys (AC25.3)', async () => {
    const user = userEvent.setup();
    renderSimulator();
    await connectMockMill();

    await openBeepParameter(user);
    expect(rawAxisText('X')).toBe('bEEP on');

    // key-6 (►) cycles to the other choice.
    await user.click(screen.getByTestId('key-6'));
    expect(rawAxisText('X')).toBe('bEEP oFF');

    // key-4 (◄) cycles back.
    await user.click(screen.getByTestId('key-4'));
    expect(rawAxisText('X')).toBe('bEEP on');
  });

  it('beeps on every key press while bEEP is ON (default) — AC25.4', async () => {
    const user = userEvent.setup();
    renderSimulator();
    await connectMockMill();

    // Leave bEEP at its default ON; back out to idle without changing it.
    await openBeepParameter(user);
    await exitSetup(user);

    beepCount = 0;
    await user.click(screen.getByTestId('key-1'));
    await user.click(screen.getByTestId('key-2'));
    await user.click(screen.getByTestId('key-3'));

    await waitFor(() => {
      expect(beepCount).toBe(3);
    });
  });

  it('keys are silent after toggling bEEP OFF — AC25.5 (keypad half)', async () => {
    const user = userEvent.setup();
    renderSimulator();
    await connectMockMill();

    await openBeepParameter(user);
    await user.click(screen.getByTestId('key-6')); // -> bEEP oFF
    expect(rawAxisText('X')).toBe('bEEP oFF');
    await exitSetup(user);

    beepCount = 0;
    await user.click(screen.getByTestId('key-1'));
    await user.click(screen.getByTestId('key-2'));
    await user.click(screen.getByTestId('key-3'));

    // No keypad beep — the gate silenced playClickSound.
    expect(beepCount).toBe(0);
  });

  it('with bEEP OFF, the zero-approach warning STILL beeps while keys stay silent (AC25.5)', async () => {
    const user = userEvent.setup();
    renderSimulator();
    const mock = await connectMockMill();
    await user.click(screen.getByTestId('btn-toggle-unit')); // mm
    await emitPosition(mock, 0, 0, 0);

    // Real setup: bEEP off AND Near-Zero Warning on.
    await setBeepOffAndWarningOn(user);

    // Keypad presses are silent (gate active) — no buffer-source beep.
    beepCount = 0;
    await user.click(screen.getByTestId('key-1'));
    await user.click(screen.getByTestId('key-2'));
    expect(beepCount).toBe(0);

    // Drive a real distance-to-go approach toward the target. The warning is
    // independent of beepEnabled, so its oscillator beep must still fire.
    warningBeepCount = 0;
    await startDistanceToGoX(user, '10');
    await waitForAxisText('X', '10.0000');
    // Approach to within the band (default BP DIST 0.002" ~= 0.0508 mm).
    await emitPosition(mock, 9.97, 0, 0);

    await waitFor(() => {
      expect(warningBeepCount).toBeGreaterThan(0);
    });
    // The keypad path stayed silent throughout (only the warning sounded).
    expect(beepCount).toBe(0);
  });
});

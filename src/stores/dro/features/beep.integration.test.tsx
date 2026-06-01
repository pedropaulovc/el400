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
 * AC25.5 note: the zero-approach warning must STILL beep when keypad beep is
 * off. That warning (US-024) is not present on this branch yet; this suite
 * proves the keypad half (silent keys) and that the gate is local to
 * playClickSound, so US-024's independent warning path is unaffected when it
 * lands. The warning-still-fires assertion lands with US-024's own tests.
 *
 * @see project/user-stories/06-configuration/US-025-keypad-beep.md
 */

/** Tracking AudioContext: every started buffer source bumps the shared counter. */
let beepCount = 0;
class TrackingAudioContext {
  state = 'running';
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
  createGain() {
    return { gain: { value: 1 }, connect: () => ({}) };
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
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderSimulator,
  getAxisDisplayPureNumberValue,
} from '../../../tests/helpers/integration-test-utils';
import { initializeDROMillConnection } from '../../droStore';
import { initializeMillStore } from '../../millStore';
import { MockMillAdapter } from '../../../adapters/MockMillAdapter';

/**
 * Integration tests: US-043 Keypad Lock (`LoC`).
 *
 * Real-input discipline (mandatory, matches the Direction/dP integration suites):
 * - The lock is engaged and released ONLY through the real setup menu (the
 *   wrench/setup button, axis select, 8/2 item-scroll, 6 choice-cycle, End+ent),
 *   exactly as an operator would. No window hooks, no forced nvMem, no direct
 *   store mutation of the lock.
 * - Locked-key presses are REAL clicks on the keypad/zero buttons.
 * - Position changes are driven by a connected MockMillAdapter via setPosition(),
 *   firing the production adapter -> millStore -> droStore MILL_STATE_CHANGED path
 *   (mirrors an encoder emitting a position).
 *
 * Covers: lock disables number/axis-zero keys (AC 43.2/43.3), the datum/ABS zero
 * is protected (AC 43.7), the live readout keeps tracking a jog while locked
 * (AC 43.5), the wrench still enters setup while locked (AC 43.4), and unlocking
 * via setup restores key input.
 *
 * @see project/user-stories/06-configuration/US-043-keypad-lock.md
 */
describe('Keypad Lock — setup affordance + live readout integration (US-043)', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let cleanup: (() => void) | null = null;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.clear();
  });

  afterEach(() => {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
    consoleWarnSpy.mockRestore();
  });

  /** Connect a MockMillAdapter to the rendered simulator (mirrors app boot). */
  async function connectMockMill(): Promise<MockMillAdapter> {
    initializeDROMillConnection();
    const mock = new MockMillAdapter();
    await act(async () => {
      cleanup = await initializeMillStore(mock);
    });
    return mock;
  }

  /** Emit a new absolute encoder position (real MILL_STATE_CHANGED path). */
  async function emitPosition(mock: MockMillAdapter, x: number, y: number, z: number) {
    await act(async () => {
      mock.setPosition(x, y, z);
    });
  }

  function rawAxisText(axis: 'X' | 'Y' | 'Z'): string {
    const el = screen.getByTestId(`axis-value-${axis.toLowerCase()}`);
    return (el.textContent || '').trim();
  }

  /** The LoC parameter renders one of these two labels while highlighted. */
  function isLockLabel(t: string): boolean {
    return t === 'LoC oFF' || t === 'LoC on';
  }

  /**
   * Drive the real setup menu to set `LoC` to the requested state: open setup,
   * (the SELECT prompt asks for an axis even for a global param — pick X), scroll
   * to the LoC parameter, cycle to the target label, then exit via End + ent.
   * Works whether or not the panel is already locked, because the wrench/setup
   * key and in-setup navigation stay live while locked (the unlock path).
   */
  async function setLock(
    user: ReturnType<typeof userEvent.setup>,
    target: 'on' | 'off'
  ) {
    const targetLabel = target === 'on' ? 'LoC on' : 'LoC oFF';
    await user.click(screen.getByTestId('btn-settings'));
    await waitFor(() => { expect(rawAxisText('X')).toBe('SELECt'); });
    await user.click(screen.getByTestId('axis-select-x'));

    // Scroll down to the LoC parameter.
    let guard = 0;
    while (!isLockLabel(rawAxisText('X'))) {
      await user.click(screen.getByTestId('key-2'));
      guard += 1;
      if (guard > 30) throw new Error('LoC parameter not found in setup menu');
    }

    // Cycle the choice to the requested label.
    guard = 0;
    while (rawAxisText('X') !== targetLabel) {
      await user.click(screen.getByTestId('key-6'));
      guard += 1;
      if (guard > 4) throw new Error(`LoC choice "${targetLabel}" not reachable`);
    }

    // Exit via the terminal End item + ent.
    guard = 0;
    while (rawAxisText('X') !== 'End') {
      await user.click(screen.getByTestId('key-2'));
      guard += 1;
      if (guard > 30) throw new Error('End item not found while exiting setup');
    }
    await user.click(screen.getByTestId('key-enter'));
  }

  it('locked number/zero keys are no-ops while the live readout keeps tracking a jog (AC 43.3/43.5/43.7)', async () => {
    const { user } = await renderSimulator({ millSource: 'noop' });
    const mock = await connectMockMill();

    // mm for exact magnitudes; establish a known X and zero it (datum at X=10).
    await user.click(screen.getByTestId('btn-toggle-unit'));
    await emitPosition(mock, 10, 0, 0);
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(10, 4); });
    await user.click(screen.getByTestId('axis-zero-x'));
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(0, 4); });

    // Move so the readout shows a meaningful non-zero datum-relative value.
    await emitPosition(mock, 13, 0, 0);
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(3, 4); });

    // Lock the panel via the REAL setup menu.
    await setLock(user, 'on');
    // Back on the readout (still 3 relative to the datum).
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(3, 4); });

    // While locked: pressing the X-zero button must NOT re-datum (AC 43.7) and
    // number keys must not enter a value (AC 43.3). The reading stays at 3.
    await user.click(screen.getByTestId('axis-zero-x'));
    await user.click(screen.getByTestId('key-5'));
    await user.click(screen.getByTestId('axis-select-y'));
    await user.click(screen.getByTestId('key-enter'));
    // Give any (erroneous) state change a chance to land, then assert unchanged.
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(3, 4); });

    // But a real jog still moves the readout while locked (AC 43.5): the datum is
    // intact, so position 18 reads 8 relative to the X=10 datum.
    await emitPosition(mock, 18, 0, 0);
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(8, 4); });
  });

  it('wrench still enters setup while locked, and unlocking restores key input (AC 43.4)', async () => {
    const { user } = await renderSimulator({ millSource: 'noop' });
    const mock = await connectMockMill();

    await user.click(screen.getByTestId('btn-toggle-unit')); // mm
    await emitPosition(mock, 7, 0, 0);
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(7, 4); });

    // Lock the panel.
    await setLock(user, 'on');
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(7, 4); });

    // Locked: the X-zero button is inert (no datum change) — proves the lock is
    // actually engaged before we test the unlock path.
    await user.click(screen.getByTestId('axis-zero-x'));
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(7, 4); });

    // The wrench still enters setup (AC 43.4): unlock via the real menu.
    await setLock(user, 'off');
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(7, 4); });

    // Now key input works again: zeroing X re-datums so the readout reads 0.
    await user.click(screen.getByTestId('axis-zero-x'));
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(0, 4); });
  });
});

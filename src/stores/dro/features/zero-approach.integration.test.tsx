import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderSimulator } from '../../../tests/helpers/integration-test-utils';
import { initializeDROMillConnection } from '../../droStore';
import { initializeMillStore } from '../../millStore';
import { MockMillAdapter } from '../../../adapters/MockMillAdapter';

/**
 * Integration tests: US-024 Near-Zero (Zero-Approach) Warning, exercised through
 * the Distance-to-Go function (one of the modes where the warning is auto-enabled,
 * AC24.9). In distance-to-go the readout shows (target − current position), so as
 * the machine nears the target the reading nears zero and the warning fires.
 *
 * Real-input discipline:
 * - The warning is enabled via the ACTUAL setup menu (wrench → axis → scroll to
 *   ZERO AP → cycle to `bU22 on` → exit via End + ent). No nvMem mutation, no
 *   window hooks.
 * - A target is entered through the real preset/distance-to-go buttons, then the
 *   machine is driven toward it by a connected MockMillAdapter's setPosition() —
 *   the production adapter → millStore → droStore MILL_STATE_CHANGED path a real
 *   encoder uses. The warning indicator (`audio-indicator`) is read from the DOM.
 *
 * Work in mm so the 0.002" (≈0.0508 mm) approach band has clean magnitudes.
 *
 * @see project/user-stories/06-configuration/US-024-zero-approach-warning.md
 */
describe('Near-Zero Warning — distance-to-go integration (US-024)', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let cleanup: (() => void) | null = null;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.clear();
  });

  afterEach(() => {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  async function connectMockMill(): Promise<MockMillAdapter> {
    initializeDROMillConnection();
    const mock = new MockMillAdapter();
    await act(async () => {
      cleanup = await initializeMillStore(mock);
    });
    return mock;
  }

  async function emitPosition(mock: MockMillAdapter, x: number, y: number, z: number) {
    await act(async () => {
      mock.setPosition(x, y, z);
    });
  }

  function rawAxisText(axis: 'X' | 'Y' | 'Z'): string {
    const el = screen.getByTestId(`axis-value-${axis.toLowerCase()}`);
    return (el.textContent || '').trim();
  }

  function indicator(): HTMLElement | null {
    return screen.queryByTestId('audio-indicator');
  }

  async function waitForAxisText(axis: 'X' | 'Y' | 'Z', expected: string) {
    await waitFor(() => { expect(rawAxisText(axis)).toBe(expected); });
  }

  /** ZERO AP renders `bU22 on` / `bU22 oF`; unique to this parameter. */
  function isZeroApLabel(t: string): boolean {
    return t === 'bU22 on' || t === 'bU22 oF';
  }

  /** Enable the Near-Zero Warning through the real setup menu (commit-on-change). */
  async function enableZeroApproach(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByTestId('btn-settings'));
    await waitForAxisText('X', 'SELECt');
    await user.click(screen.getByTestId('axis-select-x'));

    let guard = 0;
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
    guard = 0;
    while (rawAxisText('X') !== 'End') {
      await user.click(screen.getByTestId('key-2'));
      guard += 1;
      if (guard > 40) throw new Error('End item not found while exiting setup');
    }
    await user.click(screen.getByTestId('key-enter'));
    await waitForAxisText('X', '0.0000');
  }

  /**
   * Enter Distance-to-Go with an X target (mm): open distance-to-go, select X,
   * type the value, confirm, then press distance-to-go again to execute. The
   * readout then shows (target − current X).
   */
  async function startDistanceToGoX(user: ReturnType<typeof userEvent.setup>, targetMm: string) {
    await user.click(screen.getByTestId('btn-distance-to-go')); // -> preset-select
    await user.click(screen.getByTestId('axis-select-x')); // -> preset-input-x
    for (const ch of targetMm) {
      if (ch === '.') await user.click(screen.getByTestId('key-decimal'));
      else await user.click(screen.getByTestId(`key-${ch}`));
    }
    await user.click(screen.getByTestId('key-enter')); // store target -> preset-select
    await user.click(screen.getByTestId('btn-distance-to-go')); // -> distance-to-go
  }

  it('does not warn outside BP DIST, fires once within it (AC24.6, AC24.10)', async () => {
    const { user } = await renderSimulator({ millSource: 'noop' });
    const mock = await connectMockMill();
    await user.click(screen.getByTestId('btn-toggle-unit')); // mm
    await emitPosition(mock, 0, 0, 0);

    await enableZeroApproach(user);
    // Target X = 10 mm. Machine at 0 -> distance-to-go reads 10.
    await startDistanceToGoX(user, '10');
    await waitForAxisText('X', '10.0000');
    expect(indicator()).toBeNull();

    // Drive toward the target but stop 1 mm short — outside the band -> silent.
    await emitPosition(mock, 9, 0, 0);
    await waitForAxisText('X', '1.0000');
    expect(indicator()).toBeNull();

    // Close to within 0.03 mm of the target — inside the band -> warning fires.
    await emitPosition(mock, 9.97, 0, 0);
    await waitFor(() => { expect(indicator()).not.toBeNull(); });
  });

  it('clears when the axis backs out of the approach band again', async () => {
    const { user } = await renderSimulator({ millSource: 'noop' });
    const mock = await connectMockMill();
    await user.click(screen.getByTestId('btn-toggle-unit')); // mm
    await emitPosition(mock, 0, 0, 0);

    await enableZeroApproach(user);
    await startDistanceToGoX(user, '5');

    // Reach within the band -> on.
    await emitPosition(mock, 4.98, 0, 0);
    await waitFor(() => { expect(indicator()).not.toBeNull(); });

    // Back out 0.5 mm -> clears (BP TOLR default 0).
    await emitPosition(mock, 4.5, 0, 0);
    await waitFor(() => { expect(indicator()).toBeNull(); });
  });

  it('never warns while disabled, even on top of the target (AC24.2 OFF)', async () => {
    const { user } = await renderSimulator({ millSource: 'noop' });
    const mock = await connectMockMill();
    await user.click(screen.getByTestId('btn-toggle-unit')); // mm
    await emitPosition(mock, 0, 0, 0);

    // Do NOT enable the warning. Enter distance-to-go and sit exactly on target.
    await startDistanceToGoX(user, '3');
    await emitPosition(mock, 3, 0, 0);
    await waitForAxisText('X', '0.0000');
    expect(indicator()).toBeNull();
  });

  it('is off in plain idle even with an axis at zero (AC24.9 gating)', async () => {
    const { user } = await renderSimulator({ millSource: 'noop' });
    const mock = await connectMockMill();
    await user.click(screen.getByTestId('btn-toggle-unit')); // mm
    await emitPosition(mock, 0, 0, 0);

    // Enable the warning, but stay in idle (no target). Zero X — sits at 0.
    await enableZeroApproach(user);
    await user.click(screen.getByTestId('axis-zero-x'));
    await waitForAxisText('X', '0.0000');
    // No distance-to-go / function context -> no warning.
    expect(indicator()).toBeNull();
  });

  it('only the approaching axis flashes (per-axis)', async () => {
    const { user } = await renderSimulator({ millSource: 'noop' });
    const mock = await connectMockMill();
    await user.click(screen.getByTestId('btn-toggle-unit')); // mm
    await emitPosition(mock, 0, 0, 0);

    await enableZeroApproach(user);
    await startDistanceToGoX(user, '6'); // X target 6; Y has no target

    // Approach X to within the band; Y stays unset (shows live position, far).
    await emitPosition(mock, 5.98, 5, 0);
    await waitFor(() => { expect(indicator()).not.toBeNull(); });

    const xFlash = screen.getByTestId('axis-display-x').querySelector('[data-blinking="true"]');
    const yFlash = screen.getByTestId('axis-display-y').querySelector('[data-blinking="true"]');
    expect(xFlash).not.toBeNull();
    expect(yFlash).toBeNull();
  });
});

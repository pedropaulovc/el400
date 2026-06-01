/**
 * Integration tests: US-040 AC 40.4 / AC 40.3 (angular half) — once an axis is set
 * to AnGULAr through the REAL setup menu, the display-resolution (`dP`) parameter
 * offers the ANGULAR DMS formats (`dd.mn`, `dd.mn.SS`, `dd.dEC`) instead of the
 * linear micron values, and the chosen format drives how the LIVE angular readout
 * renders the wrapped degrees.
 *
 * Real-input discipline (mirrors counting-mode.integration.test.tsx):
 * - Position changes are driven by a connected MockMillAdapter via setPosition(),
 *   firing the production adapter -> millStore -> droStore MILL_STATE_CHANGED path.
 *   No forced connection, no store backdoor.
 * - All setup changes are driven by clicking the real setup buttons (btn-settings,
 *   axis-select, the 8/2 item-scroll keys, the 6 choice-cycle key, End + ent).
 *
 * @see project/user-stories/06-configuration/US-040-counting-mode.md (AC 40.3/40.4)
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderSimulator } from '../../../tests/helpers/integration-test-utils';
import { initializeDROMillConnection } from '../../droStore';
import { initializeMillStore } from '../../millStore';
import { MockMillAdapter } from '../../../adapters/MockMillAdapter';

describe('Angular display-resolution DMS formats — setup + live readout (US-040)', () => {
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

  function isCountingModeLabel(t: string): boolean {
    return t === 'LinEAr' || t === 'AnGULAr';
  }

  /** True while the dP item is highlighted in either its linear or angular form. */
  function isDpLabel(t: string): boolean {
    return t.startsWith('dP ') || t.startsWith('dd.');
  }

  async function openSetupForAxis(user: ReturnType<typeof userEvent.setup>, axis: 'X' | 'Y' | 'Z') {
    await user.click(screen.getByTestId('btn-settings'));
    await waitFor(() => { expect(rawAxisText('X')).toBe('SELECt'); });
    await user.click(screen.getByTestId(`axis-select-${axis.toLowerCase()}`));
  }

  /** Scroll the setup list up (key-8) until `pred` matches the highlighted label. */
  async function scrollUpTo(
    user: ReturnType<typeof userEvent.setup>,
    pred: (t: string) => boolean,
    what: string
  ) {
    let guard = 0;
    while (!pred(rawAxisText('X'))) {
      await user.click(screen.getByTestId('key-8'));
      guard += 1;
      if (guard > 30) throw new Error(`${what} not found in setup menu`);
    }
  }

  /** Cycle the highlighted choice (key-6) until the label reads `target`. */
  async function cycleChoiceTo(
    user: ReturnType<typeof userEvent.setup>,
    target: string,
    max = 8
  ) {
    let guard = 0;
    while (rawAxisText('X') !== target) {
      await user.click(screen.getByTestId('key-6'));
      guard += 1;
      if (guard > max) throw new Error(`choice ${target} not reachable by cycling`);
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
  }

  it('dP offers the angular formats once the axis is AnGULAr (AC 40.4)', async () => {
    const { user } = await renderSimulator({ millSource: 'noop' });
    await connectMockMill();

    await openSetupForAxis(user, 'X');

    // Counting-mode is the first item; set X to AnGULAr.
    await scrollUpTo(user, isCountingModeLabel, 'counting-mode');
    await cycleChoiceTo(user, 'AnGULAr', 4);

    // Navigate down to the dP item: now an angular axis, it shows a DMS label.
    await scrollUpTo(user, isDpLabel, 'dP');
    expect(rawAxisText('X')).toBe('dd.mn'); // default angular format (AC 40.4)

    // Cycling exposes the other two angular formats, not the micron values.
    await user.click(screen.getByTestId('key-6'));
    expect(rawAxisText('X')).toBe('dd.mn.SS');
    await user.click(screen.getByTestId('key-6'));
    expect(rawAxisText('X')).toBe('dd.dEC');
    // Wrap-around stays within the 3-format angular set (back to dd.mn).
    await user.click(screen.getByTestId('key-6'));
    expect(rawAxisText('X')).toBe('dd.mn');
  });

  it('a linear axis keeps the micron dP options (regression, AC 40.3)', async () => {
    const { user } = await renderSimulator({ millSource: 'noop' });
    await connectMockMill();

    // X stays LinEAr; open setup and scroll to dP — it must show the micron form.
    await openSetupForAxis(user, 'X');
    await scrollUpTo(user, (t) => t.startsWith('dP '), 'dP (linear)');
    expect(rawAxisText('X')).toBe('dP 5.0');
    // Cycling reaches another micron value, never a DMS label.
    await user.click(screen.getByTestId('key-6'));
    expect(rawAxisText('X')).toBe('dP 10.0');
  });

  it('the chosen angular format drives the live DMS readout (AC 40.3)', async () => {
    const { user } = await renderSimulator({ millSource: 'noop' });
    const mock = await connectMockMill();

    await user.click(screen.getByTestId('btn-toggle-unit')); // mm so 12.5 is exact

    await openSetupForAxis(user, 'X');
    await scrollUpTo(user, isCountingModeLabel, 'counting-mode');
    await cycleChoiceTo(user, 'AnGULAr', 4);

    // Pick the degrees-minutes-seconds format on the dP item.
    await scrollUpTo(user, isDpLabel, 'dP');
    await cycleChoiceTo(user, 'dd.mn.SS', 4);
    await exitSetup(user);

    // 12.5° renders as 12°30'00" -> "12.30.00" on the live readout.
    await emitPosition(mock, 12.5, 0, 0);
    await waitFor(() => { expect(rawAxisText('X')).toBe('12.30.00'); });

    // The format is live: a later encoder update reformats in DMS too (90° -> 90.00.00).
    await emitPosition(mock, 90, 0, 0);
    await waitFor(() => { expect(rawAxisText('X')).toBe('90.00.00'); });
  });
});

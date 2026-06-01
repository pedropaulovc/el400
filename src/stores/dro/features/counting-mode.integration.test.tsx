/**
 * Integration tests: US-040 AC 40.4 / 40.5 — switching an axis to AnGULAr through
 * the REAL setup menu makes its LIVE readout show degrees (wrapped to [0, 360)),
 * while linear axes keep reading distance, and the effect survives later encoder
 * updates.
 *
 * Real-input discipline (mirrors the Direction integration test, US-002):
 * - Position changes are driven by a connected MockMillAdapter via setPosition(),
 *   firing the production adapter -> millStore -> droStore MILL_STATE_CHANGED path
 *   (an encoder emitting a position). No forced connection, no store backdoor.
 * - The counting-mode change is driven by clicking the real setup buttons
 *   (btn-settings, axis-select, the 8/2 item-scroll keys, the 6 choice-cycle key,
 *   then End + ent), exactly as an operator would.
 *
 * Label contract (manual section 6.2): the counting-mode parameter renders
 * `LinEAr` (value 'linear') and `AnGULAr` (value 'angular'); these strings appear
 * on no other parameter, so they uniquely identify the item while scrolling.
 *
 * @see project/user-stories/06-configuration/US-040-counting-mode.md
 */
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

describe('Counting mode angular display — live readout integration (US-040)', () => {
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

  function isCountingModeLabel(t: string): boolean {
    return t === 'LinEAr' || t === 'AnGULAr';
  }

  /**
   * Drive the real setup menu to set the given axis to AnGULAr: open setup, select
   * the axis, scroll to the counting-mode parameter (the first item, label LinEAr /
   * AnGULAr), cycle the choice to AnGULAr, then exit via the terminal End + ent.
   */
  async function setAxisAngular(user: ReturnType<typeof userEvent.setup>, axis: 'X' | 'Y' | 'Z') {
    await user.click(screen.getByTestId('btn-settings'));
    await waitFor(() => { expect(rawAxisText('X')).toBe('SELECt'); });

    await user.click(screen.getByTestId(`axis-select-${axis.toLowerCase()}`));

    // Counting-mode is the first item; scroll up if needed until it is highlighted.
    let guard = 0;
    while (!isCountingModeLabel(rawAxisText('X'))) {
      await user.click(screen.getByTestId('key-8'));
      guard += 1;
      if (guard > 30) throw new Error('counting-mode parameter not found in setup menu');
    }

    // Cycle the choice until it reads AnGULAr.
    guard = 0;
    while (rawAxisText('X') !== 'AnGULAr') {
      await user.click(screen.getByTestId('key-6'));
      guard += 1;
      if (guard > 4) throw new Error('AnGULAr choice not reachable by cycling');
    }

    // Exit to idle via the terminal End item + ent.
    guard = 0;
    while (rawAxisText('X') !== 'End') {
      await user.click(screen.getByTestId('key-2'));
      guard += 1;
      if (guard > 30) throw new Error('End item not found while exiting setup');
    }
    await user.click(screen.getByTestId('key-enter'));
  }

  it('shows the live X readout in degrees once X is set to AnGULAr (AC 40.4)', async () => {
    const user = userEvent.setup();
    renderSimulator();
    const mock = await connectMockMill();

    // Switch to mm so the raw magnitude is exact, then establish a known position.
    await user.click(screen.getByTestId('btn-toggle-unit'));
    await emitPosition(mock, 90, 0, 0);
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(90, 4); });

    await setAxisAngular(user, 'X');

    // The same raw 90 now reads as 90 degrees in the default angular format
    // (dd.mn -> "90.00", i.e. 90°00'); NOT unit-converted and IS wrappable.
    await waitFor(() => { expect(rawAxisText('X')).toBe('90.00'); });

    // A later encoder update past 360 wraps on the live display (450 -> 90°).
    await emitPosition(mock, 450, 0, 0);
    await waitFor(() => { expect(rawAxisText('X')).toBe('90.00'); });

    // And 370 -> 10°.
    await emitPosition(mock, 370, 0, 0);
    await waitFor(() => { expect(rawAxisText('X')).toBe('10.00'); });
  });

  it('angular X does not unit-convert when the display is in inch (AC 40.4)', async () => {
    const user = userEvent.setup();
    renderSimulator(); // default unit is inch
    const mock = await connectMockMill();

    await setAxisAngular(user, 'X');

    // 90 raw reads as 90 degrees even though the panel unit is inch (no /25.4).
    await emitPosition(mock, 90, 0, 0);
    await waitFor(() => { expect(rawAxisText('X')).toBe('90.00'); });
  });

  it('switches only X to angular — Y keeps reading linear distance (AC 40.5)', async () => {
    const user = userEvent.setup();
    renderSimulator();
    const mock = await connectMockMill();

    await user.click(screen.getByTestId('btn-toggle-unit')); // mm
    await setAxisAngular(user, 'X');

    // X angular (wrapped degrees in dd.mn), Y linear (mm distance) from the same encoder.
    await emitPosition(mock, 400, 12, 0);
    await waitFor(() => { expect(rawAxisText('X')).toBe('40.00'); });
    expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(12, 4);
  });
});

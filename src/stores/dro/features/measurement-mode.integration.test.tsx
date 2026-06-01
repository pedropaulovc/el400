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
 * Integration tests: US-041 — choosing diameter (`diA`) mode for an axis through
 * the REAL setup menu DOUBLES that axis's LIVE position readout (lathe diameter
 * turning), and the doubling survives later encoder updates and is per-axis.
 *
 * Real-input discipline (mirrors the US-002 Direction integration suite):
 * - Position changes are driven by a connected MockMillAdapter via setPosition(),
 *   which fires the production adapter -> millStore -> droStore MILL_STATE_CHANGED
 *   path (an encoder emitting a position). No forced `connected:true`, no window
 *   hooks, no direct store mutation of the display.
 * - The mode change is driven by clicking the actual setup buttons (btn-settings,
 *   axis-select-x, the 2 item-scroll key, the 6 choice-cycle key, then End + ent),
 *   exactly as an operator would.
 *
 * Label contract (manual section 6.2 `rAd` / `diA`): the measurement-mode
 * parameter renders `rAd` (value 'radius') and `diA` (value 'diameter'). These
 * two strings appear on no other parameter, so they uniquely identify the item
 * while scrolling.
 *
 * @see project/user-stories/06-configuration/US-041-radius-diameter-mode.md
 */
describe('Diameter ×2 — live readout integration (US-041 AC 41.4/41.5)', () => {
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

  function isMeasurementLabel(t: string): boolean {
    return t === 'rAd' || t === 'diA';
  }

  async function waitForAxisText(axis: 'X' | 'Y' | 'Z', expected: string) {
    await waitFor(() => { expect(rawAxisText(axis)).toBe(expected); });
  }

  /**
   * Drive the real setup menu to set the given axis's measurement mode to `diA`:
   * open setup, select the axis, scroll to the rAd/diA parameter, cycle to diA,
   * then exit via the terminal End item + ent.
   */
  async function setAxisDiameter(
    user: ReturnType<typeof userEvent.setup>,
    axis: 'X' | 'Y' | 'Z'
  ) {
    await user.click(screen.getByTestId('btn-settings'));
    await waitForAxisText('X', 'SELECt');

    await user.click(screen.getByTestId(`axis-select-${axis.toLowerCase()}`));

    // Scroll down (key-2) until the measurement-mode parameter is highlighted.
    let guard = 0;
    while (!isMeasurementLabel(rawAxisText(axis))) {
      await user.click(screen.getByTestId('key-2'));
      guard += 1;
      if (guard > 30) throw new Error('measurement-mode parameter not found in setup menu');
    }

    // Cycle the choice (key-6) until it reads diA.
    guard = 0;
    while (rawAxisText(axis) !== 'diA') {
      await user.click(screen.getByTestId('key-6'));
      guard += 1;
      if (guard > 4) throw new Error('diA choice not reachable by cycling');
    }

    // Exit to idle via the terminal End item + ent.
    guard = 0;
    while (rawAxisText(axis) !== 'End') {
      await user.click(screen.getByTestId('key-2'));
      guard += 1;
      if (guard > 30) throw new Error('End item not found while exiting setup');
    }
    await user.click(screen.getByTestId('key-enter'));
  }

  it('doubles the live X readout when X is set to diA via the setup menu (AC 41.4)', async () => {
    const user = userEvent.setup();
    renderSimulator();
    const mock = await connectMockMill();

    // Switch to mm so magnitudes are exact, establish a known X = 1.000.
    await user.click(screen.getByTestId('btn-toggle-unit'));
    await emitPosition(mock, 1, 0, 0);
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(1, 4); });

    // Set X to diameter mode through the real menu.
    await setAxisDiameter(user, 'X');

    // The SAME machine position (1) must now read 2.000 on the live display.
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(2, 4); });
  });

  it('keeps the doubling on a subsequent MILL_STATE_CHANGED (persisted, not one-shot)', async () => {
    const user = userEvent.setup();
    renderSimulator();
    const mock = await connectMockMill();

    await user.click(screen.getByTestId('btn-toggle-unit')); // mm
    await emitPosition(mock, 2, 0, 0);
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(2, 4); });

    await setAxisDiameter(user, 'X');
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(4, 4); });

    // A NEW encoder position arrives after the change: diameter mode must still apply.
    await emitPosition(mock, 6, 0, 0);
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(12, 4); });
  });

  it('doubles only X — Y readout stays 1:1 (per-axis, AC 41.5)', async () => {
    const user = userEvent.setup();
    renderSimulator();
    const mock = await connectMockMill();

    await user.click(screen.getByTestId('btn-toggle-unit')); // mm
    await emitPosition(mock, 3, 3, 0);
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(3, 4); });
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(3, 4); });

    await setAxisDiameter(user, 'X');

    // X doubled, Y untouched by the per-axis measurement-mode change.
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(6, 4); });
    expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(3, 4);

    // A later encoder update confirms both axes keep their respective scales.
    await emitPosition(mock, 5, 7, 0);
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(10, 4); });
    expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(7, 4);
  });
});

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
 * Integration tests: US-002 AC 2.2 — changing the per-axis Direction through the
 * REAL setup menu flips the LIVE position readout, and the flip survives later
 * encoder updates.
 *
 * Real-input discipline:
 * - Position changes are driven by a connected MockMillAdapter via setPosition(),
 *   which fires the production adapter -> millStore -> droStore MILL_STATE_CHANGED
 *   path (mirrors an encoder emitting a position). No forced `connected:true`, no
 *   window hooks, no direct store mutation of the display.
 * - The Direction change is driven by clicking the actual setup buttons
 *   (btn-settings, axis-select-x, the 8/2 item-scroll keys, the 6 choice-cycle
 *   key, then End + ent), exactly as an operator would.
 *
 * Label contract (manual section 6.2 `dir`): the Direction parameter renders
 * `LEFt` (value 'normal') and `riGht` (value 'reversed'); the seven-segment panel
 * has no uppercase T glyph. These two strings appear on no other parameter, so
 * they uniquely identify the Direction item while scrolling.
 *
 * @see project/user-stories/01-foundation/US-002-sign-convention.md
 */
describe('Direction sign flip — live readout integration (US-002 AC 2.2)', () => {
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

  /**
   * Connect a MockMillAdapter to the rendered simulator and return it.
   * Wires the real DRO<->mill dispatch first, then connects, mirroring app boot.
   */
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

  /**
   * Drive the real setup menu to set the X-axis Direction to riGht (reversed):
   * open setup, select X, scroll down to the Direction parameter (label LEFt or
   * riGht), cycle the choice to riGht, then exit via the terminal End item + ent.
   */
  async function setXDirectionRight(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByTestId('btn-settings'));
    await waitForAxisText('X', 'SELECt');

    await user.click(screen.getByTestId('axis-select-x'));

    // Scroll down (key-2) until the Direction parameter is highlighted.
    let guard = 0;
    while (!isDirectionLabel(rawAxisText('X'))) {
      await user.click(screen.getByTestId('key-2'));
      guard += 1;
      if (guard > 30) throw new Error('Direction parameter not found in setup menu');
    }

    // Cycle the choice (key-6) until it reads riGht.
    guard = 0;
    while (rawAxisText('X') !== 'riGht') {
      await user.click(screen.getByTestId('key-6'));
      guard += 1;
      if (guard > 4) throw new Error('riGht choice not reachable by cycling');
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

  function rawAxisText(axis: 'X' | 'Y' | 'Z'): string {
    const el = screen.getByTestId(`axis-value-${axis.toLowerCase()}`);
    return (el.textContent || '').trim();
  }

  function isDirectionLabel(t: string): boolean {
    return t === 'LEFt' || t === 'riGht';
  }

  async function waitForAxisText(axis: 'X' | 'Y' | 'Z', expected: string) {
    await waitFor(() => { expect(rawAxisText(axis)).toBe(expected); });
  }

  it('flips the live X readout when Direction is set to riGht via the setup menu', async () => {
    const user = userEvent.setup();
    renderSimulator();
    const mock = await connectMockMill();

    // Switch to mm so magnitudes are exact, then establish a known positive X.
    await user.click(screen.getByTestId('btn-toggle-unit'));
    await emitPosition(mock, 10, 0, 0);
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(10, 4); });
    // Positive value carries no leading minus.
    expect(rawAxisText('X').startsWith('-')).toBe(false);

    // Flip X Direction to riGht through the real menu.
    await setXDirectionRight(user);

    // The SAME machine position (10) must now read -10 on the live display.
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(-10, 4); });
    expect(rawAxisText('X').startsWith('-')).toBe(true);
  });

  it('keeps the flipped sign on a subsequent MILL_STATE_CHANGED', async () => {
    const user = userEvent.setup();
    renderSimulator();
    const mock = await connectMockMill();

    await user.click(screen.getByTestId('btn-toggle-unit')); // mm
    await emitPosition(mock, 4, 0, 0);
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(4, 4); });

    await setXDirectionRight(user);
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(-4, 4); });

    // A NEW encoder position arrives after the flip: the persisted Direction must
    // still apply (kills a one-shot flip that only rewrote the current reading).
    await emitPosition(mock, 12, 0, 0);
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(-12, 4); });

    // And a move back toward zero stays consistent under the flip.
    await emitPosition(mock, 3, 0, 0);
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(-3, 4); });
  });

  it('flips only X — Y readout stays standard (per-axis)', async () => {
    const user = userEvent.setup();
    renderSimulator();
    const mock = await connectMockMill();

    await user.click(screen.getByTestId('btn-toggle-unit')); // mm
    await emitPosition(mock, 6, 6, 0);
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(6, 4); });
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(6, 4); });

    await setXDirectionRight(user);

    // X flipped, Y untouched by the per-axis Direction change.
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(-6, 4); });
    expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(6, 4);

    // A later encoder update confirms both axes keep their respective signs.
    await emitPosition(mock, 2, 9, 0);
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(-2, 4); });
    expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(9, 4);
  });
});

/**
 * Integration tests for US-047 — Display Overflow on Value Entry.
 *
 * The EL400 panel is fixed-width hardware: 7 seven-segment digit cells plus a
 * dedicated +/- sign cell. It cannot grow a 9th digit. When an operator keys a
 * magnitude too large to fit, the device clamps the ENTERED value (not just the
 * render) to the largest number the panel can show at that axis's current
 * display resolution, keeping the sign. Because the clamp happens to the STORED
 * value at entry time, the readout and the DRO's internal value always agree.
 *
 * Real-input discipline (mirrors measurement-mode / direction integration suites):
 * - Every value entry is driven by clicking the actual keypad (typeValue +
 *   pressEnter) exactly as an operator would. No store mutation, no window hook,
 *   no test-only commit path.
 * - The display-resolution change (AC 47.3) goes through the REAL setup menu
 *   (wrench -> axis -> scroll to dP -> cycle), the same path US-022 uses.
 * - The "stored, not render-only" guarantee (AC 47.5) is proved by letting the
 *   LIVE mill emit MILL_STATE_CHANGED ticks after a clamped entry and asserting
 *   the readout is unchanged. In connected ABS the readout is RECOMPUTED from the
 *   stored work offset against the live machine position on every tick, so a
 *   render-only truncation that left the stored value larger would resurface the
 *   over-long number on the next tick — this suite would catch it.
 *
 * Values are asserted on the raw screen-reader text via getAxisDisplayPureTextValue
 * so we pin EXACT strings ('999.9999', '-999.9999', '9999.999'), including the
 * sign cell and the digit count — not a tolerance.
 *
 * @see project/user-stories/01-foundation/US-047-display-overflow.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderSimulator,
  typeValue,
  pressEnter,
  emitMillTick,
  expectStableUnderTicks,
} from '../../../tests/helpers/integration-test-utils';
import { initializeDROMillConnection } from '../../droStore';
import { initializeMillStore } from '../../millStore';
import { MockMillAdapter } from '../../../adapters/MockMillAdapter';
import { SETUP_PARAMETERS, DISPLAY_RESOLUTION_ID } from './setup-parameters';

const DP_INDEX = SETUP_PARAMETERS.findIndex((p) => p.id === DISPLAY_RESOLUTION_ID);

/** Raw screen-reader text for an axis (trimmed), for exact-string assertions. */
function rawAxisText(axis: 'X' | 'Y' | 'Z'): string {
  return (screen.getByTestId(`axis-value-${axis.toLowerCase()}`).textContent || '').trim();
}

/** Select an axis through the real X/Y/Z button. */
async function selectAxis(
  user: ReturnType<typeof userEvent.setup>,
  axis: 'X' | 'Y' | 'Z'
) {
  await user.click(screen.getByTestId(`axis-select-${axis.toLowerCase()}`));
}

/**
 * Drive the REAL setup menu (US-022 path) to coarsen an axis's display
 * resolution from the 5-micron default (4 decimals) to 50 micron (3 decimals):
 * wrench -> select axis -> scroll up to dP -> cycle right 5 -> 10 -> 20 -> 50 ->
 * exit via wrench + CLEAR. dP commits-on-change, so the live readout updates the
 * moment we return to idle.
 */
async function coarsenToThreeDecimals(
  user: ReturnType<typeof userEvent.setup>,
  axis: 'x' | 'y' | 'z'
) {
  await user.click(screen.getByTestId('btn-settings'));
  await user.click(screen.getByTestId(`axis-select-${axis}`));
  for (let i = 0; i < DP_INDEX; i++) {
    await user.click(screen.getByTestId('key-8'));
  }
  // 5 -> 10 -> 20 -> 50 via right arrow (three presses).
  await user.click(screen.getByTestId('key-6'));
  await user.click(screen.getByTestId('key-6'));
  await user.click(screen.getByTestId('key-6'));
  // Exit setup back to idle.
  await user.click(screen.getByTestId('btn-settings'));
  await user.click(screen.getByTestId('key-clear'));
}

describe('US-047: Display Overflow on Value Entry (integration)', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.clear();
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  // --- AC 47.1: over-long magnitude pins to the 4-decimal maximum ----------
  it('AC 47.1: keying 55555555 then ENTER pins X to 999.9999 (4 decimals)', async () => {
    const { user } = await renderSimulator();
    await selectAxis(user, 'X');
    await typeValue(user, '55555555');
    await pressEnter(user);
    expect(rawAxisText('X')).toBe('999.9999');
  });

  it('AC 47.1: the clamp does not grow extra digit cells (never more than 7 digits)', async () => {
    const { user } = await renderSimulator();
    await selectAxis(user, 'X');
    await typeValue(user, '99999999'); // eight 9s — one too many to fit
    await pressEnter(user);
    const text = rawAxisText('X');
    expect(text).toBe('999.9999');
    // Defensive: the physical panel has exactly 7 digit cells; never render 8.
    const digitCount = text.replace(/[^0-9]/g, '').length;
    expect(digitCount).toBe(7);
  });

  // --- AC 47.2: clamp preserves sign ---------------------------------------
  it('AC 47.2: a too-large negative pins to -999.9999 with the leading minus', async () => {
    const { user } = await renderSimulator();
    await selectAxis(user, 'Y');
    await typeValue(user, '-55555555');
    await pressEnter(user);
    expect(rawAxisText('Y')).toBe('-999.9999');
    expect(rawAxisText('Y').startsWith('-')).toBe(true);
  });

  // --- AC 47.3: clamp limit tracks display resolution (dP, US-022) ----------
  it('AC 47.3: at 3 decimals (dP 50 micron) the maximum becomes 9999.999', async () => {
    const { user } = await renderSimulator();
    await coarsenToThreeDecimals(user, 'x');

    await selectAxis(user, 'X');
    await typeValue(user, '55555555');
    await pressEnter(user);
    // 10^(7-3) - 10^-3 = 10000 - 0.001 = 9999.999
    expect(rawAxisText('X')).toBe('9999.999');
  });

  it('AC 47.3: the resolution-aware limit is per-axis — coarsening X leaves Y at 999.9999', async () => {
    const { user } = await renderSimulator();
    await coarsenToThreeDecimals(user, 'x');

    await selectAxis(user, 'X');
    await typeValue(user, '55555555');
    await pressEnter(user);
    expect(rawAxisText('X')).toBe('9999.999');

    // Y is untouched (still 4 decimals) -> its clamp limit stays 999.9999.
    await selectAxis(user, 'Y');
    await typeValue(user, '55555555');
    await pressEnter(user);
    expect(rawAxisText('Y')).toBe('999.9999');
  });

  // --- AC 47.4: clamp is unit-independent in display space ------------------
  it('AC 47.4: the 7-digit panel limit applies in inch (default unit)', async () => {
    const { user } = await renderSimulator();
    // Default unit is inch — confirm via the led before entering.
    await selectAxis(user, 'X');
    await typeValue(user, '12345678');
    await pressEnter(user);
    expect(rawAxisText('X')).toBe('999.9999');
  });

  it('AC 47.4: the same panel limit applies in mm', async () => {
    const { user } = await renderSimulator();
    // Toggle to mm; the entered value is now in mm display space, but the
    // 7-digit panel cap is identical.
    await user.click(screen.getByTestId('btn-toggle-unit'));
    await selectAxis(user, 'X');
    await typeValue(user, '12345678');
    await pressEnter(user);
    expect(rawAxisText('X')).toBe('999.9999');
  });

  // --- AC 47.6: values that already fit are unaffected ----------------------
  it('AC 47.6: a value that already fits enters verbatim (123.4567)', async () => {
    const { user } = await renderSimulator();
    await selectAxis(user, 'Z');
    await typeValue(user, '123.4567');
    await pressEnter(user);
    expect(rawAxisText('Z')).toBe('123.4567');
  });

  it('AC 47.6: the exact boundary 999.9999 enters verbatim, no clamping', async () => {
    const { user } = await renderSimulator();
    await selectAxis(user, 'X');
    await typeValue(user, '999.9999');
    await pressEnter(user);
    expect(rawAxisText('X')).toBe('999.9999');
  });

  it('AC 47.6: a negative value that fits is unchanged (-123.4567)', async () => {
    const { user } = await renderSimulator();
    await selectAxis(user, 'Y');
    await typeValue(user, '-123.4567');
    await pressEnter(user);
    expect(rawAxisText('Y')).toBe('-123.4567');
  });

  // --- AC 47.5: displayed value equals stored value (not render-only) --------
  // Manual ABS: the clamped value is recomputed from manualAbsoluteValues; a
  // burst of live encoder ticks (which the manual-ABS reducer must treat as a
  // no-op for the value) must not resurface a larger stored magnitude.
  it('AC 47.5 (manual ABS): clamped reading survives a burst of encoder ticks', async () => {
    const { user } = await renderSimulator(); // live, ticking mill — but NOT connected
    await selectAxis(user, 'X');
    await typeValue(user, '55555555');
    await pressEnter(user);
    expect(rawAxisText('X')).toBe('999.9999');
    // If the clamp were render-only and the stored value were larger, a recompute
    // on the next tick could show the over-long number. Pin it across 5 ticks.
    expectStableUnderTicks(() => {
      expect(rawAxisText('X')).toBe('999.9999');
    });
  });

  // INC mode: clamp applies to the incremental counter the same way.
  it('AC 47.5 (INC): clamp applies in INC mode and survives ticks', async () => {
    const { user } = await renderSimulator();
    // Switch to INC via the real ABS/INC button.
    await user.click(screen.getByTestId('btn-abs-inc'));
    await selectAxis(user, 'Z');
    await typeValue(user, '55555555');
    await pressEnter(user);
    expect(rawAxisText('Z')).toBe('999.9999');
    expectStableUnderTicks(() => {
      expect(rawAxisText('Z')).toBe('999.9999');
    });
  });

  // Connected ABS (work-offset preset): the strongest render-vs-storage probe.
  // Presetting an axis to a keyed value in connected mode stores a WORK OFFSET
  // (machinePos - clampedValue). The live readout is recomputed every tick as
  // (machinePos - offset). With machine at 0, the readout = the clamped value.
  // A render-only clamp that stored the FULL 55555555 would compute an offset of
  // (0 - 55555555.xxxx) and the next encoder tick would recompute the readout to
  // the over-long magnitude — which the panel cannot show. So this asserts both
  // the clamp AND its storage location.
  describe('AC 47.5 (connected ABS, work-offset preset)', () => {
    let cleanup: (() => void) | null = null;

    afterEach(() => {
      if (cleanup) {
        cleanup();
        cleanup = null;
      }
    });

    async function connectMockMillAtOrigin(): Promise<MockMillAdapter> {
      initializeDROMillConnection();
      const mock = new MockMillAdapter({ autoTick: false });
      await act(async () => {
        cleanup = await initializeMillStore(mock);
      });
      await act(async () => {
        mock.setPosition(0, 0, 0);
      });
      return mock;
    }

    it('clamps a connected ABS preset and the reading holds after a fresh encoder tick', async () => {
      const { user } = await renderSimulator({ millSource: 'noop' });
      const mock = await connectMockMillAtOrigin();

      await selectAxis(user, 'X');
      await typeValue(user, '55555555');
      await pressEnter(user);
      await waitFor(() => { expect(rawAxisText('X')).toBe('999.9999'); });

      // A fresh encoder broadcast at the SAME machine position recomputes the
      // readout from the stored work offset. If storage held the unclamped value
      // the panel would now show the over-long magnitude.
      act(() => {
        mock.setPosition(0, 0, 0);
      });
      await waitFor(() => { expect(rawAxisText('X')).toBe('999.9999'); });
      const digitCount = rawAxisText('X').replace(/[^0-9]/g, '').length;
      expect(digitCount).toBe(7);
    });

    it('clamped connected ABS preset keeps moving 1:1 with later encoder motion', async () => {
      const { user } = await renderSimulator({ millSource: 'noop' });
      const mock = await connectMockMillAtOrigin();

      // Work in mm so the post-move magnitude is exact.
      await user.click(screen.getByTestId('btn-toggle-unit'));
      await selectAxis(user, 'X');
      await typeValue(user, '55555555');
      await pressEnter(user);
      await waitFor(() => { expect(rawAxisText('X')).toBe('999.9999'); });

      // The stored offset must equal (0 - 999.9999). Jog the machine -1 mm: the
      // readout must move to exactly 998.9999, proving the clamped value (not a
      // larger stored value) is the datum the live position is measured against.
      act(() => {
        mock.setPosition(-1, 0, 0);
      });
      await waitFor(() => { expect(rawAxisText('X')).toBe('998.9999'); });
    });
  });

  // --- Hygiene: the commit must not trip the multi-reducer conflict guard ---
  it('clamping on ENTER does not log a multi-reducer conflict', async () => {
    const { user } = await renderSimulator();
    await selectAxis(user, 'X');
    await typeValue(user, '55555555');
    await pressEnter(user);
    emitMillTick();
    const conflict = errorSpy.mock.calls.some((c: unknown[]) =>
      String(c[0]).includes('Multiple reducers handled the same event')
    );
    expect(conflict).toBe(false);
  });
});

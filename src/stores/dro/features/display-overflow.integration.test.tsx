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

/**
 * Drive the REAL setup menu (US-041 path) to put an axis into `diA` (diameter)
 * measurement mode: wrench -> select axis -> scroll to the rAd/diA item ->
 * cycle to diA -> exit via the terminal End item + ent. Mirrors
 * measurement-mode.integration.test.tsx. The `rAd`/`diA` labels appear on no
 * other parameter, so they uniquely identify the item while scrolling.
 */
async function setDiameterMode(
  user: ReturnType<typeof userEvent.setup>,
  axis: 'X' | 'Y' | 'Z'
) {
  await user.click(screen.getByTestId('btn-settings'));
  await user.click(screen.getByTestId(`axis-select-${axis.toLowerCase()}`));
  const isMeasurementLabel = (t: string) => t === 'rAd' || t === 'diA';
  let guard = 0;
  while (!isMeasurementLabel(rawAxisText(axis))) {
    await user.click(screen.getByTestId('key-2'));
    if (++guard > 30) throw new Error('measurement-mode parameter not found');
  }
  guard = 0;
  while (rawAxisText(axis) !== 'diA') {
    await user.click(screen.getByTestId('key-6'));
    if (++guard > 4) throw new Error('diA choice not reachable by cycling');
  }
  guard = 0;
  while (rawAxisText(axis) !== 'End') {
    await user.click(screen.getByTestId('key-2'));
    if (++guard > 30) throw new Error('End item not found while exiting setup');
  }
  await user.click(screen.getByTestId('key-enter'));
}

/** Inverse of {@link setDiameterMode}: put an axis back into `rAd` (radius, ×1). */
async function setRadiusMode(
  user: ReturnType<typeof userEvent.setup>,
  axis: 'X' | 'Y' | 'Z'
) {
  await user.click(screen.getByTestId('btn-settings'));
  await user.click(screen.getByTestId(`axis-select-${axis.toLowerCase()}`));
  const isMeasurementLabel = (t: string) => t === 'rAd' || t === 'diA';
  let guard = 0;
  while (!isMeasurementLabel(rawAxisText(axis))) {
    await user.click(screen.getByTestId('key-2'));
    if (++guard > 30) throw new Error('measurement-mode parameter not found');
  }
  guard = 0;
  while (rawAxisText(axis) !== 'rAd') {
    await user.click(screen.getByTestId('key-6'));
    if (++guard > 4) throw new Error('rAd choice not reachable by cycling');
  }
  guard = 0;
  while (rawAxisText(axis) !== 'End') {
    await user.click(screen.getByTestId('key-2'));
    if (++guard > 30) throw new Error('End item not found while exiting setup');
  }
  await user.click(screen.getByTestId('key-enter'));
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

  // --- Adversarial: re-clamp after a unit toggle (no stale-clamp latch) -----
  // A lazy impl that clamped once and cached the result, or that bound the limit
  // to the unit active at first entry, would mis-handle a SECOND over-long entry
  // made after switching units. Each ENTER must clamp independently.
  it('a second over-long preset after a unit toggle clamps again to 999.9999', async () => {
    const { user } = await renderSimulator();
    // First over-long entry in the default inch unit.
    await selectAxis(user, 'X');
    await typeValue(user, '55555555');
    await pressEnter(user);
    expect(rawAxisText('X')).toBe('999.9999');

    // Toggle to mm and key a DIFFERENT over-long value — must clamp afresh.
    await user.click(screen.getByTestId('btn-toggle-unit'));
    await selectAxis(user, 'X');
    await typeValue(user, '87654321');
    await pressEnter(user);
    expect(rawAxisText('X')).toBe('999.9999');
  });

  // --- Adversarial: clamped value survives an ABS/INC round-trip (storage) ---
  // Re-reading after a mode round-trip is an independent storage probe: a render
  // trick that left INC's stored counter at the un-clamped magnitude would show
  // the over-long number on the way back. The clamp is in the INC counter, so the
  // value must read 999.9999 both before and after the ABS->INC->ABS->INC trip.
  it('a clamped INC preset survives an ABS/INC round-trip', async () => {
    const { user } = await renderSimulator();
    await user.click(screen.getByTestId('btn-abs-inc')); // -> INC
    await selectAxis(user, 'X');
    await typeValue(user, '55555555');
    await pressEnter(user);
    expect(rawAxisText('X')).toBe('999.9999');

    // Round-trip the mode: INC -> ABS -> INC. The stored INC counter is untouched
    // by the toggle, so the clamped reading must reappear verbatim.
    await user.click(screen.getByTestId('btn-abs-inc')); // -> ABS
    await user.click(screen.getByTestId('btn-abs-inc')); // -> INC
    expect(rawAxisText('X')).toBe('999.9999');
  });

  // --- AC 47.7: clamp bounds the DISPLAYED magnitude (diameter ×2, US-041) ---
  // On a diameter-mode axis the readout shows 2× the stored slide value, so a
  // naive clamp on the entered value lets the DISPLAY overflow: a clamped slide
  // of 999.9999 renders 1999.9998 (8 cells). AC 47.7 requires the entered value
  // be capped at maxDisplayableMagnitude/2 so the displayed magnitude stays
  // inside the 7-digit panel.
  it('AC 47.7: over-long entry on a diameter axis displays 999.9999, never 1999.9998', async () => {
    const { user } = await renderSimulator();
    await setDiameterMode(user, 'X');

    await selectAxis(user, 'X');
    await typeValue(user, '55555555');
    await pressEnter(user);

    const text = rawAxisText('X');
    expect(text).toBe('999.9999');
    // The physical panel has exactly 7 digit cells; the ×2 scale must not grow it.
    expect(text.replace(/[^0-9]/g, '').length).toBe(7);
  });

  it('AC 47.7: radius mode (×1) is unaffected — still pins at 999.9999', async () => {
    const { user } = await renderSimulator();
    // Default measurement mode is radius; no setup change. Control case proving
    // the diameter halving does not leak into the ×1 path.
    await selectAxis(user, 'Y');
    await typeValue(user, '55555555');
    await pressEnter(user);
    expect(rawAxisText('Y')).toBe('999.9999');
  });

  it('AC 47.7: the STORED slide value is the halved 499.99995, not 999.9999', async () => {
    const { user } = await renderSimulator();
    await setDiameterMode(user, 'X');

    // Preset on the diameter axis: entered 55555555 is capped so the DISPLAY is
    // 999.9999, which means the stored slide value is 499.99995.
    await selectAxis(user, 'X');
    await typeValue(user, '55555555');
    await pressEnter(user);
    expect(rawAxisText('X')).toBe('999.9999');

    // Flip the SAME axis back to radius mode (×1): the stored slide value now
    // displays 1:1. 499.99995 at 4 decimals rounds to 500.0000 — proving storage
    // holds the halved value, not the full 999.9999 (which would read 999.9999).
    await setRadiusMode(user, 'X');
    expect(rawAxisText('X')).toBe('500.0000');
  });

  // --- Derived-reading overflow: radius→diameter ×2 of a near-limit value -------
  // US-047's clamp is entry-time; this is the DERIVED path. Preset a value just
  // under the panel limit in radius mode, then switch the SAME axis to diameter:
  // the display-only ×2 re-scale would render the 8-cell 1999.9998, so the panel
  // shows the dashes overflow indicator (Acu-Rite precedent). It self-clears when
  // the axis goes back to radius mode, since the stored slide value is untouched.
  describe('derived-reading overflow (radius→diameter ×2, US-041)', () => {
    it('switching a near-limit radius value to diameter shows the dashes overflow', async () => {
      const { user } = await renderSimulator();
      // Preset X to the panel maximum in radius mode (default). 999.9999 fits ×1.
      await selectAxis(user, 'X');
      await typeValue(user, '999.9999');
      await pressEnter(user);
      expect(rawAxisText('X')).toBe('999.9999');

      // Switch to diameter via the real setup menu: 999.9999 × 2 = 1999.9998 → dashes.
      await setDiameterMode(user, 'X');
      expect(rawAxisText('X')).toBe('-------');
    });

    it('the overflow self-clears when the axis goes back to radius mode', async () => {
      const { user } = await renderSimulator();
      await selectAxis(user, 'X');
      await typeValue(user, '999.9999');
      await pressEnter(user);
      await setDiameterMode(user, 'X');
      expect(rawAxisText('X')).toBe('-------');

      // Back to radius (×1): the stored slide value is untouched, so 999.9999 returns.
      await setRadiusMode(user, 'X');
      expect(rawAxisText('X')).toBe('999.9999');
    });

    it('a value that still fits after ×2 is unaffected (200.0000 from a 100 radius)', async () => {
      const { user } = await renderSimulator();
      await selectAxis(user, 'X');
      await typeValue(user, '100');
      await pressEnter(user);
      await setDiameterMode(user, 'X');
      // 100 × 2 = 200 → fits the panel, normal number, no dashes.
      expect(rawAxisText('X')).toBe('200.0000');
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

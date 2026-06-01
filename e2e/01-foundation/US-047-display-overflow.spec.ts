import { test, expect } from '../helpers/fixtures';

/**
 * E2E Tests: US-047 Display Overflow on Value Entry
 *
 * The EL400 panel is fixed-width hardware — 7 seven-segment digit cells plus a
 * dedicated +/- sign cell — and cannot grow a 9th digit. Keying a magnitude too
 * large to fit clamps the ENTERED value (not just the render) to the largest
 * number the panel can show at the axis's current display resolution, keeping
 * the sign. Because the clamp is applied to the STORED value at entry time, the
 * readout and the DRO's internal value always agree.
 *
 * Real-input discipline: every entry is keyed on the actual keypad
 * (dro.enterNumber + ENTER), exactly as an operator would; the readout is read
 * from the real screen-reader text. The fixture connects to the mock CNCjs
 * server, so these run in CONNECTED ABS mode — presetting an axis stores a work
 * offset and the live readout is recomputed from the encoder position on every
 * controller:state broadcast. That makes the "stored, not render-only" guarantee
 * (AC 47.5) directly observable: a render-only clamp would store the full
 * over-long value and the next encoder tick would resurface it.
 *
 * @see project/user-stories/01-foundation/US-047-display-overflow.md
 */
test.describe('US-047: Display Overflow on Value Entry', () => {
  /**
   * AC 47.1: keying an over-long value pins the readout to 999.9999 (4 decimals,
   * the 5-micron default). The spec's headline scenario.
   */
  test('AC 47.1: keying 55555555 + ENTER pins the readout to 999.9999', async ({ dro }) => {
    await dro.selectAxis('X');
    await dro.enterNumber('55555555');
    await dro.enterButton.click();
    await dro.waitForAxisPureTextValue('X', '999.9999');
  });

  /**
   * AC 47.2: the clamp preserves a negative sign — pins to -999.9999 with the
   * leading minus in the sign cell.
   */
  test('AC 47.2: clamp preserves a negative sign (-999.9999)', async ({ dro }) => {
    await dro.selectAxis('Y');
    await dro.enterNumber('-55555555');
    await dro.enterButton.click();
    await dro.waitForAxisPureTextValue('Y', '-999.9999');
  });

  /**
   * AC 47.6: a value that already fits is unaffected — enters verbatim.
   */
  test('AC 47.6: a value that already fits is unchanged (123.4567)', async ({ dro }) => {
    await dro.selectAxis('Z');
    await dro.enterNumber('123.4567');
    await dro.enterButton.click();
    await dro.waitForAxisPureTextValue('Z', '123.4567');
  });

  /**
   * AC 47.6 (boundary): the exact maximum 999.9999 enters verbatim — no
   * off-by-one that would clamp the largest legal value.
   */
  test('AC 47.6: the exact boundary 999.9999 enters verbatim', async ({ dro }) => {
    await dro.selectAxis('X');
    await dro.enterNumber('999.9999');
    await dro.enterButton.click();
    await dro.waitForAxisPureTextValue('X', '999.9999');
  });

  /**
   * AC 47.5 (connected ABS, stored == displayed): the clamp is applied to the
   * STORED value, not the render. In connected mode a preset stores a work
   * offset and the readout is recomputed from the encoder position on every
   * controller:state broadcast. After clamping at machine origin, emit a fresh
   * encoder broadcast (same position) — a render-only clamp would have stored
   * the full 55555555 and this recompute would show the over-long magnitude.
   */
  test('AC 47.5: clamped connected preset survives a fresh encoder broadcast', async ({ dro }) => {
    await dro.selectAxis('X');
    await dro.enterNumber('55555555');
    await dro.enterButton.click();
    await dro.waitForAxisPureTextValue('X', '999.9999');

    // Re-broadcast the same machine position: the readout is recomputed from the
    // stored work offset. It must still read the clamped value with 7 digits.
    await dro.simulateEncoderAbsoluteMove('X', 0);
    await dro.waitForAxisPureTextValue('X', '999.9999');
    const text = await dro.getAxisRawText('X');
    expect(text.replace(/[^0-9]/g, '').length).toBe(7);
  });

  /**
   * AC 47.5 (storage is the clamped datum): after clamping at the origin in mm,
   * the stored work offset must equal (0 - 999.9999). Jogging the encoder -1 mm
   * must move the readout to exactly 998.9999 — proving the live position is
   * measured against the CLAMPED datum, not a larger stored value.
   */
  test('AC 47.5: a clamped connected preset tracks later encoder motion 1:1', async ({ dro }) => {
    await dro.toggleInchMm(); // work in mm so the magnitude is exact
    expect(await dro.isMmUnits()).toBe(true);

    await dro.selectAxis('X');
    await dro.enterNumber('55555555');
    await dro.enterButton.click();
    await dro.waitForAxisPureTextValue('X', '999.9999');

    await dro.simulateEncoderAbsoluteMove('X', -1);
    await dro.waitForAxisPureTextValue('X', '998.9999');
  });

  /**
   * AC 47.7: the clamp bounds the DISPLAYED magnitude, composing with the
   * diameter ×2 scale (US-041). On a diameter-mode axis the readout shows twice
   * the stored slide value, so an over-long entry must still land inside the
   * 7-digit panel — 999.9999, never the 8-cell 1999.9998. Diameter mode is set
   * through the REAL setup menu (dro.setMeasurementMode, no window hook).
   */
  test('AC 47.7: over-long entry on a diameter axis displays 999.9999, never 1999.9998', async ({ dro }) => {
    await dro.setMeasurementMode('X', 'diA');

    await dro.selectAxis('X');
    await dro.enterNumber('55555555');
    await dro.enterButton.click();

    await dro.waitForAxisPureTextValue('X', '999.9999');
    const text = await dro.getAxisRawText('X');
    expect(text.replace(/[^0-9]/g, '').length).toBe(7);
  });
});

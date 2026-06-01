# US-047: Display Overflow on Value Entry

**Manual Reference:** EL400 Operation Manual, Specifications table — *"Display | 7 Digits with +/- indicator 7 Segment LED"* (the panel is physically 7 digit cells plus a sign cell; it cannot grow)
**Priority:** P1
**Category:** Foundation

## User Story
**As a** machinist presetting an axis from the keypad
**I want** a value too large for the 7-digit panel to be pinned to the largest value the panel can show
**So that** the readout never silently grows extra digit cells beyond the physical device, and what I see equals what the DRO stored

## Background
The real EL400/MX-100M readout is a fixed-width panel: **7 seven-segment digit cells plus a
dedicated +/- sign cell** (8 cells total). It is physical hardware — it cannot render a 9th digit.
Of those 7 digit cells, the active **display resolution (`dP`, US-022)** decides how many are
spent on the fraction; the rest hold the integer part:

> integer cells available = 7 − (displayed decimal places)

At the 5-micron mill default (4 decimals) that leaves **3 integer digits**, so the largest
magnitude the panel can show is **`999.9999`**. A coarser 50-micron resolution (3 decimals) frees
a fourth integer digit (`9999.999`).

A user can key in more digits than fit (e.g. `55555555`). The device cannot display them, so the
entered value is **clamped to the maximum the panel can show** at the axis's current resolution,
keeping the sign. Critically, the clamp happens to the **stored** value at entry time — not as a
render-only trick — so the displayed reading and the value the DRO holds in memory always match.

## Acceptance Criteria
- [ ] **AC 47.1:** Entering a magnitude larger than the panel can show pins the axis to the maximum displayable value at that axis's current display resolution. At the 4-decimal default this is `999.9999`; keying `55555555` then `ent` shows `999.9999`, not extra digit cells.
- [ ] **AC 47.2:** The clamp preserves sign — keying a too-large negative pins to `-999.9999` (4 decimals), with the leading `-` in the sign cell.
- [ ] **AC 47.3:** The clamp limit tracks display resolution (`dP`, US-022): at 3 decimals the panel holds 4 integer digits, so the maximum is `9999.999`. The limit is `10^(7 − decimals) − 10^(−decimals)`.
- [ ] **AC 47.4:** The clamp is unit-independent in display space — the same 7-digit panel limit applies whether the axis reads in inch or mm (the entered value is in the displayed unit; only that magnitude is capped).
- [ ] **AC 47.5:** Displayed value equals stored value after a clamped entry: the readout shows the clamped number AND the DRO's internal axis value corresponds to that same clamped number (no render-only divergence). This holds in manual ABS, connected ABS (work-offset preset), and INC modes.
- [ ] **AC 47.6:** Values that already fit are unaffected — `123.4567` (4 decimals) and the exact boundary `999.9999` enter verbatim with no clamping.
- [ ] **AC 47.7:** The clamp bounds the **displayed** magnitude, so it composes with the diameter ×2 scale (US-041). On a `diameter`-mode axis the readout shows twice the stored slide value, so the entered value is capped at `maxDisplayableMagnitude(decimals) / 2` — keying `55555555` on a diameter axis stores `499.99995` and displays `999.9999`, never the 8-cell `1999.9998`. A `radius`-mode axis (×1) is unaffected.

## E2E Test Scenarios
```typescript
describe('US-047: Display Overflow on Value Entry', () => {
  test('keying an over-long value pins the readout to 999.9999 (4 decimals)', async () => {
    await dro.selectAxis('X');
    await dro.type('55555555');
    await dro.pressEnter();
    await expect(dro.display.xAxis).toHaveText('999.9999');
  });

  test('clamp preserves a negative sign', async () => {
    await dro.selectAxis('Y');
    await dro.type('-55555555');
    await dro.pressEnter();
    await expect(dro.display.yAxis).toHaveText('-999.9999');
  });

  test('a value that already fits is unchanged', async () => {
    await dro.selectAxis('Z');
    await dro.type('123.4567');
    await dro.pressEnter();
    await expect(dro.display.zAxis).toHaveText('123.4567');
  });
});
```

## Implementation Notes
- The clamp belongs at the **value-commit boundary**, not the render layer. Clamping only at
  render (e.g. truncating cells in `formatNumberValue`) would leave the stored value larger than
  what is shown, violating AC 47.5. Clamp the entered magnitude in
  `src/stores/dro/features/axis-operations.ts` (`setAxisValue`, the `KEY_ENTER` path) before it is
  converted to mm and stored, so the recomputed display equals the stored value.
- Compute the per-axis decimal count with `axisDisplayDecimals(axis, nvMem)` (US-022). Derive the
  maximum displayable magnitude from a single pure helper in
  `src/stores/dro/utils/displayComputation.ts`:

  ```
  maxDisplayableMagnitude(decimals) = 10^(PANEL_DIGIT_CELLS − decimals) − 10^(−decimals)
  ```

  where `PANEL_DIGIT_CELLS = 7` (the panel's digit cells, excluding the sign cell —
  `DISPLAY_WIDTH` in `axisDigits.ts` is 8 because it counts the sign cell).
- Clamp magnitude, keep sign, and bound the **displayed** magnitude — divide the limit by the
  axis's measurement scale (US-041) so a diameter axis (×2) caps at half (AC 47.7):
  `clamped = sign(v) * min(abs(v), maxDisplayableMagnitude(decimals) / measurementScale(axis, nvMem))`.
  In radius mode `measurementScale` is 1, so this reduces to the plain limit. The value being
  clamped is in the **displayed unit** (what the user typed); convert to mm for storage exactly as
  today.
- Angular axes (US-040) wrap to `[0, 360)` and never approach the panel limit, so the clamp is a
  no-op for them; do not special-case beyond the existing angular path.

## Related Stories
- US-002: Sign Convention (the sign cell this clamp preserves)
- US-022: Display Resolution `dP` (decimal count that sets the integer-digit budget)
- US-040: Angular Display (wraps to [0,360), exempt from the linear clamp)
- US-041: Radius/Diameter Measurement Mode (the ×2 display scale the clamp must compose with, AC 47.7)

## Notes
- Authored to fix a reported bug: selecting X, keying `55555555`, then `ent` grew the readout past
  its physical 8 cells. Root cause was the number-formatting path (`formatNumberValue`) padding the
  integer part to a *minimum* of 3 digits but never capping it; the fix instead bounds the value at
  entry so display and storage stay consistent (AC 47.5).
- This clamp is **entry-time** (it bounds keyed values at the commit boundary). The
  *derived-reading* overflow path — where a later radius→diameter ×2 re-scale (US-041) or a far-out
  connected position would render past the panel — is handled separately at the display-derivation
  step by an all-dashes overflow indicator (US-041 AC 41.8, `DISPLAY_OVERFLOW_TEXT` in
  `displayComputation.ts`), not by this clamp.
</content>
</invoke>

# US-002: Sign Convention and Axis Direction

**Manual Reference:** MagXact MX-100M "COORDINATES" / "The coordinate sign contradiction" / "OTHER SIGN vs. DIRECTION FACTORS"; EL400 Section 6.2 Direction (`LEFT` / `riGht`)
**Priority:** P0
**Category:** Foundation

## User Story
**As a** machinist setting up a workpiece datum
**I want** the displayed coordinate signs to follow the standard tool's-eye-view convention
**So that** macros (bolt circle, SDM, etc.) and coordinate entry behave predictably regardless of how the scales were physically installed

## Background
Coordinate sign is a common source of confusion (the manual calls it "the coordinate sign
contradiction"). The convention is the **tool's-eye view**: imagine looking down from the
cutting tool onto the workpiece. From that viewpoint a table moving **left** makes the tool
effectively move **right** — the conventional positive X direction. Per-axis Left/Right setup
(US-023) and datum choice flip the observed sign, but macros assume the standard convention.

## Acceptance Criteria
- [ ] **AC 2.1:** With the standard convention, table motion that moves the **tool** in the +X / +Y direction increases the displayed value (tool's-eye view, not operator's-eye view).
- [ ] **AC 2.2:** The displayed sign of an axis flips when the per-axis Direction parameter (US-023, `LEFT`/`riGht`) is changed.
- [ ] **AC 2.3:** The displayed sign also depends on the chosen datum location (e.g. lower-left vs. lower-right corner): a coordinate negative from one datum is positive from another.
- [ ] **AC 2.4:** Z increases as cutting depth increases when the operator zeroes Z at tool-touch and prefers depth-positive (a documented user preference).
- [ ] **AC 2.5:** For sub-datums (US-009..011) and pre-programmed macros (bolt circle US-016, etc.), the **standard sign convention (Figure 1)** is used regardless of the operator's routine preference.
- [ ] **AC 2.6:** A negative value is shown with a leading `-`; positive values have no sign.

## E2E Test Scenarios
```typescript
describe('US-002: Sign Convention', () => {
  test("tool's-eye +X is table-left under default direction", async () => {
    await dro.zeroAxis('X');
    await dro.simulateTableMove('X', 'left', 10.000);
    await expect(dro.display.xAxis).toHaveValue(10.000); // positive
  });

  test('Direction parameter flips the sign', async () => {
    await dro.setAxisDirection('X', 'riGht');
    await dro.zeroAxis('X');
    await dro.simulateTableMove('X', 'left', 10.000);
    await expect(dro.display.xAxis).toHaveValue(-10.000);
  });

  test('negative values display a leading minus', async () => {
    await dro.zeroAxis('Y');
    await dro.simulateMove('Y', -3.250);
    await expect(dro.display.yAxis).toHaveText('-3.250');
  });
});
```

## Implementation Notes
- Sign is the product of (raw scale delta) × (per-axis Direction setting). The datum offset is
  applied separately (zeroing/preset). Keep these as distinct transforms in
  `src/stores/dro/utils/displayComputation.ts`.
- Macros must compute against the canonical convention, independent of the user's Direction
  preference, so generated hole coordinates land where the figures show.
- Accessibility: announce sign to screen readers (US-037) — "negative three point two five".

## Setup-Menu Label Contract (pinned)
The seven-segment glyph set has no uppercase `T` (lowercase `t` only), so the manual's "LEFT"
renders as `LEFt`. Pinned, renderable labels (single source of truth for impl + E2E helpers):
- Per-axis **Direction** parameter (`axisDirection`): choice value `'normal'` → label **`LEFt`**;
  value `'reversed'` → label **`riGht`**. The parameter's own highlight label is `LEFt`.
- Global **Z depth-sense** parameter (`zDepthSense`): value `'depth-negative'` → label
  **`dEP nEG`**; value `'depth-positive'` → label **`dEP PoS`**.
The E2E `setAxisDirection` helper locates the Direction parameter by matching a label of exactly
`LEFt` or `riGht` (note lowercase `t`).

## Related Stories
- US-005: Zeroing Individual Axes (datum choice)
- US-023: Scale Direction (Left/Right parameter)
- US-016: Bolt Circle (macros that assume the standard convention)
- US-009..011: Sub-Datum Memory

## Notes
- **Recovered missing file.** The user-stories index linked `US-002-sign-convention.md` and the
  priority matrix listed US-002 (P0), but the file did not exist on disk. Authored from the
  MagXact "COORDINATES" sections and EL400 §6.2 Direction during the README spec crosscheck.
</content>

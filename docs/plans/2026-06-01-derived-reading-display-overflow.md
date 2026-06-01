# Derived-reading Display Overflow → All-Dashes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Render an all-dashes overflow indicator when a linear axis's *derived* reading (canonically a radius value re-scaled ×2 by a later diameter mode switch) can't fit the 7-digit panel, instead of silently growing past the physical panel.

**Architecture:** One pure guard at the display-derivation step in `computeDisplayPosition`. After the angular early-return and unit conversion, if the value *as it rounds on the panel* exceeds `maxDisplayableMagnitude(decimals)`, return a new `DISPLAY_OVERFLOW_TEXT` constant (`'-------'`). It routes through the existing `formatTextValue` text path — no formatter change. The stored slide value is untouched (the ×2 scale is display-only), so the reading self-clears when the axis returns in range, `dP` coarsens, or the axis is zeroed.

**Tech Stack:** TypeScript, Vitest + RTL (unit/integration), Playwright (E2E). Reference: `superpowers:test-driven-development`.

---

## Design reference

See `docs/plans/2026-06-01-derived-reading-display-overflow-design.md` for the full
design, the Acu-Rite DRO100 precedent, and the US-047-vs-this distinction.

Key facts the implementer needs:
- `maxDisplayableMagnitude(4) = 999.9999`; `maxDisplayableMagnitude(3) = 9999.999`.
- `axisDisplayDecimals(axis, nvMem)` returns the panel decimals (default 4).
- `computeDisplayPosition` returns `number | string` (`AxisDisplayValue`); strings render
  via `formatTextValue`. `'-------'` is not numeric-looking, so it routes to text.
- No US-047 regression: keyed values are clamped at entry to ≤ limit (and `limit/scale` on
  diameter axes), so they display at exactly the limit and never trip `> limit`.

---

## Task 1: Overflow guard + `DISPLAY_OVERFLOW_TEXT` (unit-tested)

**Files:**
- Modify: `src/stores/dro/utils/displayComputation.ts`
- Test: `src/stores/dro/utils/displayComputation.test.ts`

**Step 1: Write the failing tests**

Append a new `describe` block to `displayComputation.test.ts`. Reuse the file's existing
helpers (`makeNvMem`, `manualVMem`, `manualContext`). Note `makeNvMem` defaults
`defaultUnit` to `'mm'`, so `manualAbsoluteValues` are in mm and the panel limit applies
in mm display space. Import `DISPLAY_OVERFLOW_TEXT` alongside the existing imports.

```ts
import { DISPLAY_OVERFLOW_TEXT } from './displayComputation';

describe('computeDisplayPosition — derived-reading overflow (US-041 / Acu-Rite dashes)', () => {
  it('diameter ×2 of a near-limit radius value overflows to dashes', () => {
    // 999.9999 mm stored slide value × 2 (diameter) = 1999.9998 → 8 cells → dashes
    const nvMem = makeNvMem({ measurementMode: { X: 'diameter' } });
    const vMem = manualVMem({ X: 999.9999 });
    expect(computeDisplayPosition('X', vMem, manualContext(nvMem))).toBe(DISPLAY_OVERFLOW_TEXT);
  });

  it('the exact panel boundary 999.9999 (radius, ×1) fits — no dashes', () => {
    const nvMem = makeNvMem({ measurementMode: { X: 'radius' } });
    const vMem = manualVMem({ X: 999.9999 });
    expect(computeDisplayPosition('X', vMem, manualContext(nvMem))).toBeCloseTo(999.9999, 4);
  });

  it('a value just over the float boundary but rounding to 999.9999 still fits', () => {
    // 999.99991 renders as "999.9999" at 4 decimals → must NOT trip overflow.
    const nvMem = makeNvMem({ measurementMode: { X: 'radius' } });
    const vMem = manualVMem({ X: 999.99991 });
    expect(computeDisplayPosition('X', vMem, manualContext(nvMem))).not.toBe(DISPLAY_OVERFLOW_TEXT);
  });

  it('a negative derived overflow also shows dashes (no signed number past the panel)', () => {
    const nvMem = makeNvMem({ measurementMode: { X: 'diameter' } });
    const vMem = manualVMem({ X: -999.9999 });
    expect(computeDisplayPosition('X', vMem, manualContext(nvMem))).toBe(DISPLAY_OVERFLOW_TEXT);
  });

  it('overflow self-clears once the value returns in range (diameter ×2 of 100 fits)', () => {
    const nvMem = makeNvMem({ measurementMode: { X: 'diameter' } });
    const vMem = manualVMem({ X: 100 }); // ×2 = 200 → fits
    expect(computeDisplayPosition('X', vMem, manualContext(nvMem))).toBeCloseTo(200, 4);
  });

  it('DISPLAY_OVERFLOW_TEXT is seven dashes (the 7 digit cells; sign cell blank)', () => {
    expect(DISPLAY_OVERFLOW_TEXT).toBe('-------');
  });
});
```

**Step 2: Run the tests to verify they fail**

Run: `npm run test -- displayComputation.test.ts`
Expected: FAIL — `DISPLAY_OVERFLOW_TEXT` is not exported; overflow cases return numbers.

**Step 3: Implement the guard**

In `src/stores/dro/utils/displayComputation.ts`:

Add the constant near `ENCODER_FAIL_TEXT` (~line 87):

```ts
/**
 * Seven-segment text shown when a LINEAR axis's derived reading cannot fit the
 * 7 digit cells at its current dP resolution (e.g. a near-limit radius value
 * re-scaled ×2 into diameter mode). Mirrors the Acu-Rite DRO100 "display
 * overflow" behaviour — an honest out-of-range indicator rather than a clamped,
 * plausible-but-wrong number. Seven dashes fill the 7 digit cells; the sign cell
 * stays blank so it can never be misread as a negative number. The stored slide
 * value is untouched, so the reading self-clears when the axis returns in range,
 * dP is coarsened, or the axis is zeroed.
 *
 * This complements the US-047 entry-time clamp (which bounds KEYED values at the
 * commit boundary); this guard bounds DERIVED readings at the display step.
 */
export const DISPLAY_OVERFLOW_TEXT = '-------';
```

In `computeDisplayPosition`, replace the final two lines (the `signedMm` /
`fromMmToAnyUnit` return, ~lines 296-298) with:

```ts
  // Diameter mode shows 2× the slide travel (the turned diameter); radius is 1:1.
  const signedMm = signed * measurementScale(axis, context.nvMem);
  const displayed = fromMmToAnyUnit(signedMm, context.nvMem.defaultUnit);
  // Derived-reading overflow (Acu-Rite precedent): if the value, as it would round
  // on the panel, needs more than the 7 digit cells at this axis's dP resolution,
  // show the all-dashes indicator instead of growing past the physical panel. This
  // catches the radius→diameter ×2 re-scale of an already-stored value (US-047's
  // entry-time clamp can't, since nothing was keyed) and any other derived
  // overflow (e.g. a connected machine position jogged far out of range).
  const decimals = axisDisplayDecimals(axis, context.nvMem);
  const rounded = Number(Math.abs(displayed).toFixed(decimals));
  if (rounded > maxDisplayableMagnitude(decimals)) {
    return DISPLAY_OVERFLOW_TEXT;
  }
  return displayed;
```

**Step 4: Run the tests to verify they pass**

Run: `npm run test -- displayComputation.test.ts`
Expected: PASS (all, including the pre-existing Direction/measurementScale blocks).

**Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

**Step 6: Commit**

```bash
git add src/stores/dro/utils/displayComputation.ts src/stores/dro/utils/displayComputation.test.ts
git commit -m "feat(US-041): all-dashes overflow for derived linear readings"
```

---

## Task 2: Integration test via the real setup menu

**Files:**
- Modify: `src/stores/dro/features/display-overflow.integration.test.tsx`

This file already has `setDiameterMode`, `setRadiusMode`, `coarsenToThreeDecimals`,
`selectAxis`, `rawAxisText`, `typeValue`, `pressEnter`. Reuse them — real-input discipline
only (keypad + setup menu + live ticks), no store mutation or window hooks.

**Step 1: Write the failing test**

Add a new `describe` block at the end of the file (inside the top-level describe):

```ts
// --- Derived-reading overflow: radius→diameter ×2 of a near-limit value -------
// US-047's clamp is entry-time; this is the DERIVED path. Preset a value just
// under the panel limit in radius mode, then switch the SAME axis to diameter:
// the display-only ×2 re-scale would render 8 cells, so the panel shows dashes
// (Acu-Rite precedent). It self-clears when the axis goes back to radius mode.
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
```

**Step 2: Run to verify it fails**

If Task 1 is already merged this should PASS immediately. If running Task 2 in isolation
before Task 1, it FAILS (shows `1999.9998`). Confirm the test exercises the right path by
checking the assertion message references `-------`.

Run: `npm run test -- display-overflow.integration.test.tsx`

**Step 3: (No new impl — covered by Task 1.)** If a test fails, fix the test, not the guard.

**Step 4: Run to verify pass**

Run: `npm run test -- display-overflow.integration.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/stores/dro/features/display-overflow.integration.test.tsx
git commit -m "test(US-041): integration coverage for derived-reading overflow dashes"
```

---

## Task 3: E2E happy-path

**Files:**
- Find an existing overflow/diameter E2E spec under `e2e/` to mirror its DRO page-object
  helpers (`dro.selectAxis`, `dro.type`, `dro.pressEnter`, setup-menu navigation). Create
  `e2e/derived-overflow.spec.ts` (or extend the nearest existing spec if one covers
  US-047/US-041).

**Step 1: Inspect the E2E helpers**

Run: `ls e2e && grep -rl "diameter\|diA\|999.9999\|overflow" e2e`
Read the closest spec to learn the page-object API and the boot-readiness barrier
(`waitForReady` / `data-dro-state` — see memory `e2e-boot-barrier-data-dro-state`).

**Step 2: Write the E2E spec**

One scenario only (critical flow): preset X to `999.9999` in radius mode, switch to
diameter via the setup menu, assert the X readout text is the dashes indicator.
Use the same boot barrier and real-input helpers the existing specs use. Assert exact
text `-------` (mirror how other specs read the axis text).

**Step 3: Run it**

Run: `npm run test:e2e -- derived-overflow.spec.ts`
Expected: PASS.

**Step 4: Commit**

```bash
git add e2e/derived-overflow.spec.ts
git commit -m "test(e2e): radius→diameter derived overflow shows dashes"
```

---

## Task 4: Docs + memory

**Files:**
- Modify: `project/user-stories/06-configuration/US-041-radius-diameter-mode.md`
- Modify: `project/user-stories/01-foundation/US-047-display-overflow.md`
- Modify: `/home/pedro/.claude/projects/-home-pedro-src-el400/memory/us047-clamp-is-entry-time-only.md`

**Step 1: Add AC 41.8 to US-041**

Under the Acceptance Criteria list, append:

```markdown
- [ ] **AC 41.8:** The ×2 diameter scale composes with the 7-digit panel limit. If the
  doubled value can't fit at the axis's display resolution (e.g. a stored `999.9999`
  radius value switched to `diA` would render the 8-cell `1999.9998`), the readout shows
  an **all-dashes overflow indicator** (`-------`) rather than growing past the physical
  panel — mirroring the Acu-Rite DRO100 display-overflow behaviour. The stored slide value
  is untouched, so the reading self-clears when the axis returns in range, the display
  resolution `dP` is coarsened, or the axis is zeroed. This is the *derived-reading*
  counterpart to the US-047 *entry-time* clamp.
```

Add to Related Stories: `US-047: Display Overflow on Value Entry (entry-time clamp; this is the derived-reading counterpart)`.

**Step 2: Add a cross-reference note to US-047**

In the `## Notes` section, append a bullet:

```markdown
- The clamp here is **entry-time** (bounds keyed values at the commit boundary). The
  *derived-reading* overflow path — where a later radius→diameter ×2 re-scale (US-041) or
  a far-out connected position would render past the panel — is handled separately at the
  display-derivation step by an all-dashes overflow indicator (US-041 AC 41.8), not by this
  clamp.
```

**Step 3: Update the memory file**

Edit `us047-clamp-is-entry-time-only.md`: update the `**How to apply:**` line to record the
gap is now CLOSED, naming the resolution (all-dashes `DISPLAY_OVERFLOW_TEXT` guard in
`computeDisplayPosition`, US-041 AC 41.8, Acu-Rite precedent). Keep the entry-time-vs-derived
distinction.

**Step 4: Commit**

```bash
git add project/user-stories /home/pedro/.claude/projects/-home-pedro-src-el400/memory/us047-clamp-is-entry-time-only.md
git commit -m "docs(US-041): AC 41.8 derived-reading overflow; US-047 cross-ref"
```

---

## Task 5: Full gate + PR

**Step 1: Run the full suite**

Run: `npm run test:all`
Expected: lint + coverage + e2e + storybook all green.

**Step 2: Push and open PR**

```bash
git push -u origin us041-derived-overflow-dashes --force-with-lease
gh pr create --title "US-041: all-dashes overflow for derived linear readings" --body "..."
gh pr merge <PR> --merge --auto
```

Then watch the PR lifecycle with a single Monitor call (CI green/red on every push + reach
MERGED), per the global git-workflow rule.

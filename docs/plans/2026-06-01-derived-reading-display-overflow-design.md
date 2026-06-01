# Derived-reading display overflow → all-dashes indicator

**Date:** 2026-06-01
**Status:** Approved (design)
**Owner story:** US-041 (Radius/Diameter), with a cross-reference from US-047 (entry-time overflow)

## Problem

`computeDisplayPosition` (`src/stores/dro/utils/displayComputation.ts`) derives a linear
axis reading as:

```
stored → ×directionSign → ×measurementScale → unit-convert → formatNumberValue
```

`formatNumberValue` (`src/components/axisDigits.ts`) pads the integer part to a *minimum*
of 3 digits but never **caps** it. So any *derived* value needing more than the panel's
7 digit cells silently grows to 8+ cells.

Canonical trigger (the previous-session deferred item): an axis holding the US-047
entry-clamped `999.9999` in **radius** mode is switched to **diameter** mode via setup.
The display-only ×2 scale re-derives `999.9999 × 2 = 1999.9998` — 8 digit cells, past the
physical panel. US-047's clamp cannot catch this: it fires at the **value-commit
boundary** (`KEY_ENTER` in `axis-operations.ts`), and nothing was keyed here.

This is distinct from US-047:
- **US-047** = overflow on *value entry* → clamp the **stored** value so displayed = stored.
- **This** = overflow on *display derivation* (a later mode switch / live machine position)
  where there is no keyed value to clamp; the ×2 scale is purely display-only.

## Real-device precedent

Researched how other DROs handle display overflow (not just the EL400):

- **Acu-Rite DRO100** (Heidenhain family, mainstream): *"A numeric overflow occurs when
  the intended measurement is too large for the eight-digit display"* → the panel shows
  **all dashes**. Recovery: *"returning the machine axis into an area where measurements
  can again be displayed, selecting a lower display resolution, or zeroing the display."*
- Other hits were general radius/diameter usage (the ÷2-vs-×2 convenience) or programmed
  **travel-limit** indicators (ProScale `UL`/`LL`) — a different feature, not display
  overflow.

Conclusion: the documented real-DRO behavior is an **honest "out of range" indicator
(dashes)**, *not* a clamped-but-plausible number and *not* a wrap/rollover. This also
sidesteps the "displayed ≠ stored" objection cleanly — dashes are not a number claiming
to be the value.

## Decision

When a **linear** axis's *derived* reading cannot fit the 7 digit cells at its current
`dP` resolution, render the all-dashes overflow indicator instead of an out-of-range
number. The stored slide value is untouched, so the reading **self-clears** the moment
the axis moves back in range, `dP` is coarsened, or the axis is zeroed — matching the
Acu-Rite recovery conditions.

Scope: **general** — any derived linear value, not only the diameter ×2 case (also covers
a connected machine position jogged far out of range).

## Implementation

One pure check at the display-derivation step, in `computeDisplayPosition`:

1. Keep the angular early-return as-is (angular wraps to `[0, 360)`, never overflows).
2. After `fromMmToAnyUnit(...)`, compute `decimals = axisDisplayDecimals(axis, nvMem)`.
3. Test the value *as it will round on the panel* (not the raw float):

   ```ts
   const rounded = Number(Math.abs(displayed).toFixed(decimals));
   if (rounded > maxDisplayableMagnitude(decimals)) return DISPLAY_OVERFLOW_TEXT;
   ```

   The rounded-then-compare boundary means `999.99991` (renders `999.9999`) still fits;
   only a value that actually *renders* past the panel trips it.
4. New exported const `DISPLAY_OVERFLOW_TEXT = '-------'` (7 dashes → the 7 digit cells;
   the sign cell stays blank so it can never be misread as a negative number).
5. No formatter change: `'-------'` is not numeric-looking and not angular, so
   `formatAxisDigits` routes it through the existing `formatTextValue` text path.

### No US-047 regression

Keyed values are clamped at entry to ≤ `maxDisplayableMagnitude` (and to `limit/scale`
on a diameter axis, AC 47.7), so they never reach the overflow branch — including the
diameter entry path, which stores `limit/2` and displays exactly `limit` (`999.9999`,
which is not `> limit`).

## Documentation

- Add **AC 41.8** to `US-041` (the documented triggering case is the ×2 mode switch),
  citing the Acu-Rite precedent and the dashes recovery conditions.
- Add a cross-reference note in `US-047` distinguishing entry-time clamp (US-047) from
  derived-reading dashes (US-041 / this change).
- Update the `us047-clamp-is-entry-time-only` memory to mark the gap closed.

## Tests (TDD)

**Unit** (`displayComputation.test.ts`):
- derived overflow trips → `'-------'`
- `999.9999` exact boundary fits (no dashes)
- `999.99991`-rounds-to-fit case (no dashes)
- diameter ×2 of a near-limit radius value → dashes
- coarser `dP` (3 decimals) raises the threshold to `9999.999`
- angular axes never overflow
- self-clears when the value returns in range

**Integration** (extend `display-overflow.integration.test.tsx`):
- via the real setup menu, preset a near-limit value in radius mode, switch X to `diA`
  → readout shows dashes; jog/coarsen/zero back → number returns. Real-input discipline
  only (keypad + setup menu + live ticks), no store mutation or window hooks.

**E2E** (`e2e/`): one happy-path for the diameter mode-switch overflow showing dashes.

## Files touched

- `src/stores/dro/utils/displayComputation.ts` — overflow check + `DISPLAY_OVERFLOW_TEXT`
- `src/stores/dro/utils/displayComputation.test.ts` — unit tests
- `src/stores/dro/features/display-overflow.integration.test.tsx` — integration tests
- `e2e/` — one E2E spec
- `project/user-stories/06-configuration/US-041-radius-diameter-mode.md` — AC 41.8
- `project/user-stories/01-foundation/US-047-display-overflow.md` — cross-ref note
- memory: `us047-clamp-is-entry-time-only.md`

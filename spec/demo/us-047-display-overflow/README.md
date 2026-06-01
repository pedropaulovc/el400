# US-047 Demo — Display Overflow on Value Entry

Manual walkthrough of the display-overflow clamp, driven through the simulator's
on-screen panel exactly as a machinist would (click X/Y/Z select, the numeric
keypad, ENTER; read the seven-segment displays). No mocks, no store-poking, no
test scripts — every value was keyed in by hand in a real browser.

- **Branch:** `feature/us-047-display-overflow`
- **Commit demoed:** `8f530cf`
- **Mode:** `http://localhost:8080/?source=manual` (manual mode, no backend)
- **Spec:** `project/user-stories/01-foundation/US-047-display-overflow.md`

## What this feature does

The real EL400 panel is fixed hardware: **7 seven-segment digit cells + one
+/- sign cell**. It cannot grow an 8th digit. When you key in a value too large
to fit, the DRO pins it to the largest value the panel can show *at the axis's
current display resolution*, keeping the sign. The clamp happens to the
**stored** value at entry time, so what you see always equals what the DRO holds.

At the 4-decimal mill default that maximum is `999.9999`.

Each result step has two screenshots: a full-panel frame (`NN-…png`) showing the
whole device, and a tight seven-segment close-up (`NNb-…png`) so the readout is
unambiguously legible.

## Demo plan (as executed)

| Step | AC | Action (real-user keystrokes) | Expected | Result |
|------|----|-------------------------------|----------|--------|
| 1 | 47.1 | Select X, key `5 5 5 5 5 5 5 5`, ENTER | `999.9999` | PASS |
| 2 | 47.2 | Select Y, key `5×8`, +/-, ENTER | `-999.9999` | PASS |
| 3 | 47.6 | Select Z, key `123.4567`, ENTER | `123.4567` verbatim | PASS |
| 4 | 47.7 | Set X to diameter mode in setup, key `5×8`, ENTER | `999.9999` (not `1999.9998`) | PASS |

## Step-by-step

### 0. Baseline
`00-baseline.png` — Power-on state: X/Y/Z all `0.0000`, ABS + inch lit,
4-decimal resolution. The panel shows 3 dark ghost cells to the left of each
reading — that is the full physical width the value can never exceed.

### 1. The reported bug — AC 47.1 (over-long value pins to 999.9999)
- `01-typing-55555555.png` — X is selected and the eight `5`s have been keyed.
  The panel still reads `0.0000`: this DRO buffers keypad input and only commits
  the value on ENTER (matching the real device).
- `02-clamped-999.9999.png` (full panel) and `02b-display-999.9999.png`
  (legible display close-up) — After ENTER, **X = `999.9999`**. Exactly 7 lit
  digit cells (3 integer + 4 fraction); the leftmost cells stay dark. The bug
  this story fixes — the readout growing past its 8 physical cells — does not
  occur. Read-back from the accessible position table: `X999.9999`.

### 2. Sign preserved — AC 47.2 (-999.9999)
- `03-negative-before-enter.png` — Y selected, eight `5`s keyed, then +/-
  pressed (negative buffer), still pre-commit at `0.0000`.
- `04-clamped-negative.png` (full panel) and `04b-display-negative.png`
  (close-up) — After ENTER, **Y = `-999.9999`** with the `-` in the dedicated
  sign cell and 7 digit cells holding `999.9999`. X still `999.9999`.
  Read-back: `Y-999.9999`.

### 3. A value that fits is untouched — AC 47.6 (123.4567)
- `05-fits-unchanged.png` (full panel) and `05b-display-fits.png` (close-up) —
  Z selected, `1 2 3 . 4 5 6 7` keyed, ENTER → **Z = `123.4567`** verbatim, no
  clamping (it fits in 7 cells). Read-back: `Z123.4567`. The panel now shows all
  three behaviours at once: X `999.9999` (clamped), Y `-999.9999` (clamped
  negative), Z `123.4567` (verbatim).

### 4. Diameter mode — AC 47.7 (clamp bounds the *displayed* magnitude)
Reached diameter mode entirely through the setup menu as a user:
- Press the **Settings** (wrench) key → display shows `SELECt`.
- Press **X** → first parameter `LinEAr` appears.
- Press **▼ (`2`)** to scroll to the `rAd` (radius/diameter) parameter.
- Press **► (`6`)** to cycle the choice from `rAd` to `diA` (diameter).
  `06-setup-diameter-mode.png` (full panel) and `06b-setup-diA.png` (close-up) —
  the X row reads `diA`.
- Scroll **▲ (`8`)** to `SAU ChG`, press **ENT** to save, then **C C** to exit.

With X now a diameter (×2) axis, select X, key `5×8`, ENTER →
**X = `999.9999`**, *not* the 8-cell `1999.9998`.
`07-diameter-clamped-999.9999.png` (full panel) and `07b-display-diameter.png`
(close-up). The clamp caps the entered value at `maxDisplayableMagnitude / 2`
(stored slide value `499.99995`) so the ×2 diameter scale lands exactly on the
7-cell limit. Read-back: `X999.9999`.

## Observation for the reviewer (not a US-047 bug)

When X was switched into diameter mode while it *already held* the clamped
`999.9999` slide value from step 1, the operating screen rendered
**`1999.9998`** — that stored value doubled by the freshly-applied ×2 diameter
scale, overflowing to all 8 cells. Captured in `08b-observation-1999.9998.png`
(the only frame where a row uses the full physical width).

This is **outside US-047's scope and not a regression of it**: the spec
(AC 47.7 + Implementation Notes) clamps at the *value-commit boundary* — the
magnitude a user keys in. A value committed earlier in radius mode and then
re-scaled by a later mode switch is a US-041 composition path, not an entry. The
canonical AC 47.7 case (keying a fresh over-long value *while in diameter mode*,
step 4) pins correctly to `999.9999`. Flagging the `1999.9998` render only so
the team can decide whether re-scaling an existing reading on a mode switch
should also be bounded — it is a separate question from this story.

## How values were verified

The seven-segment cells render as styled `seg-on`/`seg-off` spans (no text), so
read-back used the panel's own accessible mirror — the `table[aria-label="Axis
positions"]` that exposes the same X/Y/Z values to screen readers. Every
asserted value above was confirmed against that table *and* visually in the
screenshots. The persisted diameter setting was confirmed read-only in
`localStorage` (`el400-dro-non-volatile-memory` → `measurementMode.X = diameter`)
to show the SAV CHG actually committed; the value was set through the UI, never
written directly.

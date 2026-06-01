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
| 5 | 47.3 | Setup → X → `dP 50.0` (50 µm / 3 dec), key `5×8`, ENTER | `9999.999` (4 integer digits) | PASS |
| 6 | 47.3 | Then key `5×8` into Y (still 4 dec) | `999.9999` — per-axis limit | PASS |
| 7 | 47.4 | Toggle to **mm** (mm LED lit), key `12345678`, ENTER | `999.9999` in mm | PASS |
| 8 | 47.6 | Key the exact boundary `999.9999` DIRECTLY, ENTER | `999.9999` verbatim, no clamp | PASS |
| 9 | 47.5 | ABS/INC → **INC**, key `5×8`, ENTER; hold across ticks | `999.9999`, stable | PASS |
| 10 | 47.5 | **Connected** (`?source=debug`) ABS preset `5×8`, then jog X | `999.9999`, moves 1:1 | PASS |

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

### 5. Resolution-aware clamp — AC 47.3 (the headline gap)
The clamp limit is `10^(7−decimals) − 10^(−decimals)`, so coarsening the display
resolution frees an integer cell and *raises* the cap. Reached the resolution
through the real setup menu (US-022 path), no shortcut:
- Press **Settings** → `SELECt`, press **X** → `LinEAr`.
- Press **▼ (`2`)** to scroll to the `dP 5.0` row (5-micron default = 4 decimals).
- Press **► (`6`)** three times to cycle `5 → 10 → 20 → 50`. `09b-setup-dP50.png`
  — the X row reads `dP 50.0` (50 micron = 3 decimals).
- Exit (Settings + CLEAR). The X readout immediately becomes `0.000` (3 decimals)
  — dP commits on change. localStorage confirms `displayResolution.X = "50"`.

Now select X, key `5×8`, ENTER → **X = `9999.999`** (`09-resolution-9999.999.png`
full panel, `09c-display-9999.999.png` close-up). Four integer digits + three
fraction = 7 cells. The decimal point has visibly moved one cell right versus the
`999.9999` of step 1 — proving the limit tracks `dP`, not a hardcoded `999.9999`.

**Per-axis** — `10-peraxis-limit.png` / `10c-display-peraxis.png`: with X still at
`dP 50.0`, keying `5×8` into Y (untouched, 4 decimals) pins Y to **`999.9999`**.
One frame shows both at once: **X `9999.999`** (3 dec) above **Y `999.9999`**
(4 dec). The resolution-aware limit is scoped to the axis you configured.

### 6. Unit-independent — AC 47.4 (mm)
`11-mm-clamped.png` / `11c-display-mm.png`: press **Toggle units** so the **`mm`**
annunciator lights (and `inch` dims — visible at the bottom of the close-up),
then key `12345678`, ENTER → **X = `999.9999`**. The entered value is in mm
display space, but the 7-digit panel cap is identical to the inch case. Compare
the lit `mm` LED here against the lit `inch` LED in every other frame.

### 7. Exact boundary, typed directly — AC 47.6 (disambiguation)
`12-exact-boundary.png` / `12c-display-boundary.png`: keying `999.9999` *directly*
(not by clamping `55555555`) enters **`999.9999`** verbatim. This proves the
result in steps 1/4 is the genuine no-clamp boundary value and the clamp does not
alter a value that exactly fits — a typed `999.9999` and a clamped one are
indistinguishable on the panel, so this exercises the no-clamp branch explicitly.

### 8. Displayed == stored across modes — AC 47.5
The clamp must hit the *stored* value, not just the render, in every mode.

- **INC** — `13-inc-clamped.png` / `13c-display-inc.png`: press **ABS/INC** so the
  **`inc`** annunciator lights, select Z, key `5×8`, ENTER → **Z = `999.9999`**.
  Read back across 5 live encoder ticks: stays `999.9999` (a render-only clamp
  over a larger stored counter would resurface the over-long number on recompute).

- **Connected ABS (work-offset preset)** — the strongest render-vs-storage probe,
  run against a real connected adapter via `?source=debug` (in-browser, no backend;
  `controllerType=debug`, `connected=true`, with a live jog control panel). With
  the machine at origin (jog-reset), select X, key `5×8`, ENTER → **X = `999.9999`**
  (`14-connected-clamped.png` / `14c-display-connected.png`). This stores a *work
  offset* of `(machinePos − 999.9999)`; the readout is recomputed `machinePos −
  offset` on every encoder tick, and it holds at `999.9999` across ticks.

  Then **jog X** through the panel: the readout steps `999.9999 → 999.9605 →
  999.9212` (`15-connected-motion.png` / `15c-display-motion.png`), moving 1:1 with
  the live machine position measured against the clamped datum. Had storage kept
  the un-clamped `55555555`, the offset would be `(0 − 55555555)` and jogging would
  recompute to an over-long magnitude. It does not — so the clamp lives in storage,
  and displayed == stored even under live motion.

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
screenshots. Mode/unit states (`abs`/`inc`, `inch`/`mm`) were confirmed by the
panel's annunciator LEDs (`mode-indicator-active` vs `-inactive`) — visible in
the close-ups. Persisted setup changes were confirmed read-only in `localStorage`
(`el400-dro-non-volatile-memory` → `measurementMode.X = diameter`,
`displayResolution.X = "50"`) to show the menu commit actually took; every value
was set through the UI, never written directly.

The connected case (AC 47.5) used `?source=debug`, the project's documented
in-browser connected adapter — a real `MillAdapter` with `connected=true` and a
live jog control panel, not a mock or stub. All motion was driven by clicking the
on-screen jog buttons. No route interception, request stubbing, or store-poking
was used anywhere in this demo.

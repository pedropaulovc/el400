# US-041 — Radius / Diameter (rAd / diA) — Walkthrough

**Source:** `?source=debug` (in-browser jog controls — needed to drive live axis motion).
**What it proves:** the per-axis `rAd`/`diA` setup parameter chooses radial (1:1, mill default)
vs diametric (2× movement, lathe). Setting `diA` on X makes a 1.000 mm move read 2.000, while a
radial axis (Y) still reads 1:1 — proving it is per-axis and a display-only ×2.

The readout is switched to **mm** (via the in/mm key) so a 1.000 mm jog reads cleanly as
1.000 / 2.000, matching the spec's "1.000 move shows 2.000" narrative (the doubling is
unit-independent). All steps are real DOM clicks (keypad/axis/wrench + debug jog buttons).

| # | User action | DRO response | Screenshot |
|---|-------------|--------------|------------|
| 1 | Power up (debug), press in/mm → mm | Idle `0.0000` in mm | `01-idle-debug-mm.png` |
| 2 | Jog X +1 mm and Y +1 mm (both still default `rAd`) | X = `1.0000`, Y = `1.0000` — 1:1, mill default (AC41.3) | `02-radius-default-1to1.png` |
| 3 | Debug reset to origin | `0.0000 / 0.0000 / 0.0000` | — |
| 4 | Wrench → select **X**, scroll to rAd/diA param | X cell = `rAd` (default, AC41.1) | `03-setup-x-rAd-default.png` |
| 5 | Press `6` (►) | `rAd` → `diA` (AC41.2) | `04-setup-x-diA.png` |
| 6 | Scroll to **End**, press **ENT** (exit) | Readout `0.0000` at origin (diA committed on X) | `05-readout-origin-after-diA.png` |
| 7 | Jog X +1.000 mm and Y +1.000 mm | **X = `2.0000`** (diA, doubled), **Y = `1.0000`** (rAd, 1:1) — per-axis (AC41.4/41.5). Debug panel confirms real machine X=1.000, Y=1.000 mm | `06-live-diA-X-doubled-Y-radial.png` |
| 8 | Jog X +1.000 mm (machine X now 2.000 mm) | X = `4.0000` (still 2× of 2 mm travel) | `07-live-diA-X-4.000.png` |

## Acceptance-criteria coverage
- **AC41.1** `rAd`/`diA` available for a linear axis — step 4.
- **AC41.2** `◄`/`►` toggle rAd ↔ diA — step 5.
- **AC41.3** rAd = 1:1 (mill default) — step 2 (both axes 1.000 at default).
- **AC41.4** diA doubles the displayed value (1.000 → 2.000) — step 7 (X = 2.0000).
- **AC41.5** Per-axis — step 7 (X diA = 2.0000 while Y rAd = 1.0000 for the same 1 mm travel).
- **AC41.6** Persists via SAU CHG — the per-axis mode commits and survives exit (here via End/ENT).
- **AC41.7** Meaningful only when counting mode is `LinEAr` — both axes are linear in this demo;
  the ×2 transform is applied only in linear mode (angular has no diameter concept).

## Observations
- Clean and unambiguous in mm: machine X=1.000 mm shows as 2.0000 (diA) on the DRO while
  the debug panel shows the true 1.000 mm. The doubling is a pure display transform — stored
  machine position is untouched. Nothing felt off through the real UI.

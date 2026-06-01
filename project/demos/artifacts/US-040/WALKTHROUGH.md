# US-040 — Counting Mode (LinEAr / AnGULAr) + Angular dP DMS formats — Walkthrough

**Source:** `?source=debug` (in-browser jog controls — needed to drive the live angular readout).
**What it proves:** the first per-axis setup parameter is `LinEAr` (default); `►` toggles it to
`AnGULAr`; switching to angular replaces the linear micron `dP` options with the three angular
display-resolution formats `dd.mn` / `dd.mn.SS` / `dd.dEC`; and the chosen format drives the
live readout. This single demo also covers the **US-040-dms** follow-up (the DMS formats).

Real DOM clicks on the keypad/axis/wrench buttons and the debug panel's jog buttons. X readout
values come from the device's screen-reader cell (mirrors the seven-segment panel).

| # | User action | DRO response | Screenshot |
|---|-------------|--------------|------------|
| 1 | Power up (debug) | Idle `0.0000 / 0.0000 / 0.0000` (linear default) | `01-idle-debug.png` |
| 2 | Wrench → select **X** | First parameter = `LinEAr` (AC40.1, default) | `02-counting-mode-LinEAr-default.png` |
| 3 | Press `6` (►) | `LinEAr` → `AnGULAr` (AC40.2) | `03-counting-mode-AnGULAr.png` |
| 4 | Scroll (`2`/▼) to **dP** | X cell shows `dd.mn` — angular axis exposes DMS formats, not microns (AC40.4; the linear `dP n.0` list is replaced) | `04-angular-dP-dd.mn.png` |
| 5 | Press `6` (►) | `dd.mn` → `dd.mn.SS` (degrees-minutes-seconds) | `05-angular-dP-dd.mn.SS.png` |
| 6 | Press `6` (►) | `dd.mn.SS` → `dd.dEC` (degrees-decimal) | `06-angular-dP-dd.dEC.png` |
| 7 | Press `4` (◄) | back to `dd.mn.SS` (selected for the readout demo) | `07-angular-dP-selected-dd.mn.SS.png` |
| 8 | Scroll to **End**, press **ENT** | Readout X = `0.00.00` (angular, 0°, in dd.mn.SS) | `08-readout-angular-zero.png` |
| 9 | Jog X +1 ×12 then +0.1 ×5 (debug panel) → machine X = 12.500 mm = 12.5° | X reads **`12.30.00`** = 12°30'00" (dd.mn.SS); debug panel confirms X = 12.500 | `09-live-readout-12.30.00.png` |
| 10 | Jog X +0.1 (→ 12.6°) | X reads **`12.36.00`** = 12°36'00" | `10-live-readout-12.36.00.png` |

## Acceptance-criteria coverage
- **AC40.1** First param is `LinEAr` (default) — step 2.
- **AC40.2** `◄`/`►` toggle LinEAr ↔ AnGULAr — step 3.
- **AC40.3** Linear → micron dP, radius/diameter available (see US-041); angular → DMS readout — steps 4 & 9.
- **AC40.4** Angular exposes `dd.mn` / `dd.mn.SS` / `dd.dEC` — steps 4–6.
- **AC40.5** Per-axis — the parameter is read/written for the selected axis (X here);
  Y/Z remain linear and read `0.0000`.
- **AC40.6** Mill default all-linear — step 1 (all axes numeric/linear on boot).
- **AC40.7** Persists via SAU CHG — the per-axis mode commits and survives exit; here exit is via End/ENT.

## Observations
- The `.` separators in `12.30.00` stand in for the °/'/" the seven-segment panel cannot draw,
  exactly as the manual writes the format labels. Live jog confirms 12.5° → `12.30.00` and
  12.6° → `12.36.00` — the seconds group updates as expected. Nothing felt off through the real UI.

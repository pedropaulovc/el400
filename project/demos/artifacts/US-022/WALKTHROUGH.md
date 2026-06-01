# US-022 — Display Resolution (dP) — Walkthrough

**Source:** `?source=manual` (NoOp adapter; setup + keypad flow only, no motion needed).
**What it proves:** the `dP` setup parameter cycles the micron resolution options and the
chosen value changes the readout's decimal precision per axis, without touching measurement.

All steps are real DOM clicks on the device's keypad/axis/wrench buttons. The "X readout"
values below are read from the device's screen-reader cell (`axis-value-x`), which mirrors the
seven-segment panel.

| # | User action | DRO response | Screenshot |
|---|-------------|--------------|------------|
| 1 | Power up (boot → idle) | Readout `0.0000 / 0.0000 / 0.0000` — default `dP 5.0` = 4 decimals (AC22.2) | `01-idle-default-4-decimals.png` |
| 2 | Press wrench (setup) → select **X** | Enters setup; first parameter highlighted (`LinEAr`) | `02-setup-x-first-param-LinEAr.png` |
| 3 | Press `2` (▼) to scroll to **dP** | X cell shows `dP 5.0` — the display-resolution parameter (AC22.1) | `03-dP-parameter-default-5.0.png` |
| 4 | Press `6` (►) | `dP 5.0` → `dP 10.0` | `04-dP-10.0.png` |
| 5 | Press `6` (►) | `dP 10.0` → `dP 20.0` | `05-dP-20.0.png` |
| 6 | Press `6` (►) | `dP 20.0` → `dP 50.0` (coarse) | `06-dP-50.0-coarse.png` |
| 7 | Scroll to **End**, press **ENT** (exit) | Readout: **X = `0.000` (3 decimals)**, Y/Z still `0.0000` (4 decimals). Coarser dP drops a decimal on X only (AC22.4, AC22.5, per-axis) | `07-readout-coarse-3-decimals.png` |
| 8 | Re-enter setup X → dP, press `4` (◄) ×3 | `dP 50.0` → `dP 20.0` → `dP 10.0` → `dP 5.0` | `08-dP-back-to-5.0.png` |
| 9 | Exit (End + ENT) | Readout X restored to `0.0000` (4 decimals) | `09-readout-fine-4-decimals-restored.png` |

## Acceptance-criteria coverage
- **AC22.1** Navigate to dP parameter — step 3 (X cell reads `dP 5.0`).
- **AC22.2** Default 0.0002" / 4 digits — step 1 (`0.0000`, default `dP 5.0`).
- **AC22.3** Independent of scale resolution — dP cycles its own option set; SC is a
  separate parameter (`SC 5.0`) shown elsewhere in the list.
- **AC22.4** Reducing resolution makes display less sensitive — step 7, X drops to 3 decimals
  at `dP 50.0` (≈0.002").
- **AC22.5** Change affects display only — the underlying machine position is unchanged
  (manual mode reads `0.000`); the change is purely the rendered decimal count, and is
  **per-axis** (Y/Z keep 4 decimals while X is coarse).

## Observations
- The down/`2` key walks the registry in reverse (LinEAr → End → … → dP → SC → bEEP → EnF →
  wraps), so reaching dP from the first item is a few `▼` presses; the navigation helper just
  scans until the `dP ` label appears. Nothing felt off.

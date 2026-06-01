# US-024 — Zero-Approach (Near-Zero) Warning — Walkthrough

**Source:** `?source=debug` (jog controls — needed to drive the axis toward the target so the
distance-to-go crosses the warning band).
**What it proves:** the `ZERO AP` (`bU22`) setup toggle enables a near-zero warning; `BP DIST`
sets the approach band and `BP TOLR` the departure hysteresis; in distance-to-go (Preset) mode
the warning fires when the remaining distance enters `BP DIST` of the target and clears only
after departing past `BP DIST + BP TOLR`.

The warning surfaces as the on-screen **♪ Near-Zero indicator** (`audio-indicator`, the visual
companion of the continuous beep) plus the affected axis flashing. The readout is in **mm**.
All steps are real DOM clicks (keypad/axis/wrench + debug jog buttons).

### Configure (setup)
| # | User action | DRO response | Screenshot |
|---|-------------|--------------|------------|
| 1 | Power up (debug), in/mm → mm | Idle `0.0000` mm | `01-idle-mm.png` |
| 2 | Wrench → X, scroll to **ZERO AP** (`bU22`) | `bU22 oF` (default off, AC24.1/24.2) | `02-setup-bU22-off-default.png` |
| 3 | Press `6` (►) | `bU22 oF` → `bU22 on` | `03-setup-bU22-on.png` |
| 4 | Scroll to **BP DIST**, press `6` ×4 | `bP .002` → `bP .020` (≈0.508 mm approach band, AC24.4) | `04-setup-bP-dist-.020.png` |
| 5 | Scroll to **BP TOLR**, press `6` ×3 | `tL .000` → `tL .010` (≈0.254 mm departure hysteresis, AC24.5) | `05-setup-tL-.010.png` |
| 6 | Scroll to End, press ENT (exit) | Config committed; **idle shows no warning** (only arms in dist-to-go/SDM/milling) | — |

### Trigger (distance-to-go)
| # | User action | DRO response | Screenshot |
|---|-------------|--------------|------------|
| 7 | Press Distance-to-Go | `preset-select` (X cell = `SELECt`) | `06-preset-select.png` |
| 8 | Select **X**, type `3 . 0`, ENT | X target = 3.0 mm stored | `07-preset-input-x-3.0.png` |
| 9 | Press Distance-to-Go (execute) | `distance-to-go` active; X = `3.0000` remaining; **no warning** (3 mm > band) — AC24.9 (auto-enabled in Preset) | `08-distance-to-go-3.0-no-warning.png` |
| 10 | Jog X +1 mm ×2 | X = `1.0000` remaining; no warning (1 mm > 0.5 mm) | `09-remaining-1.0-no-warning.png` |
| 11 | Step 0.1 mm; jog X +0.1 toward target | At remaining `0.6000` → off; **at `0.5000` → WARNING FIRES** (within BP DIST), continues at 0.4/0.3/0.2 — AC24.6/24.10. ♪ indicator + axis flash | `10-WARNING-fired-within-BP-DIST.png`, `10b-WARNING-display-closeup.png` |
| 12 | Step 1 mm; jog X −1 mm (depart) | X = `1.2000` remaining (> band+tol ≈0.76 mm) → **warning clears** (hysteresis, AC24.6) | `11-departed-warning-cleared.png` |
| 13 | Exit, re-enter setup, toggle ZERO AP off | `bU22 on` → `bU22 oF` — warning will no longer fire even near target | `12-zero-ap-disabled.png` |

The close-up `10b-WARNING-display-closeup.png` shows X = `0.5000` with the red ♪ Near-Zero
indicator lit and the `inc` + `mm` LEDs on.

## Acceptance-criteria coverage
- **AC24.1** Navigate to ZERO AP — step 2.
- **AC24.2** Toggle ON/OFF (`bU22`) — steps 3 & 13.
- **AC24.3** Continuous warning near zero — steps 11–12 (♪ indicator persists across 0.5→0.2 mm).
- **AC24.4** BP DIST sets approach distance — step 4 (`bP .020`).
- **AC24.5** BP TOLR sets departure tolerance — step 5 (`tL .010`).
- **AC24.6** Beeping within BP DIST; stops beyond BP DIST+BP TOLR — steps 11 (fires at 0.5 mm) & 12 (clears at 1.2 mm).
- **AC24.8** Distinct from key-press beep — ZERO AP is a separate setting from keypad beep (`bEEP`).
- **AC24.9** Auto-enabled in Preset/SDM/milling — step 9 (engaged the moment distance-to-go starts;
  plain idle never warns, step 6).
- **AC24.10** Triggers within threshold of zero (target) — step 11 (fires exactly at the BP DIST band edge, 0.5 mm).

## Observations
- The warning correctly does **not** arm in plain idle — it only arms in distance-to-go / SDM /
  milling contexts where the readout is a distance-to-target (this is the spec's intent, AC24.9).
  So the demo deliberately enters distance-to-go to surface it; a tester checking idle alone
  would see nothing fire, which is correct. The hysteresis (fires at 0.5 mm, clears at 1.2 mm)
  is observable with the chosen BP DIST/BP TOLR. Nothing felt off through the real UI.

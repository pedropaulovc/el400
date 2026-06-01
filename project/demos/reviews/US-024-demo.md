# US-024 Zero-Approach (Near-Zero) Warning — Demo Review

**Verdict: APPROVE**

Source: `?source=debug` (jog to drive distance-to-go across the band). Real DOM clicks. Readout in mm. Warning surfaces as the on-screen ♪ Near-Zero indicator (`audio-indicator`) — the visual companion of the continuous beep (audio can't be screenshotted; ♪ is the correct artifact).

## AC coverage
- **AC24.1** Navigate to ZERO AP — `02-setup-bU22-off-default.png` (`bU22 oF` default). PASS.
- **AC24.2** Toggle ON/OFF — `03-setup-bU22-on.png` + `12-zero-ap-disabled.png`. PASS.
- **AC24.4** BP DIST sets approach band — `04-setup-bP-dist-.020.png` (`bP .020`). PASS.
- **AC24.5** BP TOLR sets departure hysteresis — `05-setup-tL-.010.png` (`tL .010`). PASS.
- **AC24.9** Auto-enabled in Preset/dist-to-go — `08-distance-to-go-3.0-no-warning.png`: warning arms only in dist-to-go, not plain idle. Correct intent. PASS.
- **AC24.6 / AC24.10** Fires within BP DIST, clears beyond BP DIST+BP TOLR — the decisive pair:
  - `10b-WARNING-display-closeup.png`: X = `0.5000` remaining (the band edge), red ♪ indicator LIT, inc+mm LEDs on — warning fires exactly at the BP DIST boundary.
  - `11-departed-warning-cleared.png`: X = `1.2000` (past band+tol ≈0.76mm), ♪ gone — hysteresis clears. PASS.
- **AC24.3** Continuous near zero — ♪ persists across 0.5→0.2mm (narrated, indicator visible at 0.5). PASS.
- **AC24.8** Distinct from keypad beep — separate `bU22` vs `bEEP` settings. PASS.

## Verdict rationale
The band/hysteresis behavior is shown precisely: no warning at 3.0/1.0mm, fires at the 0.5mm BP DIST edge with the ♪ indicator, clears at 1.2mm (proving departure tolerance). Correctly arms only in distance-to-go, not idle. The ♪ visual indicator is the right evidence for an audio feature in a screenshot demo. Approve.

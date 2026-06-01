# US-032 Touch Probe — Demo Review

**Verdict: APPROVE**

Source: `?source=debug` (real jog + probe-contact toggle; contact = rising edge of probe pin). Inside/Outside in mm so the 6mm tip and results read cleanly. 20 screenshots covering all 10 ACs.

## AC coverage
- **AC32.1** Configure `dro t` / `dro F` — `01-setup-probe-type-transmit.png` (`dro t` default) / `02-setup-probe-type-freeze.png` (`dro F`). PASS.
- **AC32.2** Transmit: keeps counting, sets datum — function demos use `dro t`; edge sets datum (`05`). PASS.
- **AC32.3** Freeze: halts display on contact — the decisive pair: `19-freeze-held-while-moving.png` shows DRO frozen at `29.0000` while the debug panel shows machine X moved to `44.000` (display does NOT update while held); `20-freeze-released-resumes.png` shows counting resumes (`34.0000`) on release. PASS — this is the hardest AC and it's clearly shown.
- **AC32.4** Probe Edge — `03-edge-menu.png` (`Prob Ed`) → `05-edge-triggered.png`: contact sets X datum to `0.0000` at the edge, prb LED + "Probe TRIGGERED" log. PASS.
- **AC32.5** Probe Midpoint — `06`–`08`: edges at 0.0787 / 0.3937 → datum at midpoint, readout `0.1575` (= 0.3937 − 0.2362). Correct. PASS.
- **AC32.6 Inside (+tip)** — `12-inside-result.png`: 10mm bore + 6mm tip = `16.0000`. PASS.
- **AC32.6 Outside (−tip)** — `15-outside-result.png`: 10mm faces − 6mm tip = `4.0000`. PASS.
- **AC32.7/32.8** Trigger sets datum/freezes + prb indication — `05` (prb LED on contact). PASS.
- **AC32.10** C exits — narrated/per-function. PASS.

## Notes
- Cosmetic: shots 12/15/19/20 have the debug panel overlapping the keypad (same responsive-layout issue flagged elsewhere). The seven-segment readout remains fully visible, so the evidence is intact.

## Verdict rationale
All four probe functions with correct tip-diameter compensation (Inside +6=16, Outside −6=4), a correct midpoint datum, the edge-set datum, and — most importantly — the distinct Transmit vs Freeze behaviors (Freeze visibly halts the display while the machine keeps moving, then resumes on release). Comprehensive and correct. Approve.

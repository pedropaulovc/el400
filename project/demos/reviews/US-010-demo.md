# US-010 SDM Direct Entry (Program Mode) — Demo Review

**Verdict: APPROVE**

Source: `?source=manual` (keypad-only, no motion). Real keypad clicks.

## AC coverage
- **AC10.1** Enter SDM Program mode — `02-sdm-menu-learn.png` (`LEArn`) → `03-sdm-menu-program.png` (`ProGrAn`) → ENT. PASS.
- **AC10.2** Step prompt — `04-step-prompt.png`: `StEP` on X row, `1.0000` (step number) on Y row. PASS. (Spec calls it `StEPno`; panel renders `StEP` + number — faithful 7-seg rendering, minor naming.)
- **AC10.3** Enter X/Y/Z coordinates — `07-step1-coords.png`: X=50.0000, Y=25.0000, Z=10.0000 with sdm LED lit. PASS.
- **AC10.4** 6► advances to next step — `09-step2-view.png` (`StEP`/`2`), `10-step2-stored.png` (X=100 programmed). PASS.
- **AC10.5** Y jumps to a specific step — `11-jump-prompt.png` → `12-jump-typed-5.png` → `13-jumped-step5.png` (`StEP`/`5.0000`). PASS.
- **AC10.6** C exits — `14-exited-idle.png`. PASS.

## Verdict rationale
All six ACs shown through real keypad entry: program-mode entry, step prompt, per-axis coordinate entry, forward step advance, arbitrary jump-to-step, and exit. The programmed points feed US-011's recall (shared store). Approve.

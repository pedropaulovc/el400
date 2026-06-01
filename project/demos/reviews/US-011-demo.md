# US-011 SDM Recall (Run Mode) — Demo Review

**Verdict: APPROVE**

Source: `?source=debug` (jog drives a real encoder so DTG updates live). Setup programs step 1 `X10 Y20 Z5`, step 2 `X30 Y0 Z0` first. Unit inch.

## AC coverage
- **AC11.1** Enter SDM Run mode — `02-sdm-menu-run.png` (`rUn`) → `03-run-step-select.png`. PASS.
- **AC11.2** Select step (starts at 1) — `03` (`rUn` / Y=`1`). PASS.
- **AC11.3** Display shows Distance-to-Go — `04-run-dtg-step1.png`: X=10.0000, Y=20.0000, Z=5.0000 (programmed point − origin). Live update: `06-run-dtg-after-jog.png`: after jogging X +5mm (debug panel machine X=5.000), DTG X shrinks 10.0000 → `9.8031` (= 10" − 0.1969"). DTG tracks the encoder live. PASS.
- **AC11.4** 6► advances to next step — `07-run-dtg-step2.png`: step 2 target X30 → DTG X=`29.8031` (30" − live 0.1969"), Y/Z=0.0000. Re-targets correctly. PASS.
- **AC11.5** SDM LED glows — `05-run-sdm-led.png` (`led-sdm` lit, visible in 04/06/07). PASS.
- **AC11.6** C exits — `08-exited-idle.png`. PASS.

## Verdict rationale
Live DTG tracking is convincing: the remaining distance shrinks as you jog toward the target, and 6► re-targets to step 2's programmed value. The recalled coordinates match what US-010 programmed — confirming Program and Run share the retained `sdmPoints` store. SDM LED correctly lit throughout. Approve.

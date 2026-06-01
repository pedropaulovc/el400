# US-046 Self-Diagnostics Mode — Demo Review

**Verdict: APPROVE** (post-#247 re-demo — flipped from REJECT; the implementation defect is fixed and verified in the ticking source where it lived)

Re-demo build: main @ `fc40f5d` (fix #247 merged). Driver `us046.mjs`, real UI. The fix gates the memory/display/keyboard steps and the exit latch on real front-panel `KEY_*`/`BTN_*` presses; only the encoder step still consumes `MILL_STATE_CHANGED` ticks. All three previously-failing symptoms are now proven fixed **in `?source=debug` with 100ms ticks flowing and live X jogging between key presses** — the debug panel shows X advancing 10→20→30→38mm, proving ticks were active the whole time.

## Fixed defects — verified under live ticks (`?source=debug`)
- **Bug 1 — AC46.2 (rAmPASS dwells):** `02-debug-rampass-dwells-under-ticks.png` — DRO holds `rAmPASS` while the debug panel reads X=10.000mm (10 ticks + jog elapsed, no skip). PASS.
- **Bug 1 — AC46.3 (segment test dwells):** `04-debug-display-dwells-under-ticks.png` — all rows `88888888` while X=20.000mm. The lamp test no longer races past. PASS.
- **Bug 3 — AC46.4 (keyboard echo survives):** `06-debug-keyboard-echo-survives-ticks.png` — echo `5.0000` persists while X=30.000mm (previously blanked on the next tick). PASS.
- **Bug 2 — AC46.6/46.7 (double-C exit completes):** `07-debug-one-c-armed.png` (first C → back to `rAmPASS`, armed) → `08-debug-double-c-exit-idle.png` (after 8 ticks + jog, second C **exits to the numeric readout** `1.4961` = X=38.000mm). The exact scenario that previously hung now completes. PASS.

## Still-working ACs (fix didn't regress them)
- **AC46.5 encoder verification:** `09`–`12` — per-axis X/Y/Z labels appear only after that axis actually moves (`10-debug-encoder-x-ok.png` shows the `X` label after a real X jog). The encoder step correctly still consumes ticks. PASS.
- **AC46.1 entry / AC46.6 single-C step exit:** still function (`01`, `07`). PASS.

## Tick-free contrast (`?source=manual`)
`14`–`17` keep the original happy path as the reference (rAmPASS → `88888888` → echo `7` → clean `C C` to idle). Post-fix, `?source=debug` now matches this reference — which was the whole point.

## Verdict rationale
The original REJECT was because the self-test's RAM-pass/lamp-test screens flashed past and the exit hung on any connected/live machine — exactly the technician's troubleshooting scenario. Fix #247 closes all three symptoms of the single root cause (ticks in any non-encoder step are now no-ops), and the re-demo proves each fix in the ticking source with the debug panel independently confirming ticks were live (X moving) throughout. The feature is now usable on a connected unit. APPROVE.

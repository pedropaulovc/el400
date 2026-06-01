# US-046: Self-Diagnostics Mode — Demo Walkthrough (RE-DEMO, fix #247 verified)

Manual §11.1. Enter the built-in self-test by pressing `▲` (the `8` key) during the
boot/version message, then walk memory → display → keyboard → encoder, exiting with a
double `C`.

**This is the re-demo after fix #247** (`fix(US-046): gate diagnostics memory/display
steps on front-panel keys`). The original demo phase found that, in any *connected*
source, the memory and display steps advanced on **any** event — and a connected
adapter broadcasts `MILL_STATE_CHANGED` every 100 ms (`?source=debug`), so a single
`▲` raced straight past `rAmPASS` and the segment test, the double-`C` exit could
never complete, and the keyboard echo blanked. The fix gates the
memory/display/keyboard steps (and the exit latch) on real front-panel `KEY_*`/`BTN_*`
presses; only the encoder step still consumes ticks.

This walkthrough proves all three fixed behaviours **in `?source=debug` itself** — the
ticking source where they were broken — by letting the 100 ms ticks flow **and jogging
the X axis** between/around key presses, then checking the readout dwells / the gesture
completes. The tick-free `?source=manual` happy path is kept at the end for contrast.

- **Driver:** [`../../scripts/us046.mjs`](../../scripts/us046.mjs) · **Log:** [`driver-log.json`](driver-log.json)
- **Build:** main @ `fc40f5d` (fix #247 merged).

## Fix proven under live ticks (`?source=debug`)

| Bug / AC | Action | DRO showed | Shot |
|---|---|---|---|
| 46.2 | `▲` at boot → memory step | **`rAmPASS`** | `01-debug-mem-rampass.png` |
| **Bug 1** 46.2 | hold: **10 ticks + live X jog**, no key | still **`rAmPASS`** (no skip) | `02-debug-rampass-dwells-under-ticks.png` |
| 46.3 | real key (`5`) advances | **`88888888`** all rows (segment test) | `03-debug-display-test.png` |
| **Bug 1** 46.3 | hold: **10 ticks + live X jog**, no key | still **`88888888`** (no skip) | `04-debug-display-dwells-under-ticks.png` |
| 46.4 | real key advances to keyboard step | **`PrESS`** | `05-debug-keyboard-prompt.png` |
| **Bug 3** 46.4 | press `5`, then **10 ticks + jog** | echo **`5`** survives (does not blank) | `06-debug-keyboard-echo-survives-ticks.png` |
| **Bug 2** 46.6 | first `C` | back to memory **`rAmPASS`** (exit armed) | `07-debug-one-c-armed.png` |
| **Bug 2** 46.7 | **8 ticks + jog**, then second `C` | exits to **numeric readout** `1.4961` | `08-debug-double-c-exit-idle.png` |

In shot `02` the debug panel reads X = 10.000 mm and `08` reads X = 38.000 mm — proof
that real encoder motion (and therefore the 100 ms `MILL_STATE_CHANGED` ticks) was
flowing the whole time, yet the diagnostic steps held and the exit completed. Before
#247 each of these three rows failed in `?source=debug`.

## Encoder step still works (AC 46.5)

| Action | DRO showed | Shot |
|---|---|---|
| key-walk to encoder step | `EnCodEr` (awaiting motion) | `09-debug-encoder-awaiting.png` |
| jog X | X row → **`X`** | `10-debug-encoder-x-ok.png` |
| jog Y | Y row → **`Y`** | `11-debug-encoder-y-ok.png` |
| jog Z | Z row → **`Z`** | `12-debug-encoder-z-ok.png` |
| `C C` from encoder path | exits to numeric readout `0.0394` | `13-debug-encoder-exit-idle.png` |

The encoder step is the one step that *should* consume `MILL_STATE_CHANGED`; each axis
label appears only after that axis actually moves, and the double-`C` exit also
completes cleanly from here.

## Contrast: tick-free `?source=manual` happy path

| Action | DRO showed | Shot |
|---|---|---|
| `▲` at boot | `rAmPASS` | `14-manual-mem-rampass.png` |
| key | `88888888` segment test | `15-manual-display-test.png` |
| key → keyboard, press `7` | echo `7` | `16-manual-keyboard-echo-7.png` |
| `C C` | exits to idle `0.0000` | `17-manual-double-c-exit-idle.png` |

Manual mode always behaved correctly (no ticks to race); it is kept as the reference
for what the user should see. Post-fix, `?source=debug` now matches it.

## Result
All three defects fix #247 addresses are confirmed fixed on the real UI in the ticking
source where they lived:
1. **AC 46.2 / 46.3** — `rAmPASS` and the segment test now DWELL under 100 ms ticks +
   live jogging; only a real key advances. No more auto-skip on a connected machine.
2. **AC 46.7** — the double-`C` exit completes under ticks (latch no longer disarmed by
   `MILL_STATE_CHANGED`), landing on the numeric readout.
3. **AC 46.4** — the keyboard echo survives ticks instead of blanking.

AC 46.5 (encoder verification) and the AC 46.6 single-`C` step exit continue to work.
The earlier "REJECT" finding is resolved.

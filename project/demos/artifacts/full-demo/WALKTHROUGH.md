# EL400 DRO Simulator — Full End-to-End Demo Walkthrough

A single, coherent product walkthrough driven entirely through the **real UI** —
DOM clicks and keyboard only. No injected state, no faked localStorage, no route
interception. Each step records what the operator did and what the DRO showed.
Display values are read from the live screen-reader axis cells (`axis-value-x/y/z`),
which mirror the seven-segment readout exactly; screenshots capture the rendered
panel (and, in debug mode, the in-browser control panel on the right).

- **Driver:** [`driver.mjs`](driver.mjs) (Playwright, headless Chromium 1600×1000)
- **Raw log:** [`driver-log.json`](driver-log.json)
- **Build:** final `main` @ `6eecfc0` (all 16 stories merged)
- **Sources used:** `?source=manual` (NoOp — pure DRO/menu flows), `?source=debug`
  (in-browser DebugServer with jog/probe controls — anything needing motion or probe)

---

## 1. Boot → Idle readout

The DRO powers on and shows its identity, then settles into the three-axis readout.

| Step | Action | DRO showed | Shot |
|---|---|---|---|
| Power on | load `?source=manual` | X `EL400`, Y `vEr 1.0.0` | `01-boot-message.png` |
| Boot completes (~1s) | wait | X/Y/Z `0.0000` (idle readout) | `02-idle-readout.png` |

## 2. Core DRO operations (real motion via `?source=debug`)

The debug control panel's jog buttons drive a real in-browser encoder, so the
readout reflects genuine machine motion.

| Step | Action | DRO showed | Shot |
|---|---|---|---|
| Connected idle | load `?source=debug` | `0.0000` all axes | `03-debug-idle.png` |
| Jog | X+5, Y+3, Z−2 (1 mm steps) | X `0.1969`, Y `0.1181`, Z `−0.0787` (inch) | `04-jogged-position.png` |
| Select X | tap X axis button | X highlighted | `05-x-selected.png` |
| Zero X | tap X₀ | X `0.0000`; Y/Z keep offset | `06-x-zeroed.png` |
| HALF on X | jog X out, select X, tap ½ | X halved `0.1575`→`0.0787` | `07-half-x.png` |
| Zero all | X₀, Y₀, Z₀ | all `0.0000` | `08-zero-all.png` |
| ABS↔INC | tap Abs/Inc | `inc` LED lit | `09-inc-mode.png`, `10-abs-mode.png` |
| inch↔mm | tap unit toggle | units LED flips | `11-unit-toggled.png` |

## 3. Setup menu — full walk

Wrench → `SELECt` prompt → choose axis X → step the whole §6.2 parameter list with
▲ (key 8). Every config parameter renders its faithful seven-segment label.

| Shot | Parameter (X label) |
|---|---|
| `12-setup-select.png` | `SELECt` prompt |
| `13-setup-param-counting.png` | counting mode `LinEAr` |
| `14-setup-walk-enf.png` | encoder-fail `EnF oFF` |
| `15-setup-walk-beep.png` | keypad beep `bEEP on` |
| `16-setup-walk-scale-res.png` | scale resolution `SC 5.0` |
| `17-setup-walk-display-res.png` | display resolution `dP 5.0` |
| `18-setup-walk-taper.png` | taper axis `tAPEr X` |
| `19-setup-walk-direction.png` | direction `LEFt` |
| `20-setup-walk-z-depth.png` | Z depth sense `dEP nEG` |
| `21-setup-walk-zero-approach.png` | near-zero warning `bU22 oF` |
| `22-setup-walk-bp-dist.png` | approach distance `bP .002` |
| `23-setup-walk-bp-tolr.png` | departure tolerance `tL .000` |
| `24-setup-walk-measurement-mode.png` | radius/diameter `rAd` |
| `25-setup-walk-probe-type.png` | probe DRO type `dro t` |
| `26-setup-walk-keypad-lock.png` | keypad lock `LoC oFF` |
| `27-setup-walk-sleep-timer.png` | sleep timer `SLP oFF` |
| `28-setup-walk-restore.png` | restore defaults `rSt oEm` |
| `29-setup-walk-oem-mode.png` | OEM mode `oEm mod` |
| `30-setup-walk-save-changes.png` | save changes `SAU ChG` |
| `31-setup-walk-end.png` | `End` |

### 3a. Choice cycling
Wrap back to the first item and cycle the counting mode left/right.

| Action | DRO showed | Shot |
|---|---|---|
| ▲ wraps to first item | `LinEAr` | `32-setup-back-to-counting.png` |
| ► cycle choice | `AnGULAr` | `33-setup-counting-angular.png` |

### 3b. Change → SAV CHG → power-cycle → persisted
SC (scale resolution) is a **draft-only** parameter: it is written to nvMem only on
`SAV CHG`. We change it, save, reload the page (a real power-cycle), and confirm it
seeded back from persistence.

| Action | DRO showed | Shot |
|---|---|---|
| At SC | `SC 5.0` (seeded) | `34-sc-before.png` |
| ►► cycle (draft) | `SC 20.0` | `35-sc-changed-draft.png` |
| Navigate to SAV CHG | `SAU ChG` | `36-sav-chg-row.png` |
| ENT → save confirm | `StorEd` | `37-sav-chg-stored.png` |
| **Reload page**, re-enter setup, go to SC | `SC 20.0` (persisted!) | `38-sc-after-reload.png` |

## 4. OEM chain — define baseline → diverge → restore (the finale)

The newest, riskiest interrelated chain: capture the live config as an OEM baseline,
change a setting away from it, then restore back to the baseline.

| Step | Action | DRO showed | Shot |
|---|---|---|---|
| Set EnF on | at `EnF`, cycle to on | `EnF on` | `39-oem-enf-initial.png`, `40-oem-enf-on.png` |
| OEM row | navigate to `oEm mod` | `oEm mod` | `41-oem-row.png` |
| ENT → password gate | type **3 5 7 2 6** | `PASS` (digits never echoed) | `42-oem-password-prompt.png` |
| ENT → OEM mode | correct code accepted | `oEm` | `43-oem-entered.png` |
| ENT → store baseline | captures live config (incl. EnF on) | `StorEd` | `44-oem-baseline-stored.png` |
| **Diverge** | go to EnF, cycle to off | `EnF oFF` | `45-oem-enf-off.png` |
| Restore row | navigate to `rSt oEm` (separate, non-password row) | `rSt oEm` | `46-restore-row.png` |
| ENT → restore runs | in-progress dwell | `In ProG` | `47-restore-in-progress.png` |
| Restore completes | back to idle, axes `0.0000` | idle | `48-restore-complete.png` |
| **Verify** | re-enter setup, check EnF | **`EnF on`** (restored to baseline!) | `49-restore-verified-enf-on.png` |

The restore returned EnF to the captured baseline value (`on`), not the factory
default (`off`) — proving the OEM-baseline path (US-044 → US-028) end to end. A
factory-fallback restore (no baseline → factory defaults) is the same `rSt oEm` row
when `oemDefaults` is null; here a baseline existed, so the baseline path is shown.

## 5. Feature sampling

### 5a–b. SDM — program a sub-datum, then run/recall it
Direct-entry programming of step 1, then Run shows live distance-to-go to it.

| Step | Action | DRO showed | Shot |
|---|---|---|---|
| SDM menu | tap SDM (intro → menu) | `LEArn` | `50-sdm-menu.png` |
| To Program | ►► | `ProGrAn` | `51-sdm-program-menu.png` |
| Step prompt | ENT | `StEP` / `1` | `52-sdm-step-prompt.png` |
| Enter X10 Y20 Z5 | ENT, type each axis | step 1 stored | `53-sdm-programmed.png` |
| Run menu | SDM → ► | `rUn` | `54-sdm-run-menu.png` |
| Run step 1 | ENT, ENT | DTG **X `10.0000` Y `20.0000` Z `5.0000`** | `55-sdm-run-step.png`, `56-sdm-run-dtg.png` |

The recalled DTG (target − live position, mill at origin) exactly matches the
programmed point — Run reads the same retained `sdmPoints` that Program wrote.

### 5c. Calculator — 12 + 8 = 20
Real keypad order: first operand → ENT → Y selects operation → second operand → ENT.

| Action | DRO showed | Shot |
|---|---|---|
| Enter calculator | tap calc | X `0.0000` | `57-calc-idle.png` |
| `12` ENT, Y→ADD | first stored, op selected | X `12.0000`, Y `Add` | `58-calc-add-op.png` |
| `8` ENT | compute | **X `20.0000`** | `59-calc-result.png` |

### 5d. Center finding — line (two points)
FUNCTION → `CEntrE` → ENT, jog to each edge and capture with ► ; result is the DTG to
the midpoint.

| Action | DRO showed | Shot |
|---|---|---|
| FUNCTION menu | tap Fn | `CEntrE` | `60-function-menu.png` |
| Collecting point 1 | ENT | live position | `61-center-point1-await.png` |
| Jog to edge 1, capture | X+4, ► | edge 1 `0.1575` | `62-center-edge1.png`, `63-center-point2-await.png` |
| Jog to edge 2, capture | X+8 more, ► | edge 2 `0.4724` | `64-center-edge2.png` |
| Result (DTG to midpoint) | — | X `−0.1575` | `65-center-result.png` |

Midpoint of edges 0.1575 and 0.4724 is 0.315; DTG from the current edge (0.4724) is
0.315 − 0.4724 = **−0.157** — correct.

### 5e. Bolt-hole (PCD) pattern
| Action | DRO showed | Shot |
|---|---|---|
| Bolt-hole intro | tap bolt-circle | `b hoLE` | `66-bolt-hole-intro.png` |
| Auto-advance to entry | wait | `CirCLE` sub-menu | `67-bolt-hole-entry.png` |

### 5f. Grid drilling pattern
| Action | DRO showed | Shot |
|---|---|---|
| Grid intro | tap grid | `Grid` | `68-grid-intro.png` |
| Auto-advance to entry | wait | Y `EntCnt0` (count entry) | `69-grid-entry.png` |

### 5g. Self-diagnostics (▲ during boot)
Static steps shown in `?source=manual` (stable), encoder step in `?source=debug`
(needs real motion — see Observations for why the split is necessary).

| Action | DRO showed | Shot |
|---|---|---|
| ▲ during boot → RAM check | `rAmPASS` | `70-diag-mem.png` |
| any key → display test | `88888888` all rows | `71-diag-display.png` |
| any key → keyboard test | `PrESS` | `72-diag-keyboard.png` |
| press `7` → echo | `7` | `73-diag-keyboard-echo.png` |
| (debug) encoder test | `EnCodEr` | `74-diag-encoder.png` |
| jog X → axis responds | `X` label | `75-diag-encoder-x.png` |
| CC → exit to idle | idle | `76-diag-exit.png` |

### 5h. Keypad lock (`LoC on`)
Lock the panel, prove a keypress is a no-op, prove the readout still tracks the
encoder, and prove setup is still reachable to unlock.

| Action | DRO showed | Shot |
|---|---|---|
| Set LoC on (in setup) | — | `LoC on` | `77-keypad-lock-on.png` |
| Exit setup, try ZERO X (locked) | X stays `0.2362` (no-op) | `78-keypad-lock-blocked.png` |
| Jog while locked | readout tracks → `0.2756` | `79-keypad-lock-readout-live.png` |
| Wrench still works | `SELECt` (setup reachable) | `80-keypad-lock-setup-reachable.png` |

### 5i. Touch probe — Edge function
The `prb` indication lights only inside an active probe function (AC 32.8): toggling
the debug probe at idle does **not** light it. We enter the Edge probe, arm on X, then
trigger contact.

| Action | DRO showed | Shot |
|---|---|---|
| Probe toggle at idle | `prb` stays off (`led-probe`=false) | — |
| FUNCTION → ProbE | `ProbE` | `81-probe-function.png` |
| ENT → sub-function | `Prob Ed` (Edge) | `82-probe-edge-menu.png` |
| ENT, select X → armed | live position | `83-probe-waiting.png` |
| Trigger debug probe | **`prb` LED lit** (`led-probe`=true) | `84-probe-triggered.png` |
| C → exit | idle | `85-probe-exit.png` |

---

## Observations (where the real UI felt off / surprises worth a look)

1. **Self-diagnostics RAM-pass & display-test steps are skipped in any connected
   source.** The `diagnostics-memory` and `diagnostics-display` steps advance on
   *any* event, and `DebugServer` broadcasts `MILL_STATE_CHANGED` every 100 ms
   (`DebugServer.startBroadcasting`). So in `?source=debug` (and presumably any live
   CNCjs/mock source with position ticks), a single ▲ press lands directly on the
   keyboard step (`PrESS`) within ~120 ms — the operator never sees `rAmPASS` or the
   segment test. They're only observable in `?source=manual` (NoOp, no ticks), where
   conversely the encoder test can't show motion. This is the main reason the demo
   splits self-diagnostics across two sources. Worth deciding whether the
   memory/display steps should gate on front-panel keys only (like the keyboard step
   does for ENT) so a moving machine doesn't fast-forward the self-test.

2. **Calculator operand order is non-obvious.** The working keypad sequence is
   *first operand → ENT → Y (select op) → second operand → ENT*. Selecting the
   operation (Y) *before* confirming the first operand with ENT silently resets the
   first value, yielding a wrong result (e.g. `12 Y(ADD) ENT 8 ENT` returns 8, not 20).
   The spec's e2e uses a `window.enterValue()` helper that hides this; through the raw
   keypad the ordering trap is real. Faithful to the device per the manual, but a
   first-time operator could be surprised.

3. **No dedicated ZERO-ALL control.** There is no single "zero all axes" button on the
   panel — the demo zeroes X, Y, Z individually. If the real EL400 has a ZERO-ALL key,
   the simulator doesn't expose one (no `axis-zero-all` testid / button).

4. **Debug control panel overlaps the simulator at narrow viewports.** The fixed 320 px
   debug panel covers the secondary-function buttons (SDM/calculator/probe) below
   ~1600 px wide, intercepting clicks. Not a product defect, but anyone driving debug
   mode on a small window will find those buttons unclickable. A responsive layout (or
   making the panel a collapsible drawer that reflows the simulator) would help.

5. **Everything else behaved exactly to spec** — boot, core DRO ops with live motion,
   the full setup walk, draft/SAV-CHG persistence across a real reload, the complete
   OEM define→diverge→restore chain, SDM program/run, center-finding math, patterns,
   keypad lock semantics (input gated, readout live, unlock reachable), and the
   probe-triggered indication.

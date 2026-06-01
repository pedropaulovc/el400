# US-011: SDM Recall (Run Mode) — Demo Walkthrough

Manual §8.2.3. Recall stored sub-datum points: select a step, see the live
**distance-to-go** to it, and watch it track the machine as you jog toward zero.
`?source=debug` so the jog buttons drive a real encoder and the DTG updates live.

Setup programs two points first (the recall needs something to read): step 1
`X10 Y20 Z5`, step 2 `X30 Y0 Z0`. Display unit is inch, so 1 mm of jog ≈ 0.0394".

- **Driver:** [`../../scripts/us011.mjs`](../../scripts/us011.mjs) · **Log:** [`driver-log.json`](driver-log.json)

| AC | Action | DRO showed | Shot |
|---|---|---|---|
| setup | program steps 1 & 2, exit | idle `0.0000` | `01-after-programming.png` |
| 11.1 | SDM → `►` to `rUn` | `rUn` | `02-sdm-menu-run.png` |
| 11.1 | `ENT` | run step-select | `03-run-step-select.png` |
| 11.2 | (start at step 1) | `rUn` / Y=`1` | `03-run-step-select.png` |
| 11.3 | `ENT` | DTG **X `10` Y `20` Z `5`** (target − origin) | `04-run-dtg-step1.png` |
| 11.5 | — | **SDM LED glows** (`led-sdm`=true) | `05-run-sdm-led.png` |
| 11.3 (live) | jog X +5 mm | DTG X `10.0000` → **`9.8031`** (shrinks) | `06-run-dtg-after-jog.png` |
| 11.4 | `6►` | step 2; DTG **X `29.8031`** (target 30 − live) | `07-run-dtg-step2.png` |
| 11.6 | `C` | exits to idle | `08-exited-idle.png` |

The distance-to-go is the stored sub-datum minus the live machine position, refreshed
on every encoder tick — exactly what an operator drives to zero per step. Jogging X by
5 mm dropped the X DTG by ~0.197" (10 → 9.8031), and `6►` re-targeted to step 2's
`X30` (29.8031 from the now-offset position). The recalled values match what US-010
programmed, confirming Program and Run share the same retained `sdmPoints` store.

## Observations
- Run mode behaved exactly to spec; the live DTG tracking is convincing and the SDM
  LED is correctly lit throughout the operation.
- The DTG sign is positive ("distance remaining to reach the point"), consistent with
  the spec's note that the convention may be ±; here it counts down toward zero as you
  approach, which is the intuitive operator behaviour.

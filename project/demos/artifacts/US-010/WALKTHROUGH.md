# US-010: SDM Direct Entry (Program Mode) — Demo Walkthrough

Manual §8.2.1. Program sub-datum points by typing coordinates directly, advancing
through steps with `6►`, and jumping to a specific step with `Y`. All input through
the real keypad; no machine motion needed, so `?source=manual`.

- **Driver:** [`../../scripts/us010.mjs`](../../scripts/us010.mjs) · **Log:** [`driver-log.json`](driver-log.json)

| AC | Action | DRO showed | Shot |
|---|---|---|---|
| setup | boot → idle | `0.0000` ×3 | `01-idle.png` |
| 10.1 | SDM (intro→menu) | `LEArn` | `02-sdm-menu-learn.png` |
| 10.1 | `►►` to Program | `ProGrAn` | `03-sdm-menu-program.png` |
| 10.1 | `ENT` | step prompt | `04-step-prompt.png` |
| 10.2 | — | **`StEP`** / Y=`1` | `04-step-prompt.png` |
| 10.3 | `ENT` → edit X | X editing `0.0000` | `05-step1-edit-x.png` |
| 10.3 | type `50` | X `50.0000` | `06-step1-x-50.png` |
| 10.3 | `ENT`, `25`, `ENT`, `10` | X `50` Y `25` Z `10` | `07-step1-coords.png` |
| 10.3 | `ENT` (confirm Z) | back at step view, step 1 stored | `08-step1-stored.png` |
| 10.4 | `6►` | advances to **step 2** (`StEP` / `2`) | `09-step2-view.png` |
| 10.4 | program X=100 on step 2 | step 2 stored | `10-step2-stored.png` |
| 10.5 | `Y` (jump prompt) | jump prompt open | `11-jump-prompt.png` |
| 10.5 | type `5` | Y shows `5` | `12-jump-typed-5.png` |
| 10.5 | `ENT` | jumped to **step 5** (`StEP` / `5`) | `13-jumped-step5.png` |
| 10.6 | `C` | exits to idle | `14-exited-idle.png` |

The per-axis entry screen shows the value taking shape (X `50`, then Y `25`, Z `10`)
before it is committed; `6►` walks the step pointer forward (1→2); `Y`+number+`ENT`
jumps directly to an arbitrary step (2→5). These coordinates persist in the shared
`sdmPoints` store and are what US-011 (Run) recalls.

## Observations
- Program mode behaved exactly to spec across all six ACs. The step counter and
  per-axis coordinate entry are clear and the jump-to-step affordance works.
- Minor naming note: the manual/spec call the prompt `StEPno`; the panel renders
  `StEP` with the step number on the Y window — a faithful seven-segment rendering
  of the same prompt.

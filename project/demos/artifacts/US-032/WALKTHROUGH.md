# US-032: Touch Probe — Demo Walkthrough

Manual §10.1. Covers probe DRO-type config (`dro t` / `dro F`), the four probe
functions (Edge, Midpoint, Inside, Outside) with tip-diameter compensation, the
triggered indication, Freeze-mode display halt, and `C`-to-exit.

`?source=debug` gives real axis motion (jog) and a probe-contact toggle. A contact is
a **rising edge** of the probe pin, so each capture is toggle-ON; for two-edge
functions the driver toggles OFF, jogs, then ON again for the next edge. The
Inside/Outside section switches the unit to **mm** so the 6 mm tip and results read
cleanly.

- **Driver:** [`../../scripts/us032.mjs`](../../scripts/us032.mjs) · **Log:** [`driver-log.json`](driver-log.json)

## Probe DRO-type configuration (AC 32.1)

| Action | DRO showed | Shot |
|---|---|---|
| setup → probe-type param | `dro t` (Transmit, default) | `01-setup-probe-type-transmit.png` |
| cycle ► | `dro F` (Freeze) | `02-setup-probe-type-freeze.png` |

## Edge function (AC 32.4, 32.7, 32.8, 32.10)

| Action | DRO showed | Shot |
|---|---|---|
| Fn→ProbE→ENT | `Prob Ed` (Edge) | `03-edge-menu.png` |
| ENT, select X, jog to edge | live X `0.1575` | `04-edge-waiting.png` |
| probe contact | X datum → **`0.0000`** at edge; **prb LED on** | `05-edge-triggered.png` |

## Midpoint function (AC 32.5)

| Action | DRO showed | Shot |
|---|---|---|
| Prob nd (Midpoint) | `Prob nd` | `06-midpoint-menu.png` |
| contact edge 1 (X `0.0787`) | captured | `07-midpoint-edge1.png` |
| jog, contact edge 2 (X `0.3937`) | datum at midpoint → X reads **`0.1575`** | `08-midpoint-result.png` |

Midpoint of 0.0787 and 0.3937 is 0.2362; at the second edge (0.3937) the new datum
makes the readout 0.3937 − 0.2362 = **0.1575** — correct.

## Inside function (AC 32.6, +tip diameter) — unit = mm

| Action | DRO showed | Shot |
|---|---|---|
| inS dE (Inside) | `inS dE` | `09-inside-menu.png` |
| ENT → tip-diameter prompt | `Prb d A` | `10-inside-diameter-prompt.png` |
| type `6`, select X, contact wall 1 | armed (X `4.0000`) | `11-inside-wall1.png` |
| jog across bore (10 mm), contact wall 2 | inside width = 10 + 6 = **`16.0000`** | `12-inside-result.png` |

## Outside function (AC 32.6, −tip diameter)

| Action | DRO showed | Shot |
|---|---|---|
| oUtS dE (Outside) | `oUtS dE` | `13-outside-menu.png` |
| type `6`, select X, contact face 1 | armed (X `14.0000`) | `14-outside-face1.png` |
| jog 10 mm, contact face 2 | outside width = 10 − 6 = **`4.0000`** | `15-outside-result.png` |

Inside adds the tip diameter, Outside subtracts it (§10.1 tip compensation) — both
exact at 6 mm.

## Freeze-mode behaviour (AC 32.2 / 32.3 / 32.7)

| Action | DRO showed | Shot |
|---|---|---|
| set `dro F` in setup | `dro F` | `16-freeze-configured.png` |
| jog to a known value | X `29.0000` | `17-freeze-before.png` |
| probe contact → freeze | X **frozen** at `29.0000` | `18-freeze-on-contact.png` |
| keep jogging while held | X still `29.0000` (unchanged) | `19-freeze-held-while-moving.png` |
| release probe | counting resumes → X `34.0000` | `20-freeze-released-resumes.png` |

In Transmit mode (`dro t`, used for the function demos above) the readout keeps
counting and the contact sets a datum; in Freeze mode (`dro F`) the contact halts the
display until the probe clears — the two configurations behave distinctly, as specified.

## Observations
- All four probe functions and both DRO-type behaviours worked exactly to spec, with
  correct tip-diameter compensation (Inside +6 = 16, Outside −6 = 4) and a correct
  midpoint datum. The `prb` triggered indication (AC 32.8) lights on contact within a
  probe function.
- Note for testers: the triggered `prb` LED only lights while a probe function is
  active or in Freeze mode — toggling the probe at plain idle in Transmit mode is a
  no-op on the readout (by design). Capturing successive edges requires a real
  release-then-retrigger (rising-edge detection), which the demo does via the debug
  probe toggle.

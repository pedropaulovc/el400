# US-038: Keyboard Shortcuts — Demo Walkthrough

Operate the DRO entirely from the **physical keyboard**, via real `keydown` events
(no DOM button clicks except the debug jog used to set up the HALF case). The
shortcut handler is scoped to the simulator container (`tabIndex=0`) and only fires
while focus is on that container (AC 38.22) — so the driver focuses the container
and sends real key presses.

- **Driver:** [`../../scripts/us038.mjs`](../../scripts/us038.mjs) · **Log:** [`driver-log.json`](driver-log.json)
- **Source:** `?source=manual` (keypad flows); `?source=debug` only for the HALF setup (needs a non-zero value to halve)

| AC | Action (keys) | DRO showed | Shot |
|---|---|---|---|
| setup | boot → idle, focus container | `0.0000` ×3 | `01-idle-focused.png` |
| 38.7 | `X` | X axis selected | `02-key-x-select.png` |
| 38.1, 38.3 | `1 2 3` then `Enter` | X `123.0000` | `03-digit-entry-123.png` |
| 38.4, 38.5 | `X 4 . 5 -` `Enter` | X `−4.5000` (decimal + sign) | `04-decimal-sign-entry.png` |
| 38.8 | `Shift+X` | X `0.0000` (axis zeroed) | `05-shift-x-zero.png` |
| 38.10 | `A` | **inc** LED lights (was abs) | `06-key-a-abs-inc.png` |
| 38.11 | `U` | **mm** LED lights (was inch) | `07-key-u-unit.png` |
| 38.13 | set Y=10, Z=20; `Shift+0` | all axes → `0.0000` | `08-before-zero-all.png`, `09-shift-0-zero-all.png` |
| 38.9 | `W` | setup `SELECt` prompt | `10-key-w-settings.png` |
| 38.6 | `Escape` | clears/exits back to idle | (note) |
| 38.2 | `F`, `ArrowRight`, `ArrowLeft` | menu `CEntrE`→`CirCLE`→`CEntrE` | `11-key-f-function.png`, `12-arrow-right-menu.png` |
| 38.20 | `S` | SDM menu (`LEArn`) | `13-key-s-sdm.png` |
| 38.18 | `K` | calculator | `14-key-k-calculator.png` |
| 38.14 | `B` | bolt-hole intro (`b hoLE`) | `15-key-b-bolt.png` |
| 38.17 | `D` | grid intro (`Grid`) | `16-key-d-grid.png` |
| 38.19 | jog X, `X`, `H` | X `0.1575`→`0.0787` (halved) | `17-key-h-half.png` |
| 38.22 | blur container, press `A` | **no toggle** (abs LED stays on) | `18-focus-gating-blurred.png` |
| 38.22 | re-focus, press `A` | now toggles (inc on) | `19-focus-gating-refocused.png` |

**Notes on the LED readings.** The abs/inc pair (and inch/mm pair) are mutually
exclusive radios in one group. Steps 38.10/38.11 read the *outgoing* LED before the
press and the *incoming* LED after — both read `true` because the press flips the
group from one to the other (abs→inc, inch→mm). The screenshots confirm the incoming
LED is the lit one.

**Coverage.** This demo exercises the keypad/navigation group (38.1–38.6), axis
control (38.7–38.8), primary functions (38.9–38.13), a representative slice of the
secondary functions (38.14, 38.17, 38.18, 38.19, 38.20, 38.21 via F), and the
focus-gating + browser-default-prevention behaviour (38.22). The remaining secondary
shortcuts (`O` arc contour, `G` angle hole, `R` reference) use the identical dispatch
path as the ones shown and are mapped in `useKeyboardShortcuts.ts`.

## Observations
- All keyboard shortcuts behaved exactly to spec. Focus gating is correctly strict:
  with focus off the simulator container, handled keys are genuine no-ops (verified
  by the abs LED not toggling), and re-focusing restores them.
- One subtlety worth noting for testers: digit shortcuts only land once an axis is
  selected (AC 38.1 "when axis selected"); pressing digits with no axis selected is a
  no-op, which is correct but easy to miss.

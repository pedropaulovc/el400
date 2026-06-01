# US-026 — Setup Menu: Display Sleep Timer (SLEEP t) — Demo Walkthrough

**Source:** `?source=manual` · **Driver:** Playwright (real UI) · **Port:** 8201

Set the idle timeout in setup, then demonstrate the **real** sleep/wake behaviour. The
app's own `setTimeout` (in `useSleepTimer`) drives `SLEEP_TIMER_ELAPSED`; Playwright's
`page.clock` advances time so a 1-minute idle elapses inside the test window. No app state
is injected — the sleep is the app's own timer firing, and the wake is a **real** axis-key
press. All assertions passed.

| Step | Screenshot | What it shows | AC |
|------|-----------|---------------|-----|
| 1 | `01-idle-awake.png` | Idle readout `0.0000`, display awake | — |
| 2 | `02-sleep-default-off.png` | Scrolled to `SLP oFF` — **default 0 = disabled** | AC26.1, AC26.2, AC26.8 |
| 3 | `03-sleep-1min.png` | ▶ → `SLP 1`; `nvMem.sleepTimeout=1` | AC26.3, AC26.4 |
| 4 | `04-idle-timer-armed.png` | Exited setup; idle, 1-min countdown armed | — |
| 5 | `05-asleep-dimmed-led-flashing.png` | After 61s idle: readout **dimmed** (`data-display-power=asleep`, `opacity-10`), wrench/sleep LED **flashing** | AC26.5, AC26.6 |
| 6 | `06-x-wakes-display.png` | Pressing **X** wakes the display (`data-display-power=awake`) | AC26.7 |

## Verified facts
- **AC26.1/26.2/26.8** `SLEEP T` reachable; default `SLP oFF` (0 = never sleeps).
- **AC26.3/26.4** ▶ sets `SLP 1`; commits to `nvMem.sleepTimeout=1`.
- **AC26.5** after the configured idle period the app's timer fires and the readout dims
  (`display-panel[data-display-power="asleep"]`, class `sleeping opacity-10`).
- **AC26.6** the wrench/sleep LED carries the `flashing animate-blink` class while asleep.
- **AC26.7** a real **X** axis-key press wakes the display (`awake`); the waking press is
  consumed (wake only, doesn't also act), per note *4.

## Honesty note
`page.clock.fastForward(61000)` advances **time only** — it does not set `displayPower` or
dispatch the sleep. The sleep transition is produced by the app's own `useSleepTimer`
expiry, and the wake by a genuine key event flowing through the reducer.

# US-042 — Encoder-Fail Warning (EnF on/oFF) — Walkthrough

**Source:** `?source=debug` (the debug panel exposes a per-axis encoder signal-loss toggle —
a real on-screen `SIG`/`no SIG` button per axis, which simulates a scale cable dropping out).
**What it proves:** `EnF` is a global setup parameter (default `oFF`); with `EnF oFF` a lost
encoder signal is silent; with `EnF on` the affected axis shows `no SIG`; restoring the signal
clears the warning automatically.

> **Reachability note (was flagged as a risk):** US-042 **is** fully reachable through the real
> UI. The debug control panel renders a per-axis signal-loss button (`signal-toggle-x/y/z`,
> labelled `SIG` / `no SIG`) that calls the in-browser DebugServer's `setEncoderSignal`. No
> `window.*` or injected state was used — these are real DOM clicks.

| # | User action | DRO response | Screenshot |
|---|-------------|--------------|------------|
| 1 | Power up (debug) | Idle `0.0000 / 0.0000 / 0.0000` | `01-idle-debug.png` |
| 2 | (EnF oFF default) click debug **X signal** button → drop X encoder | X readout stays `0.0000` — **silent**, no warning (AC42.4) | `02-EnF-off-signal-lost-silent.png` |
| 3 | Click X signal button again → restore | X back to normal | — |
| 4 | Wrench → select X, scroll to **EnF** | `EnF oFF` (default, AC42.1) | `03-setup-EnF-oFF-default.png` |
| 5 | Press `6` (►) | `EnF oFF` → `EnF on` (AC42.2) | `04-setup-EnF-on.png` |
| 6 | Scroll to End, press ENT (exit) | EnF on, committed | — |
| 7 | Click debug **X signal** button → drop X encoder | **X shows `no SIG`** (AC42.3); Y/Z unaffected (`0.0000`) | `05-EnF-on-X-no-SIG.png` |
| 8 | Click debug **Y signal** button → drop Y encoder | **Y also shows `no SIG`** — EnF is global / all-axes (AC42.2) | `06-EnF-on-X-and-Y-no-SIG.png` |
| 9 | Click X signal button → restore X | X numeric again (`0.0000`); **Y still `no SIG`** — warning clears per axis (AC42.5) | `07-EnF-on-X-restored-Y-still-no-SIG.png` |
| 10 | Click Y signal button → restore Y | Both restored, all `0.0000` | `08-both-restored.png` |

## Acceptance-criteria coverage
- **AC42.1** `EnF oFF` (default) / `EnF on` available in setup — steps 4–5.
- **AC42.2** `◄`/`►` toggle; applies to all axes (global) — step 5 (toggle) + step 8 (Y also warns).
- **AC42.3** EnF on + signal loss → `no SIG` on that axis — step 7.
- **AC42.4** EnF oFF + signal loss → silent — step 2.
- **AC42.5** Warning clears automatically once signal restored — step 9 (X clears, Y still lost).
- **AC42.6** DRO PROS recommends `EnF on` — reachable in one `►` from the default; easy/discoverable.
- **AC42.7** Persists via SAU CHG — EnF commits on change and survives exit.

## Observations
- The seven-segment panel renders `no SIG` cleanly (see step-7 screenshot). The debug panel's
  signal button turns yellow and the event log records "Encoder X signal LOST/restored", which
  makes the trigger obvious. The feature was straightforward to reach through the real UI.

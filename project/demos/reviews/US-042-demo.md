# US-042 Encoder-Fail Warning (EnF) — Demo Review

**Verdict: APPROVE**

Source: `?source=debug`. Real DOM clicks on per-axis signal-loss buttons (`signal-toggle-x/y/z`) that drive the in-browser DebugServer — NOT injected `window.*` state. The previously-flagged reachability risk is resolved: the trigger is a real on-screen control.

## AC coverage
- **AC42.1** `EnF oFF` (default) / `EnF on` in setup — `03-setup-EnF-oFF-default.png` / `04-setup-EnF-on.png`. PASS.
- **AC42.2** `◄`/`►` toggle; global/all-axes — `04` (toggle) + `06-EnF-on-X-and-Y-no-SIG.png` (both X and Y warn under one global setting). PASS.
- **AC42.3** EnF on + signal loss → `no SIG` on that axis — `05-EnF-on-X-no-SIG.png`: X row shows `no SIG` on the seven-segment, Y/Z stay `0.0000`. PASS.
- **AC42.4** EnF oFF + signal loss → silent — `02-EnF-off-signal-lost-silent.png`: X signal LOST (event log) but DRO readout stays `0.0000`, no warning. PASS. (Strong: shows the *negative* path before turning the feature on.)
- **AC42.5** Warning clears automatically on signal restore — `07-EnF-on-X-restored-Y-still-no-SIG.png`: X back to `0.0000` while Y still `no SIG` — auto-clear is per-axis. PASS.
- **AC42.6** EnF on discoverable — one ► from default. PASS.
- **AC42.7** Persists via SAV CHG — narrated; generic persistence via US-027. Non-blocking.

## Verdict rationale
The full matrix is shown through real UI: silent when off, `no SIG` when on, global (both axes can warn), and per-axis auto-clear on restore. This is also the worked example consumed by the US-044/US-028 OEM chain. Approve.

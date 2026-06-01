# US-028 — Setup Menu: Restore Defaults (rSt oEm) — Demo Walkthrough

**Source:** `?source=manual` · **Driver:** Playwright (real UI) · **Port:** 8201

The marquee chain with **US-044**: define an OEM baseline (`EnF on`), change the live setting
away (`EnF off`), then `rSt oEm` → `In ProG` → settings restored to the **OEM baseline**
(`EnF` back **ON**, not the bare factory `off`). This is the consuming side of US-044 AC44.4.
All assertions passed.

| Step | Screenshot | What it shows | AC |
|------|-----------|---------------|-----|
| 1 | `01-idle.png` | Idle `0.0000` | — |
| 2 | `02-oem-baseline-enf-on.png` | OEM baseline captured with `EnF on` (via `oEm mod`, pw `3 5 7 2 6`) | (US-044 setup) |
| 3 | `03-enf-changed-off.png` | Live `EnF` changed to `EnF oFF` — diverges from the baseline | — |
| 4 | `04-rst-oem-row.png` | Scrolled to `rSt oEm` row | AC28.3 |
| 5 | `05-in-prog.png` | ENT → **`In ProG`** (restore running) | AC28.7, AC28.8 |
| 6 | `06-restore-complete-idle.png` | After the dwell → back to readout `0.0000` | AC28.9 |
| 7 | `07-enf-restored-on.png` | Re-entered setup → **`EnF on`** restored to the baseline | **AC28.10, AC44.4** |

## Verified facts
- The restore is its **own terminal row** `rSt oEm` (ENT runs it directly — no password, no
  confirm chain), per the manual §6.2 reconciliation in the story file.
- **AC28.8** `In ProG` is shown during the brief dwell (`In`, since the 7-seg font has no
  uppercase 'N').
- **AC28.9** after the dwell the display returns to the normal readout.
- **AC28.10 / AC44.4** settings are restored to the **captured OEM baseline**: `EnF` returns
  to **ON** (the baseline value) rather than the factory `off` — `nvMem.encoderFailWarning=true`
  after the restore. This proves the restore consumes the OEM baseline, not the factory defaults.
- The restore also clears user data (SDM points / tool & work offsets) per
  `restoreDefaults()`; the `EnF on` recovery is the visible, asserted proof of the baseline path.

## AC reconciliation (manual tie-breaker)
ACs 28.4–28.6 (password `3 5 7 2 6` / `3 AXIS`-`MILL`-`OPT OFF` confirm chain / separate
`SAV CHG`) conflate the **adjacent** password-protected `oEm mod` row (US-044) with the
restore row. Per el400-operation-manual §6.2 (the designated tie-breaker), `r5t oEñ` carries
**no** password marker and `oEñ ñod` does — so the password guards *defining* the baseline
(US-044), not *restoring* to it. Documented in the story file's "Notes — Manual reconciliation"
block and `demos/US-028.md`, not silently dropped.

## Honesty note
Every step is a real setup-menu action; the restore is the app's own `rSt oEm` handler. The
restored value is read from `nvMem` written by the app and re-displayed through the UI.

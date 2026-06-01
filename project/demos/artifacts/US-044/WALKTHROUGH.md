# US-044 — Setup Menu: OEM Mode (oEm mod) — Demo Walkthrough

**Source:** `?source=manual` · **Driver:** Playwright (real UI) · **Port:** 8201

Captures the current config (with `EnF on`) as the custom **OEM/default baseline** behind
the password gate, proves it persists across a real reload, and shows that a **wrong
password is rejected** (AC44.7). Marquee chain with US-028. All assertions passed.

| Step | Screenshot | What it shows | AC |
|------|-----------|---------------|-----|
| 1 | `01-idle.png` | Idle `0.0000` | — |
| 2 | `02-enf-default-off.png` | Setup → X → `EnF oFF` (factory) | — |
| 3 | `03-enf-on.png` | ▶ → `EnF on`; `nvMem.encoderFailWarning=true` | AC44.5 |
| 4 | `04-oem-mod-row.png` | Scrolled to `oEm mod` row | AC44.1 |
| 5 | `05-password-prompt.png` | ENT → `PASS` (password prompt) | AC44.2 |
| 6 | `06-wrong-password-err.png` | Typed `0 0 0 0` → **`Err`**; OEM **not** entered, `oemDefaults` still null | **AC44.7** |
| 7 | `07-back-to-oem-row.png` | `Err` auto-dismisses back to `oEm mod` | AC44.7 |
| 8 | `08-correct-password-typed.png` | ENT → `PASS`, typed `3 5 7 2 6` | AC44.2 |
| 9 | `09-in-oem-mode.png` | ENT → **`oEm`** (in OEM Mode) | AC44.2, AC44.3 |
| 10 | `10-baseline-stored.png` | ENT → **`StorEd`**; `nvMem.oemDefaults` captured (incl. `EnF on`) | AC44.3, AC44.5 |
| 11 | `11-after-reload-idle.png` | **Reloaded**; `nvMem.oemDefaults` persisted | **AC44.6** |

## Verified facts
- **AC44.1/44.2** `oEm mod` reachable; ENT prompts for a password (`PASS`).
- **AC44.7** wrong code `0000` → `Err`; OEM Mode is **not** entered and **no** baseline is
  captured (`nvMem.oemDefaults === null`) — a real gate, demonstrated before the success path.
- **AC44.2/44.3** the correct code `3 5 7 2 6` enters OEM Mode (`oEm`); ENT stores the live
  config as the baseline (`StorEd`).
- **AC44.5** the captured baseline includes `EnF on` (`oemDefaults.encoderFailWarning=true`).
- **AC44.6** the baseline survives a real `page.reload()`.

## Honesty note
The password is a real module-private gate (`OEM_PASSWORD='35726'`) — the wrong-code path is
exercised first to prove it actually blocks entry. The baseline is read from
`nvMem.oemDefaults` written by the app, observed after reload (not injected).

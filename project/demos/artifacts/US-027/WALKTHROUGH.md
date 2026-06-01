# US-027 — Setup Menu: Save Changes (SAV CHG) — Demo Walkthrough

**Source:** `?source=manual` · **Driver:** Playwright (real UI) · **Port:** 8201

Changes a **draft-only** parameter (`SC` scale resolution — it buffers in the draft and is
only written to nvMem on SAV CHG), saves it, **reloads the page (real power-cycle)**, and
shows it persisted. Then makes a second change and **exits via End without saving** to show
it is discarded (AC27.6). All assertions passed across two real reloads.

| Step | Screenshot | What it shows | AC |
|------|-----------|---------------|-----|
| 1 | `01-idle.png` | Idle `0.0000` | — |
| 2 | `02-sc-default-5.png` | Setup → X → scrolled to `SC 5.0` (factory) | — |
| 3 | `03-sc-changed-to-1.png` | ◀◀ → `SC 1.0` (draft; `nvMem` not yet written) | AC27.6 (buffer) |
| 4 | `04-sav-chg-highlighted.png` | Scrolled to `SAU ChG` | AC27.1 |
| 5 | `05-stored-confirmation.png` | ENT → **`StorEd`**; `nvMem.scaleResolution.X='1'` | AC27.2, AC27.3, AC27.4 |
| 6 | `06-after-reload-idle.png` | **Page reloaded** (power-cycle) | AC27.5 |
| 7 | `07-after-reload-sc-persisted.png` | Re-entered setup → `SC 1.0` **persisted** | **AC27.5** |
| 8 | `08-unsaved-change-sc-2.png` | ▶ → `SC 2.0` as an **unsaved** edit | — |
| 9 | `09-after-reload-discarded.png` | Exited via `End` (no save), reloaded → `SC 1.0` (`SC 2.0` **discarded**) | **AC27.6** |

## Verified facts
- **AC27.1/27.2** `SAU ChG` reachable; ENT confirms the save.
- **AC27.3/27.4** the buffered draft is written to `nvMem` and `StorEd` is shown.
- **AC27.5** after a real `page.reload()` the saved `SC 1.0` survives (localStorage-backed).
- **AC27.6** an edit made and **not** saved (exited via `End`) is gone after reload — the
  panel and `nvMem` both return to the last saved `SC 1.0`.

## Honesty note
Persistence is proven by **reloading the page** and re-reading the value through the UI; the
draft-vs-saved distinction is confirmed against `nvMem.scaleResolution.X` written by the app
itself. SC (not bEEP) is used precisely because it is draft-only — commit-on-change params
could not demonstrate the discard path.

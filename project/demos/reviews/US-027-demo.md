# US-027 Save Changes (SAV CHG) — Demo Review

**Verdict: APPROVE** (exemplary — proves both persist AND discard across real reloads)

Source: `?source=manual`. Real UI. Two real `page.reload()` power-cycles. Uses `SC` (scale resolution) deliberately because it is a draft-only param — the only kind that can demonstrate the discard path (commit-on-change params can't).

## AC coverage
- **AC27.1/27.2** Reach SAV CHG, ENT confirms — `04-sav-chg-highlighted.png` (`SAU ChG`) + `05-stored-confirmation.png` (`StorEd`). PASS.
- **AC27.3/27.4** Draft written to nvMem + confirmation — `05` (`StorEd`); SC changed 5.0→1.0 as a draft (`03`) then committed. PASS.
- **AC27.5** Survives power cycle — `06-after-reload-idle.png` (real reload) → `07-after-reload-sc-persisted.png` (`SC 1.0` persisted). PASS.
- **AC27.6** Exit without save discards — `08-unsaved-change-sc-2.png` (`SC 2.0` unsaved) → exit via End → reload → `09-after-reload-discarded.png` (`SC 1.0`, the `SC 2.0` edit gone). PASS.

## Verdict rationale
Best-in-class persistence demo: the save path is proven by a real page reload showing `SC 1.0` survives, and the discard path by a second reload showing an unsaved `SC 2.0` reverts to `SC 1.0`. Both halves of the spec (persist on save, discard without save) are screenshot-backed against real power-cycles. Approve. This is also the generic persistence proof other config stories (US-040/041/042/043) lean on for their SAV-CHG AC.

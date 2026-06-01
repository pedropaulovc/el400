# US-025 — Setup Menu: Keypad Beep (bEEP) — Demo Walkthrough

**Source:** `?source=manual` · **Driver:** Playwright (real UI, data-testid clicks) · **Port:** 8201

Beep is **audio-only**, so it cannot be captured in a screenshot. This demo shows the
`bEEP` setup parameter toggling on/off through the real panel and verifies the gate the
audio path actually reads (`nvMem.beepEnabled`, read live on every key press in
`src/utils/audio.ts:33`). All assertions passed.

| Step | Screenshot | What it shows | AC |
|------|-----------|---------------|-----|
| 1 | `01-idle.png` | Idle readout `0.0000` | — |
| 2 | `02-setup-select-x.png` | Wrench → `SELECt` → X → first param `LinEAr` | AC25.1 |
| 3 | `03-beep-default.png` | Scrolled (▼) to `bEEP on` — **default is ON** | AC25.1, AC25.2 |
| 4 | `04-beep-off.png` | ▶ (key 6) toggles to `bEEP oFF`; `nvMem.beepEnabled=false` | AC25.3, AC25.5 |
| 5 | `05-beep-on-again.png` | ◀ (key 4) toggles back to `bEEP on`; `nvMem.beepEnabled=true` | AC25.3, AC25.4 |
| 6 | `06-back-to-idle.png` | Scrolled to `End` + ENT → back to readout | — |

## Verified facts
- **AC25.2** default `bEEP on`.
- **AC25.3** key 6 (▶) / key 4 (◀) toggle the value (`bEEP oFF` / `bEEP on`).
- **AC25.4 / AC25.5** the choice commits immediately to `nvMem.beepEnabled`; the keypad
  click gate (`playClickSound`) returns early when `beepEnabled` is false, so keys fall
  silent the instant the operator cycles to `bEEP oFF` — no SAV CHG needed.
- **AC25.6** error / zero-approach beeps are a **separate audio path**
  (`playZeroApproachBeep`, US-024) independent of this setting — narrated, since both are
  audio-only.

## Honesty note
Audio output itself is not asserted (headless, no speaker). The demo verifies the
**setting state** and the **live gate** the beep reads; the on/off audio behaviour follows
deterministically from that gate.

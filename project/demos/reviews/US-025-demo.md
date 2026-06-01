# US-025 Keypad Beep (bEEP) — Demo Review

**Verdict: APPROVE**

Source: `?source=manual`. Real UI clicks. Beep is audio-only — cannot be screenshotted; the demo shows the setting toggle and is honest that audio itself is not asserted (headless, no speaker).

## AC coverage
- **AC25.1** Navigate to BEEP — `02-setup-select-x.png` + `03-beep-default.png`. PASS.
- **AC25.2** Default ON — `03-beep-default.png` (`bEEP on`). PASS.
- **AC25.3** Toggle with 6/4 — `04-beep-off.png` (► → `bEEP oFF`), `05-beep-on-again.png` (◄ → `bEEP on`). PASS.
- **AC25.4/25.5** Commits to the live gate (`nvMem.beepEnabled`) read on every key press — narrated; the on/off audio follows deterministically from the gate. PASS (state-level).
- **AC25.6** Error/zero-approach beeps are a separate path (US-024) — narrated. PASS.

## Verdict rationale
For an audio-only feature in a screenshot demo, showing the observable setting state (`bEEP on`↔`bEEP oFF`) through real toggles is the correct and honest evidence. The presenter is explicit that raw audio is not captured. No way to do better in a headless screenshot demo; the toggle is shown. Approve.

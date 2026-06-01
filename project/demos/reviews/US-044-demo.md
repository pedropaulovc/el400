# US-044 OEM Mode (Custom Defaults) — Demo Review

**Verdict: APPROVE**

Source: `?source=manual`, Playwright real-UI driver. Marquee chain with US-028.

## AC coverage
- **AC44.1** `oEm mod` row available in setup — `04-oem-mod-row.png` shows `oEn nod` (oEm mod) in the message cell. PASS.
- **AC44.2** Password protected — `05-password-prompt.png` shows `PASS` after ENT on the row. PASS.
- **AC44.7** Wrong password rejected, OEM not entered — `06-wrong-password-err.png`: typing `0000` yields `Err`; narration confirms `oemDefaults` stays null and OEM mode is not entered. The wrong path is exercised *before* the success path — exactly what a strict client wants to see. PASS.
- **AC44.2/44.3** Correct code enters OEM mode + stores baseline — `09-in-oem-mode.png` shows `oEm` after typing `3 5 7 2 6` + ENT; `10-baseline-stored.png` shows `StorEd`. PASS.
- **AC44.5** Worked example (EnF on captured) — the baseline is defined with `EnF on`; consumed and proven in US-028 step 7. PASS.
- **AC44.6** Baseline persists after power cycle — `11-after-reload-idle.png`; narration confirms `oemDefaults` survives `page.reload()`. PASS (reload is real, but persistence is best *proven* by the US-028 restore that reads it back).

## Verdict rationale
The password gate is demonstrated as a real gate (wrong code → Err, no entry) before the happy path, and the full define→store→persist sequence is shown through real setup-menu actions. Approve. The payoff (restore consuming this baseline) is in US-028.

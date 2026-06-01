# US-043 Keypad Lock (LoC) — Demo Review

**Verdict: APPROVE**

Source: `?source=debug` (needed to jog a real axis and prove the readout tracks while locked). Real key/jog events through the reducer via `useKeyboardShortcuts` (same dispatch as on-panel buttons).

## AC coverage
- **AC43.1** `LoC oFF` (default) / `LoC on` — `03-loc-default-off.png` / `04-loc-on.png`. PASS.
- **AC43.2** Save LoC on disables keys; cycle to LoC oFF restores — `09-loc-off-again.png` + `10-unlocked-zero-works.png`. PASS.
- **AC43.3 / AC43.7** Locked Zero X is a no-op, datum protected — `07-locked-zero-is-noop.png`: after Shift+X while locked, X stays `0.2362` (NOT reset). The whole point of the feature — protecting the datum from an accidental zero — is shown. PASS.
- **AC43.4** Wrench still enters setup while locked (unlock path) — `08-locked-wrench-enters-setup.png` (`SELECt`). PASS.
- **AC43.5** Readout keeps updating on real jog while locked — `06-locked-display-updates-on-jog.png`: readout tracks the jog (0.1969→0.2362) while input is gated. PASS — exactly the right distinction (lock affects input, not readout).
- **AC43.6** Persists via nvMem.keypadLock (localStorage) — narrated. PASS (generic persistence proven by US-027).

## Cosmetic finding (team-lead flagged)
The debug control panel **overlaps the keypad** in shots 06/07/08/10 — the keypad's right column (and the wrench/calc buttons) is partially covered by the panel. The demo works around it by using keyboard shortcuts, but on a real narrow viewport an operator could not click the covered buttons. Noted as a responsive-layout bug (not blocking US-043's logic, which is sound).

## Verdict rationale
Complete lock→protect→unlock→zero loop demonstrated through real events: locked zero is a true no-op, readout stays live, wrench remains the escape hatch, and unlocking restores key input. Approve. Cosmetic panel-overlap noted separately.

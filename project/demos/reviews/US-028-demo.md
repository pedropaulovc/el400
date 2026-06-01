# US-028 Restore Defaults (rSt oEm) — Demo Review

**Verdict: APPROVE**

Source: `?source=manual`, Playwright real-UI driver. Consuming side of the US-044 OEM chain.

## Special-attention checks (team-lead flagged)
1. **Restore must visibly return settings to the OEM baseline, not factory** — CONFIRMED. `02` defines baseline with `EnF on`; `03-enf-changed-off.png` shows live `EnF oFF` (diverged); after `rSt oEm` + `In ProG`, `07-enf-restored-on.png` shows **`EnF on`** restored. EnF returns to the OEM-defined value (ON), NOT the bare factory `oFF`. This is the decisive proof and it is screenshot-backed, not just narrated.
2. **Restore must NOT be password-gated** — CONFIRMED. `04-rst-oem-row.png` shows `rSt oEm` as its own terminal row; pressing ENT runs it directly (no `PASS` prompt appears — contrast US-044's `05-password-prompt.png`). The restore is a separate, non-password row exactly as specified.

## AC coverage
- **AC28.3** Reach restore row — `04-rst-oem-row.png` (`rSt oEm`). PASS.
- **AC28.7/28.8** `In ProG` shown during restore — `05-in-prog.png` (`In ProG`). PASS.
- **AC28.9** Returns to normal readout after dwell — `06-restore-complete-idle.png` (`0.0000`). PASS.
- **AC28.10 / AC44.4** Settings restored to OEM baseline — `07-enf-restored-on.png` (`EnF on`). PASS.

## Note on spec vs. implementation
The US-028 spec text (ACs 28.4–28.6) describes restore behind the OEM password / `3 AXIS`-`MILL`-`OPT OFF` confirm chain. The team-lead's authoritative clarification (and the walkthrough's manual-§6.2 reconciliation) is that `rSt oEm` is a SEPARATE non-password row and the password guards *defining* the baseline (US-044), not restoring. The demo correctly implements the reconciled design: no password on restore. This is the intended behavior — NOT a defect.

## Verdict rationale
The define→diverge→restore→verify loop is shown end-to-end through real UI, the restored value is the OEM baseline (not factory), and restore is correctly non-password-gated. Both special-attention checks pass on screenshot evidence. Approve.

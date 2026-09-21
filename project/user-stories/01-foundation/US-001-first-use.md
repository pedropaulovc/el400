# US-001: First Use and Power-Up Display

**Authority:** EL400 Operation Manual §5.4 (Power Up), with the EL400 video walkthrough as secondary evidence.  
**Priority:** Low

## User Story
**As a** machine operator  
**I want** a brief model/version indication followed by the counting display  
**So that** I can tell that the simulator started normally

## Target Acceptance Criteria
- [ ] **AC 1.1:** Power-on briefly shows the simulator identity on X and its firmware-version identity on Y.
- [ ] **AC 1.2:** The simulator identity remains the EL400 / `vEr 1.0.0` variant. The primary manual and video show other EL400-family model/version glyphs, so those literals are not claimed to be a universal physical-firmware identity.
- [ ] **AC 1.3:** Pressing `C` while the identity is shown bypasses the remaining delay.
- [ ] **AC 1.4:** Timeout or bypass enters the normal X/Y/Z counting display at the configured resolution and restores persisted operator settings.
- [ ] **NF 1.1:** E2E setup may bypass the boot delay by default, but dedicated boot coverage must exercise both timeout and the visible `C` key.

## Baseline Audit (headed debug source)
- **Passed:** X showed `EL400`, Y showed `vEr 1.0.0`, and Z was blank on reload.
- **Passed:** `C` dismissed the message immediately; waiting 1.2 seconds also reached the normal `0.0000` counting display.
- This is completed baseline evidence, not verification of changes made after the audit.

## Evidence
- Runtime audit: `/tmp/el400-audit-ManualCore.json` (`US-001`)
- Screenshot: `/tmp/el400-audit/core/boot.png`
- E2E: [`e2e/01-foundation/US-001-first-use.spec.ts`](../../../e2e/01-foundation/US-001-first-use.spec.ts)

## Scope
The simulator is X/Y/Z only; a fourth Z/U axis is deliberately out of scope.

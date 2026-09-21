# US-001: First Use and Power-Up Display

**Authority:** [EL400 Operation Manual](https://www.dropros.com/documents/EL400%20OpManual.pdf) §5.4 (Power Up), with the [EL400 video walkthrough](https://www.youtube.com/watch?v=7W47KPCu7jE) as secondary evidence.  
**Priority:** Low

## User Story
**As a** machine operator  
**I want** a brief model/version indication followed by the counting display  
**So that** I can tell that the simulator started normally

## Target Acceptance Criteria
- [x] **AC 1.1:** Power-on briefly shows the simulator identity on X and its firmware-version identity on Y.
- [x] **AC 1.2:** The simulator identity remains the EL400 / `vEr 1.0.0` variant. The primary manual and video show other EL400-family model/version glyphs, so those literals are not claimed to be a universal physical-firmware identity.
- [x] **AC 1.3:** Pressing `C` while the identity is shown bypasses the remaining delay.
- [x] **AC 1.4:** Timeout or bypass enters the normal X/Y/Z counting display at the configured resolution and restores persisted operator settings.
- [x] **NF 1.1:** E2E setup may bypass the boot delay by default, but dedicated boot coverage exercises both timeout and the visible `C` key.

## Verification
The completed headed Chromium run observed `EL400` on X, `vEr 1.0.0` on Y and a blank Z. The visible `C` key bypassed the delay, while a separate reload reached normal counting after the timeout. A reload also restored the saved unit, direction, diameter and datum settings. This verifies the simulator identity and persistence behavior, not the identity or startup timing of physical firmware.

## Evidence
- [Verification index and headed-session reports](../README.md#verification)
- [`e2e/01-foundation/US-001-first-use.spec.ts`](../../../e2e/01-foundation/US-001-first-use.spec.ts)

## Scope
The simulator is X/Y/Z only; a fourth Z/U axis is deliberately out of scope.

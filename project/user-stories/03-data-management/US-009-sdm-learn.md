# US-009: SDM Learn Mode

**Authority:** EL400 Operation Manual §§8.2 and 8.2.2.  
**Priority:** Medium

## User Story
**As a** machine operator  
**I want** to capture exact live XYZ positions into persistent sub-datum steps  
**So that** I can teach a machining sequence without retyping coordinates

## Target Acceptance Criteria
- [ ] **AC 9.1:** SDM opens the three-option menu in manual order `ProGrAn` → `rUn` → `LEArn`; arrows select `LEArn` and `ent` confirms.
- [ ] **AC 9.2:** `StEPno` defaults to 1. `Y`, digits and `ent` select any step from 1 through 1000; 0 and 1001 are rejected without entering capture.
- [ ] **AC 9.3:** Active Learn shows the exact current compensated X/Y/Z coordinates.
- [ ] **AC 9.4:** The first X press shows the current step number; the second X press stores all three live coordinates exactly and advances to the next step. X is both the documented confirmation key and one coordinate being captured; its value must not be replaced with zero.
- [ ] **AC 9.5:** Captures share the same 1000-slot SDM store as Program and Run and persist across reload/power-up using the simulator's non-volatile storage.
- [ ] **AC 9.6:** `C` exits without corrupting already committed steps.

## Baseline Audit (headed debug source)
- **Passed:** live-coordinate display, step 1000 acceptance/1001 rejection and Learn re-entry.
- **Confirmed gaps:** the old menu required an extra SDM activation, the prompt defaulted to step 0, Program readback displayed learned X as zero while Y/Z survived, and all SDM data disappeared on reload. The implementation owner traced the X symptom to empty X-entry rendering rather than loss of the stored learned X; the observable contract still requires exact XYZ readback.

## Evidence
- Runtime audit: `/tmp/el400-audit-ManualData.json` (`US-009`)
- Corruption screenshot: `/tmp/el400-audit/data/sdm-learn-x-corruption.png`
- E2E: [`e2e/03-data-management/US-009-sdm-learn.spec.ts`](../../../e2e/03-data-management/US-009-sdm-learn.spec.ts)
- Integrated target E2E: `e2e/03-data-management/manual-fidelity.spec.ts` (pending Main verification)

Target persistence and exact XYZ capture are pending Main's integrated verification.

# US-011: SDM Run Mode

**Authority:** EL400 Operation Manual §§8.2, 8.2.3 and 8.3.  
**Priority:** High

## User Story
**As a** machine operator  
**I want** to run persistent sub-datum steps as live distance-to-go coordinates  
**So that** I can machine each programmed location by moving all axes to zero

## Target Acceptance Criteria
- [ ] **AC 11.1:** SDM opens `ProGrAn` → `rUn` → `LEArn`; arrows select `rUn` and `ent` confirms.
- [ ] **AC 11.2:** `StEPno` defaults to 1. `Y`, digits and `ent` select a stored step from 1–1000.
- [ ] **AC 11.3:** `ent` displays live X/Y/Z distance-to-go as stored sub-datum minus the current compensated displayed coordinate, using the same persisted data written by Program or Learn.
- [ ] **AC 11.4:** `6►` advances to the next step; the SDM indicator remains lit throughout active Run.
- [ ] **AC 11.5:** The automatic Near Zero Warning operates at and within 0.05 mm on physical target-bearing axes and cannot be disabled by `BUZZ`.
- [ ] **AC 11.6:** `C` exits, extinguishes the SDM indicator and restores live ABS counting without deleting the program.

## Baseline Audit (headed debug source)
- **Passed:** default step 1, exact DTG arithmetic (`(10,20,5) - (4,1,-3) = (6,19,8)`), live updates, next-step advance, SDM indicator and clean exit.
- **Confirmed gaps:** the mode menu required an extra SDM activation, no warning appeared at X DTG `0.0500`, and all stored steps disappeared after reload.

## Evidence
- Runtime audit: `/tmp/el400-audit-ManualData.json` (`US-011`)
- Screenshot: `/tmp/el400-audit/data/sdm-run-live.png`
- E2E: [`e2e/03-data-management/US-011-sdm-run.spec.ts`](../../../e2e/03-data-management/US-011-sdm-run.spec.ts)
- Integrated target E2E: `e2e/03-data-management/manual-fidelity.spec.ts` (pending Main verification)

Post-audit persistence/warning work remains pending Main's integrated verification.

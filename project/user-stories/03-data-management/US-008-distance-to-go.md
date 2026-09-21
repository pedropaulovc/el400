# US-008: Distance-to-Go (Preset)

**Authority:** EL400 Operation Manual §8.1 and §8.3; EL400 video walkthrough §2.5.  
**Priority:** High

## User Story
**As a** machine operator  
**I want** to enter a relative travel distance and count it down to zero  
**So that** I can reach the next position without disturbing the ABS datum

## Target Acceptance Criteria
- [ ] **AC 8.1:** In ABS, pressing Distance-to-Go shows `SELECt`; each selected axis accepts a signed relative distance and `ent` confirms it.
- [ ] **AC 8.2:** Pressing Distance-to-Go again executes Preset in INC function mode. At activation, each selected axis shows the entered distance regardless of its nonzero starting ABS coordinate.
- [ ] **AC 8.3:** Subsequent compensated machine motion subtracts from that starting relative distance and reaches zero after the requested travel. Unselected axes remain live/unchanged.
- [ ] **AC 8.4:** The INC indicator and the manual's leading function decimal are shown while active.
- [ ] **AC 8.5:** The automatic Near Zero Warning is active at and within 0.05 mm of the target. The optional `BUZZ` setting cannot disable this primary-function warning.
- [ ] **AC 8.6:** `C` exits, removes the function marker and restores the live ABS display without changing its datum.

## Baseline Audit (headed debug source)
- **Passed:** selection, signed multi-axis entry, second-key execution, live countdown, mode indicator/leading decimal and clean ABS exit.
- **Confirmed gap:** at live X=12, entering X=20 started at X=8, proving absolute-target rather than required relative-distance semantics.
- **Confirmed gap:** no observable warning at 0.0500 or 0.0400 mm.

## Evidence
- Runtime audit: `/tmp/el400-audit-ManualData.json` (`US-008`)
- Screenshot: `/tmp/el400-audit/data/preset-near-zero-005.png`
- E2E: [`e2e/03-data-management/US-008-distance-to-go.spec.ts`](../../../e2e/03-data-management/US-008-distance-to-go.spec.ts)
- Integrated target E2E: `e2e/02-core-operations/manual-fidelity.spec.ts` (pending Main verification)

Corrections after the audit remain pending Main's integrated verification.
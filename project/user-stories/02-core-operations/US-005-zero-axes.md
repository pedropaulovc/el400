# US-005: Axis Reset and Set

**Authority:** EL400 Operation Manual §§7.3–7.4.  
**Priority:** High

## User Story
**As a** machine operator  
**I want** to zero or preset one axis  
**So that** I can establish the required datum without altering unrelated axes

## Target Acceptance Criteria
- [ ] **AC 5.1:** An axis quick-zero key immediately makes that axis read zero at its configured resolution; the default simulator rendering is `0.0000`, not a universal three-decimal value.
- [ ] **AC 5.2:** ABS zero/preset redefines the selected work datum; INC zero/preset changes only its independent temporary datum.
- [ ] **AC 5.3:** Axis select → signed numeric entry → `ent` makes the selected axis display the requested value.
- [ ] **AC 5.4:** Preset conversion accounts for active unit, source decoding, radius/diameter scale and Direction. Under `riGht`, a requested positive value remains positive after commit and later motion continues from it correctly.
- [ ] **AC 5.5:** `C` clears/cancels an uncommitted entry without changing the datum; other axes remain unchanged.

## Baseline Audit (headed debug source)
- **Passed:** quick zero, normal-direction preset, ABS datum relocation and cancellation.
- **Confirmed gap:** the same positive preset under saved `riGht` displayed a negative value.

## Evidence
- Runtime audit: `/tmp/el400-audit-ManualCore.json` (`US-005`)
- Failure screenshot: `/tmp/el400-audit/core/reversed-positive-preset.png`
- E2E: [`e2e/02-core-operations/US-005-zero-axes.spec.ts`](../../../e2e/02-core-operations/US-005-zero-axes.spec.ts)
- Integrated target E2E: `e2e/02-core-operations/manual-fidelity.spec.ts` (pending Main verification)

Post-audit correction remains pending Main's integrated verification.
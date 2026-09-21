# US-006: Half Function

**Authority:** EL400 Operation Manual §7.5 and its SELECT illustration; MagXact “CENTER FIND.”  
**Priority:** Medium

## User Story
**As a** machine operator  
**I want** to select an axis and halve its displayed value  
**So that** I can locate the midpoint between two measured edges

## Target Acceptance Criteria
- [ ] **AC 6.1:** From normal counting, pressing `½` enters a selection phase and displays `SELECt`.
- [ ] **AC 6.2:** Pressing X, Y or Z halves that axis's current displayed coordinate exactly once and returns to normal counting; no previously selected axis is acted on before this choice.
- [ ] **AC 6.3:** The other axes and their datums are unchanged. `C` cancels selection without halving.
- [ ] **AC 6.4:** HALF works in ABS and INC, while INC is the recommended midpoint workflow because it preserves the ABS datum.
- [ ] **AC 6.5:** Connected INC uses the live incremental coordinate, not a frozen stored reading.

## Baseline Audit (headed debug source)
- **Passed only for arithmetic:** with X already selected, `100` became `50`.
- **Confirmed gap:** `½` acted immediately on the previously selected axis; no `SELECt` phase appeared and the subsequent axis key did nothing.

## Evidence
- Runtime audit: `/tmp/el400-audit-ManualCore.json` (`US-006`)
- Screenshot: `/tmp/el400-audit/core/half-no-select.png`
- Target E2E: [`e2e/02-core-operations/US-006-half-function.spec.ts`](../../../e2e/02-core-operations/US-006-half-function.spec.ts) (pending Main verification)
- Integrated target E2E: `e2e/02-core-operations/manual-fidelity.spec.ts` (pending Main verification)
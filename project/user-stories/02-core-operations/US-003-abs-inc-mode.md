# US-003: Absolute and Incremental Mode

**Authority:** EL400 Operation Manual §7.1; MagXact “CHOICE OF abs OR inc MODES.”  
**Priority:** High

## User Story
**As a** machine operator  
**I want** an independent temporary incremental datum  
**So that** point-to-point work cannot disturb my fixed absolute datum

## Target Acceptance Criteria
- [ ] **AC 3.1:** `ABS/INC` toggles modes and exactly the active `abs` or `Inc` indicator glows.
- [ ] **AC 3.2:** Zeroing or presetting an axis in INC establishes that axis's temporary datum without changing its ABS datum.
- [ ] **AC 3.3:** Connected INC is live: after zeroing, machine motion changes the display by current compensated machine coordinate minus the stored incremental datum.
- [ ] **AC 3.4:** Returning to ABS restores the current position relative to the fixed ABS datum, including physical motion made while INC was active.
- [ ] **AC 3.5:** Unit, scale, calibration and Direction transforms are shared with ABS; only the selected datum differs.

## Baseline Audit (headed debug source)
- **Passed:** toggling, indicators, independent stored ABS/INC values and restoration of ABS.
- **Confirmed gap:** after INC X zero, visible debug jogs changed the machine from X3 to X5 while the DRO remained `0.0000`; connected INC used a frozen stored value instead of a live offset.

## Evidence
- Runtime audit: `/tmp/el400-audit-ManualCore.json` (`US-003`)
- E2E: [`e2e/02-core-operations/US-003-abs-inc-mode.spec.ts`](../../../e2e/02-core-operations/US-003-abs-inc-mode.spec.ts)
- Integrated target E2E: `e2e/02-core-operations/manual-fidelity.spec.ts` (pending Main verification)

Post-audit implementation is not marked verified until Main runs integrated checks.
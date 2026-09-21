# US-004: Inch and Metric Display

**Authority:** EL400 Operation Manual §7.2; MagXact “INCHES vs. METRIC UNITS.”  
**Priority:** High

## User Story
**As a** machine operator  
**I want** to change the displayed linear unit  
**So that** I can use inch or metric drawings without changing physical position

## Target Acceptance Criteria
- [ ] **AC 4.1:** `in/mm` toggles inch and millimetre display and exactly the active unit indicator glows.
- [ ] **AC 4.2:** Linear values convert using exactly 25.4 mm per inch; toggling units changes presentation, not the stored physical coordinate or datum.
- [ ] **AC 4.3:** The selected unit persists across reload/power-up.
- [ ] **AC 4.4:** Entry, distance-to-go, scale/sign transforms and overflow limits operate in the currently displayed unit and round only for display.

## Baseline Audit (headed debug source)
- **Passed:** `4.0000` mm became `0.1575` inch and returned to `4.0000` mm with correct indicators.
- **Passed:** a `1.0000` inch preset recovered as `25.4000` mm.
- **Passed:** the selected mm setting remained after reload.

## Evidence
- Runtime audit: `/tmp/el400-audit-ManualCore.json` (`US-004`)
- E2E: [`e2e/02-core-operations/US-004-inch-metric.spec.ts`](../../../e2e/02-core-operations/US-004-inch-metric.spec.ts)

These are baseline results; subsequent integrated behavior remains for Main to verify.

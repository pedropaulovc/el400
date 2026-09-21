# US-004: Inch and Metric Display

**Authority:** [EL400 Operation Manual](https://www.dropros.com/documents/EL400%20OpManual.pdf) §7.2; [MagXact](https://cdn.shopify.com/s/files/1/0576/0984/6859/files/MagXact-MX-100M-Mill-DRO-V1-9-1-2021.pdf?v=1740669616) “INCHES vs. METRIC UNITS.”  
**Priority:** High

## User Story
**As a** machine operator  
**I want** to change the displayed linear unit  
**So that** I can use inch or metric drawings without changing physical position

## Target Acceptance Criteria
- [x] **AC 4.1:** `in/mm` toggles inch and millimetre display and exactly the active unit indicator glows.
- [x] **AC 4.2:** Linear values convert using exactly 25.4 mm per inch; toggling units changes presentation, not the stored physical coordinate or datum.
- [x] **AC 4.3:** The selected unit persists across reload/power-up.
- [x] **AC 4.4:** Entry, distance-to-go, scale/sign transforms and overflow limits operate in the currently displayed unit and round only for display.

## Verification
The headed run converted `4.0000`, `-2.2500` and `2.5000` mm to `0.1575`, `-0.0886` and `0.0984` inch, then returned to the exact millimetre readings without changing the datum. A `1.0000` inch preset became `25.4000` mm, and the saved millimetre selection survived reload. Distance-to-go conversion and display-space overflow were exercised in their owning story runs.

## Evidence
- [Verification index and headed-session reports](../README.md#verification)
- [`e2e/02-core-operations/US-004-inch-metric.spec.ts`](../../../e2e/02-core-operations/US-004-inch-metric.spec.ts)


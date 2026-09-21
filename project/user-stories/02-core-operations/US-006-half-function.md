# US-006: Half Function

**Authority:** [EL400 Operation Manual](https://www.dropros.com/documents/EL400%20OpManual.pdf) §7.5 and its SELECT illustration; [MagXact](https://cdn.shopify.com/s/files/1/0576/0984/6859/files/MagXact-MX-100M-Mill-DRO-V1-9-1-2021.pdf?v=1740669616) “CENTER FIND.”  
**Priority:** Medium

## User Story
**As a** machine operator  
**I want** to select an axis and halve its displayed value  
**So that** I can locate the midpoint between two measured edges

## Target Acceptance Criteria
- [x] **AC 6.1:** From normal counting, pressing `½` enters a selection phase and displays `SELECt`.
- [x] **AC 6.2:** Pressing X, Y or Z halves that axis's current displayed coordinate exactly once and returns to normal counting; no previously selected axis is acted on before this choice.
- [x] **AC 6.3:** The other axes and their datums are unchanged. `C` cancels selection without halving.
- [x] **AC 6.4:** HALF works in ABS and INC, while INC is the recommended midpoint workflow because it preserves the ABS datum.
- [x] **AC 6.5:** Connected INC uses the live incremental coordinate, not a frozen stored reading.

## Verification
From a fresh headed session, `½` displayed `SELECt` before any axis changed. Separate X, Y and Z choices halved exactly one axis, and `C` canceled a pending selection without changing the display. In the connected INC case, halving X produced `6.0000`; 2 mm of physical movement changed it to `8.0000`, while returning to ABS showed its independent `22.0000` coordinate.

## Evidence
- [Verification index and headed-session reports](../README.md#verification)
- [`e2e/02-core-operations/US-006-half-function.spec.ts`](../../../e2e/02-core-operations/US-006-half-function.spec.ts)

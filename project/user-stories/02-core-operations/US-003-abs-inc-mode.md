# US-003: Absolute and Incremental Mode

**Authority:** [EL400 Operation Manual](https://www.dropros.com/documents/EL400%20OpManual.pdf) §7.1; [MagXact](https://cdn.shopify.com/s/files/1/0576/0984/6859/files/MagXact-MX-100M-Mill-DRO-V1-9-1-2021.pdf?v=1740669616) “CHOICE OF abs OR inc MODES.”  
**Priority:** High

## User Story
**As a** machine operator  
**I want** an independent temporary incremental datum  
**So that** point-to-point work cannot disturb my fixed absolute datum

## Target Acceptance Criteria
- [x] **AC 3.1:** `ABS/INC` toggles modes and exactly the active `abs` or `Inc` indicator glows.
- [x] **AC 3.2:** Zeroing or presetting an axis in INC establishes that axis's temporary datum without changing its ABS datum.
- [x] **AC 3.3:** Connected INC is live: after zeroing, machine motion changes the display by current compensated machine coordinate minus the stored incremental datum.
- [x] **AC 3.4:** Returning to ABS restores the current position relative to the fixed ABS datum, including physical motion made while INC was active.
- [x] **AC 3.5:** Unit, scale, calibration and Direction transforms are shared with ABS; only the selected datum differs.

## Verification
The headed core run zeroed all three axes independently in ABS and INC, then changed the visible physical inputs. INC tracked the live deltas `2.5000`, `-2.2500` and `2.5000`; returning to ABS restored the same accumulated movement against its separate datum. A connected INC preset also changed from `10.0000` to `11.5000` after 1.5 mm of physical movement, while ABS returned to its own `4.0000` reading. Raw-count source scaling was checked separately under US-002.

## Evidence
- [Verification index and headed-session reports](../README.md#verification)
- [`e2e/02-core-operations/US-003-abs-inc-mode.spec.ts`](../../../e2e/02-core-operations/US-003-abs-inc-mode.spec.ts)

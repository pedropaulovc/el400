# US-007: Center Finding (Circle and Line)

**Authority:** [EL400 Operation Manual](https://www.dropros.com/documents/EL400%20OpManual.pdf) §§8.4–8.5. It takes precedence over the flatter [MagXact](https://cdn.shopify.com/s/files/1/0576/0984/6859/files/MagXact-MX-100M-Mill-DRO-V1-9-1-2021.pdf?v=1740669616) macro sequence.  
**Priority:** Medium

## User Story
**As a** machine operator  
**I want** the documented nested center menu and point-capture flow  
**So that** I can move to the center of a line or circle by distance-to-go

## Target Acceptance Criteria
- [x] **AC 7.1:** `fⁿ` shows `CEntrE`; `ent` opens a nested subtype menu whose default is `CirCLE`.
- [x] **AC 7.2:** `4◄`/`6►` toggle `CirCLE` and `LinE`; `ent` starts the selected capture routine.
- [x] **AC 7.3:** Circle capture labels Z as `Point 1`, `Point 2`, `Point 3`; visible machine motion sets each point and `6►` stores it. The third point yields live X/Y distance-to-go and Z=`CEntrE`.
- [x] **AC 7.4:** Line capture similarly stores two endpoints and yields live distance-to-go to their midpoint.
- [x] **AC 7.5:** Duplicate/collinear circle geometry displays `inuAL d` and visibly restarts capture instead of silently accepting no result.
- [x] **AC 7.6:** The Fn indicator remains lit throughout menu, capture and result; `C` exits and restores normal counting.

## Verification
The completed headed calculation run covered the nested `CEntrE` menu, both sibling subtypes, point labels, line and circle geometry, live distance-to-go, the Fn indicator and clean exit. A targeted recheck closed the remaining feedback defect: duplicate and collinear inputs now keep `inuAL d` readable through polling and movement, then fresh captures recover and reach zero at the calculated center. Debug physical-position controls supplied the movement; no physical encoder hardware was used.

## Evidence
- [Verification index and headed-session reports](../README.md#verification)
- [`e2e/02-core-operations/US-007-center-finding.spec.ts`](../../../e2e/02-core-operations/US-007-center-finding.spec.ts)


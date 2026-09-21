# US-007: Center Finding (Circle and Line)

**Authority:** EL400 Operation Manual §§8.4–8.5. It takes precedence over the flatter MagXact macro sequence.  
**Priority:** Medium

## User Story
**As a** machine operator  
**I want** the documented nested center menu and point-capture flow  
**So that** I can move to the center of a line or circle by distance-to-go

## Target Acceptance Criteria
- [ ] **AC 7.1:** `fⁿ` shows `CEntrE`; `ent` opens a nested subtype menu whose default is `CirCLE`.
- [ ] **AC 7.2:** `4◄`/`6►` toggle `CirCLE` and `LinE`; `ent` starts the selected capture routine.
- [ ] **AC 7.3:** Circle capture labels Z as `Point 1`, `Point 2`, `Point 3`; visible machine motion sets each point and `6►` stores it. The third point yields live X/Y distance-to-go and Z=`CEntrE`.
- [ ] **AC 7.4:** Line capture similarly stores two endpoints and yields live distance-to-go to their midpoint.
- [ ] **AC 7.5:** Duplicate/collinear circle geometry displays `inuAL d` and visibly restarts capture instead of silently accepting no result.
- [ ] **AC 7.6:** The Fn indicator remains lit throughout menu, capture and result; `C` exits and restores normal counting.

## Baseline Audit (headed debug source)
- **Passed through non-authoritative routes:** two-point line and three-point circle calculations produced correct `-5` distance-to-go results; Fn stayed lit.
- **Confirmed gap:** `ent` on `CEntrE` immediately started line capture; the `CirCLE`/`LinE` submenu and point labels were absent. Circle was reachable only by navigating before Enter.

## Evidence
- Runtime audit: `/tmp/el400-audit-ManualCore.json` (`US-007`)
- Screenshots: `/tmp/el400-audit/core/center-missing-submenu.png`, `/tmp/el400-audit/core/center-line-result.png`, `/tmp/el400-audit/core/center-circle-noncanonical.png`
- E2E: [`e2e/02-core-operations/US-007-center-finding.spec.ts`](../../../e2e/02-core-operations/US-007-center-finding.spec.ts)

The nested target and invalid-geometry behavior are pending Main's integrated verification.

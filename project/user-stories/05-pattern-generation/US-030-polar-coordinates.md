# US-030: Polar Coordinates

**Priority:** P4  
**Category:** Pattern Generation  
**Manual reference:** EL400 Operation Manual §9.1.7, pp. 58–59; EL400 overview video §2.13

## User Story

**As a** milling operator  
**I want** a live radius/angle view in any principal plane  
**So that** I can inspect positions defined in polar coordinates

## Target Acceptance Criteria

- [ ] **AC30.1:** Set any required Cartesian axis values before entry. Press Fn, navigate the top-level ring `CEntrE` → `LinEAr` → `PoLAr`, and press ENT.
- [ ] **AC30.2:** 4/6 cycles the three plane choices and ENT accepts one. Seven-segment `h-Y`, `h-Z`, and `Y-Z` represent the manual's X-Y, X-Z, and Y-Z planes.
- [ ] **AC30.3:** In X-Y, X displays radius and Y displays angle; in X-Z, X displays radius and Z displays angle; in Y-Z, Y displays radius and Z displays angle. The unused axis is blank.
- [ ] **AC30.4:** Radius is the Euclidean magnitude of the selected Cartesian pair and follows the current linear unit. Angle is `atan2(second-axis, first-axis)` in degrees and does not change with inch/mm selection.
- [ ] **AC30.5:** Radius and angle update live as either selected physical axis moves; entering Polar does not change the stored Cartesian coordinates.
- [ ] **AC30.6:** C exits and restores the live Cartesian X/Y/Z display with its prior mode and unit.

## Operator Procedure and Independent Oracles

- X-Y with X=`3`, Y=`4`: X radius=`5.0000`, Y angle=`53.1301`, Z blank.
- X-Z with X=`3`, Z=`4`: X radius=`5.0000`, Z angle=`53.1301`, Y blank.
- Y-Z with Y=`3`, Z=`4`: Y radius=`5.0000`, Z angle=`53.1301`, X blank.

While X-Y is active, changing X from 3 to 4 with Y=4 must update the display to radius `5.6569`, angle `45.0000`. Exit must reveal Cartesian `(4,4)` unchanged by the view transformation.

## Baseline Audit Status (headed debug audit)

The pre-implementation audit passed the then-current (longer) Fn route, all three plane labels/mappings and 3-4-5 oracles, live update, and Cartesian restoration on C. The target top-level route is shortened because `CirCLE` and `LinE` now belong under `CEntrE`; that newly integrated route is not yet verified.

Evidence: `/tmp/el400-audit-ManualPatterns.json` (`US-030`) and `/tmp/el400-audit/patterns/us030-yz.png`.

## Automated Coverage

[`e2e/05-pattern-generation/US-030-polar-coordinates.spec.ts`](../../../e2e/05-pattern-generation/US-030-polar-coordinates.spec.ts) is the executable browser coverage. It must exercise all three physical plane pairs and live movement rather than only label cycling. New route coverage remains unverified until Main runs the integrated suite.

## Related Stories

- US-016 / US-017: radial geometry expressed as target positions
- US-003 / US-004: Cartesian mode and linear-unit preservation

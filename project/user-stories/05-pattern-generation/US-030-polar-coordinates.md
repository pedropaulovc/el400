# US-030: Polar Coordinates

**Priority:** P4  
**Category:** Pattern Generation  
**Manual reference:** [EL400 Operation Manual](https://www.dropros.com/documents/EL400%20OpManual.pdf) §9.1.7, pp. 58–59; [EL400 overview video](https://www.youtube.com/watch?v=7W47KPCu7jE) §2.13

## User Story

**As a** milling operator  
**I want** a live radius/angle view in any principal plane  
**So that** I can inspect positions defined in polar coordinates

## Target Acceptance Criteria

- [x] **AC30.1:** Set any required Cartesian axis values before entry. Press Fn, navigate the top-level ring `CEntrE` → `LinEAr` → `PoLAr`, and press ENT.
- [x] **AC30.2:** 4/6 cycles the three plane choices and ENT accepts one. Seven-segment `h-Y`, `h-Z`, and `Y-Z` represent the manual's X-Y, X-Z, and Y-Z planes.
- [x] **AC30.3:** In X-Y, X displays radius and Y displays angle; in X-Z, X displays radius and Z displays angle; in Y-Z, Y displays radius and Z displays angle. The unused axis is blank.
- [x] **AC30.4:** Radius is the Euclidean magnitude of the selected Cartesian coordinate pair before radius/diameter readout scaling, converted to the current linear unit. Angle is `atan2(second-axis, first-axis)` after applying each axis's Direction/Z-depth orientation, in degrees; inch/mm selection does not change it. Diameter settings do not distort this geometry. The manual does not specify the diameter interaction; this is the simulator's explicit convention.
- [x] **AC30.5:** Radius and angle update live as either selected physical axis moves; entering Polar does not change the stored Cartesian coordinates.
- [x] **AC30.6:** C exits and restores the live Cartesian X/Y/Z display with its prior mode and unit.

## Operator Procedure and Independent Oracles
These examples use radius mode and oriented Cartesian readings of `(3, 4)`, not unconditionally positive raw encoder travel:


- X-Y with X=`3`, Y=`4`: X radius=`5.0000`, Y angle=`53.1301`, Z blank.
- X-Z with X=`3`, Z=`4`: X radius=`5.0000`, Z angle=`53.1301`, Y blank.
- Y-Z with Y=`3`, Z=`4`: Y radius=`5.0000`, Z angle=`53.1301`, X blank.

While X-Y is active, changing X from 3 to 4 with Y=4 must update the display to radius `5.6569`, angle `45.0000`. Exit must reveal Cartesian `(4,4)` unchanged by the view transformation.

## Verification

The headed pattern pass supersedes the baseline's unverified shortened route. It verified `CEntrE` → `LinEAr` → `PoLAr`, all three plane labels and mappings, independent 3-4-5 oracles, live X-Y updates, Cartesian restoration, and radius conversion between millimetres and inches while the angle remained in degrees. Movement used visible debug physical-millimetre controls; no physical encoder was exercised.

See the [verification evidence, source snapshots, and full-suite results](../README.md#verification).

## Automated coverage

[`e2e/05-pattern-generation/US-030-polar-coordinates.spec.ts`](../../../e2e/05-pattern-generation/US-030-polar-coordinates.spec.ts) exercises all three physical plane pairs and live movement.

## Related Stories

- US-016 / US-017: radial geometry expressed as target positions
- US-003 / US-004: Cartesian mode and linear-unit preservation

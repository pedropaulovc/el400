# US-015: Center of Circle Macro

**Priority:** P3  
**Category:** Calculations  
**Manual reference:** EL400 Operation Manual §8.4, pp. 42–43 (three-point circle center and distance-to-go); §8.5, pp. 43–44 (separate line-center routine); display text table, pp. 85–86 (`CEntrE`, `CirCLE`, `LinE`, `Point`, `inuAL d`)

## User Story

**As a** machine operator  
**I want** to capture three perimeter points and receive live distance-to-go to their circle center  
**So that** I can center a circular workpiece from the front panel

## Target Acceptance Criteria

- [ ] **AC15.1:** From the normal display, Fn shows `CEntrE`; ENT opens the nested center submenu with `CirCLE` selected by default.
- [ ] **AC15.2:** 4/6 toggles the center submenu between `CirCLE` and `LinE`. ENT on `CirCLE` starts circle capture; it must not silently start the two-point line routine.
- [ ] **AC15.3:** The Z window visibly identifies `Point 1`, `Point 2`, and `Point 3` during the three capture phases.
- [ ] **AC15.4:** At each perimeter location, 6 stores the current X/Y point and advances the prompt. The recommended procedure is to traverse only X between points 1 and 2 and only Y between points 2 and 3, matching the manual illustration.
- [ ] **AC15.5:** After point 3, X and Y show live distance-to-go from the current machine position to the computed center, and Z shows `CEntrE`.
- [ ] **AC15.6:** The center result uses the terminal function decimal shown in the primary manual's center-result image, without placing a marker on the textual Z label.
- [ ] **AC15.7:** Moving the table toward the center updates X/Y continuously; both read exactly `0.0000` at the computed center.
- [ ] **AC15.8:** Duplicate or collinear captures do not create a center. The display shows `inuAL d` and restarts circle point capture so the operator can retry.
- [ ] **AC15.9:** C exits from the submenu, capture, result, or invalid state and restores the previous unit/mode and live coordinate display.

## Operator Procedure and Independent Oracle

1. Start in the normal display and press Fn, ENT (`CEntrE`), then ENT on the default `CirCLE` choice.
2. At perimeter point 1, press 6. Traverse X only to point 2 and press 6. Traverse Y only to point 3 and press 6.
3. Read X/Y distance-to-go while Z reads `CEntrE`; move both displayed values to zero.

For points `(0,0)`, `(10,0)`, and `(10,10)`, the geometric center is `(5,5)`. Immediately after the third capture at `(10,10)`, the independent expected distance-to-go is X=`-5.0000`, Y=`-5.0000`; at physical `(5,5)` it is zero on both axes. `(0,0)`, `(10,0)`, `(20,0)` is the collinear invalid control.

## Baseline Audit Status (headed debug audit)

The pre-implementation audit found correct three-point arithmetic and live move-to-zero only through the alternate Fn→6 `CirCLE` route. Fn→`CEntrE`→ENT incorrectly entered line capture; Point labels and result `CEntrE` were absent; collinear input failed silently. The function marker, live DTG, C exit, and ABS/mm restoration passed on the alternate route. These are baseline facts, not post-change verification.

Evidence: `/tmp/el400-audit-ManualCalculations.json` (`US-015`) and `/tmp/el400-audit/calculations/us015-*.png`.

## Automated Coverage

- [`e2e/04-calculations/US-015-center-circle-macro.spec.ts`](../../../e2e/04-calculations/US-015-center-circle-macro.spec.ts) contains the visible duplicate/collinear invalid-and-retry scenarios.
- [`e2e/02-core-operations/US-007-center-finding.spec.ts`](../../../e2e/02-core-operations/US-007-center-finding.spec.ts) covers the nested `CEntrE` submenu, `CirCLE` default/`LinE` toggle, Point prompts, `CEntrE` result, and live debug distance-to-go to zero.

The common Axis marker assertion and all newly changed scenarios remain unverified until Main runs the integrated suite.

## Related Stories

- US-006 / US-007: half and two-point center methods
- US-016 / US-017: patterns that consume known center coordinates

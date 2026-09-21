# US-015: Center of Circle Macro

**Priority:** P3  
**Category:** Calculations  
**Manual reference:** [EL400 Operation Manual](https://www.dropros.com/documents/EL400%20OpManual.pdf) §8.4, pp. 42–43 (three-point circle center and distance-to-go); §8.5, pp. 43–44 (separate line-center routine); display text table, pp. 85–86 (`CEntrE`, `CirCLE`, `LinE`, `Point`, `inuAL d`)

## User Story

**As a** machine operator  
**I want** to capture three perimeter points and receive live distance-to-go to their circle center  
**So that** I can center a circular workpiece from the front panel

## Target Acceptance Criteria

- [x] **AC15.1:** From the normal display, Fn shows `CEntrE`; ENT opens the nested center submenu with `CirCLE` selected by default.
- [x] **AC15.2:** 4/6 toggles the center submenu between `CirCLE` and `LinE`. ENT on `CirCLE` starts circle capture; it must not silently start the two-point line routine.
- [x] **AC15.3:** The Z window visibly identifies `Point 1`, `Point 2`, and `Point 3` during the three capture phases.
- [x] **AC15.4:** At each perimeter location, 6 stores the current X/Y point and advances the prompt. The recommended procedure is to traverse only X between points 1 and 2 and only Y between points 2 and 3, matching the manual illustration.
- [x] **AC15.5:** After point 3, X and Y show live distance-to-go from the current machine position to the computed center, and Z shows `CEntrE`.
- [x] **AC15.6:** The center result uses the terminal function decimal shown in the primary manual's center-result image, without placing a marker on the textual Z label.
- [x] **AC15.7:** Moving the table toward the center updates X/Y continuously; both read exactly `0.0000` at the computed center.
- [x] **AC15.8:** Duplicate or collinear captures do not create a center. The display shows `inuAL d` and restarts circle point capture so the operator can retry.
- [x] **AC15.9:** C exits from the submenu, capture, result, or invalid state and restores the previous unit/mode and live coordinate display.

## Operator Procedure and Independent Oracle

1. Start in the normal display and press Fn, ENT (`CEntrE`), then ENT on the default `CirCLE` choice.
2. At perimeter point 1, press 6. Traverse X only to point 2 and press 6. Traverse Y only to point 3 and press 6.
3. Read X/Y distance-to-go while Z reads `CEntrE`; move both displayed values to zero.

For points `(0,0)`, `(10,0)`, and `(10,10)`, the geometric center is `(5,5)`. Immediately after the third capture at `(10,10)`, the independent expected distance-to-go is X=`-5.0000`, Y=`-5.0000`; at physical `(5,5)` it is zero on both axes. `(0,0)`, `(10,0)`, `(20,0)` is the collinear invalid control.

## Verification

The first headed calculation pass verified the repaired Fn → `CEntrE` → `CirCLE` route, point prompts, independent center geometry, live movement to zero, result label, function markers, retry, and exit. It found that duplicate and collinear captures restarted at `Point 1` without a readable `inuAL d`. The targeted center recheck supersedes that failure. Duplicate and collinear inputs both showed `inuAL d` with `Point 1`, remained visible through polling and debug movement, and cleared only after a fresh capture or exit. Fresh point sets then produced the independently calculated centers and reached `0.0000` on both axes through visible jogs.

The center recheck targeted the repaired invalid-feedback path and relied on the earlier headed pass for the other criteria. See the [verification evidence, source snapshots, and full-suite results](../README.md#verification).

Movement used visible debug physical-position and jog controls. No physical encoder hardware or installed screen-reader speech was exercised.

## Automated coverage

[`e2e/04-calculations/US-015-center-circle-macro.spec.ts`](../../../e2e/04-calculations/US-015-center-circle-macro.spec.ts) covers duplicate and collinear invalid-and-retry behavior. [`e2e/02-core-operations/US-007-center-finding.spec.ts`](../../../e2e/02-core-operations/US-007-center-finding.spec.ts) covers the shared nested menu, prompts, result label, and live distance-to-go.

## Related Stories

- US-006 / US-007: half and two-point center methods
- US-016 / US-017: patterns that consume known center coordinates

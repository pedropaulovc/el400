# US-019: Angle Hole (Linear Hole Pattern)

**Priority:** P4  
**Category:** Pattern Generation  
**Manual reference:** EL400 Operation Manual §9.1.4, pp. 53–54

## User Story

**As a** machine operator  
**I want** distance-to-go guidance for equally spaced holes on an angled line  
**So that** I can drill a straight pattern at any orientation

## Target Acceptance Criteria

- [ ] **AC19.1:** Angle Hole starts only from ABS mode and visibly requests first-hole X (`EntCnt0`), first-hole Y (`EntCnt1`), positive pitch, line angle, and hole count.
- [ ] **AC19.2:** Angle is measured anticlockwise from +X: 0° advances +X, 90° advances +Y, 180° advances −X, and 270° advances −Y.
- [ ] **AC19.3:** Hole $n$ is $start+(n-1)·pitch·[cos(angle),sin(angle)]$. Therefore the final hole is **(holes−1) pitches** from the first, not holes×pitch.
- [ ] **AC19.4:** Final ENT enters live X/Y distance-to-go to hole 1. Only numeric distance-to-go axes use the pattern function marker.
- [ ] **AC19.5:** 6/4 navigate and wrap; 8 toggles a visible current-hole view with X=`hoLES` and the 1-based hole number in Y.
- [ ] **AC19.6:** 2 opens visible specific-hole entry with X=`hoLES` and the numeric buffer in Y. All digits, including 2/4/6/8, are data; ENT accepts only a safe in-range integer and returns to its distance-to-go.
- [ ] **AC19.7:** C leaves the macro and restores the normal ABS coordinate display.

## Operator Procedure and Independent Oracles

For start `(10,5)`, pitch `20`, angle `30°`, six holes, expected targets are:

`(10,5)`, `(27.3205,15)`, `(44.6410,25)`, `(61.9615,35)`, `(79.2820,45)`, `(96.6025,55)`.

The last target is five pitches from the first. Axis convention controls are start `(0,0)`, pitch `10`, five holes: at 0° expect `(0,0)` through `(40,0)`; at 90° expect `(0,0)` through `(0,40)`. Jump to hole 4 proves that the arrow-labelled key is treated as a digit during jump entry.

## Baseline Audit Status (headed debug audit)

The pre-implementation audit passed all visible setup prompts, the six 30° targets, the 0° and 90° controls, 4/6 navigation, and wrap. The old story incorrectly described the endpoint as holes×pitch. Direct jump worked only for non-arrow digits; the jump prompt was invisible and hole 4 could not be entered. These are baseline observations only.

Evidence: `/tmp/el400-audit-ManualPatterns.json` (`US-019`) and `/tmp/el400-audit/patterns/us019-vertical.png`.

## Automated Coverage

[`e2e/05-pattern-generation/US-019-angle-hole.spec.ts`](../../../e2e/05-pattern-generation/US-019-angle-hole.spec.ts) is the executable browser coverage. It should compare displayed DTG against the independent target list and exercise visible jump entry. New checks remain unverified until Main runs the integrated suite.

## Related Stories

- US-020: two-dimensional Grid pattern
- US-029: axis-aligned, unbounded Linear Bolt Hole function

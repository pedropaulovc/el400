# US-016: Bolt Circle Drilling — Full Circle

**Priority:** P4  
**Category:** Pattern Generation  
**Manual reference:** EL400 Operation Manual §9.1.1, pp. 45–47, especially the PCD result image on p. 46 and additional controls on p. 47

## User Story

**As a** machine operator  
**I want** distance-to-go guidance for evenly spaced holes around a full circle  
**So that** I can drill a bolt pattern from the front panel

## Target Acceptance Criteria

- [ ] **AC16.1:** The PCD key starts the macro only from ABS mode and initially shows `CirCLE`; ENT accepts that default (6 selects `ArC` for US-017).
- [ ] **AC16.2:** The visible entry sequence is center X (`EntCnt0`), center Y (`EntCnt1`), positive radius, starting angle measured anticlockwise from +X, and 2–999 holes.
- [ ] **AC16.3:** Final ENT enters INC distance-to-go for hole 1. Only numeric distance-to-go axes show the leading function decimal depicted by the primary p. 46 PCD image; prompts and number-entry views do not.
- [ ] **AC16.4:** For hole number $n$ of $N$, the target angle is $a_0+(n-1)360°/N$; 360° is not duplicated as another endpoint.
- [ ] **AC16.5:** X/Y distance-to-go updates from the live physical position and reads zero at the selected hole.
- [ ] **AC16.6:** 6 advances and wraps last→first; 4 goes backward and wraps first→last.
- [ ] **AC16.7:** 8 opens a visible current-hole phase with X=`hoLES` and the 1-based hole number in Y; pressing 8 again returns to that hole's distance-to-go.
- [ ] **AC16.8:** 2 opens a visible specific-hole entry phase with X=`hoLES` and the numeric buffer in Y. All keypad digits, including 2/4/6/8, are data while that phase is active; ENT accepts only a safe in-range integer and returns to its distance-to-go.
- [ ] **AC16.9:** C from distance-to-go or current-number view exits to the normal ABS display without altering the datum. In jump entry, C backspaces entered digits; with an empty buffer it cancels the request and returns to distance-to-go.

## Operator Procedure and Independent Oracle

Enter center `(0,0)`, radius `10`, start `0°`, and four holes. Independently expected targets are `(10,0)`, `(0,10)`, `(-10,0)`, and `(0,-10)`. Move to each target until X/Y read zero; exercise forward/backward wrap, 8→8, and jumps to holes 3 and 4 (the latter proves arrow-digit entry).

## Baseline Audit Status (headed debug audit)

The pre-implementation audit passed the ABS guard, entry prompts, four target positions, live distance-to-go, 4/6 navigation and wrap, and C exit. It found no leading function marker, no visible current-number or jump prompt, and an arrow/digit collision that prevented jumps to numbers containing 2/4/6/8. These observations are the baseline, not verification of the target fixes.

Evidence: `/tmp/el400-audit-ManualPatterns.json` (`US-016`) and `/tmp/el400-audit/patterns/us016-active.png`.

## Automated Coverage

[`e2e/05-pattern-generation/US-016-bolt-hole-circle.spec.ts`](../../../e2e/05-pattern-generation/US-016-bolt-hole-circle.spec.ts) is the executable real-control coverage. It must cover the independent target list and visible navigation phases; store/input-buffer assertions alone do not satisfy this story. New checks remain unverified until Main runs the integrated suite.

## Related Stories

- US-017: Arc Bolt Hole
- US-024: automatic milling-function near-zero warning

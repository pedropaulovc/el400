# US-020: Grid Drilling Pattern

**Priority:** P4  
**Category:** Pattern Generation  
**Manual reference:** EL400 Operation Manual §9.1.5, pp. 55–56; MagXact Grid procedure (secondary clarification that current position is an X/Y index pair and specific-hole request is unavailable)

## User Story

**As a** machine operator  
**I want** distance-to-go guidance for a possibly rotated rectangular grid  
**So that** I can drill rows and columns without calculating each coordinate

## Target Acceptance Criteria

- [ ] **AC20.1:** Grid starts only from ABS mode and visibly requests first-hole X/Y, positive Pitch X/Y, grid angle, Holes X, and Holes Y.
- [ ] **AC20.2:** The X-grid direction is `[cos(a), sin(a)]`; the Y-grid direction is perpendicular, `[-sin(a), cos(a)]`.
- [ ] **AC20.3:** For zero-based column $j$ and row $i$, target position is `start + j·pitchX·Xdir + i·pitchY·Ydir`.
- [ ] **AC20.4:** There are exactly `holesX × holesY` targets in row-major order: X index advances within a row, then Y index advances.
- [ ] **AC20.5:** Final ENT enters live X/Y distance-to-go to index pair `(1,1)`. Only numeric distance-to-go axes use the pattern function marker.
- [ ] **AC20.6:** 6/4 move through the row-major targets and wrap at the two ends.
- [ ] **AC20.7:** 8 opens a visible current-number phase with the 1-based **column in X**, 1-based **row in Y**, and Z blank; pressing 8 again returns to that target's distance-to-go.
- [ ] **AC20.8:** Grid has **no key-2 direct jump**. Pressing 2 in normal grid navigation must not enter a jump phase or change the selected target; this is the documented difference from the other point-pattern macros.
- [ ] **AC20.9:** C exits and restores the normal ABS coordinate display.

## Operator Procedure and Independent Oracles

For start `(0,0)`, Pitch X `10`, Pitch Y `8`, angle `0°`, 3×3, the row-major targets are `(0,0)`, `(10,0)`, `(20,0)`, `(0,8)`, `(10,8)`, `(20,8)`, `(0,16)`, `(10,16)`, `(20,16)`. At target 5, the 8 phase must visibly identify X index 2 and Y index 2.

For start `(0,0)`, pitches `1,1`, angle `45°`, 2×2, expected targets are `(0,0)`, `(0.7071,0.7071)`, `(-0.7071,0.7071)`, `(0,1.4142)`.

## Baseline Audit Status (headed debug audit)

The pre-implementation audit passed all setup prompts, all nine axis-aligned targets, the 45° geometry, row-major order, 4/6 navigation, and wrap. Key 8 showed no visible X/Y index pair. The simulator incorrectly accepted a key-2 direct jump, with the same invisible prompt and arrow-digit collision as other patterns, even though Grid explicitly excludes that request. These are baseline facts only.

Evidence: `/tmp/el400-audit-ManualPatterns.json` (`US-020`) and `/tmp/el400-audit/patterns/us020-rotated.png`.

## Automated Coverage

[`e2e/05-pattern-generation/US-020-grid-drilling.spec.ts`](../../../e2e/05-pattern-generation/US-020-grid-drilling.spec.ts) is the executable browser coverage. It must enumerate the independent target lists, observe the visible X/Y index pair, and include the negative key-2 control. New checks remain unverified until Main runs the integrated suite.

## Related Stories

- US-019: one-dimensional angled pattern
- US-016: common distance-to-go navigation, except Grid has no direct jump

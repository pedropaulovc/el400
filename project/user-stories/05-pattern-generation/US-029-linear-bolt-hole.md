# US-029: Linear Bolt Hole

**Priority:** P4  
**Category:** Pattern Generation  
**Manual reference:** EL400 Operation Manual §9.1.6, pp. 57–58; EL400 overview video §2.13 (top-level Fn choices and axis-aligned line-hole description)

## User Story

**As a** milling operator  
**I want** repeated distance-to-go targets at a fixed pitch on X, Y, or Z  
**So that** I can drill an equally spaced axis-aligned line

## Target Acceptance Criteria

- [ ] **AC29.1:** Press Fn, navigate from the default `CEntrE` top-level item to `LinEAr`, and press ENT. `CirCLE`/`LinE` belong to the nested `CEntrE` submenu and are not extra top-level steps.
- [ ] **AC29.2:** The visible `AXIS` phase accepts a genuine physical X, Y, or Z axis. The selected axis is reset as directed by the manual before pitch entry.
- [ ] **AC29.3:** Enter a positive `PitCh` in the current linear unit and confirm it with ENT.
- [ ] **AC29.4:** Confirming the documented axis-and-pitch flow enters counting mode and shows live distance-to-go to the first hole (zero on the reset selected axis); the other two axes remain ordinary live coordinates.
- [ ] **AC29.5:** Each 6 advances the target by one pitch on the selected axis: hole $n$ is `(n−1)·pitch` from the reset origin. 4 steps backward but clamps at hole 1; there is no count-based wrap.
- [ ] **AC29.6:** Only the active numeric distance-to-go axis uses the pattern function marker.
- [ ] **AC29.7:** C exits and restores the normal ABS coordinate display.
- [ ] **AC29.8:** There is **no hole-count prompt or terminal count**. Those behaviors are unsupported by the EL400 procedure and must not gate entry into navigation.

## Operator Procedure and Independent Oracles

Enter Linear Bolt Hole, choose each of X/Y/Z in turn, reset the chosen axis, and enter pitch `10 mm`. The first target is `0`; successive 6 presses produce target positions `10`, `20`, and `30 mm` on only the chosen axis. Move the selected physical axis to 10 mm and verify the second target reads zero while the sequence continues forward without a count prompt or wrap.

## Baseline Audit Status (headed debug audit)

The pre-implementation audit reached `LinEAr`, selected X/Y/Z, and observed correct pitch increments after supplying an extra count. It confirmed the authoritative workflow failure: after pitch the simulator showed `hoLES`; pressing the manual's documented 6 entered the digit 6 instead of advancing. The old story's count and wrap criteria described the implementation defect, not the manual. This is baseline evidence only.

Evidence: `/tmp/el400-audit-ManualPatterns.json` (`US-029`) and `/tmp/el400-audit/patterns/us029-undocumented-holes.png`.

## Automated Coverage

[`e2e/05-pattern-generation/US-029-linear-bolt-hole.spec.ts`](../../../e2e/05-pattern-generation/US-029-linear-bolt-hole.spec.ts) is the executable browser coverage. It must exercise X, Y, and Z through the real front panel/debug position controls and negatively assert that no count gate appears. New checks remain unverified until Main runs the integrated suite.

## Related Stories

- US-019: finite angled hole pattern with an explicit hole count
- US-020: finite two-dimensional Grid pattern

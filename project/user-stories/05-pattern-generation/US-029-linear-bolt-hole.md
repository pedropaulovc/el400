# US-029: Linear Bolt Hole

**Priority:** P4  
**Category:** Pattern Generation  
**Manual reference:** [EL400 Operation Manual](https://www.dropros.com/documents/EL400%20OpManual.pdf) §9.1.6, pp. 57–58; [EL400 overview video](https://www.youtube.com/watch?v=7W47KPCu7jE) §2.13 (top-level Fn choices and axis-aligned line-hole description)

## User Story

**As a** milling operator  
**I want** repeated distance-to-go targets at a fixed pitch on X, Y, or Z  
**So that** I can drill an equally spaced axis-aligned line

## Target Acceptance Criteria

- [x] **AC29.1:** Press Fn, navigate from the default `CEntrE` top-level item to `LinEAr`, and press ENT. `CirCLE`/`LinE` belong to the nested `CEntrE` submenu and are not extra top-level steps.
- [x] **AC29.2:** The visible `AXIS` phase accepts a genuine physical X, Y, or Z axis. The selected axis is reset as directed by the manual before pitch entry.
- [x] **AC29.3:** Enter a positive `PitCh` in the current linear unit and confirm it with ENT.
- [x] **AC29.4:** Confirming the documented axis-and-pitch flow enters counting mode and shows live distance-to-go to the first hole (zero on the reset selected axis); the other two axes remain ordinary live coordinates.
- [x] **AC29.5:** Each 6 advances the target by one pitch on the selected axis: hole $n$ is `(n−1)·pitch` from the reset origin. 4 steps backward but clamps at hole 1; there is no count-based wrap.
- [x] **AC29.6:** Only the active numeric distance-to-go axis uses the pattern function marker.
- [x] **AC29.7:** C exits and restores the normal ABS coordinate display.
- [x] **AC29.8:** There is **no hole-count prompt or terminal count**. Those behaviors are unsupported by the EL400 procedure and must not gate entry into navigation.

## Operator Procedure and Independent Oracles

Enter Linear Bolt Hole, choose each of X/Y/Z in turn, reset the chosen axis, and enter pitch `10 mm`. The first target is `0`; successive 6 presses produce target positions `10`, `20`, and `30 mm` on only the chosen axis. Move the selected physical axis to 10 mm and verify the second target reads zero while the sequence continues forward without a count prompt or wrap.

## Verification

The headed pattern pass supersedes the baseline undocumented count gate. It verified the corrected top-level route, the visible axis choice for X/Y/Z, pitch-only entry with no hole-count prompt, first-target clamp, unbounded forward progression, selected-axis-only distance-to-go and marker, live movement to zero, and exit. The run extended well beyond the old finite behavior but did not seek a numeric overflow limit because the source procedure has no terminal count. No physical encoder or drilling operation was exercised.

See the [verification evidence, source snapshots, and full-suite results](../README.md#verification).

## Automated coverage

[`e2e/05-pattern-generation/US-029-linear-bolt-hole.spec.ts`](../../../e2e/05-pattern-generation/US-029-linear-bolt-hole.spec.ts) exercises X, Y, and Z through the front panel and visible debug position controls and checks that no count gate appears.

## Related Stories

- US-019: finite angled hole pattern with an explicit hole count
- US-020: finite two-dimensional Grid pattern

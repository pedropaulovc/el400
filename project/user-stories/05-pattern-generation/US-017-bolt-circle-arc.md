# US-017: Bolt Circle Drilling: Arc

**Priority:** P4  
**Category:** Pattern Generation  
**Manual reference:** [EL400 Operation Manual](https://www.dropros.com/documents/EL400%20OpManual.pdf) §9.1.2, pp. 48–50

## User Story

**As a** machine operator  
**I want** distance-to-go guidance for evenly spaced holes between two arc endpoints  
**So that** I can drill a partial bolt pattern

## Target Acceptance Criteria

- [x] **AC17.1:** From ABS mode, press PCD, press 6 once to change the default `CirCLE` choice to `ArC`, then press ENT.
- [x] **AC17.2:** Enter center X/Y, positive radius, start angle, end angle, and the number of holes through visible prompts.
- [x] **AC17.3:** Angles are measured anticlockwise from +X. If end is numerically below start, the arc crosses 0° anticlockwise.
- [x] **AC17.4:** Both endpoints are holes. For $N>1$, spacing is the anticlockwise arc span divided by **$N-1$**, not by $N$. A zero span after angle normalization rejects multiple holes at the hole-count prompt instead of stacking coincident targets; a single hole at the start angle remains valid. Use Circle for a full revolution.
- [x] **AC17.5:** Final ENT enters live X/Y distance-to-go to hole 1 with the pattern function marker on numeric result axes.
- [x] **AC17.6:** 6/4 navigate and wrap. The visible 8 current-hole phase, second-8 return, visible 2 jump phase, arrow-digit entry, and C behavior are the same as US-016.
- [x] **AC17.7:** A one-hole arc resolves to the start endpoint; the implementation must not divide by zero or invent a second endpoint.

## Operator Procedure and Independent Oracles

For center `(0,0)`, radius `10`, start `0°`, end `180°`, four holes, the expected targets are `(10,0)`, `(5,8.6603)`, `(-5,8.6603)`, and `(-10,0)`: three equal 60° intervals across four endpoint-inclusive holes.

For the wrap case 350°→10° with four holes, expected angles are `350°`, `356.6667°`, `3.3333°`, and `10°`, with targets approximately `(9.8481,-1.7365)`, `(9.9831,-0.5814)`, `(9.9831,0.5814)`, `(9.8481,1.7365)`.

## Verification

The headed pattern pass supersedes the shared baseline navigation defects. It verified the visible arc setup, endpoint-inclusive `N-1` spacing, anticlockwise crossing through 0°, one-hole behavior, live movement to zero, wrapping, current-hole view, and visible jump entry with an arrow-labelled digit. No physical encoder, spindle, or drilled workpiece was exercised.

See the [verification evidence, source snapshots, and full-suite results](../README.md#verification).

## Automated coverage

[`e2e/05-pattern-generation/US-017-bolt-hole-arc.spec.ts`](../../../e2e/05-pattern-generation/US-017-bolt-hole-arc.spec.ts) compares displayed distance-to-go with independent endpoint calculations.

## Related Stories

- US-016: Full Circle PCD and shared navigation
- US-018: Arc Contouring

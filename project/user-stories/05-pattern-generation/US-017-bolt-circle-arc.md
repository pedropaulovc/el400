# US-017: Bolt Circle Drilling — Arc

**Priority:** P4  
**Category:** Pattern Generation  
**Manual reference:** EL400 Operation Manual §9.1.2, pp. 48–50

## User Story

**As a** machine operator  
**I want** distance-to-go guidance for evenly spaced holes between two arc endpoints  
**So that** I can drill a partial bolt pattern

## Target Acceptance Criteria

- [ ] **AC17.1:** From ABS mode, press PCD, press 6 once to change the default `CirCLE` choice to `ArC`, then press ENT.
- [ ] **AC17.2:** Enter center X/Y, positive radius, start angle, end angle, and the number of holes through visible prompts.
- [ ] **AC17.3:** Angles are measured anticlockwise from +X. If end is numerically below start, the arc crosses 0° anticlockwise.
- [ ] **AC17.4:** Both endpoints are holes. For $N>1$, spacing is the anticlockwise arc span divided by **$N-1$**, not by $N$.
- [ ] **AC17.5:** Final ENT enters live X/Y distance-to-go to hole 1 with the pattern function marker on numeric result axes.
- [ ] **AC17.6:** 6/4 navigate and wrap. The visible 8 current-hole phase, second-8 return, visible 2 jump phase, arrow-digit entry, and C behavior are the same as US-016.
- [ ] **AC17.7:** A one-hole arc resolves to the start endpoint; the implementation must not divide by zero or invent a second endpoint.

## Operator Procedure and Independent Oracles

For center `(0,0)`, radius `10`, start `0°`, end `180°`, four holes, the expected targets are `(10,0)`, `(5,8.6603)`, `(-5,8.6603)`, and `(-10,0)`: three equal 60° intervals across four endpoint-inclusive holes.

For the wrap case 350°→10° with four holes, expected angles are `350°`, `356.6667°`, `3.3333°`, and `10°`, with targets approximately `(9.8481,-1.7365)`, `(9.9831,-0.5814)`, `(9.9831,0.5814)`, `(9.8481,1.7365)`.

## Baseline Audit Status (headed debug audit)

The pre-implementation audit passed the entry sequence, both independent geometries, endpoint inclusion, 4/6 navigation, and wrap. The common visible current-number/jump and arrow-digit defects from US-016 were still present in the shared navigation behavior. This is baseline evidence only.

Evidence: `/tmp/el400-audit-ManualPatterns.json` (`US-017`) and `/tmp/el400-audit/patterns/us017-wrap.png`.

## Automated Coverage

[`e2e/05-pattern-generation/US-017-bolt-hole-arc.spec.ts`](../../../e2e/05-pattern-generation/US-017-bolt-hole-arc.spec.ts) covers this operator surface. Geometry assertions must compare displayed distance-to-go with the independent endpoints above rather than merely repeat the production formula. New checks remain unverified until Main runs the integrated suite.

## Related Stories

- US-016: Full Circle PCD and shared navigation
- US-018: Arc Contouring

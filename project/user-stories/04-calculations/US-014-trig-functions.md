# US-014: Trigonometric Calculator Functions

**Priority:** P3  
**Category:** Calculations  
**Manual reference:** [EL400 Operation Manual](https://www.dropros.com/documents/EL400%20OpManual.pdf) §7.6, pp. 31–32; display text table, p. 86 (`S in`, `CoS`, `tAn`, `AS in`, `ACoS`, `AtAn`, `inF uAL`)

## User Story

**As a** machine operator  
**I want** degree-based trigonometric calculations on the DRO  
**So that** I can solve angular machining problems without an external calculator

## Target Acceptance Criteria

- [x] **AC14.1:** In calculator mode, repeated Y presses select SIN, COS, TAN, ASIN, ACOS, and ATAN after the four arithmetic operations.
- [x] **AC14.2:** SIN, COS, and TAN interpret their input in degrees. Representative results are `sin(30°) = 0.5000`, `cos(60°) = 0.5000`, and `tan(45°) = 1.0000`.
- [x] **AC14.3:** ASIN, ACOS, and ATAN return degrees. Representative results are `asin(0.5) = 30.0000`, `acos(0.5) = 60.0000`, and `atan(1) = 45.0000`.
- [x] **AC14.4:** Results appear in X with the calculator's four-decimal rendering contract.
- [x] **AC14.5:** Inputs outside the ASIN/ACOS domain and undefined tangent values such as 90° display `inF vAL`; a stale numeric result is not left on screen.
- [x] **AC14.6:** A trig result remains available to the next operation in the same calculator session, as specified by US-013.
- [x] **AC14.7:** Pressing Calculator exits and restores the live DRO without changing machine coordinates, ABS/INC, or inch/mm state.

## Operator Procedure

1. Press Calculator and key the input in X.
2. Press Y until the required function label appears.
3. Press ENT; read the result in X.
4. Either select another operation to chain from that result or press Calculator to exit.

Angular values are degrees regardless of the linear inch/mm selection.

## Verification

The headed calculation pass verified degree-based trig chaining, four-decimal results, domain and tangent errors, C recovery, and restoration of the live DRO. The later calculator recheck, after the literal-entry repair, supersedes the input-display failure found during the center recheck. It visibly entered `30` and obtained `cos(30°) = 0.8660`, displayed `inF vAL` for `asin(1.1)`, then used C and obtained `atan(1) = 45.0000`.

The repaired input and recovery paths were rechecked; direct examples for every function were covered by the earlier headed pass rather than independently repeated at one source checkpoint. See the [verification evidence, source snapshots, and full-suite results](../README.md#verification).

No installed screen-reader speech was assessed.

## Automated coverage

[`e2e/04-calculations/US-014-trig-functions.spec.ts`](../../../e2e/04-calculations/US-014-trig-functions.spec.ts) exercises the Calculator, Y, keypad, ENT, and display surfaces.

## Related Stories

- US-013: Basic Calculator Functions and chaining
- US-019 / US-020: pattern geometry uses the same degree convention

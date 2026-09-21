# US-014: Trigonometric Calculator Functions

**Priority:** P3  
**Category:** Calculations  
**Manual reference:** EL400 Operation Manual §7.6, pp. 31–32; display text table, p. 86 (`S in`, `CoS`, `tAn`, `AS in`, `ACoS`, `AtAn`, `inF uAL`)

## User Story

**As a** machine operator  
**I want** degree-based trigonometric calculations on the DRO  
**So that** I can solve angular machining problems without an external calculator

## Target Acceptance Criteria

- [ ] **AC14.1:** In calculator mode, repeated Y presses select SIN, COS, TAN, ASIN, ACOS, and ATAN after the four arithmetic operations.
- [ ] **AC14.2:** SIN, COS, and TAN interpret their input in degrees. Representative results are `sin(30°) = 0.5000`, `cos(60°) = 0.5000`, and `tan(45°) = 1.0000`.
- [ ] **AC14.3:** ASIN, ACOS, and ATAN return degrees. Representative results are `asin(0.5) = 30.0000`, `acos(0.5) = 60.0000`, and `atan(1) = 45.0000`.
- [ ] **AC14.4:** Results appear in X with the calculator's four-decimal rendering contract.
- [ ] **AC14.5:** Inputs outside the ASIN/ACOS domain and undefined tangent values such as 90° display `inF vAL`; a stale numeric result is not left on screen.
- [ ] **AC14.6:** A trig result remains available to the next operation in the same calculator session, as specified by US-013.
- [ ] **AC14.7:** Pressing Calculator exits and restores the live DRO without changing machine coordinates, ABS/INC, or inch/mm state.

## Operator Procedure

1. Press Calculator and key the input in X.
2. Press Y until the required function label appears.
3. Press ENT; read the result in X.
4. Either select another operation to chain from that result or press Calculator to exit.

Angular values are degrees regardless of the linear inch/mm selection.

## Baseline Audit Status (headed debug audit)

The pre-implementation audit passed all six direct functions, degree input/output, four-decimal rendering, and invalid-domain/singularity indications (`asin(1.1)`, `acos(-1.1)`, and `tan(90°)`). Chaining the result into arithmetic failed because of the shared calculator-chain defect recorded in US-013. These results describe the baseline only.

Evidence: `/tmp/el400-audit-ManualCalculations.json` (`US-014`) and `/tmp/el400-audit/calculations/us014-atan-result.png`.

## Automated Coverage

[`e2e/04-calculations/US-014-trig-functions.spec.ts`](../../../e2e/04-calculations/US-014-trig-functions.spec.ts) is the executable browser coverage for this story. It uses the actual Calculator, Y, keypad, ENT, and display surfaces; no window/store injection is part of the story contract. New chain coverage remains unverified until Main runs the integrated suite.

## Related Stories

- US-013: Basic Calculator Functions and chaining
- US-019 / US-020: pattern geometry uses the same degree convention

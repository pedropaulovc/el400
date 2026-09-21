# US-013: Basic Calculator Functions

**Priority:** P3  
**Category:** Calculations  
**Manual reference:** EL400 Operation Manual §7.6, pp. 31–32 (calculator selection and illustrated chained calculation); display text table, p. 86 (`Add`, `SUb`, `mULtI`, `dIv`, `inF uAL`)

## User Story

**As a** machine operator  
**I want** to perform and chain calculations on the DRO  
**So that** I can compute dimensions without leaving the machine

## Target Acceptance Criteria

- [ ] **AC13.1:** Press Calculator to enter calculator mode; press Calculator again to leave it. Entry does not alter the current ABS/INC or inch/mm selection, and exit restores the continuously updated live axis display rather than writing the calculator result into machine position.
- [ ] **AC13.2:** The X window accepts the first operand. Pressing Y cycles in order through `Add`, `SUb`, `mULtI`, `dIv`, then the six functions in US-014.
- [ ] **AC13.3:** For a binary operation, selecting the operation commits the displayed first operand, the keypad enters the second operand, and ENT displays the result in X.
- [ ] **AC13.4:** Addition, subtraction, multiplication, and division use ordinary operand order. Operator checks include `2.5 + 3.75 = 6.2500`, `10 - 3.5 = 6.5000`, `2.5 × 4 = 10.0000`, and `10 ÷ 4 = 2.5000`.
- [ ] **AC13.5:** `+/-` changes the sign of the value currently being entered.
- [ ] **AC13.6:** A displayed result can be the first operand of the next operation without leaving calculator mode. The manual chain `12 + 34 = 46`, then `+ 56`, must produce `102.0000`.
- [ ] **AC13.7:** Arithmetic can also consume a trig result without leaving calculator mode. For example, `cos(30°)`, then `× 7`, produces `6.0622` at four-decimal display precision.
- [ ] **AC13.8:** Calculator values retain the simulator's four-decimal rendering contract.
- [ ] **AC13.9:** Division by zero, a non-finite result, or a finite result that cannot be represented accurately in the calculator display is reported as `inF vAL`; it must not silently display a rounded or incorrect integer as exact.
- [ ] **AC13.10:** C removes the current numeric entry in the same manner as normal numeric entry; it does not corrupt the committed operand or the live DRO position.

## Operator Procedure and Oracles

1. Press Calculator.
2. Enter the first value in X.
3. Press Y until the required operation is shown.
4. Enter the second value and press ENT.
5. To chain, press Y to choose the next operation while the result is still displayed, enter the next value, and press ENT.
6. Press Calculator again to return to the live DRO.

In addition to the chain above, use `99999999 × 99999999` as a finite-range guard: JavaScript's nearby rounded value must not be presented as an exact calculator result.

## Baseline Audit Status (headed debug audit)

The pre-implementation audit passed calculator entry/exit, the four single arithmetic operations, Y cycling, sign change, four-decimal results, division-by-zero indication, and preservation of live position/mode/unit state. It confirmed two gaps: a result could not start the next operation, and `99999999 × 99999999` displayed an inaccurate finite integer without an error. These are baseline observations, not verification of the target changes.

Evidence: `/tmp/el400-audit-ManualCalculations.json` (`US-013`) and screenshots under `/tmp/el400-audit/calculations/`.

## Automated Coverage

- [`e2e/04-calculations/US-013-basic-calculator.spec.ts`](../../../e2e/04-calculations/US-013-basic-calculator.spec.ts) exercises the real calculator controls.
- US-014 owns the direct trig/domain scenarios used by the mixed-chain criterion.

New or changed checks are not considered verified until the integrated E2E run completes.

## Related Stories

- US-014: Trigonometric Calculator Functions
- US-003 / US-004: mode and unit state preserved while calculator is active

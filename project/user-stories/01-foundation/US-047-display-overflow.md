# US-047: Fixed-Width Display Overflow

**Authority:** [EL400 Operation Manual](https://www.dropros.com/documents/EL400%20OpManual.pdf) specification: “7 Digits with +/- indicator 7 Segment LED.”  
**Priority:** P1

## User Story
**As a** machinist  
**I want** every numeric result to respect the fixed seven-digit panel  
**So that** the simulator never invents extra display cells or silently shows a misleading number

## Target Acceptance Criteria
- [x] **AC 47.1:** The numeric magnitude has seven digit cells; the sign has its own cell. At four decimals the maximum magnitude is `999.9999`; at three decimals it is `9999.999`.
- [x] **AC 47.2:** The simulator-defined keypad policy clamps an entered linear value in display space to `10^(7-decimals) - 10^(-decimals)`, preserves its sign, and stores the corresponding unit/scale-adjusted value.
- [x] **AC 47.3:** Connected ABS presets, INC presets and disconnected/manual entry recompute to the same clamped value; clamping is not a render-only substitution.
- [x] **AC 47.4:** Exact-boundary and smaller values are unchanged. The limit applies in the active displayed unit.
- [x] **AC 47.5:** Radius/diameter composition is performed in display space: a diameter-mode entry stores half the capped display value and never produces an eighth numeric cell.
- [x] **AC 47.6:** A later derived finite coordinate that rounds outside the panel uses the simulator-defined all-dashes overflow indication rather than clamping or showing an inaccurate integer. Returning in range restores the numeric display.
- [x] **AC 47.7:** Source decoding remains source-sensitive: CNCjs engineering-millimetre positions are not rescaled by `SC`; only a simulated raw-scale source with installed encoder resolution applies the configured/installed scale ratio before overflow is evaluated.

## Authority Boundary
The manual establishes digit width only. Entry clamping, the exact formula, diameter composition, all-dashes derived overflow and recovery are explicit simulator contracts; they are not attributed to undocumented EL400 firmware behavior.

## Verification
The headed runs covered signed overlong entry, four- and three-decimal limits, inch and millimetre display-space limits, connected ABS and INC, disconnected/manual entry, exact-boundary values, diameter composition and derived overflow recovery. A targeted recheck confirmed symmetric `±5000.000` radius midpoints from exact stored `±4999.9995`, recovery of `±9999.999` on return to diameter, and seven-dash overflow without an extra display cell. Raw debug-source and CNCjs rechecks separately confirmed the source-decoding distinction. These policies are simulator contracts; they are not claims about undocumented physical firmware behavior.

## Evidence
- [Verification index and headed-session reports](../README.md#verification)
- [`e2e/01-foundation/US-047-display-overflow.spec.ts`](../../../e2e/01-foundation/US-047-display-overflow.spec.ts)

## Related Stories
US-002 (sign/source transforms), US-022 (display resolution), US-040 (angular display), US-041 (radius/diameter).

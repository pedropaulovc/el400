# US-047: Fixed-Width Display Overflow

**Authority:** EL400 Operation Manual specifications: “7 Digits with +/- indicator 7 Segment LED.”  
**Priority:** P1

## User Story
**As a** machinist  
**I want** every numeric result to respect the fixed seven-digit panel  
**So that** the simulator never invents extra display cells or silently shows a misleading number

## Target Acceptance Criteria
- [ ] **AC 47.1:** The numeric magnitude has seven digit cells; the sign has its own cell. At four decimals the maximum magnitude is `999.9999`; at three decimals it is `9999.999`.
- [ ] **AC 47.2:** The simulator-defined keypad policy clamps an entered linear value in display space to `10^(7-decimals) - 10^(-decimals)`, preserves its sign, and stores the corresponding unit/scale-adjusted value.
- [ ] **AC 47.3:** Connected ABS presets, INC presets and disconnected/manual entry must recompute to the same clamped value; clamping is not a render-only substitution.
- [ ] **AC 47.4:** Exact-boundary and smaller values are unchanged. The limit applies in the active displayed unit.
- [ ] **AC 47.5:** Radius/diameter composition is performed in display space: a diameter-mode entry stores half the capped display value and never produces an eighth numeric cell.
- [ ] **AC 47.6:** A later derived finite coordinate that rounds outside the panel uses the simulator-defined all-dashes overflow indication rather than clamping or showing an inaccurate integer. Returning in range restores the numeric display.
- [ ] **AC 47.7:** Source decoding remains source-sensitive: CNCjs engineering-millimetre positions are not rescaled by `SC`; only a simulated raw-scale source with installed encoder resolution applies the configured/installed scale ratio before overflow is evaluated.

## Authority Boundary
The manual establishes digit width only. Entry clamping, the exact formula, diameter composition, all-dashes derived overflow and recovery are explicit simulator contracts; they are not attributed to undocumented EL400 firmware behavior.

## Baseline Audit (headed debug source)
- **Passed:** positive and negative overlong entry, four-/three-decimal limits, inch/mm display-space limits, connected ABS and INC storage behavior, exact boundary, smaller values, diameter composition and recovery.
- **Not covered by that audit:** the separate disconnected/manual adapter. Post-audit changes remain pending Main's integrated verification.

## Evidence
- Runtime audit: `/tmp/el400-audit-ManualCore.json` (`US-047`)
- Screenshot: `/tmp/el400-audit/core/overflow.png`
- E2E: [`e2e/01-foundation/US-047-display-overflow.spec.ts`](../../../e2e/01-foundation/US-047-display-overflow.spec.ts)

## Related Stories
US-002 (sign/source transforms), US-022 (display resolution), US-040 (angular display), US-041 (radius/diameter).

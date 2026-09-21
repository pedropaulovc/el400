# US-048: Screen Reader Support

**Reference:** WCAG 2.1 Name, Role, Value; Info and Relationships; ARIA live regions
**Priority:** High (P1)
**Category:** Accessibility

## User Story

**As a** user of browser accessibility features  
**I want** meaningful names, states, structure, and live position updates  
**So that** assistive technology has a usable representation of the simulator

## Target Acceptance Criteria

- [x] **AC 48.1:** Every simulator button has a descriptive accessible name from its existing `sr-only` text, including axis select/zero, keypad, primary functions, and secondary functions.
- [x] **AC 48.2:** Direction keys are named `8 (Up)`, `2 (Down)`, `4 (Left)`, and `6 (Right)`; other digit keys use the bare digit.
- [x] **AC 48.3:** A table named `Axis positions` exposes X/Y/Z values. Each value cell (`axis-value-x`, `axis-value-y`, `axis-value-z`) is `aria-live="polite"` and `aria-atomic="true"` and follows the rendered position.
- [x] **AC 48.4:** Native fieldsets are named `Positioning mode`, `Measurement units`, and `Status` by their legends.
- [x] **AC 48.5:** Indicators are disabled status radios whose checked state follows ABS/INC, inch/mm, and status state; they are not operable controls.
- [x] **AC 48.6:** Axis-select buttons expose the current selection with `aria-pressed`; momentary function buttons are not falsely described as persistent toggles.
- [x] **AC 48.7:** Level-two headings identify `Axis display`, `Axis selection`, `Numeric keypad`, `Primary functions`, and `Secondary functions`.
- [x] **AC 48.8:** The duplicated visual seven-segment layer and purely decorative chrome are hidden from the accessibility tree, while the `Electronica Logo` image remains named and exposed.

## Baseline Audit

The completed headed Chromium accessibility-tree audit passed all criteria. A visible debug X jog changed the live X cell from 0.0000 to 0.0394; checked radio and `aria-pressed` states followed real UI actions; all named groups/headings and hidden/exposed elements were inspected. This verifies the DOM and browser accessibility-tree contract. No NVDA, Narrator, JAWS, VoiceOver, or actual speech output was run, so this story does not claim particular spoken phrases or end-to-end AT speech behavior.

## Verification Procedure

Use role/accessibility snapshots plus real actions in [`e2e/08-accessibility/US-048-screen-reader-support.spec.ts`](../../../e2e/08-accessibility/US-048-screen-reader-support.spec.ts). Check names, roles, states, grouping, headings, live-cell attributes/value changes, and hidden duplicate visuals. Role queries validate the browser's accessible-name computation; they are not a substitute for claiming an unperformed screen-reader session.

## References

- [WCAG 2.1 Name, Role, Value](https://www.w3.org/WAI/WCAG21/Understanding/name-role-value)
- [WCAG 2.1 Info and Relationships](https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships)
- [ARIA live regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Live_Regions)

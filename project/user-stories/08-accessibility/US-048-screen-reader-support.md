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
- [x] **AC 48.9:** The external machine-connection message has `role="status"` and follows visible Connected/Disconnected transitions from the production CNCjs adapter path.

## Verification notes

Headed Chromium inspection covered browser-computed names, roles, grouping, headings, checked/pressed state, and hidden decorative layers. A keyboard change to the visible physical-X input moved the production value cell to 25.0000 while `aria-live="polite"` and `aria-atomic="true"` remained present. A dedicated mock CNCjs service drove the production adapter through Connected, Disconnected, and Connected transitions; the same visible machine-connection text was exposed by `role="status"`.

This proves browser DOM and accessibility semantics plus live-region mutation. No NVDA, Narrator, JAWS, VoiceOver, or actual screen-reader speech was run, so it does not establish spoken wording or end-to-end speech behavior.

## Verification Procedure

Use role/accessibility snapshots plus real actions in [`e2e/08-accessibility/US-048-screen-reader-support.spec.ts`](../../../e2e/08-accessibility/US-048-screen-reader-support.spec.ts). Check names, roles, states, grouping, headings, live-cell attributes/value changes, hidden duplicate visuals, and machine-connection status transitions. Role queries validate the browser's accessible-name computation; they do not substitute for a screen-reader session. See the [verification evidence and full-suite results](../README.md#verification).

## References

- [WCAG 2.1 Name, Role, Value](https://www.w3.org/WAI/WCAG21/Understanding/name-role-value)
- [WCAG 2.1 Info and Relationships](https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships)
- [ARIA live regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Live_Regions)

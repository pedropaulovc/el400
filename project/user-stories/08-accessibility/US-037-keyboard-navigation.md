# US-037: Keyboard Navigation

**Reference:** WCAG 2.1 Keyboard, Focus Order, and Focus Visible
**Priority:** High (P1)
**Category:** Accessibility

## User Story

**As a** keyboard-only user  
**I want** to reach and activate every simulator control in a predictable order  
**So that** mouse or touch input is not required

## Target Acceptance Criteria

- [x] **AC 37.1:** All enabled simulator buttons are native, Tab-focusable controls; Enter and Space activate a focused button.
- [x] **AC 37.2:** Keypad DOM/Tab order is `key-1` through `key-9`, then `key-0`, `key-sign`, `key-decimal`, `key-clear`, and `key-enter`; CSS may arrange the visual calculator layout without changing that order.
- [x] **AC 37.3:** Axis selection/zero, numeric entry, ABS/INC, and inch/mm operations can be completed solely by focus plus Enter/Space.
- [x] **AC 37.4:** Every focused simulator control has a clearly visible focus indicator, including in forced-colors mode.
- [x] **AC 37.5:** Directional keypad buttons have accessible names `8 (Up)`, `2 (Down)`, `4 (Left)`, and `6 (Right)`; ordinary digit names remain bare.
- [x] **AC 37.6:** The debug panel's controls remain outside the simulator shortcut scope and do not corrupt the simulator's internal focus order.

## Verification notes

The headed session tabbed through the exact 14-control keypad order and activated axis selection, numeric entry, Enter, Space, ABS/INC, units, and axis zero operations from the keyboard. Directional accessible names matched the criteria. A visible physical-mm spinbutton accepted keyboard-only input, and typing `A` there stayed native input instead of toggling ABS/INC. Focus outlines remained visible in normal and forced-colors rendering.

## Verification Procedure

Run [`e2e/08-accessibility/US-037-keyboard-navigation.spec.ts`](../../../e2e/08-accessibility/US-037-keyboard-navigation.spec.ts) against the real simulator. Start from `key-1`, press Tab through all 14 keypad controls, exercise Enter and Space on representative axis/function/keypad buttons, and inspect computed focus styling. Use actual IDs such as `axis-select-x`, `axis-zero-x`, `btn-abs-inc`, and `axis-value-x`; do not add `tabindex` manipulation or fictional selectors. See the [verification evidence and full-suite results](../README.md#verification).

## References

- [WCAG 2.1 Keyboard](https://www.w3.org/WAI/WCAG21/Understanding/keyboard)
- [WCAG 2.1 Focus Order](https://www.w3.org/WAI/WCAG21/Understanding/focus-order)
- [WCAG 2.1 Focus Visible](https://www.w3.org/WAI/WCAG21/Understanding/focus-visible)

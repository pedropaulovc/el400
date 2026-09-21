# US-034: Forced Colors Mode (High Contrast) Support

**Reference:** WCAG 2.1, Windows forced-colors/high-contrast behavior
**Priority:** Critical (P0)
**Category:** Accessibility

## User Story

**As a** user with low vision  
**I want** the simulator to remain legible and operable in forced-colors mode  
**So that** system contrast preferences do not erase readouts, indicators, controls, or focus

## Target Acceptance Criteria

- [x] **AC 34.1:** Lit seven-segment shapes remain visible against the display background with at least 20:1 measured contrast in the accepted dark and light forced-color palettes.
- [x] **AC 34.2:** Unlit shapes are distinct from lit shapes and blend into the display background (approximately 1:1 and below 1.5:1).
- [x] **AC 34.3:** Every simulator button has a visible border and remains distinguishable from the seven-segment display.
- [x] **AC 34.4:** Button foreground/background contrast is at least 17:1 in the accepted palettes.
- [x] **AC 34.5:** Active ABS/INC, inch/mm, and status indicators remain visible; inactive indicators blend into the background without obscuring their labelled groups.
- [x] **AC 34.6:** Focused enabled controls retain a visible focus indicator. Locked controls remain identifiable and natively disabled, while Settings stays enabled and focusable so the operator can unlock the panel.

## Verification notes

Headed Chromium forced-colors emulation was active in light and dark schemes. Lit segments and enabled buttons rendered black on white or white on black, a measured 21:1 in both palettes; unlit segments were transparent. Buttons retained 1.66667 px solid borders. Focused controls had a visible solid outline, including a cyan outline in the dark palette. With keypad lock enabled, 32 front-panel buttons were natively disabled and rendered at opacity 0.5; Settings remained full-opacity, enabled, and visibly focused. The 21:1 locked-control figure describes the CSS foreground/background pair before opacity compositing. This was Chromium emulation, not an installed Windows High Contrast desktop session.

## Verification Procedure

Use [`e2e/08-accessibility/US-034-forced-colors-mode.spec.ts`](../../../e2e/08-accessibility/US-034-forced-colors-mode.spec.ts) with Playwright forced-colors emulation. Inspect the actual `.seg-on`/`.seg-off` elements, representative buttons, active/inactive indicators, and focused controls. Do not use the obsolete `.segment-on`/`.segment-off` selectors or conditional assertions that silently skip missing UI. See the [verification evidence and full-suite results](../README.md#verification).

## References

- [WCAG 2.1 Contrast (Minimum)](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum)
- [WCAG 2.1 Focus Visible](https://www.w3.org/WAI/WCAG21/Understanding/focus-visible)
- [Windows contrast themes](https://support.microsoft.com/en-us/windows/change-color-contrast-in-windows-fedc744c-90ac-69df-aed5-c8a90125e696)

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
- [x] **AC 34.6:** Focused controls retain a visible focus indicator, and all controls remain identifiable and operable.

## Baseline Audit

The completed headed Chromium audit enabled forced-colors emulation and confirmed the browser media query was active. Actual `.seg-on` shapes rendered black, `.seg-off` shapes transparent on the white forced canvas, buttons used black-on-white with 2 px solid borders, and active/inactive indicators remained distinguishable. Prior dark/light captures measured lit segments at 21:1, buttons at 21:1, and off segments/inactive indicators at 1:1. This is browser forced-colors evidence, not a claim of a Windows desktop or assistive-technology speech session.

## Verification Procedure

Use [`e2e/08-accessibility/US-034-forced-colors-mode.spec.ts`](../../../e2e/08-accessibility/US-034-forced-colors-mode.spec.ts) with Playwright forced-colors emulation. Inspect the actual `.seg-on`/`.seg-off` elements, representative buttons, active/inactive indicators, and focused controls. Do not use the obsolete `.segment-on`/`.segment-off` selectors or conditional assertions that silently skip missing UI.

## References

- [WCAG 2.1 Contrast (Minimum)](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum)
- [WCAG 2.1 Focus Visible](https://www.w3.org/WAI/WCAG21/Understanding/focus-visible)
- [Windows contrast themes](https://support.microsoft.com/en-us/windows/change-color-contrast-in-windows-fedc744c-90ac-69df-aed5-c8a90125e696)

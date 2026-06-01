# Plan: Accessibility Retest & Screen Reader Support (US-048)

## Background

Audit of `ACCESSIBILITY.md` against the codebase + user stories found:

- **Screen-reader infrastructure is implemented but has NO user story / AC coverage.**
  `ACCESSIBILITY.md` documents a whole "Screen Reader Support" section (sr-only button
  text, aria-live axis table, fieldset/legend mode grouping, disabled-radio LEDs,
  aria-pressed toggles, sr-only section headings, aria-hidden icons) yet only US-034
  (forced colors), US-037 (keyboard nav), US-038 (keyboard shortcuts) exist. These
  features are untested and unprotected against regression.
- **Two genuine code gaps** vs the doc's "decorative elements use aria-hidden" claim:
  - `src/components/PowerLED.tsx` — decorative power LED, no `aria-hidden`.
  - `src/components/HousingEdge.tsx` — decorative housing edges, no `aria-hidden`.
- **Doc inaccuracy:** ACCESSIBILITY.md says buttons have "transparent borders that become
  visible in forced-colors mode"; borders are colored in normal mode and switch to
  `ButtonText` under forced-colors (`src/index.css`). Wording should match reality.

Baseline: all 13 existing accessibility e2e tests pass. `npm run test:all` is the exit gate.

## Verified ground truth (write tests/ACs against THIS, not assumptions)

- sr-only button text: `DROButton.tsx` (sr-only span), `KeypadSection.tsx`,
  `AxisSelectionSection.tsx`. Buttons are native `<button>`.
- aria-live axis table: `MultiAxisSection.tsx:115` `<table class="sr-only" aria-label="Axis positions">`;
  per-axis cell `aria-live="polite" aria-atomic="true"` via `ScreenReaderAxisValue`.
- Mode grouping: THREE `<fieldset>`s in `MultiAxisSection.tsx` (legends "Positioning mode",
  "Measurement units", "Status"), each wrapping multiple `LEDIndicator`s — NOT one fieldset per LED.
- LEDs: `LEDIndicator.tsx` renders `<input type="radio" disabled readOnly class="sr-only">`
  grouped by `name` (positioning-mode / measurement-units / status).
- aria-pressed: `DROButton.tsx:59` `aria-pressed={isActive}`; only axis-select buttons pass a
  selection `isActive` (selected axis reports `aria-pressed="true"`). The momentary mode buttons
  (`btn-abs-inc`, `btn-toggle-unit`) stay `aria-pressed="false"` and convey state via the
  disabled-radio LED group, not a pressed toggle.
- sr-only headings: "Axis display", "Numeric keypad", "Axis selection", "Primary functions",
  "Secondary functions".
- Decorative icons: `Icon.tsx:259` wrapper `aria-hidden="true"`.
- Near-zero warning: `role="status" aria-live="assertive"` with sr-only "Near zero warning".
- testids exist: `led-abs/inc/inch/mm/fn/sdm/probe`, `btn-abs-inc`, `btn-toggle-unit`,
  `key-0..9`, `key-sign/decimal/clear/enter`, `display-panel`, `el400-simulator`.

## Tasks

### Task 1 — Honor "decorative elements use aria-hidden"
Add `aria-hidden="true"` so screen readers skip purely decorative chrome.
- `src/components/PowerLED.tsx`: outermost `<div>` gets `aria-hidden="true"`.
- `src/components/HousingEdge.tsx`: the decorative gradient/background `<div>`s get
  `aria-hidden="true"`. The top-edge `children` slot (holds the BrandLogo) must REMAIN
  visible to screen readers — only the decorative background div is hidden.
- Tests (RED first): component/integration tests asserting the decorative elements are
  `aria-hidden` and that BrandLogo (alt text) is still reachable.

### Task 2 — US-048 user story + screen-reader regression tests
- Create `project/user-stories/08-accessibility/US-048-screen-reader-support.md` following
  the exact structure of US-034/US-037 (header, `## User Story`, `## Acceptance Criteria`
  with `AC 48.N` checkboxes, `## E2E Test Scenarios`, related stories, references).
  ACs MUST describe the verified ground truth above (including Task 1's aria-hidden).
- Integration test `src/components/screen-reader.integration.test.tsx` (RTL) asserting:
  sr-only button labels, aria-live axis table, three fieldsets+legends, disabled-radio
  LEDs, aria-pressed selection on axis-select buttons (mode buttons stay `false`), sr-only
  section headings, aria-hidden decorative chrome.
- E2E `e2e/08-accessibility/US-048-screen-reader-support.spec.ts` (1–2 critical checks):
  accessible names present + aria-live region exists + an axis-select button's `aria-pressed`
  flips to `true` on selection (momentary mode buttons stay `aria-pressed="false"`).
- Mark US-048 ACs `[x]` only for behaviors the tests actually verify GREEN.

### Task 3 — Documentation accuracy
- `ACCESSIBILITY.md`: fix the "transparent borders" wording to describe the real behavior
  (colored borders in normal mode → `ButtonText` under forced-colors); add PowerLED +
  HousingEdge to the decorative-elements coverage; reference US-048 in the table/references.
- `project/user-stories/README.md`: add US-048 to the `08. Accessibility` table (now 4
  stories) and the foundation roadmap deliverable line.

## Exit Criteria
- `npm run test:all` passes (lint + coverage + e2e + storybook).
- New US-048 doc accurately reflects implemented behavior; every checked AC has a passing test.
- PowerLED + HousingEdge decorative elements are `aria-hidden`; BrandLogo still announced.

# US-048: Screen Reader Support

**Manual Reference:** Accessibility Standards (WCAG 2.1)
**Priority:** High (P1)

## User Story
**As a** user who relies on a screen reader
**I want** the DRO's controls, readout, and indicators announced with meaningful names and live updates
**So that** I can operate the simulator and follow position changes without seeing the screen

## Acceptance Criteria
- [x] **AC 48.1:** Every interactive control (axis select/zero buttons, keypad keys, primary/secondary function buttons) has a descriptive accessible name provided via `sr-only` text rather than relying on the visual icon.
- [x] **AC 48.2:** Directional keypad keys announce their arrow direction: "8 (Up)", "2 (Down)", "4 (Left)", "6 (Right)"; non-directional digit keys announce the bare digit.
- [x] **AC 48.3:** Axis positions are exposed through an `sr-only` table labelled "Axis positions"; each axis value cell is an `aria-live="polite"` `aria-atomic="true"` region that re-announces when the position changes.
- [x] **AC 48.4:** Mode, units, and status indicators are grouped in native `<fieldset>` elements with `<legend>` names "Positioning mode", "Measurement units", and "Status".
- [x] **AC 48.5:** Each LED indicator is a disabled `<input type="radio">` whose `checked` state reflects the current mode/units/status, so assistive tech reports the active option within each group.
- [x] **AC 48.6:** Axis selection buttons expose their selected state via `aria-pressed`; the selected axis is `aria-pressed="true"` and the others `aria-pressed="false"`.
- [x] **AC 48.7:** Every major UI section carries an `sr-only` `<h2>` heading ("Axis display", "Axis selection", "Numeric keypad", "Primary functions", "Secondary functions") for landmark/heading navigation.
- [x] **AC 48.8:** Purely decorative chrome is marked `aria-hidden="true"` so it is not announced: the PowerLED, the HousingEdge bezels, and the seven-segment visual display (which duplicates the live-region value). The BrandLogo image inside the housing edge keeps its `alt` text and remains announced.

## E2E Test Scenarios
```typescript
import { test, expect } from '../helpers/fixtures';

test.describe('US-048: Screen Reader Support', () => {
  test('AC 48.1: interactive controls expose sr-only accessible names', async ({ dro }) => {
    const { page } = dro;
    await expect(page.getByRole('button', { name: 'Select X axis' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Zero X axis' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Abs/Inc' })).toBeVisible();
  });

  test('AC 48.3: zeroing an axis updates its live-region value', async ({ dro }) => {
    const { page } = dro;
    await page.getByRole('button', { name: 'Zero X axis' }).click();
    const xCell = page.getByTestId('axis-value-x');
    await expect(xCell).toHaveAttribute('aria-live', 'polite');
    await expect(xCell).toHaveText(/^-?0(\.0+)?$/);
  });

  test('AC 48.5: LED indicators are disabled radios reflecting current state', async ({ dro }) => {
    const { page } = dro;
    const absRadio = page.getByTestId('led-abs').locator('input[type="radio"]');
    await expect(absRadio).toBeDisabled();
    await expect(absRadio).toBeChecked();
    await page.getByRole('button', { name: 'Abs/Inc' }).click();
    await expect(absRadio).not.toBeChecked();
  });

  test('AC 48.6: axis selection reflects pressed state via aria-pressed', async ({ dro }) => {
    const { page } = dro;
    const yButton = page.getByRole('button', { name: 'Select Y axis' });
    await expect(yButton).toHaveAttribute('aria-pressed', 'false');
    await yButton.click();
    await expect(yButton).toHaveAttribute('aria-pressed', 'true');
  });

  test('AC 48.8: decorative chrome is hidden but the brand logo stays announced', async ({ dro }) => {
    const { page } = dro;
    await expect(page.getByRole('img', { name: 'Electronica Logo' })).toBeAttached();
    await expect(page.getByTestId('axis-display-x')).toHaveAttribute('aria-hidden', 'true');
  });
});
```

## Implementation Details

### sr-only labels over aria-label
Interactive controls render an `<span className="sr-only">` describing the action
(`Select X axis`, `Zero X axis`, `Settings`, `Abs/Inc`, `Toggle units`, …) alongside
the decorative `<Icon>`. The sr-only text contributes the button's accessible name;
`aria-label` is deliberately avoided so the label is part of the DOM text.

### aria-live axis table
`MultiAxisSection` renders two parallel views of the readout:
- A visual seven-segment display (`Axis`), marked `aria-hidden="true"`, for sighted users.
- An `sr-only` `<table aria-label="Axis positions">` whose value cells are
  `aria-live="polite" aria-atomic="true"`. Each cell subscribes to a single axis hook,
  so a position change re-announces only that axis.

### Fieldset + legend grouping
The three indicator clusters use `<fieldset>` + `<legend className="sr-only">`
("Positioning mode", "Measurement units", "Status"). Grouping lets a screen reader
report "X of N" membership for the radios within.

### LED indicators as disabled radios
`LEDIndicator` renders a disabled, read-only `<input type="radio" className="sr-only">`
sharing a `name` per fieldset. `checked` mirrors the live state, so the active option in
each group is announced. The radios are `disabled` because they are status read-outs,
not user controls.

### aria-pressed selection state
`DROButton` forwards `aria-pressed={isActive}`. Axis-select buttons pass
`isActive={activeAxis === axis}`, so the currently selected axis reports
`aria-pressed="true"`. (Momentary function buttons remain `aria-pressed="false"`; their
state is conveyed by the LED radios, not by a pressed toggle.)

### sr-only section headings
Each major section renders an `sr-only` `<h2>` heading so screen-reader users can navigate
by heading and orient within the layout.

### aria-hidden decorative chrome
The PowerLED, both HousingEdge bezels, and the seven-segment visual display are
`aria-hidden="true"`. The BrandLogo `<img alt="Electronica Logo">` lives in the
HousingEdge `children` slot, which is NOT hidden, so the brand name stays in the
accessibility tree.

## Related Stories
- US-034: Forced Colors Mode (visual accessibility)
- US-037: Keyboard Navigation (keyboard operability)
- US-038: Keyboard Shortcuts

## Technical Notes
- `sr-only` is the project-wide convention for screen-reader-only text (visually hidden,
  still in the accessibility tree).
- RTL/Playwright `getByRole` with a name resolves through the same accessible-name
  computation a screen reader uses and excludes `aria-hidden` subtrees, so the tests
  exercise the real assistive-tech surface.

## References
- [WCAG 2.1 Name, Role, Value](https://www.w3.org/WAI/WCAG21/Understanding/name-role-value)
- [WCAG 2.1 Info and Relationships](https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [ARIA live regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Live_Regions)

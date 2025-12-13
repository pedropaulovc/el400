# US-037: Keyboard Navigation

**Manual Reference:** Accessibility Standards (WCAG 2.1)
**Priority:** High (P1)

## User Story
**As a** user who relies on keyboard navigation
**I want** to operate the DRO using only the keyboard
**So that** I can use the simulator without a mouse or touch input

## Acceptance Criteria
- [x] **AC 37.1:** All interactive buttons are focusable via Tab key
- [x] **AC 37.2:** Numeric keypad buttons follow natural numeric order (1-9, 0) for tab navigation
- [x] **AC 37.3:** Enter and Space keys activate focused buttons
- [x] **AC 37.4:** Focus indicators are clearly visible on all buttons
- [x] **AC 37.5:** Users can enter numeric values using keyboard-only interaction
- [x] **AC 37.6:** Mode toggles (ABS/INC, inch/mm) are operable via keyboard
- [x] **AC 37.7:** Axis selection and zeroing are operable via keyboard
- [x] **AC 37.8:** Arrow keys on keypad (2, 4, 6, 8) have directional hints for screen readers

## E2E Test Scenarios
```typescript
describe('US-037: Keyboard Navigation', () => {
  test('keypad buttons follow natural numeric tab order', async ({ page }) => {
    await page.goto('/');

    const firstKey = page.getByTestId('key-1');
    await firstKey.focus();

    const expectedOrder = [
      'key-1', 'key-2', 'key-3',
      'key-4', 'key-5', 'key-6',
      'key-7', 'key-8', 'key-9',
      'key-0', 'key-sign', 'key-decimal',
      'key-clear', 'key-enter'
    ];

    await expect(page.getByTestId('key-1')).toBeFocused();

    for (let i = 1; i < expectedOrder.length; i++) {
      await page.keyboard.press('Tab');
      await expect(page.getByTestId(expectedOrder[i])).toBeFocused();
    }
  });

  test('can enter value using keyboard only', async ({ page }) => {
    await page.goto('/');

    // Select axis
    const xButton = page.getByTestId('axis-select-x');
    await xButton.focus();
    await page.keyboard.press('Enter');

    // Enter value via keyboard
    await page.getByTestId('key-1').focus();
    await page.keyboard.press('Enter');
    await page.getByTestId('key-2').focus();
    await page.keyboard.press('Enter');
    await page.getByTestId('key-3').focus();
    await page.keyboard.press('Enter');
    await page.getByTestId('key-enter').focus();
    await page.keyboard.press('Enter');

    const xValue = page.getByTestId('axis-value-x');
    await expect(xValue).toContainText('123');
  });

  test('can toggle modes using keyboard', async ({ page }) => {
    await page.goto('/');

    const absLed = page.getByTestId('led-abs');
    await expect(absLed.locator('input')).toBeChecked();

    const absIncButton = page.getByTestId('btn-abs-inc');
    await absIncButton.focus();
    await page.keyboard.press('Enter');

    const incLed = page.getByTestId('led-inc');
    await expect(incLed.locator('input')).toBeChecked();
  });

  test('Space key activates buttons', async ({ page }) => {
    await page.goto('/');

    const xButton = page.getByTestId('axis-select-x');
    await xButton.focus();
    await page.keyboard.press('Space');

    await page.getByTestId('key-7').focus();
    await page.keyboard.press('Space');
    await page.getByTestId('key-enter').focus();
    await page.keyboard.press('Space');

    const xValue = page.getByTestId('axis-value-x');
    await expect(xValue).toContainText('7');
  });

  test('focus is visible on buttons', async ({ page }) => {
    await page.goto('/');

    const button = page.getByTestId('key-5');
    await button.focus();

    const outlineStyle = await button.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        outlineWidth: style.outlineWidth,
        outlineStyle: style.outlineStyle,
        boxShadow: style.boxShadow,
      };
    });

    const hasVisibleFocus =
      (outlineStyle.outlineStyle !== 'none' && outlineStyle.outlineWidth !== '0px') ||
      outlineStyle.boxShadow !== 'none';

    expect(hasVisibleFocus).toBe(true);
  });
});
```

## Implementation Details

### Keypad Tab Order
The numeric keypad HTML is ordered 1-9, 0 for natural tab navigation, with CSS Grid used to position buttons in the traditional calculator layout (7-8-9 on top row):

```tsx
<div className="grid grid-cols-3 gap-3">
  <DROButton className="row-start-3 col-start-1">1</DROButton>
  <DROButton className="row-start-3 col-start-2">2</DROButton>
  <DROButton className="row-start-3 col-start-3">3</DROButton>
  <DROButton className="row-start-2 col-start-1">4</DROButton>
  <!-- ... etc -->
</div>
```

### Arrow Key Hints
Directional keypad buttons include screen reader hints:
- Key 8: "8 (Up)"
- Key 4: "4 (Left)"
- Key 6: "6 (Right)"
- Key 2: "2 (Down)"

### Focus Indicators
All buttons use Tailwind's focus ring utilities:
```css
focus:outline-none focus:ring-2 focus:ring-white/50
```

## Related Stories
- US-034: Forced Colors Mode (visual accessibility)
- US-001: First Use and Power-Up Display

## Technical Notes
- Tab order follows DOM order by default; no `tabindex` manipulation needed
- CSS Grid `row-start` and `col-start` control visual position without affecting tab order
- `sr-only` class used for screen reader text that shouldn't be visible

## References
- [WCAG 2.1 Keyboard Accessible](https://www.w3.org/WAI/WCAG21/Understanding/keyboard)
- [WCAG 2.1 Focus Visible](https://www.w3.org/WAI/WCAG21/Understanding/focus-visible)
- [WCAG 2.1 Focus Order](https://www.w3.org/WAI/WCAG21/Understanding/focus-order)

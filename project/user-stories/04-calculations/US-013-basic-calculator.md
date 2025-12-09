# US-013: Basic Calculator Functions

**Priority:** P3
**Category:** Calculations
**Manual Reference:** MATH CALCULATIONS (lines 265-286)

## User Story

**As a** machine operator
**I want** to perform basic math calculations
**So that** I can compute dimensions without external tools

## Acceptance Criteria

- [ ] AC13.1: Pressing calculator key activates calculator mode
- [ ] AC13.2: Pressing calculator key again exits calculator mode
- [ ] AC13.3: Can perform ADD (addition)
- [ ] AC13.4: Can perform SUB (subtraction)
- [ ] AC13.5: Can perform MULTI (multiplication)
- [ ] AC13.6: Can perform DIV (division)
- [ ] AC13.7: Pressing Y key cycles through functions
- [ ] AC13.8: Results display in X window
- [ ] AC13.9: Pressing +/- key changes sign
- [ ] AC13.10: Pressing ENT displays result

## E2E Test Scenarios

```typescript
describe('US-013: Basic Calculator Functions', () => {
  test('activate calculator mode', async ({ page }) => {
    await page.goto('/');

    await page.click('[data-testid="calculator-button"]');

    // Calculator mode active (may show indicator)
    await expect(page.locator('[data-testid="calculator-indicator"]')).toBeVisible();
  });

  test('add 2.5 + 3.75 = 6.25', async ({ page }) => {
    await page.goto('/');

    // Activate calculator
    await page.click('[data-testid="calculator-button"]');

    // Enter first value 2.5 in X window
    await page.evaluate(() => window.enterValue('2.5'));

    // Select ADD function
    await page.click('[data-testid="y-axis-button"]'); // Cycles to ADD
    await expect(page.locator('[data-testid="y-axis-display"]')).toContainText('ADD');

    // Enter second value 3.75 (or press ENT and enter)
    await page.evaluate(() => window.enterValue('3.75'));

    // Press ENT to calculate
    await page.click('[data-testid="ent-button"]');

    // Result in X window
    await expect(page.locator('[data-testid="x-axis-display"]')).toContainText('6.25');
  });

  test('subtract 10 - 3.5 = 6.5', async ({ page }) => {
    await page.goto('/');

    await page.click('[data-testid="calculator-button"]');

    await page.evaluate(() => window.enterValue('10'));
    await page.click('[data-testid="y-axis-button"]'); // Cycle to SUB
    await expect(page.locator('[data-testid="y-axis-display"]')).toContainText('SUB');

    await page.evaluate(() => window.enterValue('3.5'));
    await page.click('[data-testid="ent-button"]');

    await expect(page.locator('[data-testid="x-axis-display"]')).toContainText('6.5');
  });

  test('multiply 2.5 × 4 = 10', async ({ page }) => {
    await page.goto('/');

    await page.click('[data-testid="calculator-button"]');

    await page.evaluate(() => window.enterValue('2.5'));

    // Cycle Y key to MULTI
    await page.click('[data-testid="y-axis-button"]');
    await page.click('[data-testid="y-axis-button"]');
    await expect(page.locator('[data-testid="y-axis-display"]')).toContainText('MULTI');

    await page.evaluate(() => window.enterValue('4'));
    await page.click('[data-testid="ent-button"]');

    await expect(page.locator('[data-testid="x-axis-display"]')).toContainText('10');
  });

  test('divide 10 ÷ 4 = 2.5', async ({ page }) => {
    await page.goto('/');

    await page.click('[data-testid="calculator-button"]');

    await page.evaluate(() => window.enterValue('10'));

    // Cycle Y key to DIV
    await page.click('[data-testid="y-axis-button"]');
    await page.click('[data-testid="y-axis-button"]');
    await page.click('[data-testid="y-axis-button"]');
    await expect(page.locator('[data-testid="y-axis-display"]')).toContainText('DIV');

    await page.evaluate(() => window.enterValue('4'));
    await page.click('[data-testid="ent-button"]');

    await expect(page.locator('[data-testid="x-axis-display"]')).toContainText('2.5');
  });

  test('change sign of value', async ({ page }) => {
    await page.goto('/');

    await page.click('[data-testid="calculator-button"]');

    // Enter positive value
    await page.evaluate(() => window.enterValue('5.5'));

    // Change sign
    await page.click('[data-testid="plus-minus-button"]');

    await expect(page.locator('[data-testid="x-axis-display"]')).toContainText('-5.5');

    // Change back
    await page.click('[data-testid="plus-minus-button"]');

    await expect(page.locator('[data-testid="x-axis-display"]')).toContainText('5.5');
  });

  test('exit calculator mode', async ({ page }) => {
    await page.goto('/');

    await page.click('[data-testid="calculator-button"]');
    await expect(page.locator('[data-testid="calculator-indicator"]')).toBeVisible();

    // Exit calculator
    await page.click('[data-testid="calculator-button"]');

    await expect(page.locator('[data-testid="calculator-indicator"]')).not.toBeVisible();
  });
});
```

## Implementation Notes

- **Calculator mode**: Separate from normal DRO operation
- **Display usage**:
  - X window: Shows input values and results
  - Y window: Shows selected function (ADD, SUB, MULTI, DIV)
  - Z window: May show intermediate values
- **Function cycling**: Y key cycles through math functions
- **Operation flow**:
  1. Enter first value
  2. Select function (press Y repeatedly)
  3. Enter second value
  4. Press ENT for result
- **Sign change**: +/- key toggles sign before or after entry
- **Precision**: Maintains 4 decimal places
- **Error handling**: Division by zero, overflow

## Related Stories

- US-014: Trigonometric Calculator Functions (extends calculator with trig)
- US-010: SDM Direct Entry (calculator useful for coordinate calculations)
- US-013 through US-020: Pattern macros (may need calculations for parameters)

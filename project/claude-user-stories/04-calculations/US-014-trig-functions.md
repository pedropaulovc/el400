# US-014: Trigonometric Calculator Functions

**Priority:** P3
**Category:** Calculations
**Manual Reference:** MATH CALCULATIONS > Functions (lines 274-279)

## User Story

**As a** machine operator
**I want** to calculate sine, cosine, tangent, and their inverses
**So that** I can solve angular machining problems

## Acceptance Criteria

- [ ] AC14.1: Can calculate SIN (sine)
- [ ] AC14.2: Can calculate COS (cosine)
- [ ] AC14.3: Can calculate TAN (tangent)
- [ ] AC14.4: Can calculate ASIN (arcsine)
- [ ] AC14.5: Can calculate ACOS (arccosine)
- [ ] AC14.6: Can calculate ATAN (arctangent)
- [ ] AC14.7: Trig functions accept angles in degrees
- [ ] AC14.8: Inverse trig functions return degrees
- [ ] AC14.9: Results maintain 4 decimal precision

## E2E Test Scenarios

```typescript
describe('US-014: Trigonometric Calculator Functions', () => {
  test('calculate sin(30) = 0.5000', async ({ page }) => {
    await page.goto('/');

    // Activate calculator
    await page.click('[data-testid="calculator-button"]');

    // Enter 30
    await page.evaluate(() => window.enterValue('30'));

    // Cycle Y to SIN function
    await page.click('[data-testid="y-axis-button"]'); // cycle to SIN
    await expect(page.locator('[data-testid="y-axis-display"]')).toContainText('SIN');

    // Calculate
    await page.click('[data-testid="ent-button"]');

    // Result should be 0.5
    await expect(page.locator('[data-testid="x-axis-display"]')).toContainText('0.5000');
  });

  test('calculate cos(60) = 0.5000', async ({ page }) => {
    await page.goto('/');

    await page.click('[data-testid="calculator-button"]');
    await page.evaluate(() => window.enterValue('60'));

    // Cycle to COS
    await page.click('[data-testid="y-axis-button"]'); // cycle to COS
    await expect(page.locator('[data-testid="y-axis-display"]')).toContainText('COS');

    await page.click('[data-testid="ent-button"]');

    await expect(page.locator('[data-testid="x-axis-display"]')).toContainText('0.5000');
  });

  test('calculate tan(45) = 1.0000', async ({ page }) => {
    await page.goto('/');

    await page.click('[data-testid="calculator-button"]');
    await page.evaluate(() => window.enterValue('45'));

    // Cycle to TAN
    await page.click('[data-testid="y-axis-button"]'); // cycle to TAN
    await expect(page.locator('[data-testid="y-axis-display"]')).toContainText('TAN');

    await page.click('[data-testid="ent-button"]');

    await expect(page.locator('[data-testid="x-axis-display"]')).toContainText('1.0000');
  });

  test('calculate asin(0.5) = 30 degrees', async ({ page }) => {
    await page.goto('/');

    await page.click('[data-testid="calculator-button"]');
    await page.evaluate(() => window.enterValue('0.5'));

    // Cycle to ASIN
    await page.click('[data-testid="y-axis-button"]'); // cycle to ASIN
    await expect(page.locator('[data-testid="y-axis-display"]')).toContainText('ASIN');

    await page.click('[data-testid="ent-button"]');

    // Result in degrees
    await expect(page.locator('[data-testid="x-axis-display"]')).toContainText('30');
  });

  test('calculate acos(0.5) = 60 degrees', async ({ page }) => {
    await page.goto('/');

    await page.click('[data-testid="calculator-button"]');
    await page.evaluate(() => window.enterValue('0.5'));

    // Cycle to ACOS
    await page.click('[data-testid="y-axis-button"]'); // cycle to ACOS
    await expect(page.locator('[data-testid="y-axis-display"]')).toContainText('ACOS');

    await page.click('[data-testid="ent-button"]');

    await expect(page.locator('[data-testid="x-axis-display"]')).toContainText('60');
  });

  test('calculate atan(1) = 45 degrees', async ({ page }) => {
    await page.goto('/');

    await page.click('[data-testid="calculator-button"]');
    await page.evaluate(() => window.enterValue('1'));

    // Cycle to ATAN
    await page.click('[data-testid="y-axis-button"]'); // cycle to ATAN
    await expect(page.locator('[data-testid="y-axis-display"]')).toContainText('ATAN');

    await page.click('[data-testid="ent-button"]');

    await expect(page.locator('[data-testid="x-axis-display"]')).toContainText('45');
  });
});
```

## Implementation Notes

- **Angular units**: All angles in degrees, not radians
- **Function list** (cycle through with Y key):
  - ADD, SUB, MULTI, DIV (from US-013)
  - SIN, COS, TAN
  - ASIN, ACOS, ATAN
- **Trig functions**: Take angle in degrees, return ratio
  - sin(30°) = 0.5
  - cos(60°) = 0.5
  - tan(45°) = 1.0
- **Inverse trig functions**: Take ratio, return angle in degrees
  - asin(0.5) = 30°
  - acos(0.5) = 60°
  - atan(1) = 45°
- **Precision**: Maintain 4 decimal places for ratios, degrees may be whole numbers
- **Error handling**: Domain errors (asin > 1, acos > 1), tan(90°)
- **Use cases**: Calculating coordinates on angles, verifying hole positions

## Related Stories

- US-013: Basic Calculator Functions (provides base calculator functionality)
- US-019: Angle Hole Pattern (uses angles for hole placement)
- US-020: Grid Drilling (supports rotated grids with angle parameter)

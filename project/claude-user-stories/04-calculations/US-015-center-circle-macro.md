# US-015: Center of Circle (Macro)

**Priority:** P3
**Category:** Calculations
**Manual Reference:** CENTER-FINDING MACRO ROUTINE (lines 168-191)

## User Story

**As a** machine operator
**I want** to find circle center from 3 perimeter points
**So that** I can center circular workpieces automatically

## Acceptance Criteria

- [ ] AC15.1: Press fn key, displays "CENTER"
- [ ] AC15.2: Press ENT, toggle to "CIRCLE"
- [ ] AC15.3: Press ENT, displays "Point 1"
- [ ] AC15.4: Find perimeter point 1, press 6 to save (Y unchanged for next)
- [ ] AC15.5: Find perimeter point 2, press 6 to save (X unchanged for next)
- [ ] AC15.6: Find perimeter point 3, press 6 to save
- [ ] AC15.7: Display shows "CENTER" with calculated X, Y coordinates
- [ ] AC15.8: Extra decimal point indicates function mode active
- [ ] AC15.9: Zero display by table movement to reach exact center
- [ ] AC15.10: C key exits function

## E2E Test Scenarios

```typescript
describe('US-015: Center of Circle (Macro)', () => {
  test('activate center-finding function', async ({ page }) => {
    await page.goto('/');

    // Press fn key
    await page.click('[data-testid="fn-button"]');

    // Should display CENTER
    await expect(page.locator('[data-testid="z-axis-display"]')).toContainText('CENTER');
  });

  test('select circle mode', async ({ page }) => {
    await page.goto('/');

    await page.click('[data-testid="fn-button"]');

    // Press ENT
    await page.click('[data-testid="ent-button"]');

    // May need to toggle with 4/6 keys to CIRCLE (vs LINE)
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('CIRCLE');

    // Press ENT to confirm
    await page.click('[data-testid="ent-button"]');

    await expect(page.locator('[data-testid="z-axis-display"]')).toContainText('Point 1');
  });

  test('save point 1 coordinates', async ({ page }) => {
    await page.goto('/');

    // Setup function
    await page.click('[data-testid="fn-button"]');
    await page.click('[data-testid="ent-button"]');
    await page.click('[data-testid="ent-button"]');

    // Position at point 1 (example: X=1.0, Y=2.0 on circle perimeter)
    await page.evaluate(() => {
      window.setAxisPosition('X', 1.0);
      window.setAxisPosition('Y', 2.0);
    });

    // Save point 1
    await page.click('[data-testid="6-key"]');

    // Point 1 saved, Y axis should remain locked
  });

  test('save point 2 coordinates (Y locked)', async ({ page }) => {
    await page.goto('/');

    // After saving point 1
    // ... setup ...

    // Move to point 2 (Y must not change from point 1)
    // Only traverse X axis
    await page.evaluate(() => {
      window.setAxisPosition('X', 3.0);
      // Y stays at 2.0 from point 1
    });

    // Save point 2
    await page.click('[data-testid="6-key"]');

    // Point 2 saved, X axis now locked
  });

  test('save point 3 coordinates (X locked)', async ({ page }) => {
    await page.goto('/');

    // After saving points 1 and 2
    // ... setup ...

    // Move to point 3 (X must not change from point 2)
    // Only traverse Y axis
    await page.evaluate(() => {
      // X stays at 3.0 from point 2
      window.setAxisPosition('Y', 3.5);
    });

    // Save point 3
    await page.click('[data-testid="6-key"]');

    // Calculation performed automatically
  });

  test('calculate center coordinates', async ({ page }) => {
    await page.goto('/');

    // After saving all 3 points
    // Example: Points at (1,2), (3,2), (3,3.5)
    // ... setup and save points ...

    // Display should automatically show CENTER
    await expect(page.locator('[data-testid="z-axis-display"]')).toContainText('CENTER');

    // X and Y windows show center coordinates
    // Calculated from 3-point circle algorithm
    const centerX = await page.locator('[data-testid="x-axis-display"]').textContent();
    const centerY = await page.locator('[data-testid="y-axis-display"]').textContent();

    expect(centerX).toMatch(/\d+\.\d{4}/);
    expect(centerY).toMatch(/\d+\.\d{4}/);
  });

  test('display shows CENTER indicator', async ({ page }) => {
    await page.goto('/');

    // After calculation
    // ... setup ...

    await expect(page.locator('[data-testid="z-axis-display"]')).toContainText('CENTER');
  });

  test('extra decimal point visible', async ({ page }) => {
    await page.goto('/');

    // After calculation, function mode active
    // ... setup ...

    // Extra decimal point indicates function mode
    await expect(page.locator('[data-testid="x-decimal-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="y-decimal-indicator"]')).toBeVisible();
  });

  test('exit function with C key', async ({ page }) => {
    await page.goto('/');

    // In center function
    // ... setup ...

    // Exit
    await page.click('[data-testid="c-button"]');

    // Function mode exited
    await expect(page.locator('[data-testid="z-axis-display"]')).not.toContainText('CENTER');
    await expect(page.locator('[data-testid="x-decimal-indicator"]')).not.toBeVisible();
  });
});
```

## Implementation Notes

- **3-point circle algorithm**: Given 3 points, calculate center and radius
- **Constraint method**:
  - Point 1 → 2: Y axis locked (traverse only X)
  - Point 2 → 3: X axis locked (traverse only Y)
  - Creates perpendicular measurements
- **Geometry**:
  - Imagine rectangle touching circle at 3 points
  - Distance between opposing corners = 2R
  - Algorithm solves for center (Xc, Yc)
- **Display**: Shows calculated center as distance-to-go from current position
- **Workflow**:
  1. Position spindle over approximate center
  2. Move back ~2/3 radius
  3. Press fn, ENT, ENT (CIRCLE mode)
  4. Find point 1, press 6
  5. Traverse X only, find point 2, press 6
  6. Traverse Y only, find point 3, press 6
  7. Center calculated and displayed
  8. Move table to zero X and Y
  9. Spindle now exactly over center
- **Alternative to**: US-007 Manual Center Finding

## Related Stories

- US-006: Half Function (manual center-finding method)
- US-007: Center Finding Manual Method (simpler but less automated)
- US-016: Bolt Circle Drilling (uses center coordinates)

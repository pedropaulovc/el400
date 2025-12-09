# US-016: Bolt Circle Drilling - Full Circle

**Priority:** P4
**Category:** Pattern Generation
**Manual Reference:** BOLT CIRCLE DRILLING — FULL CIRCLE (lines 313-328)

## User Story

**As a** machine operator
**I want** to drill evenly-spaced holes around a full circle
**So that** I can create bolt patterns and mounting holes

## Acceptance Criteria

- [ ] AC16.1: Must be in ABS mode to run macro
- [ ] AC16.2: Press PCD key, toggle to "CIRCLE", press ENT
- [ ] AC16.3: Enter X coordinate of center (ENTCNT 0)
- [ ] AC16.4: Enter Y coordinate of center (ENTCNT 1)
- [ ] AC16.5: Enter RADIUS of circle
- [ ] AC16.6: Enter radial ANGLE of first hole (0-359 degrees)
- [ ] AC16.7: Enter number of HOLES (2-999)
- [ ] AC16.8: Display switches to INC mode (distance-to-go)
- [ ] AC16.9: Extra decimal point indicates macro active
- [ ] AC16.10: Pressing 6 key advances to next hole
- [ ] AC16.11: Pressing 4 key returns to previous hole
- [ ] AC16.12: Pressing 8 key shows current hole number
- [ ] AC16.13: Pressing 2 key allows jumping to specific hole
- [ ] AC16.14: Holes evenly distributed around 360°
- [ ] AC16.15: C key exits macro

## E2E Test Scenarios

```typescript
describe('US-016: Bolt Circle Drilling - Full Circle', () => {
  test('activate bolt circle full circle mode', async ({ page }) => {
    await page.goto('/');

    // Must be in ABS mode
    await expect(page.locator('[data-testid="abs-indicator"]')).toHaveClass(/active/);

    // Press PCD key
    await page.click('[data-testid="pcd-button"]');

    // Toggle to CIRCLE (if not already)
    await page.click('[data-testid="6-key"]');
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('CIRCLE');

    await page.click('[data-testid="ent-button"]');
  });

  test('enter circle center coordinates', async ({ page }) => {
    await page.goto('/');

    // Activate PCD CIRCLE mode
    // ... setup ...

    // Should prompt for ENTCNT 0 (X center)
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('ENTCNT 0');

    // Enter X = 1.750
    await page.evaluate(() => window.enterValue('1.750'));
    await page.click('[data-testid="ent-button"]');

    // Should prompt for ENTCNT 1 (Y center)
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('ENTCNT 1');

    // Enter Y = 1.250
    await page.evaluate(() => window.enterValue('1.250'));
    await page.click('[data-testid="ent-button"]');
  });

  test('enter radius value', async ({ page }) => {
    await page.goto('/');

    // After entering center coordinates
    // ... setup ...

    // Should prompt for RADIUS
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('RADIUS');

    // Enter 0.950
    await page.evaluate(() => window.enterValue('0.950'));
    await page.click('[data-testid="ent-button"]');
  });

  test('enter starting angle', async ({ page }) => {
    await page.goto('/');

    // After entering radius
    // ... setup ...

    // Should prompt for ANGLE
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('ANGLE');

    // Enter 20 degrees
    await page.evaluate(() => window.enterValue('20'));
    await page.click('[data-testid="ent-button"]');
  });

  test('enter hole count', async ({ page }) => {
    await page.goto('/');

    // After entering angle
    // ... setup ...

    // Should prompt for number of holes
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('HOLES');

    // Enter 6 holes
    await page.evaluate(() => window.enterValue('6'));
    await page.click('[data-testid="ent-button"]');
  });

  test('display switches to distance-to-go', async ({ page }) => {
    await page.goto('/');

    // After entering all parameters
    // ... setup ...

    // Should switch to INC mode
    await expect(page.locator('[data-testid="inc-indicator"]')).toHaveClass(/active/);

    // Extra decimal point visible
    await expect(page.locator('[data-testid="x-decimal-indicator"]')).toBeVisible();

    // Display shows distance to hole 1
    const xDist = await page.locator('[data-testid="x-axis-display"]').textContent();
    const yDist = await page.locator('[data-testid="y-axis-display"]').textContent();

    expect(xDist).toMatch(/[+-]?\d+\.\d{4}/);
    expect(yDist).toMatch(/[+-]?\d+\.\d{4}/);
  });

  test('navigate to hole 1', async ({ page }) => {
    await page.goto('/');

    // In distance-to-go mode
    // ... setup ...

    // Move table to zero display
    await page.evaluate(() => window.moveToTarget());

    await expect(page.locator('[data-testid="x-axis-display"]')).toContainText('0.0000');
    await expect(page.locator('[data-testid="y-axis-display"]')).toContainText('0.0000');

    // Now at hole 1 position
  });

  test('advance to hole 2 with key 6', async ({ page }) => {
    await page.goto('/');

    // At hole 1
    // ... setup ...

    // Press 6 to advance
    await page.click('[data-testid="6-key"]');

    // Display now shows distance to hole 2
    // Verify hole number indicator shows 2
    await expect(page.locator('[data-testid="hole-number"]')).toContainText('2');
  });

  test('return to hole 1 with key 4', async ({ page }) => {
    await page.goto('/');

    // At hole 2
    // ... setup ...

    // Press 4 to go back
    await page.click('[data-testid="4-key"]');

    // Back at hole 1
    await expect(page.locator('[data-testid="hole-number"]')).toContainText('1');
  });

  test('jump to specific hole number', async ({ page }) => {
    await page.goto('/');

    // In macro mode
    // ... setup ...

    // Press 2 key to request specific hole
    await page.click('[data-testid="2-key"]');

    // Enter hole number 4
    await page.evaluate(() => window.enterValue('4'));
    await page.click('[data-testid="ent-button"]');

    // Now at hole 4
    await expect(page.locator('[data-testid="hole-number"]')).toContainText('4');
  });

  test('verify even hole distribution', async ({ page }) => {
    await page.goto('/');

    // Setup: 6 holes, radius 1.0, starting angle 0
    // ... setup macro ...

    // Calculate expected positions
    // Holes at 0°, 60°, 120°, 180°, 240°, 300°
    const expectedAngles = [0, 60, 120, 180, 240, 300];

    // Verify spacing
    // Angular spacing = 360 / 6 = 60 degrees
    expect(expectedAngles[1] - expectedAngles[0]).toBe(60);
  });

  test('exit macro with C key', async ({ page }) => {
    await page.goto('/');

    // In macro mode
    // ... setup ...

    await page.click('[data-testid="c-button"]');

    // Back to ABS mode
    await expect(page.locator('[data-testid="abs-indicator"]')).toHaveClass(/active/);
    await expect(page.locator('[data-testid="x-decimal-indicator"]')).not.toBeVisible();
  });
});
```

## Implementation Notes

- **Prerequisite**: Must be in ABS mode
- **Parameters**:
  1. Center X, Y coordinates (absolute)
  2. Radius
  3. Starting angle (0-359°, 0° = 3 o'clock position)
  4. Number of holes (evenly distributed around 360°)
- **Angle calculation**: For N holes, spacing = 360° / N
  - Hole angle = start_angle + (i × 360 / N)
- **Position calculation**:
  - X = center_x + radius × cos(angle)
  - Y = center_y + radius × sin(angle)
- **Navigation**: 6=next, 4=prev, 8=show current, 2=jump to specific
- **Use cases**: Flanges, mounting plates, wheel patterns

## Related Stories

- US-003: Absolute vs Incremental Mode (requires ABS mode)
- US-015: Center of Circle Macro (finding center coordinates)
- US-017: Bolt Circle Arc (partial circle variant)
- US-024: Zero Approach Warning (may beep approaching each hole)

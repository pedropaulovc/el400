# US-017: Bolt Circle Drilling - Arc

**Priority:** P4
**Category:** Pattern Generation
**Manual Reference:** BOLT CIRCLE DRILLING — CIRCULAR ARC (lines 329-343)

## User Story

**As a** machine operator
**I want** to drill evenly-spaced holes along a circular arc
**So that** I can create partial bolt patterns

## Acceptance Criteria

- [ ] AC17.1: Press PCD key, toggle to "ARC", press ENT
- [ ] AC17.2: Enter X coordinate of center
- [ ] AC17.3: Enter Y coordinate of center
- [ ] AC17.4: Enter RADIUS
- [ ] AC17.5: Enter radial ANGLE of first hole
- [ ] AC17.6: Enter radial ANGLE of last hole
- [ ] AC17.7: Enter number of HOLES
- [ ] AC17.8: Holes evenly distributed along arc from start to end angle
- [ ] AC17.9: Navigation works same as full circle (6=next, 4=prev)
- [ ] AC17.10: Can span across 0° (e.g., 350° to 10°)

## E2E Test Scenarios

```typescript
describe('US-017: Bolt Circle Drilling - Arc', () => {
  test('activate bolt circle arc mode', async ({ page }) => {
    await page.goto('/');

    // Press PCD key
    await page.click('[data-testid="pcd-button"]');

    // Toggle to ARC
    await page.click('[data-testid="6-key"]');
    await page.click('[data-testid="6-key"]');
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('ARC');

    await page.click('[data-testid="ent-button"]');
  });

  test('enter arc parameters', async ({ page }) => {
    await page.goto('/');

    // Activate ARC mode
    // ... setup ...

    // Enter center X = 1.400
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('ENTCNT 0');
    await page.evaluate(() => window.enterValue('1.400'));
    await page.click('[data-testid="ent-button"]');

    // Enter center Y = 1.100
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('ENTCNT 1');
    await page.evaluate(() => window.enterValue('1.100'));
    await page.click('[data-testid="ent-button"]');

    // Enter radius = 0.700
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('RADIUS');
    await page.evaluate(() => window.enterValue('0.700'));
    await page.click('[data-testid="ent-button"]');
  });

  test('enter start angle 45 degrees', async ({ page }) => {
    await page.goto('/');

    // After center and radius
    // ... setup ...

    // Enter start angle = 45
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('ANGLE');
    await page.evaluate(() => window.enterValue('45'));
    await page.click('[data-testid="ent-button"]');
  });

  test('enter end angle 260 degrees', async ({ page }) => {
    await page.goto('/');

    // After start angle
    // ... setup ...

    // Enter end angle = 260
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('ANGLE'); // or "END ANGLE"
    await page.evaluate(() => window.enterValue('260'));
    await page.click('[data-testid="ent-button"]');
  });

  test('enter 6 holes', async ({ page }) => {
    await page.goto('/');

    // After end angle
    // ... setup ...

    // Enter 6 holes
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('HOLES');
    await page.evaluate(() => window.enterValue('6'));
    await page.click('[data-testid="ent-button"]');

    // Macro calculates positions
  });

  test('verify hole distribution along arc', async ({ page }) => {
    await page.goto('/');

    // Setup: start=45°, end=260°, 6 holes
    // Arc span = 260 - 45 = 215°
    // Spacing = 215 / (6-1) = 43°
    // Holes at: 45°, 88°, 131°, 174°, 217°, 260°

    // ... setup macro ...

    // Verify calculated angles
    const expectedAngles = [45, 88, 131, 174, 217, 260];
    const spacing = (260 - 45) / (6 - 1);
    expect(spacing).toBeCloseTo(43, 1);
  });

  test('navigate between holes', async ({ page }) => {
    await page.goto('/');

    // In arc macro
    // ... setup ...

    // Navigate to hole 1
    await page.evaluate(() => window.moveToTarget());
    await expect(page.locator('[data-testid="hole-number"]')).toContainText('1');

    // Advance to hole 2
    await page.click('[data-testid="6-key"]');
    await expect(page.locator('[data-testid="hole-number"]')).toContainText('2');

    // Back to hole 1
    await page.click('[data-testid="4-key"]');
    await expect(page.locator('[data-testid="hole-number"]')).toContainText('1');
  });

  test('arc spanning across 0 degrees', async ({ page }) => {
    await page.goto('/');

    // Setup: start=350°, end=10°, 4 holes
    // Arc goes 350° → 360° → 0° → 10°
    // Arc span = (360-350) + 10 = 20°
    // Spacing = 20 / 3 = 6.67°
    // Holes at: 350°, 356.67°, 3.33°, 10°

    // ... setup macro with start=350, end=10 ...

    // Verify wrapping works correctly
    // Hole 2 should be at ~357° (350 + 6.67)
    // Hole 3 should be at ~3° (wraps to 0)
  });
});
```

## Implementation Notes

- **Difference from full circle**: User specifies start and end angles, not full 360°
- **Arc span calculation**:
  - If end > start: span = end - start
  - If end < start: span = (360 - start) + end (wraps around 0°)
- **Hole spacing**: span / (holes - 1)
  - Note: holes-1 because we include both endpoints
- **Position calculation**: Same as full circle
  - X = center_x + radius × cos(angle)
  - Y = center_y + radius × sin(angle)
- **Parameters**:
  1. Center X, Y
  2. Radius
  3. Start angle
  4. End angle
  5. Number of holes
- **Use cases**: Partial flanges, slotted mounting patterns
- **Edge case**: start=end creates single hole

## Related Stories

- US-016: Bolt Circle Full (full 360° variant)
- US-018: Arc Contouring (similar arc path but for contouring)
- US-014: Trigonometric Functions (angle calculations)

# US-019: Angle Hole (Linear Hole Pattern)

**Priority:** P4
**Category:** Pattern Generation
**Manual Reference:** DRILLING HOLES IN A LINE — "ANGLE HOLE" (lines 364-377)

## User Story

**As a** machine operator
**I want** to drill evenly-spaced holes along a straight line at any angle
**So that** I can create linear bolt patterns and slot mounting

## Acceptance Criteria

- [ ] AC19.1: Press Angle Hole key
- [ ] AC19.2: Enter X coordinate of first hole (ENTCNT 0)
- [ ] AC19.3: Enter Y coordinate of first hole (ENTCNT 1)
- [ ] AC19.4: Enter PITCH (hole spacing distance)
- [ ] AC19.5: Enter line ANGLE (0-359 degrees)
- [ ] AC19.6: Enter number of HOLES
- [ ] AC19.7: System calculates end point based on holes × pitch
- [ ] AC19.8: Holes positioned along line at specified angle
- [ ] AC19.9: 0° = horizontal right, 90° = vertical up
- [ ] AC19.10: Navigation works (6=next, 4=prev, 2=jump)

## E2E Test Scenarios

```typescript
describe('US-019: Angle Hole (Linear Hole Pattern)', () => {
  test('activate angle hole mode', async ({ page }) => {
    await page.goto('/');

    await page.click('[data-testid="angle-hole-button"]');

    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('ANGLE');
  });

  test('enter first hole coordinates', async ({ page }) => {
    await page.goto('/');

    // Activate angle hole
    // ... setup ...

    // Enter X = 0.45
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('ENTCNT 0');
    await page.evaluate(() => window.enterValue('0.45'));
    await page.click('[data-testid="ent-button"]');

    // Enter Y = 0.65
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('ENTCNT 1');
    await page.evaluate(() => window.enterValue('0.65'));
    await page.click('[data-testid="ent-button"]');
  });

  test('enter pitch spacing 0.5', async ({ page }) => {
    await page.goto('/');

    // After first hole coordinates
    // ... setup ...

    // Enter pitch = 0.5
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('PITCH');
    await page.evaluate(() => window.enterValue('0.5'));
    await page.click('[data-testid="ent-button"]');
  });

  test('enter angle 30 degrees', async ({ page }) => {
    await page.goto('/');

    // After pitch
    // ... setup ...

    // Enter angle = 30
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('ANGLE');
    await page.evaluate(() => window.enterValue('30'));
    await page.click('[data-testid="ent-button"]');
  });

  test('enter 6 holes', async ({ page }) => {
    await page.goto('/');

    // After angle
    // ... setup ...

    // Enter 6 holes
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('HOLES');
    await page.evaluate(() => window.enterValue('6'));
    await page.click('[data-testid="ent-button"]');

    // System calculates positions
  });

  test('verify hole 1 at start point', async ({ page }) => {
    await page.goto('/');

    // Setup: first hole at (0.45, 0.65)
    // ... complete setup ...

    // Navigate to hole 1
    await page.evaluate(() => window.moveToTarget());

    // Should be at start position
    // (distance-to-go shows 0,0 when at hole position)
  });

  test('verify hole spacing equals pitch', async ({ page }) => {
    await page.goto('/');

    // Setup: pitch = 0.5, angle = 30°, 6 holes
    // Hole 1: (0.45, 0.65)
    // Hole 2: (0.45 + 0.5×cos(30°), 0.65 + 0.5×sin(30°))
    //       = (0.45 + 0.433, 0.65 + 0.25)
    //       = (0.883, 0.90)

    // ... setup macro ...

    // Calculate expected positions
    const pitch = 0.5;
    const angle = 30 * Math.PI / 180;

    for (let i = 0; i < 6; i++) {
      const expectedX = 0.45 + i * pitch * Math.cos(angle);
      const expectedY = 0.65 + i * pitch * Math.sin(angle);

      // Verify hole i+1 is at expected position
      // ... navigate to hole i+1 ...
      // ... verify position ...
    }
  });

  test('verify holes follow angle line', async ({ page }) => {
    await page.goto('/');

    // Setup: angle = 30°
    // All holes should lie on a line at 30° from horizontal

    // ... setup macro ...

    // Verify linearity: all holes on same slope
    // Slope = tan(30°) = 0.577
    // ΔY / ΔX should equal tan(30°) for all consecutive holes
  });

  test('horizontal line at 0 degrees', async ({ page }) => {
    await page.goto('/');

    // Setup: angle = 0°, pitch = 1.0, 5 holes, start (0,0)
    // Holes should be at:
    // (0,0), (1,0), (2,0), (3,0), (4,0)

    // ... setup macro with angle=0 ...

    // Verify all Y coordinates are 0
    // Verify X increases by pitch
  });

  test('vertical line at 90 degrees', async ({ page }) => {
    await page.goto('/');

    // Setup: angle = 90°, pitch = 1.0, 5 holes, start (0,0)
    // Holes should be at:
    // (0,0), (0,1), (0,2), (0,3), (0,4)

    // ... setup macro with angle=90 ...

    // Verify all X coordinates are 0
    // Verify Y increases by pitch
  });
});
```

## Implementation Notes

- **Position calculation**:
  - Hole[i].X = start_x + (i × pitch × cos(angle))
  - Hole[i].Y = start_y + (i × pitch × sin(angle))
  - where i = 0, 1, 2, ..., (holes-1)
- **Angle convention**:
  - 0° = horizontal right (+X direction)
  - 90° = vertical up (+Y direction)
  - 180° = horizontal left (-X direction)
  - 270° = vertical down (-Y direction)
- **Parameters**:
  1. First hole X, Y coordinates
  2. Pitch (spacing between holes)
  3. Angle (line direction)
  4. Number of holes
- **End point**: Automatically calculated, not entered
  - End = start + (holes-1) × pitch × [cos(angle), sin(angle)]
- **Use cases**: Slotted mounting, linear fastener patterns, guide rails

## Related Stories

- US-014: Trigonometric Functions (angle calculations)
- US-016: Bolt Circle Full (similar navigation)
- US-020: Grid Drilling (2D extension of linear pattern)

# US-020: Grid Drilling Pattern

**Priority:** P4
**Category:** Pattern Generation
**Manual Reference:** DRILLING A GRID OF HOLES (lines 378-392)

## User Story

**As a** machine operator
**I want** to drill a rectangular grid of holes
**So that** I can create mounting plates and perforation patterns

## Acceptance Criteria

- [ ] AC20.1: Press Grid key
- [ ] AC20.2: Enter X coordinate of first hole (ENTCNT 0)
- [ ] AC20.3: Enter Y coordinate of first hole (ENTCNT 1)
- [ ] AC20.4: Enter PITCH X (spacing in X direction)
- [ ] AC20.5: Enter PITCH Y (spacing in Y direction)
- [ ] AC20.6: Enter ANGLE (grid rotation, 0-359 degrees)
- [ ] AC20.7: Enter HOLES X (number of holes in X direction)
- [ ] AC20.8: Enter HOLES Y (number of holes in Y direction)
- [ ] AC20.9: Total holes = HOLES X × HOLES Y
- [ ] AC20.10: Grid can be rotated by ANGLE parameter
- [ ] AC20.11: Holes numbered sequentially (row by row or column by column)
- [ ] AC20.12: 0° angle creates axis-aligned grid

## E2E Test Scenarios

```typescript
describe('US-020: Grid Drilling Pattern', () => {
  test('activate grid drilling mode', async ({ page }) => {
    await page.goto('/');

    await page.click('[data-testid="grid-button"]');

    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('GRID');
  });

  test('enter starting hole coordinates', async ({ page }) => {
    await page.goto('/');

    // Activate grid mode
    // ... setup ...

    // Enter X = 0
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('ENTCNT 0');
    await page.evaluate(() => window.enterValue('0'));
    await page.click('[data-testid="ent-button"]');

    // Enter Y = 0.250
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('ENTCNT 1');
    await page.evaluate(() => window.enterValue('0.250'));
    await page.click('[data-testid="ent-button"]');
  });

  test('enter X pitch 0.350', async ({ page }) => {
    await page.goto('/');

    // After starting coordinates
    // ... setup ...

    // Enter PITCH X = 0.350
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('PITCH X');
    await page.evaluate(() => window.enterValue('0.350'));
    await page.click('[data-testid="ent-button"]');
  });

  test('enter Y pitch 0.350', async ({ page }) => {
    await page.goto('/');

    // After X pitch
    // ... setup ...

    // Enter PITCH Y = 0.350
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('PITCH Y');
    await page.evaluate(() => window.enterValue('0.350'));
    await page.click('[data-testid="ent-button"]');
  });

  test('enter angle 45 degrees for rotated grid', async ({ page }) => {
    await page.goto('/');

    // After pitches
    // ... setup ...

    // Enter ANGLE = 45
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('ANGLE');
    await page.evaluate(() => window.enterValue('45'));
    await page.click('[data-testid="ent-button"]');
  });

  test('enter 5 holes in X', async ({ page }) => {
    await page.goto('/');

    // After angle
    // ... setup ...

    // Enter HOLES X = 5
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('HOLES X');
    await page.evaluate(() => window.enterValue('5'));
    await page.click('[data-testid="ent-button"]');
  });

  test('enter 5 holes in Y', async ({ page }) => {
    await page.goto('/');

    // After HOLES X
    // ... setup ...

    // Enter HOLES Y = 5
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('HOLES Y');
    await page.evaluate(() => window.enterValue('5'));
    await page.click('[data-testid="ent-button"]');

    // System calculates all positions
  });

  test('verify total 25 holes', async ({ page }) => {
    await page.goto('/');

    // 5 × 5 grid = 25 holes
    // ... setup macro ...

    // Navigate through all holes
    let holeCount = 0;
    // ... press 6 key repeatedly until back to hole 1 ...

    expect(holeCount).toBe(25);
  });

  test('verify hole spacing', async ({ page }) => {
    await page.goto('/');

    // Setup: PITCH X = 0.350, PITCH Y = 0.350, angle = 0°
    // ... setup macro ...

    // Get position of hole 1
    // Get position of hole 2 (next in X direction)
    // Verify X difference = 0.350

    // Get position of hole 6 (next row, same X column)
    // Verify Y difference = 0.350
  });

  test('verify grid rotation', async ({ page }) => {
    await page.goto('/');

    // Setup: angle = 45°, pitch X = 1.0, pitch Y = 1.0
    // Start at (0, 0)

    // ... setup macro ...

    // Hole at row 0, col 1 should be at:
    // X = 0 + 1 × cos(45°) = 0.707
    // Y = 0 + 1 × sin(45°) = 0.707

    // Hole at row 1, col 0 should be at:
    // X = 0 + 1 × cos(45° + 90°) = -0.707
    // Y = 0 + 1 × sin(45° + 90°) = 0.707

    // Verify rotated positions
  });

  test('axis-aligned grid at 0 degrees', async ({ page }) => {
    await page.goto('/');

    // Setup: angle = 0°, PITCH X = 1.0, PITCH Y = 0.5, 3×3 grid
    // Start at (0, 0)

    // ... setup macro ...

    // Expected positions:
    // Row 0: (0,0), (1,0), (2,0)
    // Row 1: (0,0.5), (1,0.5), (2,0.5)
    // Row 2: (0,1.0), (1,1.0), (2,1.0)

    // Verify all positions align with X and Y axes
  });
});
```

## Implementation Notes

- **Position calculation**:
  - For hole at row i, column j:
  - X = start_x + (j × pitch_x × cos(angle)) + (i × pitch_y × cos(angle + 90°))
  - Y = start_y + (j × pitch_x × sin(angle)) + (i × pitch_y × sin(angle + 90°))
  - where i = 0..(holes_y-1), j = 0..(holes_x-1)
- **Hole numbering**: Typically row-major order
  - Hole# = (i × holes_x) + j + 1
  - Example 3×3: holes 1-3 (row 0), 4-6 (row 1), 7-9 (row 2)
- **Parameters**:
  1. First hole X, Y coordinates
  2. Pitch X (spacing in X direction)
  3. Pitch Y (spacing in Y direction)
  4. Angle (grid rotation)
  5. Holes X (columns)
  6. Holes Y (rows)
- **Total holes**: holes_x × holes_y
- **Rotation**:
  - 0° = grid aligned with X/Y axes
  - 45° = diamond pattern
  - Any angle supported
- **Use cases**: Perforation patterns, mounting plates, ventilation grids

## Related Stories

- US-019: Angle Hole (linear pattern, subset of grid)
- US-014: Trigonometric Functions (rotation calculations)
- US-016: Bolt Circle Full (similar navigation)

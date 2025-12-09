# US-023: Setup Menu - Scale Direction

**Priority:** P5
**Category:** Configuration
**Manual Reference:** SETUP MENU > LEFT/RIGHT, Scale Direction (line 50)

## User Story

**As a** machine operator
**I want** to configure axis count direction (LEFT/RIGHT)
**So that** positive/negative signs match my preferred convention

## Acceptance Criteria

- [ ] AC23.1: Navigate to LEFT/RIGHT parameter
- [ ] AC23.2: Default is LEFT (arbitrary)
- [ ] AC23.3: Press 6 key to toggle to RIGHT
- [ ] AC23.4: Changes whether axis counts up or down for given motion
- [ ] AC23.5: Setting is per-axis (X, Y, Z configured independently)
- [ ] AC23.6: Change does not affect current displayed value, only future counts

## E2E Test Scenarios

```typescript
describe('US-023: Setup Menu - Scale Direction', () => {
  test('navigate to scale direction parameter', async ({ page }) => {
    await page.goto('/');

    // Enter setup
    await page.click('[data-testid="wrench-button"]');
    await page.click('[data-testid="x-axis-button"]');

    // Scroll to LEFT/RIGHT parameter
    // ... press 2 key multiple times ...

    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('LEFT');
    // or may show as "DIRECTION" or similar
  });

  test('toggle from LEFT to RIGHT', async ({ page }) => {
    await page.goto('/');

    // Navigate to direction parameter
    // ... setup ...

    await expect(page.locator('[data-testid="value-display"]')).toContainText('LEFT');

    // Toggle with 6 key
    await page.click('[data-testid="6-key"]');

    await expect(page.locator('[data-testid="value-display"]')).toContainText('RIGHT');
  });

  test('verify count direction reverses', async ({ page }) => {
    await page.goto('/');

    // Set to LEFT, save, exit
    // ... setup ...

    const initialX = parseFloat(await page.locator('[data-testid="x-axis-display"]').textContent());

    // Move table left
    await page.evaluate(() => window.simulateMovement('X', 'left', 0.1));

    const newX = parseFloat(await page.locator('[data-testid="x-axis-display"]').textContent());

    // With LEFT, moving left increases value
    expect(newX).toBeGreaterThan(initialX);

    // Now change to RIGHT
    // ... enter setup, change to RIGHT, save, exit ...

    const initialX2 = parseFloat(await page.locator('[data-testid="x-axis-display"]').textContent());

    // Move table left again
    await page.evaluate(() => window.simulateMovement('X', 'left', 0.1));

    const newX2 = parseFloat(await page.locator('[data-testid="x-axis-display"]').textContent());

    // With RIGHT, moving left decreases value
    expect(newX2).toBeLessThan(initialX2);
  });

  test('configure X axis opposite of Y axis', async ({ page }) => {
    await page.goto('/');

    // Set X to LEFT
    await page.click('[data-testid="wrench-button"]');
    await page.click('[data-testid="x-axis-button"]');
    // ... navigate to direction, set LEFT ...

    // Set Y to RIGHT
    await page.click('[data-testid="wrench-button"]');
    await page.click('[data-testid="y-axis-button"]');
    // ... navigate to direction, set RIGHT ...

    // Save and verify independent settings
  });

  test('current display value unchanged', async ({ page }) => {
    await page.goto('/');

    // Record current value
    const currentX = await page.locator('[data-testid="x-axis-display"]').textContent();

    // Change direction
    // ... enter setup, toggle direction, save ...

    // Exit setup
    await page.click('[data-testid="c-button"]');
    await page.click('[data-testid="c-button"]');

    // Verify value unchanged
    await expect(page.locator('[data-testid="x-axis-display"]')).toContainText(currentX);
  });

  test('future motion follows new direction', async ({ page }) => {
    await page.goto('/');

    // Change direction, save
    // ... setup ...

    // Move table and verify new direction in effect
    const initial = parseFloat(await page.locator('[data-testid="x-axis-display"]').textContent());

    await page.evaluate(() => window.simulateMovement('X', 'left', 0.1));

    const after = parseFloat(await page.locator('[data-testid="x-axis-display"]').textContent());

    // Verify direction change (depends on LEFT vs RIGHT setting)
  });
});
```

## Implementation Notes

- **Purpose**: Adapt DRO to physical scale installation
  - Scales can be mounted left/right, front/back of table
  - DRO can't auto-detect orientation
  - This setting corrects sign convention
- **LEFT vs RIGHT**: Arbitrary labels
  - Default is LEFT
  - If counts go "wrong way", toggle to RIGHT
- **Per-axis**: Each axis independent
  - X, Y, Z can have different settings
  - Depends on how scales are physically installed
- **Effect**: Reverses sign of counts
  - Doesn't change current value
  - Only affects future movement
- **Relationship to US-002**: Implements sign convention configuration

## Related Stories

- US-002: Sign Convention and Axis Direction (user-facing behavior)
- US-001: First Use and Power-Up Display (default direction)
- US-027: Save Changes (persist direction settings)

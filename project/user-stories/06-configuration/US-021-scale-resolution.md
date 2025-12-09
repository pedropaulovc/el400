# US-021: Setup Menu - Scale Resolution

**Priority:** P5
**Category:** Configuration
**Manual Reference:** SETUP MENU > SC (Scale Resolution) (line 47)

## User Story

**As a** machine operator
**I want** to configure scale resolution (1 or 5 microns)
**So that** the display reports travel distance correctly

## Acceptance Criteria

- [ ] AC21.1: Press wrench key, displays "SELECT"
- [ ] AC21.2: Press X, Y, or Z to select axis
- [ ] AC21.3: Press 2 key to scroll to "SC" parameter
- [ ] AC21.4: Default is 5 (5 microns for mills)
- [ ] AC21.5: Press 4 key to change to 1.0 (1 micron scales)
- [ ] AC21.6: Other values possible for special scales
- [ ] AC21.7: Press 2 to advance to next parameter
- [ ] AC21.8: Must save changes before exit (SAV CHG)

## E2E Test Scenarios

```typescript
describe('US-021: Setup Menu - Scale Resolution', () => {
  test('enter setup menu', async ({ page }) => {
    await page.goto('/');

    await page.click('[data-testid="wrench-button"]');

    await expect(page.locator('[data-testid="x-axis-display"]')).toContainText('SELECT');
  });

  test('select X axis for configuration', async ({ page }) => {
    await page.goto('/');

    await page.click('[data-testid="wrench-button"]');
    await page.click('[data-testid="x-axis-button"]');

    // Axis selected, ready for configuration
  });

  test('navigate to SC parameter', async ({ page }) => {
    await page.goto('/');

    // Enter setup, select axis
    await page.click('[data-testid="wrench-button"]');
    await page.click('[data-testid="x-axis-button"]');

    // Scroll down to SC (may need multiple presses of 2 key)
    await page.click('[data-testid="2-key"]'); // Down arrow
    await page.click('[data-testid="2-key"]');
    await page.click('[data-testid="2-key"]');

    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('SC');
  });

  test('change from 5 to 1 micron', async ({ page }) => {
    await page.goto('/');

    // Navigate to SC parameter
    // ... setup ...

    // Current value should be 5
    await expect(page.locator('[data-testid="value-display"]')).toContainText('5');

    // Press 4 key (left arrow) to change
    await page.click('[data-testid="4-key"]');

    // Value changes to 1.0
    await expect(page.locator('[data-testid="value-display"]')).toContainText('1.0');
  });

  test('verify display multiplier changes', async ({ page }) => {
    await page.goto('/');

    // With 5 micron scale, 0.0002" increments
    // Change to 1 micron scale, 0.00004" increments (5× more sensitive)

    // ... change SC from 5 to 1 ...

    // Save and exit
    // ... save changes ...

    // Verify display now shows 5× movement for same physical distance
  });

  test('save changes', async ({ page }) => {
    await page.goto('/');

    // After changing SC parameter
    // ... setup ...

    // Navigate to SAV CHG
    await page.click('[data-testid="2-key"]'); // Keep pressing until SAV CHG
    // ... scroll down ...

    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('SAV CHG');

    // Confirm save
    await page.click('[data-testid="ent-button"]');

    // Changes saved
  });

  test('setting persists after exit', async ({ page }) => {
    await page.goto('/');

    // Change SC, save, exit
    // ... setup ...

    // Exit setup
    await page.click('[data-testid="c-button"]');
    await page.click('[data-testid="c-button"]');

    // Re-enter setup
    await page.click('[data-testid="wrench-button"]');
    await page.click('[data-testid="x-axis-button"]');
    // Navigate to SC
    // ... scroll ...

    // Verify setting persisted
    await expect(page.locator('[data-testid="value-display"]')).toContainText('1.0');
  });
});
```

## Implementation Notes

- **Scale resolution**: Physical resolution of magnetic scales
  - 5 microns = 0.005mm = 0.0002" (standard for mills)
  - 1 micron = 0.001mm = 0.00004" (high-precision scales)
- **Why configure**: If wrong scale resolution set, display shows incorrect distance
  - Example: 1 micron scale with 5 micron setting → display shows 5× actual movement
- **Per-axis setting**: Each axis can have different scale resolution
- **Other values**: Some scales have 2, 10, or 20 micron resolution
- **Effect on display**: Directly affects position calculations
- **Common issue**: FAQ in manual addresses this (line 24-25)

## Related Stories

- US-001: First Use and Power-Up Display (default 5 micron resolution)
- US-022: Display Resolution (related but independent setting)
- US-027: Save Changes (required to persist settings)

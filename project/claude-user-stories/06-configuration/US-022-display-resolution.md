# US-022: Setup Menu - Display Resolution

**Priority:** P5
**Category:** Configuration
**Manual Reference:** SETUP MENU > DP (Display Resolution) (line 48)

## User Story

**As a** machine operator
**I want** to configure display resolution
**So that** I can choose between fine (0.0002") or coarse (0.002") increments

## Acceptance Criteria

- [ ] AC22.1: Navigate to DP parameter in setup menu
- [ ] AC22.2: Default is 5 microns (0.0002" / 4 digits right of decimal)
- [ ] AC22.3: Can change to 50 microns (0.002" / 3 digits right of decimal)
- [ ] AC22.4: Display resolution independent of scale resolution
- [ ] AC22.5: Reducing resolution makes display less sensitive
- [ ] AC22.6: Change affects display only, not measurement accuracy

## E2E Test Scenarios

```typescript
describe('US-022: Setup Menu - Display Resolution', () => {
  test('navigate to DP parameter', async ({ page }) => {
    await page.goto('/');

    // Enter setup menu
    await page.click('[data-testid="wrench-button"]');
    await page.click('[data-testid="x-axis-button"]');

    // Scroll to DP
    // ... press 2 key multiple times ...

    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('DP');
  });

  test('default shows 5 microns', async ({ page }) => {
    await page.goto('/');

    // Navigate to DP
    // ... setup ...

    await expect(page.locator('[data-testid="value-display"]')).toContainText('5');
  });

  test('change to 50 microns', async ({ page }) => {
    await page.goto('/');

    // Navigate to DP
    // ... setup ...

    // Change value to 50
    await page.click('[data-testid="4-key"]'); // or enter value directly
    // ... input 50 ...

    await expect(page.locator('[data-testid="value-display"]')).toContainText('50');
  });

  test('display shows 3 decimal places', async ({ page }) => {
    await page.goto('/');

    // Set DP to 50 microns
    // ... setup and save ...

    // Exit setup
    await page.click('[data-testid="c-button"]');
    await page.click('[data-testid="c-button"]');

    // Verify display format
    // 0.002" increments = 3 decimal places
    const xDisplay = await page.locator('[data-testid="x-axis-display"]').textContent();
    expect(xDisplay).toMatch(/\d+\.\d{3}$/); // 3 digits right of decimal
  });

  test('change back to 5 microns', async ({ page }) => {
    await page.goto('/');

    // Set DP back to 5
    // ... setup ...

    await page.click('[data-testid="4-key"]');
    await expect(page.locator('[data-testid="value-display"]')).toContainText('5');
  });

  test('display shows 4 decimal places', async ({ page }) => {
    await page.goto('/');

    // Set DP to 5 microns
    // ... setup and save ...

    // Exit setup
    // ... exit ...

    // Verify display format
    // 0.0002" increments = 4 decimal places
    const xDisplay = await page.locator('[data-testid="x-axis-display"]').textContent();
    expect(xDisplay).toMatch(/\d+\.\d{4}$/); // 4 digits right of decimal
  });
});
```

## Implementation Notes

- **Display Resolution (DP)**: Controls how finely display shows position
  - Independent of scale resolution (SC)
  - Affects visual display only, not actual measurement
- **Common values**:
  - 5 microns = 0.0002" increments (4 decimal places)
  - 50 microns = 0.002" increments (3 decimal places)
- **Why reduce resolution**: Less "jitter" in display for rough work
- **Relationship to SC**:
  - DP should be ≥ SC for best results
  - Can set DP < SC but wastes display precision
  - Can set DP > SC to reduce sensitivity
- **Effect on display**:
  - Changes number of decimal places shown
  - Changes minimum increment displayed
  - Does NOT affect internal position tracking

## Related Stories

- US-021: Scale Resolution (related but different parameter)
- US-001: First Use and Power-Up Display (default display resolution)
- US-004: Inch vs Metric Display (precision in both units)

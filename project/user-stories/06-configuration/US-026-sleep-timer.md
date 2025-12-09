# US-026: Setup Menu - Display Sleep Timer

**Priority:** P5
**Category:** Configuration
**Manual Reference:** SETUP MENU > SLEEP T (lines 57-58)

## User Story

**As a** machine operator
**I want** to set display timeout period
**So that** I can save power when machine is idle

## Acceptance Criteria

- [ ] AC26.1: Navigate to SLEEP T parameter
- [ ] AC26.2: Press ENT to display current timeout (default 000 = disabled)
- [ ] AC26.3: Press ENT again, enter minutes (0-120)
- [ ] AC26.4: Press ENT to confirm
- [ ] AC26.5: Display times out after specified idle period
- [ ] AC26.6: Red LED below wrench key flashes when timed out
- [ ] AC26.7: Pressing X, Y, or Z key wakes display
- [ ] AC26.8: Setting 0 disables timeout

## E2E Test Scenarios

```typescript
describe('US-026: Setup Menu - Display Sleep Timer', () => {
  test('navigate to sleep timer parameter', async ({ page }) => {
    await page.goto('/');

    // Enter setup
    await page.click('[data-testid="wrench-button"]');
    await page.click('[data-testid="x-axis-button"]');

    // Scroll to SLEEP T
    // ... press 2 key multiple times ...

    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('SLEEP T');
  });

  test('set timeout to 5 minutes', async ({ page }) => {
    await page.goto('/');

    // Navigate to SLEEP T
    // ... setup ...

    // Press ENT to edit
    await page.click('[data-testid="ent-button"]');

    // Default should be 000
    await expect(page.locator('[data-testid="value-display"]')).toContainText('000');

    // Press ENT to enter edit mode
    await page.click('[data-testid="ent-button"]');

    // Enter 5 minutes
    await page.click('[data-testid="5-key"]');
    await page.click('[data-testid="ent-button"]');

    await expect(page.locator('[data-testid="value-display"]')).toContainText('5');
  });

  test('display sleeps after 5 minutes idle', async ({ page }) => {
    await page.goto('/');

    // Set SLEEP T to 5 minutes (use shorter time for testing, e.g., 0.1 min)
    // ... setup and save ...

    // Wait for timeout (in test, use short duration)
    await page.waitForTimeout(6000); // 6 seconds if using 0.1 min for testing

    // Display should be dimmed/off
    await expect(page.locator('[data-testid="display-panel"]')).toHaveClass(/sleeping|dimmed/);
  });

  test('red LED flashes when sleeping', async ({ page }) => {
    await page.goto('/');

    // Set sleep timer and wait for timeout
    // ... setup ...

    await page.waitForTimeout(6000);

    // Red LED below wrench key should flash
    await expect(page.locator('[data-testid="sleep-led"]')).toHaveClass(/flashing/);
  });

  test('X key wakes display', async ({ page }) => {
    await page.goto('/');

    // Put display to sleep
    // ... setup and wait ...

    // Press X key
    await page.click('[data-testid="x-axis-button"]');

    // Display wakes up
    await expect(page.locator('[data-testid="display-panel"]')).not.toHaveClass(/sleeping/);
  });

  test('Y key wakes display', async ({ page }) => {
    await page.goto('/');

    // Put display to sleep
    // ... setup and wait ...

    // Press Y key
    await page.click('[data-testid="y-axis-button"]');

    // Display wakes up
    await expect(page.locator('[data-testid="display-panel"]')).not.toHaveClass(/sleeping/);
  });

  test('Z key wakes display', async ({ page }) => {
    await page.goto('/');

    // Put display to sleep
    // ... setup and wait ...

    // Press Z key
    await page.click('[data-testid="z-axis-button"]');

    // Display wakes up
    await expect(page.locator('[data-testid="display-panel"]')).not.toHaveClass(/sleeping/);
  });

  test('set 0 to disable timeout', async ({ page }) => {
    await page.goto('/');

    // Navigate to SLEEP T
    // ... setup ...

    await page.click('[data-testid="ent-button"]');
    await page.click('[data-testid="ent-button"]');

    // Enter 0
    await page.click('[data-testid="0-key"]');
    await page.click('[data-testid="ent-button"]');

    // Save and exit
    // ... save ...

    // Wait for extended period
    await page.waitForTimeout(60000); // 1 minute

    // Display should NOT sleep
    await expect(page.locator('[data-testid="display-panel"]')).not.toHaveClass(/sleeping/);
  });
});
```

## Implementation Notes

- **Purpose**: Power saving for idle DRO
- **Timeout range**: 0-120 minutes
  - 0 = disabled (never sleeps)
  - 1-120 = timeout in minutes
- **Sleep behavior**:
  - Display dims or turns off
  - Red LED flashes to indicate sleep state
  - Position tracking continues in background
  - No data loss during sleep
- **Wake triggers**:
  - X, Y, or Z axis button
  - Does NOT wake on other keys (intentional)
- **Implementation**:
  - Track last user interaction timestamp
  - setTimeout for idle detection
  - Reduce display brightness or hide displays
  - Flash LED indicator
  - Resume on axis button press
- **Testing**: Use shorter timeout for automated tests

## Related Stories

- US-027: Save Changes (persist sleep timer setting)
- US-025: Keypad Beep (may be silent during sleep)

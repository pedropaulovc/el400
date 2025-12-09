# US-027: Setup Menu - Save Changes

**Priority:** P5
**Category:** Configuration
**Manual Reference:** SETUP MENU > SAV CHG (line 60)

## User Story

**As a** machine operator
**I want** to save configuration changes
**So that** my settings persist across power cycles

## Acceptance Criteria

- [ ] AC27.1: Navigate to SAV CHG in setup menu
- [ ] AC27.2: Press ENT key to confirm save
- [ ] AC27.3: All parameter changes written to non-volatile memory
- [ ] AC27.4: Confirmation message displayed
- [ ] AC27.5: Settings survive power cycle
- [ ] AC27.6: Exiting setup without SAV CHG discards changes

## E2E Test Scenarios

```typescript
describe('US-027: Setup Menu - Save Changes', () => {
  test('make parameter changes', async ({ page }) => {
    await page.goto('/');

    // Enter setup
    await page.click('[data-testid="wrench-button"]');
    await page.click('[data-testid="x-axis-button"]');

    // Change a parameter (e.g., BEEP to OFF)
    // ... navigate to BEEP ...
    await page.click('[data-testid="6-key"]'); // Toggle OFF

    // Changes made but not saved yet
  });

  test('navigate to SAV CHG', async ({ page }) => {
    await page.goto('/');

    // In setup menu with changes made
    // ... setup ...

    // Scroll down to SAV CHG
    await page.click('[data-testid="2-key"]');
    // ... keep pressing until SAV CHG ...

    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('SAV CHG');
  });

  test('confirm save with ENT', async ({ page }) => {
    await page.goto('/');

    // Navigate to SAV CHG
    // ... setup ...

    // Press ENT to save
    await page.click('[data-testid="ent-button"]');

    // Confirmation message may appear
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText(/SAVED|OK/);
  });

  test('exit setup menu', async ({ page }) => {
    await page.goto('/');

    // After saving changes
    // ... setup and save ...

    // Scroll to END or press C twice
    await page.click('[data-testid="c-button"]');
    await page.click('[data-testid="c-button"]');

    // Back to normal operation
    await expect(page.locator('[data-testid="x-axis-display"]')).not.toContainText('SELECT');
  });

  test('power cycle simulator', async ({ page }) => {
    await page.goto('/');

    // Make changes, save
    // ... setup, change BEEP to OFF, save, exit ...

    // Simulate power cycle (reload page)
    await page.reload();

    // Enter setup again
    await page.click('[data-testid="wrench-button"]');
    await page.click('[data-testid="x-axis-button"]');

    // Navigate to BEEP
    // ... scroll to BEEP ...

    // Verify setting persisted (should be OFF)
    await expect(page.locator('[data-testid="value-display"]')).toContainText('OFF');
  });

  test('verify settings persisted', async ({ page }) => {
    await page.goto('/');

    // After power cycle and reload
    // ... setup multiple parameters, save, reload ...

    // Verify all changed settings persisted
    // Check each parameter
    // ... verify BEEP, SLEEP T, etc. ...
  });

  test('exit without save discards changes', async ({ page }) => {
    await page.goto('/');

    // Make a change
    await page.click('[data-testid="wrench-button"]');
    await page.click('[data-testid="x-axis-button"]');
    // ... change BEEP to ON ...

    // Exit WITHOUT saving (press C before SAV CHG)
    await page.click('[data-testid="c-button"]');
    await page.click('[data-testid="c-button"]');

    // Re-enter setup
    await page.click('[data-testid="wrench-button"]');
    await page.click('[data-testid="x-axis-button"]');
    // ... navigate to BEEP ...

    // Verify change was NOT saved (should still be OFF from previous test)
    await expect(page.locator('[data-testid="value-display"]')).toContainText('OFF');
  });
});
```

## Implementation Notes

- **Critical function**: Without SAV CHG, all changes are temporary
- **Storage**: Use localStorage or IndexedDB for persistence
- **Settings to save**:
  - Scale resolution (SC) per axis
  - Display resolution (DP) per axis
  - Scale direction (LEFT/RIGHT) per axis
  - Zero approach (ZERO AP, BP DIST, BP TOLR)
  - Keypad beep (BEEP)
  - Sleep timer (SLEEP T)
  - Other configuration parameters
- **Workflow**:
  1. Enter setup (wrench key)
  2. Navigate and change parameters
  3. Navigate to SAV CHG
  4. Press ENT to save
  5. Exit setup
- **Without save**: Changes lost on exit or power cycle
- **Implementation**:
  ```typescript
  // Save to localStorage
  localStorage.setItem('dro-config', JSON.stringify(config));

  // Load on startup
  const savedConfig = localStorage.getItem('dro-config');
  if (savedConfig) {
    config = JSON.parse(savedConfig);
  }
  ```

## Related Stories

- US-021 through US-026: All configuration parameters that need saving
- US-028: Restore Factory Defaults (clears saved settings)

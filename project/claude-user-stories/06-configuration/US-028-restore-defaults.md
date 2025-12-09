# US-028: Setup Menu - Restore Factory Defaults

**Priority:** P5
**Category:** Configuration
**Manual Reference:** SPECIAL FUNCTIONS > RESTORE TO "AS-SHIPPED" (lines 441-447)

## User Story

**As a** machine operator
**I want** to restore DRO to factory default settings
**So that** I can recover from configuration errors

## Acceptance Criteria

- [ ] AC28.1: Press wrench key to enter setup
- [ ] AC28.2: Select axis
- [ ] AC28.3: Scroll to OEM MOD parameter
- [ ] AC28.4: Enter password: 3 5 7 2 6
- [ ] AC28.5: Confirm through prompts: 3 AXIS, MILL, OPT OFF
- [ ] AC28.6: Confirm SAV CHG
- [ ] AC28.7: Confirm RST DEF (reset defaults)
- [ ] AC28.8: Display shows "IN PROG"
- [ ] AC28.9: Wait 2 minutes for completion
- [ ] AC28.10: All settings return to factory defaults

## E2E Test Scenarios

```typescript
describe('US-028: Setup Menu - Restore Factory Defaults', () => {
  test('enter OEM mode with password', async ({ page }) => {
    await page.goto('/');

    // Enter setup
    await page.click('[data-testid="wrench-button"]');
    await page.click('[data-testid="x-axis-button"]');

    // Scroll to OEM MOD
    // ... press 2 key many times to reach end of menu ...

    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('OEM MOD');

    // Should prompt for password
    await page.click('[data-testid="ent-button"]');

    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('PASS'); // or similar

    // Enter password: 3 5 7 2 6
    await page.click('[data-testid="3-key"]');
    await page.click('[data-testid="5-key"]');
    await page.click('[data-testid="7-key"]');
    await page.click('[data-testid="2-key"]');
    await page.click('[data-testid="6-key"]');
    await page.click('[data-testid="ent-button"]');

    // Password accepted
  });

  test('confirm 3-axis mill configuration', async ({ page }) => {
    await page.goto('/');

    // After entering OEM mode with password
    // ... setup ...

    // Confirm 3 AXIS
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('3 AXIS');
    await page.click('[data-testid="ent-button"]');

    // Confirm MILL
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('MILL');
    await page.click('[data-testid="ent-button"]');

    // Confirm OPT OFF
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('OPT OFF');
    await page.click('[data-testid="ent-button"]');
  });

  test('initiate reset to defaults', async ({ page }) => {
    await page.goto('/');

    // After confirming configuration
    // ... setup ...

    // SAV CHG prompt
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('SAV CHG');
    await page.click('[data-testid="ent-button"]');

    // RST DEF prompt
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('RST DEF');
    await page.click('[data-testid="ent-button"]');

    // Reset initiated
  });

  test('wait for completion progress', async ({ page }) => {
    await page.goto('/');

    // After initiating reset
    // ... setup ...

    // Should show IN PROG
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('IN PROG');

    // Wait 2 minutes (use shorter time for testing)
    await page.waitForTimeout(5000); // 5 seconds for testing

    // Process should complete
    await expect(page.locator('[data-testid="prompt-display"]')).not.toContainText('IN PROG');
  });

  test('verify all parameters at defaults', async ({ page }) => {
    await page.goto('/');

    // After reset completes
    // ... wait for completion ...

    // Enter setup
    await page.click('[data-testid="wrench-button"]');
    await page.click('[data-testid="x-axis-button"]');

    // Check each parameter:
    // SC = 5
    await expect(page.locator('[data-testid="value-display"]')).toContainText('5');

    // DP = 5
    // ... navigate to DP ...
    await expect(page.locator('[data-testid="value-display"]')).toContainText('5');

    // BEEP = ON
    // ... navigate to BEEP ...
    await expect(page.locator('[data-testid="value-display"]')).toContainText('ON');

    // SLEEP T = 000
    // ... navigate to SLEEP T ...
    await expect(page.locator('[data-testid="value-display"]')).toContainText('000');

    // All other parameters at defaults
  });

  test('verify data cleared (SDM, tool offsets)', async ({ page }) => {
    await page.goto('/');

    // Before reset, save some SDMs
    // ... program SDM 1, 2, 3 ...

    // Perform factory reset
    // ... reset procedure ...

    // Try to recall SDM 1
    await page.click('[data-testid="sdm-button"]');
    await page.click('[data-testid="6-key"]');
    await page.click('[data-testid="ent-button"]');
    await page.click('[data-testid="y-axis-button"]');
    await page.click('[data-testid="1-key"]');
    await page.click('[data-testid="ent-button"]');

    // SDM should be empty/default
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText(/ERROR|EMPTY/);
  });
});
```

## Implementation Notes

- **Purpose**: Factory reset when configuration is corrupted or unknown
- **Password protection**: Prevents accidental reset (password: 35726)
- **Confirmation prompts**: Multiple steps to confirm destructive action
- **What gets reset**:
  - All setup parameters to factory defaults
  - Scale resolution → 5 microns
  - Display resolution → 5 microns
  - Beep → ON
  - Sleep timer → 000 (disabled)
  - All other setup parameters
  - **User data cleared**: SDMs, tool offsets, machine references
- **Process duration**: Manual says "wait 2 minutes"
  - In simulation, can be instant or shorter
  - Show IN PROG indicator
- **Implementation**:
  ```typescript
  function restoreFactoryDefaults() {
    // Clear localStorage
    localStorage.clear();

    // Reset to default config
    config = getDefaultConfig();

    // Clear user data
    sdm = [];
    toolOffsets = [];

    // Save defaults
    localStorage.setItem('dro-config', JSON.stringify(config));
  }
  ```
- **Warning**: Irreversible! All user data lost.

## Related Stories

- US-027: Save Changes (opposite of reset - preserves settings)
- US-021 through US-026: All parameters that get reset
- US-009 through US-011: SDM data gets cleared

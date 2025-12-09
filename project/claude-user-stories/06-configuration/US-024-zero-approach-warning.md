# US-024: Setup Menu - Zero Approach Warning

**Priority:** P5
**Category:** Configuration
**Manual Reference:** SETUP MENU > ZERO AP (line 55), SPECIAL FUNCTIONS > ZERO APPROACH WARNING (lines 435-439)

## User Story

**As a** machine operator
**I want** audible warning when approaching zero
**So that** I know when I'm close to target position

## Acceptance Criteria

- [ ] AC24.1: Navigate to ZERO AP parameter
- [ ] AC24.2: Press ENT to toggle BU22 ON/OFF
- [ ] AC24.3: When ON, continuous beeping starts near zero
- [ ] AC24.4: BP DIST parameter sets approach distance (default 0.002")
- [ ] AC24.5: BP TOLR parameter sets departure tolerance (default 0.0000")
- [ ] AC24.6: Beeping occurs within BP DIST of zero
- [ ] AC24.7: Used primarily with SDM and macro functions
- [ ] AC24.8: Beep distinct from key press beep

## E2E Test Scenarios

```typescript
describe('US-024: Setup Menu - Zero Approach Warning', () => {
  test('enable zero approach warning', async ({ page }) => {
    await page.goto('/');

    // Enter setup
    await page.click('[data-testid="wrench-button"]');
    await page.click('[data-testid="x-axis-button"]');

    // Navigate to ZERO AP
    // ... scroll with 2 key ...

    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('ZERO AP');

    // Toggle ON
    await page.click('[data-testid="ent-button"]');

    await expect(page.locator('[data-testid="value-display"]')).toContainText('BU22 ON');
  });

  test('set approach distance to 0.010', async ({ page }) => {
    await page.goto('/');

    // After enabling ZERO AP
    // ... setup ...

    // Navigate to BP DIST parameter
    await page.click('[data-testid="2-key"]');

    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('BP DIST');

    // Enter 0.010
    await page.click('[data-testid="ent-button"]');
    await page.evaluate(() => window.enterValue('0.010'));
    await page.click('[data-testid="ent-button"]');
  });

  test('approaching zero triggers beep', async ({ page }) => {
    await page.goto('/');

    // Enable zero approach warning, set BP DIST = 0.010
    // ... setup and save ...

    // Exit setup
    await page.click('[data-testid="c-button"]');
    await page.click('[data-testid="c-button"]');

    // Simulate distance-to-go mode or SDM
    // Set position to 0.015" from target
    await page.evaluate(() => window.setDistanceToGo('X', 0.015));

    // No beep yet (outside BP DIST)
    await expect(page.locator('[data-testid="audio-indicator"]')).not.toBeVisible();

    // Move closer, within 0.010"
    await page.evaluate(() => window.setDistanceToGo('X', 0.008));

    // Beeping should start
    await expect(page.locator('[data-testid="audio-indicator"]')).toBeVisible();
    // or verify audio element playing
  });

  test('beeping continuous within approach distance', async ({ page }) => {
    await page.goto('/');

    // With zero approach ON and within BP DIST
    // ... setup ...

    // Verify beeping continues while within range
    await page.evaluate(() => window.setDistanceToGo('X', 0.005));

    await page.waitForTimeout(2000);

    // Still beeping
    await expect(page.locator('[data-testid="audio-indicator"]')).toBeVisible();
  });

  test('beeping stops after leaving tolerance zone', async ({ page }) => {
    await page.goto('/');

    // Start within BP DIST (beeping)
    await page.evaluate(() => window.setDistanceToGo('X', 0.005));

    // Move away from zero, outside BP DIST + BP TOLR
    await page.evaluate(() => window.setDistanceToGo('X', 0.015));

    // Beeping stops
    await expect(page.locator('[data-testid="audio-indicator"]')).not.toBeVisible();
  });

  test('disable zero approach warning', async ({ page }) => {
    await page.goto('/');

    // Enter setup, navigate to ZERO AP
    // ... setup ...

    // Toggle OFF
    await page.click('[data-testid="ent-button"]');

    await expect(page.locator('[data-testid="value-display"]')).toContainText('OFF');

    // Save and exit
    // ... save ...

    // Verify no beeping even when near zero
    await page.evaluate(() => window.setDistanceToGo('X', 0.005));

    await expect(page.locator('[data-testid="audio-indicator"]')).not.toBeVisible();
  });
});
```

## Implementation Notes

- **Purpose**: Audio feedback when approaching target position
- **Use cases**:
  - Distance-to-go mode
  - SDM run mode
  - Macro functions (bolt circle, etc.)
- **Parameters**:
  - **ZERO AP**: ON/OFF toggle
  - **BP DIST**: Approach distance (when beeping starts)
  - **BP TOLR**: Tolerance (hysteresis to prevent beep flutter)
- **Beep behavior**:
  - Continuous beep when |distance| ≤ BP DIST
  - Stops when |distance| > BP DIST + BP TOLR
- **Independent from keypad beep**: Different setting (US-025)
- **Implementation**:
  - Monitor distance-to-go in active modes
  - Trigger audio alert when within threshold
  - Use web Audio API for beep sound

## Related Stories

- US-008: Distance-to-Go Function (uses zero approach warning)
- US-011: SDM Run Mode (uses zero approach warning)
- US-016 through US-020: Pattern macros (use zero approach warning)
- US-025: Keypad Beep (different audio feedback)

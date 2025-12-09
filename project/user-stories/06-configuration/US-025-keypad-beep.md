# US-025: Setup Menu - Keypad Beep

**Priority:** P5
**Category:** Configuration
**Manual Reference:** SETUP MENU > BEEP (line 56)

## User Story

**As a** machine operator
**I want** to enable/disable keypad beep sounds
**So that** I can work quietly or with audio confirmation

## Acceptance Criteria

- [ ] AC25.1: Navigate to BEEP parameter
- [ ] AC25.2: Default is ON
- [ ] AC25.3: Press 4 or 6 key to toggle ON/OFF
- [ ] AC25.4: When ON, every key press produces beep
- [ ] AC25.5: When OFF, keys are silent (except zero approach warning)
- [ ] AC25.6: Error conditions may still beep regardless of setting

## E2E Test Scenarios

```typescript
describe('US-025: Setup Menu - Keypad Beep', () => {
  test('navigate to BEEP parameter', async ({ page }) => {
    await page.goto('/');

    // Enter setup
    await page.click('[data-testid="wrench-button"]');
    await page.click('[data-testid="x-axis-button"]');

    // Scroll to BEEP
    // ... press 2 key multiple times ...

    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('BEEP');
  });

  test('beep ON produces sound on key press', async ({ page }) => {
    await page.goto('/');

    // Ensure BEEP is ON (default)
    // ... navigate to BEEP in setup ...

    await expect(page.locator('[data-testid="value-display"]')).toContainText('ON');

    // Save and exit
    // ... save and exit ...

    // Press a key
    const audioPromise = page.waitForEvent('console', msg => msg.text().includes('beep'));

    await page.click('[data-testid="1-key"]');

    // Should hear/detect beep
    // (In real implementation, check audio element or audio context)
  });

  test('toggle beep OFF', async ({ page }) => {
    await page.goto('/');

    // Navigate to BEEP
    // ... setup ...

    await expect(page.locator('[data-testid="value-display"]')).toContainText('ON');

    // Toggle OFF with 4 or 6 key
    await page.click('[data-testid="6-key"]');

    await expect(page.locator('[data-testid="value-display"]')).toContainText('OFF');
  });

  test('verify silent key presses', async ({ page }) => {
    await page.goto('/');

    // Set BEEP to OFF
    // ... setup and save ...

    // Exit setup
    await page.click('[data-testid="c-button"]');
    await page.click('[data-testid="c-button"]');

    // Press keys, verify no beep
    await page.click('[data-testid="1-key"]');
    await page.click('[data-testid="2-key"]');
    await page.click('[data-testid="3-key"]');

    // No audio should play
    // (Verify audio element not playing or silent)
  });

  test('zero approach warning still audible', async ({ page }) => {
    await page.goto('/');

    // Set BEEP to OFF
    // Enable zero approach warning
    // ... setup both ...

    // Exit setup
    // ... exit ...

    // Trigger zero approach (get close to zero in distance-to-go mode)
    await page.evaluate(() => window.setDistanceToGo('X', 0.005));

    // Zero approach warning should still beep
    // (Zero approach warning is independent of keypad beep)
    await expect(page.locator('[data-testid="audio-indicator"]')).toBeVisible();
  });
});
```

## Implementation Notes

- **Purpose**: Provide audio feedback for key presses
- **Default**: ON (user hears click/beep for every button press)
- **When to disable**: Quiet work environment, personal preference
- **Independence**: Separate from zero approach warning (US-024)
- **Error beeps**: May still beep for invalid operations regardless of setting
- **Implementation**:
  - Single short beep (~50-100ms) on key press
  - Use Web Audio API or HTML5 audio element
  - Check BEEP setting before playing sound
- **Accessibility**: Consider visual feedback alternative for users who disable beep

## Related Stories

- US-024: Zero Approach Warning (different beep type)
- US-027: Save Changes (persist beep setting)

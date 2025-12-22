import { test, expect } from '../helpers/fixtures';

/**
 * E2E Tests: US-008 Distance-to-Go (Preset)
 *
 * These are end-to-end tests covering the complete user journey.
 * Most functionality is tested via integration tests in preset.integration.test.tsx
 *
 * @see project/user-stories/03-data-management/US-008-distance-to-go.md
 */
test.describe('US-008: Distance-to-Go (Preset)', () => {
  /**
   * Complete user journey: set preset targets, execute, verify distance updates
   * with encoder movement, and exit.
   *
   * Covers: AC 8.1, 8.2, 8.3, 8.4
   */
  test('complete distance-to-go workflow with encoder movement', async ({ dro }) => {
    // AC 8.1: Press Distance-to-Go, display shows SELECT
    await dro.distanceToGoButton.click();
    await expect(dro.xDisplay).toHaveText('SELECt');
    await expect(dro.yDisplay).toHaveText('SELECt');
    await expect(dro.zDisplay).toHaveText('SELECt');

    // AC 8.2: Select X axis and enter target value (100 inches)
    await dro.selectAxis('X');
    await dro.enterNumber('100');
    await dro.enterButton.click();

    // AC 8.2: Select Y axis and enter target value (50 inches)
    await dro.selectAxis('Y');
    await dro.enterNumber('50');
    await dro.enterButton.click();

    // Verify Z still shows SELECT (not set)
    await expect(dro.zDisplay).toHaveText('SELECt');

    // AC 8.3: Press Distance-to-Go again to execute
    await dro.distanceToGoButton.click();

    // AC 8.4: Display shows distance remaining
    // Current position is 0, so distance = preset value
    let xValue = await dro.getAxisDisplayPureNumberValue('X');
    let yValue = await dro.getAxisDisplayPureNumberValue('Y');
    let zValue = await dro.getAxisDisplayPureNumberValue('Z');

    expect(xValue).toBeCloseTo(100, 1);
    expect(yValue).toBeCloseTo(50, 1);
    expect(zValue).toBeCloseTo(0, 1); // Z has no preset, shows normal position

    // Simulate machine moving (25.4mm = 1 inch towards target)
    await dro.simulateEncoderAbsoluteMove('X', 25.4);

    // Distance should decrease: 100 - 1 = 99
    await dro.waitForAxisValue('X', 99);

    // Move to target position (100 inches = 2540mm)
    await dro.simulateEncoderAbsoluteMove('X', 2540);

    // Distance should be 0 when at target
    await dro.waitForAxisValue('X', 0);

    // Exit with Clear key
    await dro.clearButton.click();

    // Should return to idle, showing normal position
    await dro.waitForAxisValue('X', 100); // 2540mm displayed as 100 inches
  });

  /**
   * Test re-entering preset mode to modify targets.
   *
   * Covers: AC 8.2 (modify existing presets)
   */
  test('modify preset targets after initial execution', async ({ dro }) => {
    // Set initial preset X=50
    await dro.distanceToGoButton.click();
    await dro.selectAxis('X');
    await dro.enterNumber('50');
    await dro.enterButton.click();
    await dro.distanceToGoButton.click();

    // Verify initial distance
    let xValue = await dro.getAxisDisplayPureNumberValue('X');
    expect(xValue).toBeCloseTo(50, 1);

    // Re-enter preset mode to modify
    await dro.distanceToGoButton.click();

    // X should show current preset value
    xValue = await dro.getAxisDisplayPureNumberValue('X');
    expect(xValue).toBeCloseTo(50, 1);

    // Modify X to 100
    await dro.selectAxis('X');
    await dro.enterNumber('100');
    await dro.enterButton.click();

    // Execute again
    await dro.distanceToGoButton.click();

    // Should show new distance
    xValue = await dro.getAxisDisplayPureNumberValue('X');
    expect(xValue).toBeCloseTo(100, 1);
  });
});

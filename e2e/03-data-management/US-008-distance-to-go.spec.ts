import { test, expect } from '../helpers/fixtures';

/**
 * E2E Tests: US-008 Distance-to-Go (Preset)
 *
 * Tests the preset target entry and distance-to-go display feature.
 *
 * @see project/user-stories/03-data-management/US-008-distance-to-go.md
 */
test.describe('US-008: Distance-to-Go (Preset)', () => {
  /**
   * AC 8.1: Pressing the Preset key initiates the function, display shows SELECT.
   */
  test('should show SELECT on all axes when pressing Preset', async ({ dro }) => {
    await dro.presetButton.click();

    // All axes should show SELECT (rendered as 'SELECt' in seven-segment display)
    await expect(dro.xDisplay).toHaveText('SELECt');
    await expect(dro.yDisplay).toHaveText('SELECt');
    await expect(dro.zDisplay).toHaveText('SELECt');
  });

  /**
   * AC 8.2: Pressing an axis key allows entering a numeric value for that axis.
   */
  test('should allow entering preset value for X axis', async ({ dro }) => {
    await dro.presetButton.click();
    await dro.selectAxis('X');

    // X should show input mode (buffer shows 0)
    await expect(dro.xDisplay).toContainText('0');
    await expect(dro.yDisplay).toHaveText('SELECt');

    // Enter value
    await dro.enterNumber('100');
    await expect(dro.xDisplay).toHaveText('100');

    // Press enter to store
    await dro.enterButton.click();

    // X should now show the stored value (with precision), Y and Z still SELECT
    const xValue = await dro.getAxisDisplayPureNumberValue('X');
    expect(xValue).toBeCloseTo(100, 1);
    await expect(dro.yDisplay).toHaveText('SELECt');
    await expect(dro.zDisplay).toHaveText('SELECt');
  });

  /**
   * AC 8.2 + 8.3: Can set multiple axes and execute with second Preset press.
   */
  test('should allow setting multiple axes before executing', async ({ dro }) => {
    await dro.presetButton.click();

    // Set X
    await dro.selectAxis('X');
    await dro.enterNumber('50');
    await dro.enterButton.click();

    // Set Y
    await dro.selectAxis('Y');
    await dro.enterNumber('25');
    await dro.enterButton.click();

    // Press Preset to execute
    await dro.presetButton.click();

    // Now in distance-to-go mode - display shows distance remaining
    // Current position is 0, so distance = preset value
    const xValue = await dro.getAxisDisplayPureNumberValue('X');
    const yValue = await dro.getAxisDisplayPureNumberValue('Y');

    expect(xValue).toBeCloseTo(50, 1);
    expect(yValue).toBeCloseTo(25, 1);
  });

  /**
   * AC 8.4: The display shows the distance remaining to reach the preset position.
   */
  test('should show distance-to-go that updates with machine position', async ({ dro }) => {
    // Set preset target for X axis
    await dro.presetButton.click();
    await dro.selectAxis('X');
    await dro.enterNumber('100');
    await dro.enterButton.click();
    await dro.presetButton.click();

    // Initial distance: 100 (target) - 0 (current) = 100
    let xValue = await dro.getAxisDisplayPureNumberValue('X');
    expect(xValue).toBeCloseTo(100, 1);

    // Simulate machine moving to 25.4mm (1 inch)
    await dro.simulateEncoderAbsoluteMove('X', 25.4);

    // Wait for display to update
    await dro.waitForAxisPureNumberValue('X', 99, 0, 1000);
  });

  /**
   * AC 8.4: Distance decreases as machine approaches target.
   */
  test('should show zero when at target position', async ({ dro }) => {
    // Set preset target for X axis at 1 inch (25.4mm)
    await dro.presetButton.click();
    await dro.selectAxis('X');
    await dro.enterNumber('1');
    await dro.enterButton.click();
    await dro.presetButton.click();

    // Simulate machine at target position
    await dro.simulateEncoderAbsoluteMove('X', 25.4);

    // Wait for display to show 0
    await dro.waitForAxisPureNumberValue('X', 0, 1, 1000);
  });

  /**
   * Test: Exit from distance-to-go with Clear key.
   */
  test('should exit to idle on Clear key', async ({ dro }) => {
    await dro.presetButton.click();
    await dro.selectAxis('X');
    await dro.enterNumber('100');
    await dro.enterButton.click();
    await dro.presetButton.click();

    // Now in distance-to-go mode
    let xValue = await dro.getAxisDisplayPureNumberValue('X');
    expect(xValue).toBeCloseTo(100, 1);

    // Press Clear to exit
    await dro.clearButton.click();

    // Should return to idle, showing normal position (0)
    await dro.waitForAxisValue('X', 0);
  });

  /**
   * Test: Cancel preset entry with Clear key.
   */
  test('should cancel preset entry on Clear key', async ({ dro }) => {
    await dro.presetButton.click();
    await expect(dro.xDisplay).toHaveText('SELECt');

    // Press Clear to exit
    await dro.clearButton.click();

    // Should return to idle, showing normal position (0)
    await dro.waitForAxisValue('X', 0);
  });

  /**
   * Test: Can re-enter preset mode to modify targets.
   */
  test('should allow modifying targets by pressing Preset again', async ({ dro }) => {
    // Set initial preset
    await dro.presetButton.click();
    await dro.selectAxis('X');
    await dro.enterNumber('50');
    await dro.enterButton.click();
    await dro.presetButton.click();

    // Verify distance-to-go
    let xValue = await dro.getAxisDisplayPureNumberValue('X');
    expect(xValue).toBeCloseTo(50, 1);

    // Press Preset to re-enter modification mode
    await dro.presetButton.click();

    // Should show the current preset value (with precision formatting)
    xValue = await dro.getAxisDisplayPureNumberValue('X');
    expect(xValue).toBeCloseTo(50, 1);

    // Modify X
    await dro.selectAxis('X');
    await dro.enterNumber('100');
    await dro.enterButton.click();

    // Execute again
    await dro.presetButton.click();

    // Should now show new distance
    xValue = await dro.getAxisDisplayPureNumberValue('X');
    expect(xValue).toBeCloseTo(100, 1);
  });

  /**
   * Test: Handle negative preset values.
   */
  test('should handle negative preset values', async ({ dro }) => {
    await dro.presetButton.click();
    await dro.selectAxis('X');
    await dro.enterNumber('-50');
    await dro.enterButton.click();
    await dro.presetButton.click();

    // Current position is 0, distance to -50 = -50
    const xValue = await dro.getAxisDisplayPureNumberValue('X');
    expect(xValue).toBeCloseTo(-50, 1);
  });
});

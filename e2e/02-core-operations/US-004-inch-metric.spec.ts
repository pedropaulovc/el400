import { test, expect } from '../helpers/fixtures';

/**
 * E2E Tests: US-004 Inch and Metric Display
 *
 * Tests unit toggle between Inch and Millimeter display modes.
 *
 * @see project/user-stories/02-core-operations/US-004-inch-metric.md
 */
test.describe('US-004: Inch/Metric Mode', () => {
  /**
   * AC 4.1: Pressing the in/mm key toggles the display units.
   * AC 4.2: The Inch LED indicator glows when in Inch mode.
   * AC 4.3: The mm LED indicator glows when in Millimeter mode.
   */
  test('should toggle between inch and mm units', async ({ dro }) => {
    // Start in inch mode
    await expect(await dro.isInchUnits()).toBe(true);

    // Toggle to mm
    await dro.toggleInchMm();
    await expect(await dro.isMmUnits()).toBe(true);
    await expect(await dro.isInchUnits()).toBe(false);

    // Toggle back to inch
    await dro.toggleInchMm();
    await expect(await dro.isInchUnits()).toBe(true);
    await expect(await dro.isMmUnits()).toBe(false);
  });

  /**
   * Default unit should be inch.
   */
  test('should start in inch mode by default', async ({ dro }) => {
    await expect(await dro.isInchUnits()).toBe(true);
    await expect(await dro.isMmUnits()).toBe(false);
  });

  /**
   * AC 4.4: The displayed value converts correctly (1 inch = 25.4 mm)
   */
  test('should convert values when toggling between units', async ({ dro }) => {
    // Start in inch mode, enter 1 inch
    await dro.selectAxis('X');
    await dro.enterNumber('1');
    await dro.enterButton.click();
    
    let value = await dro.getAxisValue('X');
    expect(value).toBeCloseTo(1, 4);
    
    // Toggle to mm - should show 25.4 mm
    await dro.toggleInchMm();
    await expect(await dro.isMmUnits()).toBe(true);
    
    value = await dro.getAxisValue('X');
    expect(value).toBeCloseTo(25.4, 3);
    
    // Toggle back to inch - should show 1 inch again
    await dro.toggleInchMm();
    await expect(await dro.isInchUnits()).toBe(true);
    
    value = await dro.getAxisValue('X');
    expect(value).toBeCloseTo(1, 4);
  });

  /**
   * AC 4.4: Test conversion with multiple values
   */
  test('should convert multiple axis values correctly', async ({ dro }) => {
    // Enter values in inch mode
    await dro.selectAxis('X');
    await dro.enterNumber('2.5');
    await dro.enterButton.click();
    
    await dro.selectAxis('Y');
    await dro.enterNumber('0.5');
    await dro.enterButton.click();
    
    await dro.selectAxis('Z');
    await dro.enterNumber('1');
    await dro.enterButton.click();
    
    // Toggle to mm
    await dro.toggleInchMm();
    
    const xValue = await dro.getAxisValue('X');
    const yValue = await dro.getAxisValue('Y');
    const zValue = await dro.getAxisValue('Z');
    
    // 2.5 inches = 63.5 mm
    expect(xValue).toBeCloseTo(63.5, 3);
    // 0.5 inches = 12.7 mm
    expect(yValue).toBeCloseTo(12.7, 3);
    // 1 inch = 25.4 mm
    expect(zValue).toBeCloseTo(25.4, 3);
  });

  /**
   * Test entering values in mm mode
   */
  test('should handle value entry in mm mode', async ({ dro }) => {
    // Toggle to mm mode
    await dro.toggleInchMm();
    await expect(await dro.isMmUnits()).toBe(true);
    
    // Enter 50.8 mm
    await dro.selectAxis('X');
    await dro.enterNumber('50.8');
    await dro.enterButton.click();
    
    let value = await dro.getAxisValue('X');
    expect(value).toBeCloseTo(50.8, 3);
    
    // Toggle to inch - should show 2 inches
    await dro.toggleInchMm();
    value = await dro.getAxisValue('X');
    expect(value).toBeCloseTo(2, 4);
  });

  /**
   * AC 4.5: Test persistence of unit preference
   */
  test('should persist unit preference across reload', async ({ dro, page }) => {
    // Start in inch mode
    await expect(await dro.isInchUnits()).toBe(true);
    
    // Toggle to mm
    await dro.toggleInchMm();
    await expect(await dro.isMmUnits()).toBe(true);
    
    // Reload page
    await page.reload();
    
    // Should still be in mm mode
    await expect(await dro.isMmUnits()).toBe(true);
    
    // Toggle back to inch for cleanup
    await dro.toggleInchMm();
    await expect(await dro.isInchUnits()).toBe(true);
  });

  /**
   * Test negative value conversion
   */
  test('should convert negative values correctly', async ({ dro }) => {
    // Enter negative value in inch mode
    await dro.selectAxis('X');
    await dro.enterNumber('-1.5');
    await dro.enterButton.click();
    
    let value = await dro.getAxisValue('X');
    expect(value).toBeCloseTo(-1.5, 4);
    
    // Toggle to mm
    await dro.toggleInchMm();
    value = await dro.getAxisValue('X');
    expect(value).toBeCloseTo(-38.1, 3); // -1.5 * 25.4 = -38.1
  });

  /**
   * Test conversion with half function
   */
  test('should work correctly with half function', async ({ dro }) => {
    // Enter 2 inches
    await dro.selectAxis('X');
    await dro.enterNumber('2');
    await dro.enterButton.click();
    
    // Half it to 1 inch
    await dro.halfButton.click();
    
    let value = await dro.getAxisValue('X');
    expect(value).toBeCloseTo(1, 4);
    
    // Toggle to mm - should show 25.4 mm
    await dro.toggleInchMm();
    value = await dro.getAxisValue('X');
    expect(value).toBeCloseTo(25.4, 3);
    
    // Half in mm mode - should show 12.7 mm
    await dro.halfButton.click();
    value = await dro.getAxisValue('X');
    expect(value).toBeCloseTo(12.7, 3);
    
    // Toggle back to inch - should show 0.5 inches
    await dro.toggleInchMm();
    value = await dro.getAxisValue('X');
    expect(value).toBeCloseTo(0.5, 4);
  });

});


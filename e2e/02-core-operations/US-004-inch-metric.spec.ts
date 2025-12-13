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
   * AC 4.4: The displayed value converts correctly based on the standard conversion (1 inch = 25.4 mm).
   * Test conversion from mm to inch
   */
  test('should convert values from mm to inch when toggling units', async ({ dro }) => {
    // Start in inch mode (default)
    await expect(await dro.isInchUnits()).toBe(true);

    // Select X axis and enter 1.0000 inch
    await dro.selectAxis('X');
    await dro.enterNumber('1');
    await dro.enterButton.click();
    
    // Verify it shows 1.0000 inch
    let xValue = await dro.getAxisValue('X');
    expect(xValue).toBeCloseTo(1.0000, 4);

    // Toggle to mm
    await dro.toggleInchMm();
    await expect(await dro.isMmUnits()).toBe(true);

    // Should now display 25.4000 mm (1 inch = 25.4 mm)
    xValue = await dro.getAxisValue('X');
    expect(xValue).toBeCloseTo(25.4000, 4);
  });

  /**
   * AC 4.4: Test conversion from inch to mm
   */
  test('should convert values from inch to mm when toggling units', async ({ dro }) => {
    // Start in inch mode, toggle to mm
    await dro.toggleInchMm();
    await expect(await dro.isMmUnits()).toBe(true);

    // Select Y axis and enter 25.4 mm
    await dro.selectAxis('Y');
    await dro.enterNumber('25.4');
    await dro.enterButton.click();
    
    // Verify it shows 25.4000 mm
    let yValue = await dro.getAxisValue('Y');
    expect(yValue).toBeCloseTo(25.4, 4);

    // Toggle to inch
    await dro.toggleInchMm();
    await expect(await dro.isInchUnits()).toBe(true);

    // Should now display 1.0000 inch (25.4 mm = 1 inch)
    yValue = await dro.getAxisValue('Y');
    expect(yValue).toBeCloseTo(1.0000, 4);
  });

  /**
   * AC 4.4: Test conversion with negative values
   */
  test('should convert negative values correctly', async ({ dro }) => {
    // Start in inch mode
    await expect(await dro.isInchUnits()).toBe(true);

    // Select Z axis and enter -2.0000 inch
    await dro.selectAxis('Z');
    await dro.enterNumber('2');
    await dro.keyMinus.click(); // Toggle sign
    await dro.enterButton.click();
    
    // Verify it shows -2.0000 inch
    let zValue = await dro.getAxisValue('Z');
    expect(zValue).toBeCloseTo(-2.0000, 4);

    // Toggle to mm
    await dro.toggleInchMm();
    await expect(await dro.isMmUnits()).toBe(true);

    // Should now display -50.8000 mm (-2 inch = -50.8 mm)
    zValue = await dro.getAxisValue('Z');
    expect(zValue).toBeCloseTo(-50.8000, 4);
  });

  /**
   * AC 4.4: Test round-trip conversion accuracy
   */
  test('should maintain precision through round-trip conversion', async ({ dro }) => {
    // Start in mm mode
    await dro.toggleInchMm();
    await expect(await dro.isMmUnits()).toBe(true);

    // Enter 100.0000 mm
    await dro.selectAxis('X');
    await dro.enterNumber('100');
    await dro.enterButton.click();
    
    // Verify initial value
    let xValue = await dro.getAxisValue('X');
    expect(xValue).toBeCloseTo(100.0000, 4);

    // Toggle to inch
    await dro.toggleInchMm();
    xValue = await dro.getAxisValue('X');
    expect(xValue).toBeCloseTo(3.937007874, 4); // 100 / 25.4

    // Toggle back to mm
    await dro.toggleInchMm();
    xValue = await dro.getAxisValue('X');
    expect(xValue).toBeCloseTo(100.0000, 4); // Should be back to 100
  });

  /**
   * AC 4.4: Test conversion with multiple axes simultaneously
   */
  test('should convert all axes when toggling units', async ({ dro }) => {
    // Start in inch mode
    await expect(await dro.isInchUnits()).toBe(true);

    // Set different values for each axis
    await dro.selectAxis('X');
    await dro.enterNumber('1');
    await dro.enterButton.click();
    
    await dro.selectAxis('Y');
    await dro.enterNumber('2');
    await dro.enterButton.click();
    
    await dro.selectAxis('Z');
    await dro.enterNumber('3');
    await dro.enterButton.click();

    // Verify inch values
    expect(await dro.getAxisValue('X')).toBeCloseTo(1.0000, 4);
    expect(await dro.getAxisValue('Y')).toBeCloseTo(2.0000, 4);
    expect(await dro.getAxisValue('Z')).toBeCloseTo(3.0000, 4);

    // Toggle to mm
    await dro.toggleInchMm();
    await expect(await dro.isMmUnits()).toBe(true);

    // All axes should convert
    expect(await dro.getAxisValue('X')).toBeCloseTo(25.4000, 4);
    expect(await dro.getAxisValue('Y')).toBeCloseTo(50.8000, 4);
    expect(await dro.getAxisValue('Z')).toBeCloseTo(76.2000, 4);
  });

});

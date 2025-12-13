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
   * E2E test for complete unit conversion flow
   */
  test('should convert values correctly when toggling between inch and mm', async ({ dro }) => {
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

    // Toggle back to inch and verify round-trip precision
    await dro.toggleInchMm();
    await expect(await dro.isInchUnits()).toBe(true);
    xValue = await dro.getAxisValue('X');
    expect(xValue).toBeCloseTo(1.0000, 4);
  });

});

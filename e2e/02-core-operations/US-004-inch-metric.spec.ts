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
   * Comprehensive E2E test covering all acceptance criteria:
   * AC 4.1: Pressing the in/mm key toggles the display units
   * AC 4.2: The Inch LED indicator glows when in Inch mode
   * AC 4.3: The mm LED indicator glows when in Millimeter mode
   * AC 4.4: The displayed value converts correctly (1 inch = 25.4 mm)
   * AC 4.5: The DRO remembers the unit preference
   */
  test('should toggle units with correct conversion and persistence', async ({ dro, page }) => {
    // AC 4.1 & 4.2: Start in inch mode by default
    await expect(await dro.isInchUnits()).toBe(true);
    await expect(await dro.isMmUnits()).toBe(false);

    // AC 4.4: Enter value and test conversion
    await dro.selectAxis('X');
    await dro.enterNumber('1');
    await dro.enterButton.click();
    
    let value = await dro.getAxisDisplayPureNumberValue('X');
    expect(value).toBeCloseTo(1, 4);
    
    // AC 4.1 & 4.3: Toggle to mm - LED and value should update
    await dro.toggleInchMm();
    await expect(await dro.isMmUnits()).toBe(true);
    await expect(await dro.isInchUnits()).toBe(false);
    
    // AC 4.4: Verify conversion (1 inch = 25.4 mm)
    value = await dro.getAxisDisplayPureNumberValue('X');
    expect(value).toBeCloseTo(25.4, 3);
    
    // AC 4.5: Test persistence across reload
    await dro.reload();
    await expect(await dro.isMmUnits()).toBe(true);
    
    // AC 4.1 & 4.2: Toggle back to inch
    await dro.toggleInchMm();
    await expect(await dro.isInchUnits()).toBe(true);
    
    // Verify persistence by toggling back to mm and reloading
    await dro.toggleInchMm();
    await expect(await dro.isMmUnits()).toBe(true);
    await dro.reload();
    await expect(await dro.isMmUnits()).toBe(true);
    
    // Clean up: toggle back to inch (default)
    await dro.toggleInchMm();
    await expect(await dro.isInchUnits()).toBe(true);
  });

});


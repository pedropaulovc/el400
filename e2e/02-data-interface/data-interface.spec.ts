import { test, expect } from '../helpers/fixtures';
import { expectAxisValues } from '../helpers/assertions';

/**
 * E2E Tests: Data Interface
 * Tests data source configuration and mock adapter behavior.
 */
test.describe('Data Interface', () => {
  /**
   * Test default manual mode when no source specified.
   */
  test('should default to manual mode without source parameter', async ({ dro }) => {
    // In manual mode, values should be zeros and controllable via keypad
    await expectAxisValues(dro.xDisplay, dro.yDisplay, dro.zDisplay, {
      x: 0,
      y: 0,
      z: 0,
    });

    // Manual entry should work
    await dro.selectAxis('X');
    await dro.enterNumber('12.345');
    await dro.enterButton.click();

    const xValue = await dro.getAxisValue('X');
    expect(xValue).toBeCloseTo(12.345, 2);
  });

  /**
   * Test URL parameter parsing for data source config.
   */
  test('should parse source URL parameter', async ({ page }) => {
    // Navigate with mock source
    await page.goto('/?source=mock');
    await page.waitForLoadState('networkidle');

    // Page should load without errors
    const errorMessages = page.getByRole('alert');
    await expect(errorMessages).toHaveCount(0);
  });

  /**
   * Test URL parameter parsing for CNCjs config.
   */
  test('should parse cncjs URL parameters', async ({ page }) => {
    // Navigate with cncjs source parameters
    await page.goto('/?source=cncjs&host=192.168.1.100&port=8000');
    await page.waitForLoadState('networkidle');

    // Page should load (connection may fail but params should be parsed)
    const errorMessages = page.getByRole('alert');
    await expect(errorMessages).toHaveCount(0);
  });

  /**
   * Test that manual entry works for individual axes.
   */
  test('should allow manual entry on X axis', async ({ dro }) => {
    await dro.selectAxis('X');
    await dro.enterNumber('99.999');
    await dro.enterButton.click();

    const value = await dro.getAxisValue('X');
    expect(value).toBeCloseTo(99.999, 2);
  });

  /**
   * Test that manual entry works for Y axis.
   */
  test('should allow manual entry on Y axis', async ({ dro }) => {
    await dro.selectAxis('Y');
    await dro.enterNumber('-50.5');
    await dro.enterButton.click();

    const value = await dro.getAxisValue('Y');
    expect(value).toBeCloseTo(-50.5, 1);
  });

  /**
   * Test that manual entry works for Z axis.
   */
  test('should allow manual entry on Z axis', async ({ dro }) => {
    await dro.selectAxis('Z');
    await dro.enterNumber('0.0001');
    await dro.enterButton.click();

    const value = await dro.getAxisValue('Z');
    expect(value).toBeCloseTo(0.0001, 4);
  });

  /**
   * Test zero axis functionality.
   */
  test('should zero individual axis', async ({ dro }) => {
    // Set X to non-zero
    await dro.selectAxis('X');
    await dro.enterNumber('123');
    await dro.enterButton.click();

    // Verify X is set
    expect(await dro.getAxisValue('X')).toBeCloseTo(123, 0);

    // Zero X
    await dro.zeroAxis('X');

    // Verify X is zero
    expect(await dro.getAxisValue('X')).toBeCloseTo(0, 0);
  });

  /**
   * Test zero all functionality.
   */
  test('should zero all axes', async ({ dro }) => {
    // Set all axes to non-zero
    await dro.selectAxis('X');
    await dro.enterNumber('10');
    await dro.enterButton.click();

    await dro.selectAxis('Y');
    await dro.enterNumber('20');
    await dro.enterButton.click();

    await dro.selectAxis('Z');
    await dro.enterNumber('30');
    await dro.enterButton.click();

    // Verify values
    expect(await dro.getAxisValue('X')).toBeCloseTo(10, 0);
    expect(await dro.getAxisValue('Y')).toBeCloseTo(20, 0);
    expect(await dro.getAxisValue('Z')).toBeCloseTo(30, 0);

    // Zero all
    await dro.zeroAllButton.click();

    // Verify all zero
    await expectAxisValues(dro.xDisplay, dro.yDisplay, dro.zDisplay, {
      x: 0,
      y: 0,
      z: 0,
    });
  });

  /**
   * Test negative value entry.
   */
  test('should handle negative value entry', async ({ dro }) => {
    await dro.selectAxis('X');
    await dro.enterNumber('-100.5');
    await dro.enterButton.click();

    const value = await dro.getAxisValue('X');
    expect(value).toBeCloseTo(-100.5, 1);
  });

  /**
   * Test decimal value entry.
   */
  test('should handle decimal value entry', async ({ dro }) => {
    await dro.selectAxis('Y');
    await dro.enterNumber('.5');
    await dro.enterButton.click();

    const value = await dro.getAxisValue('Y');
    expect(value).toBeCloseTo(0.5, 1);
  });

  /**
   * Test unit toggle.
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
   * Test ABS/INC toggle.
   */
  test('should toggle between ABS and INC modes', async ({ dro }) => {
    // Start in ABS mode
    await expect(await dro.isAbsMode()).toBe(true);

    // Toggle to INC
    await dro.toggleAbsInc();
    await expect(await dro.isIncMode()).toBe(true);
    await expect(await dro.isAbsMode()).toBe(false);

    // Toggle back to ABS
    await dro.toggleAbsInc();
    await expect(await dro.isAbsMode()).toBe(true);
    await expect(await dro.isIncMode()).toBe(false);
  });
});

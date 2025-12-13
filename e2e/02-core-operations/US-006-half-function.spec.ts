import { test, expect } from '../helpers/fixtures';

/**
 * E2E Tests: US-006 Half Function
 *
 * Tests the half function which allows finding the center of a workpiece
 * by halving the displayed value.
 *
 * @see project/user-stories/02-core-operations/US-006-half-function.md
 */
test.describe('US-006: Half Function', () => {
  /**
   * AC 6.1: Pressing the ½ key initiates the Half function.
   * AC 6.2: The display shows SELECT.
   */
  test('should show SELECT message when half button is pressed', async ({ dro }) => {
    await dro.halfButton.click();
    await expect(dro.messageDisplay).toHaveText('SELECT');
  });

  /**
   * AC 6.3: Pressing an axis key (X, Y, or Z) halves the current value of that axis.
   */
  test('should halve X axis value when selected after pressing half', async ({ dro }) => {
    // Set X to 100
    await dro.selectAxis('X');
    await dro.enterNumber('100');
    await dro.enterButton.click();

    // Verify X is 100
    expect(await dro.getAxisValue('X')).toBeCloseTo(100, 0);

    // Press Half and select X
    await dro.halfButton.click();
    await expect(dro.messageDisplay).toHaveText('SELECT');
    await dro.xButton.click();

    // Verify X is halved to 50
    expect(await dro.getAxisValue('X')).toBeCloseTo(50, 0);

    // Verify SELECT message is gone
    await expect(dro.messageDisplay).not.toBeVisible();
  });

  /**
   * AC 6.3: Test halving Y axis.
   */
  test('should halve Y axis value when selected after pressing half', async ({ dro }) => {
    // Set Y to 200
    await dro.selectAxis('Y');
    await dro.enterNumber('200');
    await dro.enterButton.click();

    // Verify Y is 200
    expect(await dro.getAxisValue('Y')).toBeCloseTo(200, 0);

    // Press Half and select Y
    await dro.halfButton.click();
    await expect(dro.messageDisplay).toHaveText('SELECT');
    await dro.yButton.click();

    // Verify Y is halved to 100
    expect(await dro.getAxisValue('Y')).toBeCloseTo(100, 0);
  });

  /**
   * AC 6.3: Test halving Z axis.
   */
  test('should halve Z axis value when selected after pressing half', async ({ dro }) => {
    // Set Z to 50
    await dro.selectAxis('Z');
    await dro.enterNumber('50');
    await dro.enterButton.click();

    // Verify Z is 50
    expect(await dro.getAxisValue('Z')).toBeCloseTo(50, 0);

    // Press Half and select Z
    await dro.halfButton.click();
    await expect(dro.messageDisplay).toHaveText('SELECT');
    await dro.zButton.click();

    // Verify Z is halved to 25
    expect(await dro.getAxisValue('Z')).toBeCloseTo(25, 0);
  });

  /**
   * Test halving with negative values.
   */
  test('should halve negative values correctly', async ({ dro }) => {
    // Set X to -100
    await dro.selectAxis('X');
    await dro.enterNumber('-100');
    await dro.enterButton.click();

    // Verify X is -100
    expect(await dro.getAxisValue('X')).toBeCloseTo(-100, 0);

    // Press Half and select X
    await dro.halfButton.click();
    await dro.xButton.click();

    // Verify X is halved to -50
    expect(await dro.getAxisValue('X')).toBeCloseTo(-50, 0);
  });

  /**
   * Test halving with decimal values.
   */
  test('should halve decimal values correctly', async ({ dro }) => {
    // Set Y to 99.999
    await dro.selectAxis('Y');
    await dro.enterNumber('99.999');
    await dro.enterButton.click();

    // Verify Y is 99.999
    expect(await dro.getAxisValue('Y')).toBeCloseTo(99.999, 3);

    // Press Half and select Y
    await dro.halfButton.click();
    await dro.yButton.click();

    // Verify Y is halved to 49.9995
    expect(await dro.getAxisValue('Y')).toBeCloseTo(49.9995, 4);
  });

  /**
   * AC 6.4: Half function works in current mode only (INC mode recommended).
   * Test that half function works in INC mode.
   */
  test('should work in INC mode', async ({ dro }) => {
    // Switch to INC mode
    await dro.toggleAbsInc();
    await expect(await dro.isIncMode()).toBe(true);

    // Set X to 80 in INC mode
    await dro.selectAxis('X');
    await dro.enterNumber('80');
    await dro.enterButton.click();

    // Apply Half function
    await dro.halfButton.click();
    await expect(dro.messageDisplay).toHaveText('SELECT');
    await dro.xButton.click();

    // Verify X is halved to 40
    expect(await dro.getAxisValue('X')).toBeCloseTo(40, 0);
  });

  /**
   * Test that half function only affects the current mode.
   */
  test('should only affect current mode values', async ({ dro }) => {
    // Set X to 100 in ABS mode
    await dro.selectAxis('X');
    await dro.enterNumber('100');
    await dro.enterButton.click();

    // Apply Half function
    await dro.halfButton.click();
    await dro.xButton.click();

    // Verify X is halved to 50 in ABS
    expect(await dro.getAxisValue('X')).toBeCloseTo(50, 0);

    // Switch to INC mode
    await dro.toggleAbsInc();
    await expect(await dro.isIncMode()).toBe(true);

    // Set X to 40 in INC mode
    await dro.selectAxis('X');
    await dro.enterNumber('40');
    await dro.enterButton.click();

    // Apply Half in INC mode
    await dro.halfButton.click();
    await dro.xButton.click();

    // INC X should be 20
    expect(await dro.getAxisValue('X')).toBeCloseTo(20, 0);

    // Switch back to ABS mode
    await dro.toggleAbsInc();
    await expect(await dro.isAbsMode()).toBe(true);

    // ABS X should still be 50
    expect(await dro.getAxisValue('X')).toBeCloseTo(50, 0);
  });

  /**
   * Test that multiple axes can be halved independently.
   */
  test('should allow halving multiple axes independently', async ({ dro }) => {
    // Set all axes
    await dro.selectAxis('X');
    await dro.enterNumber('100');
    await dro.enterButton.click();

    await dro.selectAxis('Y');
    await dro.enterNumber('200');
    await dro.enterButton.click();

    await dro.selectAxis('Z');
    await dro.enterNumber('300');
    await dro.enterButton.click();

    // Halve X
    await dro.halfButton.click();
    await dro.xButton.click();
    expect(await dro.getAxisValue('X')).toBeCloseTo(50, 0);

    // Halve Y
    await dro.halfButton.click();
    await dro.yButton.click();
    expect(await dro.getAxisValue('Y')).toBeCloseTo(100, 0);

    // Z should still be 300
    expect(await dro.getAxisValue('Z')).toBeCloseTo(300, 0);

    // Halve Z
    await dro.halfButton.click();
    await dro.zButton.click();
    expect(await dro.getAxisValue('Z')).toBeCloseTo(150, 0);
  });

  /**
   * Test halving zero value.
   */
  test('should handle halving zero correctly', async ({ dro }) => {
    // X starts at 0
    expect(await dro.getAxisValue('X')).toBeCloseTo(0, 0);

    // Press Half and select X
    await dro.halfButton.click();
    await dro.xButton.click();

    // X should still be 0
    expect(await dro.getAxisValue('X')).toBeCloseTo(0, 0);
  });
});

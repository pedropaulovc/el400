import { test, expect } from '../helpers/fixtures';
import { expectAxisValues } from '../helpers/assertions';

/**
 * E2E Tests: ABS/INC Memory
 * Tests the separate ABS and INC value storage and mode switching.
 */
test.describe('ABS/INC Memory', () => {
  /**
   * Test that the DRO maintains separate ABS and INC values.
   */
  test('should maintain separate ABS and INC values', async ({ dro }) => {
    // Verify starting in ABS mode with all zeros
    await expect(await dro.isAbsMode()).toBe(true);
    await expectAxisValues(dro.xDisplay, dro.yDisplay, dro.zDisplay, {
      x: 0,
      y: 0,
      z: 0,
    });

    // Enter a value in ABS mode for X axis
    await dro.selectAxis('X');
    await dro.enterNumber('10.5');
    await dro.enterButton.click();

    // Verify X shows 10.5 in ABS mode
    const xAbsValue = await dro.getAxisValue('X');
    expect(xAbsValue).toBeCloseTo(10.5, 1);

    // Switch to INC mode
    await dro.toggleAbsInc();
    await expect(await dro.isIncMode()).toBe(true);

    // INC mode should show 0 (independent memory)
    const xIncValue = await dro.getAxisValue('X');
    expect(xIncValue).toBeCloseTo(0, 1);

    // Enter a different value in INC mode
    await dro.selectAxis('X');
    await dro.enterNumber('5.25');
    await dro.enterButton.click();

    // Verify INC shows 5.25
    const xIncValue2 = await dro.getAxisValue('X');
    expect(xIncValue2).toBeCloseTo(5.25, 1);

    // Switch back to ABS mode
    await dro.toggleAbsInc();
    await expect(await dro.isAbsMode()).toBe(true);

    // ABS value should still be 10.5
    const xAbsValueAfter = await dro.getAxisValue('X');
    expect(xAbsValueAfter).toBeCloseTo(10.5, 1);
  });

  /**
   * Test that switching display modes shows correct values.
   */
  test('should switch display when toggling ABS/INC', async ({ dro }) => {
    // Set ABS values
    await dro.selectAxis('X');
    await dro.enterNumber('100');
    await dro.enterButton.click();

    await dro.selectAxis('Y');
    await dro.enterNumber('200');
    await dro.enterButton.click();

    // Switch to INC and set different values
    await dro.toggleAbsInc();
    await dro.selectAxis('X');
    await dro.enterNumber('50');
    await dro.enterButton.click();

    await dro.selectAxis('Y');
    await dro.enterNumber('75');
    await dro.enterButton.click();

    // Verify INC values displayed
    expect(await dro.getAxisValue('X')).toBeCloseTo(50, 0);
    expect(await dro.getAxisValue('Y')).toBeCloseTo(75, 0);

    // Switch back to ABS
    await dro.toggleAbsInc();

    // Verify ABS values displayed
    expect(await dro.getAxisValue('X')).toBeCloseTo(100, 0);
    expect(await dro.getAxisValue('Y')).toBeCloseTo(200, 0);
  });

  /**
   * Test that zeroing only affects the current mode.
   */
  test('should zero only current mode values', async ({ dro }) => {
    // Set X to 100 in ABS mode
    await dro.selectAxis('X');
    await dro.enterNumber('100');
    await dro.enterButton.click();

    // Switch to INC and set X to 50
    await dro.toggleAbsInc();
    await dro.selectAxis('X');
    await dro.enterNumber('50');
    await dro.enterButton.click();

    // Zero X in INC mode
    await dro.zeroAxis('X');

    // INC X should be 0
    expect(await dro.getAxisValue('X')).toBeCloseTo(0, 0);

    // Switch back to ABS
    await dro.toggleAbsInc();

    // ABS X should still be 100
    expect(await dro.getAxisValue('X')).toBeCloseTo(100, 0);
  });

  /**
   * Test that Zero All only affects the current mode.
   */
  test('should preserve other mode values when zeroing all', async ({ dro }) => {
    // Set all axes in ABS mode
    await dro.selectAxis('X');
    await dro.enterNumber('10');
    await dro.enterButton.click();

    await dro.selectAxis('Y');
    await dro.enterNumber('20');
    await dro.enterButton.click();

    await dro.selectAxis('Z');
    await dro.enterNumber('30');
    await dro.enterButton.click();

    // Switch to INC and set values
    await dro.toggleAbsInc();
    await dro.selectAxis('X');
    await dro.enterNumber('1');
    await dro.enterButton.click();

    await dro.selectAxis('Y');
    await dro.enterNumber('2');
    await dro.enterButton.click();

    await dro.selectAxis('Z');
    await dro.enterNumber('3');
    await dro.enterButton.click();

    // Zero all in INC mode
    await dro.zeroAllButton.click();

    // Verify INC values are all zero
    expect(await dro.getAxisValue('X')).toBeCloseTo(0, 0);
    expect(await dro.getAxisValue('Y')).toBeCloseTo(0, 0);
    expect(await dro.getAxisValue('Z')).toBeCloseTo(0, 0);

    // Switch to ABS mode
    await dro.toggleAbsInc();

    // Verify ABS values are preserved
    expect(await dro.getAxisValue('X')).toBeCloseTo(10, 0);
    expect(await dro.getAxisValue('Y')).toBeCloseTo(20, 0);
    expect(await dro.getAxisValue('Z')).toBeCloseTo(30, 0);
  });

  /**
   * Test default mode is ABS on startup.
   */
  test('should start in ABS mode by default', async ({ dro }) => {
    const isAbs = await dro.isAbsMode();
    const isInc = await dro.isIncMode();

    expect(isAbs).toBe(true);
    expect(isInc).toBe(false);
  });

  /**
   * Test Half function works in current mode.
   */
  test('should halve value in current mode only', async ({ dro }) => {
    // Set X to 100 in ABS mode
    await dro.selectAxis('X');
    await dro.enterNumber('100');
    await dro.enterButton.click();

    // Apply Half function
    await dro.halfButton.click();

    // Verify X is halved to 50
    expect(await dro.getAxisValue('X')).toBeCloseTo(50, 0);

    // Set INC X to 40
    await dro.toggleAbsInc();
    await dro.selectAxis('X');
    await dro.enterNumber('40');
    await dro.enterButton.click();

    // Apply Half in INC mode
    await dro.halfButton.click();

    // INC X should be 20
    expect(await dro.getAxisValue('X')).toBeCloseTo(20, 0);

    // ABS X should still be 50
    await dro.toggleAbsInc();
    expect(await dro.getAxisValue('X')).toBeCloseTo(50, 0);
  });
});

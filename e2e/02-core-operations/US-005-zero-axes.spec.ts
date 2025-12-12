import { test, expect } from '../helpers/fixtures';
import { expectAxisValues } from '../helpers/assertions';

/**
 * E2E Tests: US-005 Axis Reset and Set
 *
 * Tests zeroing axes and setting axis values via keypad entry.
 *
 * @see project/user-stories/02-core-operations/US-005-zero-axes.md
 */
test.describe('US-005: Axis Reset and Set', () => {
  /**
   * AC 5.3: Set axis to specific value - Press axis key, enter value, press ent.
   */
  test('should allow manual entry on X axis', async ({ dro }) => {
    await dro.selectAxis('X');
    await dro.enterNumber('99.999');
    await dro.enterButton.click();

    const value = await dro.getAxisValue('X');
    expect(value).toBeCloseTo(99.999, 2);
  });

  /**
   * AC 5.3: Set Y axis to specific value.
   */
  test('should allow manual entry on Y axis', async ({ dro }) => {
    await dro.selectAxis('Y');
    await dro.enterNumber('-50.5');
    await dro.enterButton.click();

    const value = await dro.getAxisValue('Y');
    expect(value).toBeCloseTo(-50.5, 1);
  });

  /**
   * AC 5.3: Set Z axis to specific value.
   */
  test('should allow manual entry on Z axis', async ({ dro }) => {
    await dro.selectAxis('Z');
    await dro.enterNumber('0.0001');
    await dro.enterButton.click();

    const value = await dro.getAxisValue('Z');
    expect(value).toBeCloseTo(0.0001, 4);
  });

  /**
   * AC 5.1: Quick Zero key immediately resets axis display to 0.000.
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
   * Zero all axes at once.
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
   * Handle negative value entry.
   */
  test('should handle negative value entry', async ({ dro }) => {
    await dro.selectAxis('X');
    await dro.enterNumber('-100.5');
    await dro.enterButton.click();

    const value = await dro.getAxisValue('X');
    expect(value).toBeCloseTo(-100.5, 1);
  });

  /**
   * Handle decimal value entry starting with decimal point.
   */
  test('should handle decimal value entry', async ({ dro }) => {
    await dro.selectAxis('Y');
    await dro.enterNumber('.5');
    await dro.enterButton.click();

    const value = await dro.getAxisValue('Y');
    expect(value).toBeCloseTo(0.5, 1);
  });
});

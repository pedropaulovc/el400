import { test, expect } from '../helpers/fixtures';

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

    const value = await dro.getAxisDisplayPureNumberValue('X');
    expect(value).toBeCloseTo(99.999, 2);
  });

  /**
   * AC 5.3: Set Y axis to specific value.
   */
  test('should allow manual entry on Y axis', async ({ dro }) => {
    await dro.selectAxis('Y');
    await dro.enterNumber('-50.5');
    await dro.enterButton.click();

    const value = await dro.getAxisDisplayPureNumberValue('Y');
    expect(value).toBeCloseTo(-50.5, 1);
  });

  /**
   * AC 5.3: Set Z axis to specific value.
   */
  test('should allow manual entry on Z axis', async ({ dro }) => {
    await dro.selectAxis('Z');
    await dro.enterNumber('0.0001');
    await dro.enterButton.click();

    const value = await dro.getAxisDisplayPureNumberValue('Z');
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
    expect(await dro.getAxisDisplayPureNumberValue('X')).toBeCloseTo(123, 0);

    // Zero X
    await dro.zeroAxis('X');

    // Verify X is zero
    expect(await dro.getAxisDisplayPureNumberValue('X')).toBeCloseTo(0, 0);
  });

  /**
   * Handle negative value entry.
   */
  test('should handle negative value entry', async ({ dro }) => {
    await dro.selectAxis('X');
    await dro.enterNumber('-100.5');
    await dro.enterButton.click();

    const value = await dro.getAxisDisplayPureNumberValue('X');
    expect(value).toBeCloseTo(-100.5, 1);
  });

  /**
   * Handle decimal value entry starting with decimal point.
   */
  test('should handle decimal value entry', async ({ dro }) => {
    await dro.selectAxis('Y');
    await dro.enterNumber('.5');
    await dro.enterButton.click();

    const value = await dro.getAxisDisplayPureNumberValue('Y');
    expect(value).toBeCloseTo(0.5, 1);
  });

  /**
   * AC 5.5: C removes pending digits one by one; empty-buffer C cancels selection.
   */
  test('should cancel numeric entry with C key', async ({ dro }) => {
    // Set X to a known value first
    await dro.selectAxis('X');
    await dro.enterNumber('10');
    await dro.enterButton.click();

    // Verify initial value
    let value = await dro.getAxisDisplayPureNumberValue('X');
    expect(value).toBeCloseTo(10, 0);

    // Remove all three digits, then cancel the empty Axis Set entry.
    await dro.selectAxis('X');
    await dro.enterNumber('999');
    for (let press = 0; press < 4; press++) await dro.clearButton.click();

    // A digit after cancellation must not set an axis without selecting it again.
    await dro.enterNumber('1');
    await dro.enterButton.click();

    // Value should remain 10, not change to 999
    value = await dro.getAxisDisplayPureNumberValue('X');
    expect(value).toBeCloseTo(10, 0);
  });
});

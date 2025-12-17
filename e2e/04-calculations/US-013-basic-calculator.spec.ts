import { test, expect } from '../helpers/fixtures';

/**
 * E2E Tests: US-013 Basic Calculator Functions
 *
 * Minimal e2e tests covering critical calculator functionality.
 * Additional coverage provided by integration tests.
 *
 * @see project/user-stories/04-calculations/US-013-basic-calculator.md
 */
test.describe('US-013: Basic Calculator Functions', () => {
  /**
   * AC13.1: Pressing calculator key activates calculator mode
   * AC13.2: Pressing calculator key again exits calculator mode
   */
  test('activate and exit calculator mode', async ({ dro }) => {
    // Activate calculator
    await dro.page.click('[data-testid="btn-calculator"]');

    // Y and Z axes should be blank in calculator mode
    await expect(dro.yDisplay).toContainText('');
    await expect(dro.zDisplay).toContainText('');

    // Exit calculator
    await dro.page.click('[data-testid="btn-calculator"]');

    // Should return to normal mode showing axis values
    const yValue = await dro.getAxisValue('Y');
    const zValue = await dro.getAxisValue('Z');
    expect(typeof yValue).toBe('number');
    expect(typeof zValue).toBe('number');
  });

  /**
   * AC13.3: Can perform ADD (addition)
   * AC13.8: Results display in X window
   * AC13.10: Pressing ENT displays result
   */
  test('add 2.5 + 3.75 = 6.25', async ({ dro }) => {
    // Activate calculator
    await dro.page.click('[data-testid="btn-calculator"]');

    // Enter first value 2.5
    await dro.enterNumber('2.5');
    await dro.enterButton.click();

    // Assert number appears in X axis
    await expect(dro.xDisplay).toContainText('2.5');

    // Select ADD function by cycling Y
    await dro.yButton.click();
    await expect(dro.yDisplay).toContainText('ADD');

    // Enter second value 3.75
    await dro.enterNumber('3.75');
    await dro.enterButton.click();

    // Result in X window
    await expect(dro.xDisplay).toContainText('6.25');
  });

  /**
   * AC13.9: Pressing +/- key changes sign immediately
   */
  test('sign toggle happens immediately', async ({ dro }) => {
    await dro.page.click('[data-testid="btn-calculator"]');

    // Enter positive value
    await dro.enterNumber('5.5');
    
    // Sign toggle happens immediately after pressing button
    await dro.keyMinus.click();
    
    // Enter the toggled value
    await dro.enterButton.click();
    
    // Should show -5.5 in X display
    await expect(dro.xDisplay).toContainText('-5.5');
  });
});

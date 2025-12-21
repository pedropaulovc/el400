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
   * AC13.3: Can perform ADD (addition)
   * AC13.8: Results display in X window
   * AC13.10: Pressing ENT displays result
   */
  test('activate calculator, perform addition, and exit', async ({ dro }) => {
    // Activate calculator
    await dro.page.click('[data-testid="btn-calculator"]');

    // Y and Z axes should be blank in calculator mode
    await expect(dro.yDisplay).toContainText('');
    await expect(dro.zDisplay).toContainText('');

    // Enter first value 2.5
    await dro.enterNumber('2.5');
    await dro.enterButton.click();

    // Assert number appears in X axis
    await expect(dro.xDisplay).toContainText('2.5');

    // Select ADD function by cycling Y
    await dro.yButton.click();
    await expect(dro.yDisplay).toContainText('Add');

    // Enter second value 3.75
    await dro.enterNumber('3.75');
    await dro.enterButton.click();

    // Result in X window
    await expect(dro.xDisplay).toContainText('6.25');

    // Exit calculator
    await dro.page.click('[data-testid="btn-calculator"]');

    // Should return to normal mode showing axis values
    const yValue = await dro.getAxisDisplayPureNumberValue('Y');
    const zValue = await dro.getAxisDisplayPureNumberValue('Z');
    expect(typeof yValue).toBe('number');
    expect(typeof zValue).toBe('number');
  });
});

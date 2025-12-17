import { test, expect } from '../helpers/fixtures';

/**
 * E2E Tests: US-013 Basic Calculator Functions
 *
 * Tests basic calculator operations (ADD, SUB, MULTI, DIV).
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

    // Calculator mode active (indicator visible)
    await expect(dro.page.locator('[data-testid="calculator-indicator"]')).toBeVisible();

    // Exit calculator
    await dro.page.click('[data-testid="btn-calculator"]');

    // Calculator indicator should not be visible
    const indicator = dro.page.locator('[data-testid="calculator-indicator"]');
    const isOn = await indicator.locator('span').first().evaluate((el) => {
      return el.className.includes('text-red-400');
    });
    expect(isOn).toBe(false);
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
   * AC13.4: Can perform SUB (subtraction)
   */
  test('subtract 10 - 3.5 = 6.5', async ({ dro }) => {
    await dro.page.click('[data-testid="btn-calculator"]');

    await dro.enterNumber('10');
    await dro.enterButton.click();

    // Cycle Y to SUB
    await dro.yButton.click();
    await dro.yButton.click();
    await expect(dro.yDisplay).toContainText('SUB');

    await dro.enterNumber('3.5');
    await dro.enterButton.click();

    await expect(dro.xDisplay).toContainText('6.5');
  });

  /**
   * AC13.5: Can perform MULTI (multiplication)
   */
  test('multiply 2.5 × 4 = 10', async ({ dro }) => {
    await dro.page.click('[data-testid="btn-calculator"]');

    await dro.enterNumber('2.5');
    await dro.enterButton.click();

    // Cycle Y to MULTI
    await dro.yButton.click();
    await dro.yButton.click();
    await dro.yButton.click();
    await expect(dro.yDisplay).toContainText('MULTI');

    await dro.enterNumber('4');
    await dro.enterButton.click();

    await expect(dro.xDisplay).toContainText('10');
  });

  /**
   * AC13.6: Can perform DIV (division)
   */
  test('divide 10 ÷ 4 = 2.5', async ({ dro }) => {
    await dro.page.click('[data-testid="btn-calculator"]');

    await dro.enterNumber('10');
    await dro.enterButton.click();

    // Cycle Y to DIV
    await dro.yButton.click();
    await dro.yButton.click();
    await dro.yButton.click();
    await dro.yButton.click();
    await expect(dro.yDisplay).toContainText('DIV');

    await dro.enterNumber('4');
    await dro.enterButton.click();

    await expect(dro.xDisplay).toContainText('2.5');
  });

  /**
   * AC13.9: Pressing +/- key changes sign
   */
  test('change sign of value', async ({ dro }) => {
    await dro.page.click('[data-testid="btn-calculator"]');

    // Enter positive value
    await dro.enterNumber('5.5');
    
    // Change sign
    await dro.keyMinus.click();

    // Should show -5.5 in buffer (verify by entering it)
    await dro.enterButton.click();
    await expect(dro.xDisplay).toContainText('-5.5');
  });

  /**
   * AC13.7: Pressing Y key cycles through functions
   */
  test('cycle through operations', async ({ dro }) => {
    await dro.page.click('[data-testid="btn-calculator"]');

    // Enter a value first
    await dro.enterNumber('5');
    await dro.enterButton.click();

    // Cycle through operations
    await dro.yButton.click();
    await expect(dro.yDisplay).toContainText('ADD');

    await dro.yButton.click();
    await expect(dro.yDisplay).toContainText('SUB');

    await dro.yButton.click();
    await expect(dro.yDisplay).toContainText('MULTI');

    await dro.yButton.click();
    await expect(dro.yDisplay).toContainText('DIV');

    // Should wrap around
    await dro.yButton.click();
    await expect(dro.yDisplay).toContainText('ADD');
  });

  /**
   * Test division by zero handling
   */
  test('handle division by zero', async ({ dro }) => {
    await dro.page.click('[data-testid="btn-calculator"]');

    await dro.enterNumber('10');
    await dro.enterButton.click();

    // Select DIV
    await dro.yButton.click();
    await dro.yButton.click();
    await dro.yButton.click();
    await dro.yButton.click();

    await dro.enterNumber('0');
    await dro.enterButton.click();

    // Should return 0 for division by zero
    await expect(dro.xDisplay).toContainText('0');
  });
});

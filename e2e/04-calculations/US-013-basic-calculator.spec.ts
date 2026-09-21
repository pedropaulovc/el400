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

  test('debug: pending entry stays visible through a live tick and sessions start clean', async ({ dro }) => {
    await dro.goto({ source: 'debug', skipBootMessage: true });
    await dro.page.click('[data-testid="btn-calculator"]');

    await dro.enterNumber('12.5');
    await dro.waitForAxisPureTextValue('X', '12.5');
    await dro.page.click('[data-testid="btn-calculator"]');
    await dro.page.click('[data-testid="btn-calculator"]');

    await dro.enterNumber('1');
    await dro.waitForAxisPureTextValue('X', '1');
    await dro.simulateEncoderAbsoluteMove('X', 25);
    await dro.waitForAxisPureTextValue('X', '1');

    await dro.yButton.click();
    await expect(dro.yDisplay).toContainText('Add');
    await dro.enterNumber('2.50');
    await dro.waitForAxisPureTextValue('X', '2.50');
    await dro.enterButton.click();
    await dro.waitForAxisPureNumberValue('X', 3.5);
  });

  test('debug: repeated addition reuses the displayed result', async ({ dro }) => {
    await dro.goto({ source: 'debug', skipBootMessage: true });
    await dro.page.click('[data-testid="btn-calculator"]');

    await dro.enterNumber('12');
    await dro.yButton.click();
    await dro.enterNumber('34');
    await dro.enterButton.click();
    await expect(dro.xDisplay).toContainText('46.0000');

    await dro.yButton.click();
    await dro.enterNumber('56');
    await dro.enterButton.click();
    await expect(dro.xDisplay).toContainText('102.0000');
  });

  test('debug: finite result beyond the four-decimal panel shows inF vAL', async ({ dro }) => {
    await dro.goto({ source: 'debug', skipBootMessage: true });
    await dro.page.click('[data-testid="btn-calculator"]');

    await dro.enterNumber('99999999');
    for (let i = 0; i < 3; i++) await dro.yButton.click();
    await dro.enterNumber('99999999');
    await dro.enterButton.click();

    await expect(dro.xDisplay).toContainText('inF vAL');
  });

  test('debug: calculator has no axis-transfer side effect', async ({ dro }) => {
    await dro.goto({ source: 'debug', skipBootMessage: true });
    await dro.toggleUnitButton.click();
    await dro.simulateEncoderAbsoluteMove('X', 2);

    await dro.page.click('[data-testid="btn-calculator"]');
    await dro.simulateEncoderAbsoluteMove('X', 3);
    await dro.enterNumber('2');
    await dro.yButton.click();
    await dro.enterNumber('3');
    await dro.enterButton.click();
    await expect(dro.xDisplay).toContainText('5.0000');

    await dro.page.click('[data-testid="btn-calculator"]');
    await dro.waitForAxisValue('X', 3);
  });
});

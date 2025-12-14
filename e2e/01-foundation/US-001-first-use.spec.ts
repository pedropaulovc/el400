import { test, expect } from '../helpers/fixtures';
import { expectLEDOn, expectAxisValues, expectPureTextValue } from '../helpers/assertions';

/**
 * US-001: First Use and Power-Up Display
 * Manual Reference: Section 1.1 FIRST USE
 * Priority: Critical (P0)
 */
test.describe('US-001: First Use and Power-Up Display', () => {
  /**
   * AC 1.1-1.4: Power-up shows model/version and transitions to counting mode
   */
  test('Power-up displays model and version before counting mode', async ({ dro }) => {
    await dro.goto({ bypassPowerOn: false });

    await expectPureTextValue(dro.xDisplay, 'EL400');
    await expectPureTextValue(dro.yDisplay, 'vEr 1.0.0');

    await dro.page.waitForTimeout(1000);

    await expectAxisValues(dro.xDisplay, dro.yDisplay, dro.zDisplay, {
      x: 0,
      y: 0,
      z: 0,
    });
  });

  /**
   * AC 1.2: The default mode is Absolute (ABS LED is on)
   */
  test('AC 1.2: Default mode is Absolute', async ({ dro }) => {
    await dro.goto();
    await expectLEDOn(dro.absLED);
    const isAbs = await dro.isAbsMode();
    expect(isAbs).toBe(true);
  });

  /**
   * AC 1.3: The default unit is inches (INCH LED is on)
   */
  test('AC 1.3: Default unit is inches', async ({ dro }) => {
    await dro.goto();
    await expectLEDOn(dro.inchLED);
    const isInch = await dro.isInchUnits();
    expect(isInch).toBe(true);
  });

  /**
   * AC 1.3: Power-up message can be bypassed with the C key
   */
  test('Bypass power-up message with clear key', async ({ dro }) => {
    await dro.goto({ bypassPowerOn: false });

    await expectPureTextValue(dro.xDisplay, 'EL400');
    await dro.clearButton.click();

    await expectAxisValues(dro.xDisplay, dro.yDisplay, dro.zDisplay, {
      x: 0,
      y: 0,
      z: 0,
    });
  });

  /**
   * AC 1.5: No error messages or warnings appear on startup
   */
  test('AC 1.5: No error messages on startup', async ({ page }) => {
    await page.goto('/');
    // Check for error message elements
    const errorMessages = page.getByRole('alert');
    await expect(errorMessages).toHaveCount(0);

    // Check console for errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Wait a bit to ensure no errors appear
    await page.waitForTimeout(1000);
    expect(consoleErrors).toHaveLength(0);
  });
});

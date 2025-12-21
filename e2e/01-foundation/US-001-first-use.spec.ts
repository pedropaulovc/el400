import { test, expect } from '../helpers/fixtures';
import { expectLEDOn, expectAxisValues, expectPureTextValue } from '../helpers/assertions';

/**
 * US-001: First Use and Power-Up Display
 * Manual Reference: Section 1.1 FIRST USE
 * Priority: Critical (P0)
 */
test.describe('US-001: First Use and Power-Up Display', () => {
  // Run tests serially to avoid localStorage race conditions between parallel workers
  // (Zustand persist middleware shares localStorage across parallel test instances)
  test.describe.configure({ mode: 'serial' });
  /**
   * AC 1.1-1.4: Power-up shows model/version and transitions to counting mode
   */
  test('Power-up displays model and version before counting mode', async ({ dro }) => {
    // Install clock before navigation to control setTimeout in boot sequence
    await dro.page.clock.install({ time: new Date('2024-01-01T00:00:00Z') });

    // Show boot message for this test
    await dro.goto({ skipBootMessage: false });

    await expectPureTextValue(dro.xDisplay, 'EL400');
    await expectPureTextValue(dro.yDisplay, 'vEr 1.0.0');
    await expectPureTextValue(dro.zDisplay, '');

    // Advance clock by boot message duration (1000ms) to trigger auto-dismiss
    await dro.page.clock.fastForward(1000);

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
   * Power-up message can be bypassed with the C key (AC 1.3)
   */
  test('Bypass power-up message with clear key', async ({ dro }) => {
    // Show boot message for this test
    await dro.goto({ skipBootMessage: false });

    // Display starts blank in boot state, then shows EL400 when state machine advances to boot-show-message
    await dro.waitForAxisPureTextValue('X', 'EL400');
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
    // Install clock before navigation
    await page.clock.install({ time: new Date('2024-01-01T00:00:00Z') });

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

    // Advance clock to allow time for errors to appear
    await page.clock.fastForward(1000);
    expect(consoleErrors).toHaveLength(0);
  });
});

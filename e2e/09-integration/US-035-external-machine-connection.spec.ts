import { test, expect } from '../helpers/fixtures';
import { test as baseTest } from '@playwright/test';
import { expectAxisValues } from '../helpers/assertions';
import { DROPage } from '../helpers/dro-page';

/**
 * E2E Tests: US-035 External Machine Connection
 *
 * Tests data source configuration, URL parameter parsing,
 * and adapter behavior for CNCjs integration and manual mode fallback.
 *
 * @see project/user-stories/09-integration/US-035-external-machine-connection.md
 */
test.describe('US-035: External Machine Connection', () => {
  /**
   * AC35.4: When disconnected, the DRO continues to function in manual mode.
   * Uses base test (not dro fixture) to navigate without CNCjs params.
   */
  baseTest('should default to manual mode without source parameter', async ({ page }) => {
    // Navigate without source parameter (defaults to manual mode)
    await page.goto('/?bootMessageMode=skip');
    await page.waitForLoadState('domcontentloaded');

    const dro = new DROPage(page);

    // Wait for display to be ready (polling until X shows 0)
    await dro.waitForAxisValue('X', 0);

    // In manual mode, values should be zeros and controllable via keypad
    await expectAxisValues(dro.xDisplay, dro.yDisplay, dro.zDisplay, {
      x: 0,
      y: 0,
      z: 0,
    });

    // Manual entry should work
    await dro.selectAxis('X');
    await dro.enterNumber('12.345');
    await dro.enterButton.click();

    const xValue = await dro.getAxisDisplayPureNumberValue('X');
    expect(xValue).toBeCloseTo(12.345, 2);
  });

  /**
   * AC35.5: Connection parameters can be specified via URL (host, port).
   * Test CNCjs configuration via URL parameters.
   */
  test('should parse cncjs URL parameters', async ({ dro }) => {
    // The dro fixture already navigates to the mock CNCjs server
    // If we got here, connection was successful (goto waits for initial state)

    // Verify page loaded and connected without errors
    const errorMessages = dro.page.getByRole('alert');
    await expect(errorMessages).toHaveCount(0);
  });

  test('native ABS writes work coordinates while INC stays local across offset changes and motion', async ({ dro }) => {
    await dro.toggleInchMm();
    await dro.simulateEncoderAbsoluteMove('X', 25);
    await dro.simulateEncoderAbsoluteMove('Y', 10);
    await dro.waitForAxisValue('X', 25);
    await dro.waitForAxisValue('Y', 10);

    // ABS preset is a controller work-coordinate edit, not physical motion.
    await dro.selectAxis('X');
    await dro.enterNumber('12');
    await dro.enterButton.click();
    await dro.waitForAxisValue('X', 12);
    await dro.waitForConnectedReady();

    await dro.toggleAbsInc();
    await dro.zeroAxis('X');
    await dro.waitForAxisValue('X', 0);
    await dro.selectAxis('Y');
    await dro.enterNumber('7');
    await dro.enterButton.click();
    await dro.waitForAxisValue('Y', 7);

    // Neither INC edit changed the controller offsets.
    await dro.toggleAbsInc();
    await dro.waitForAxisValue('X', 12);
    await dro.waitForAxisValue('Y', 10);
    await dro.toggleAbsInc();

    // An independent client changes WPos without moving the machine.
    await dro.simulateExternalWorkPosition('X', 40);
    await dro.toggleAbsInc();
    await dro.waitForAxisValue('X', 40);
    await dro.waitForAxisValue('Y', 10);
    await dro.toggleAbsInc();
    await dro.waitForAxisValue('X', 0);
    await dro.waitForAxisValue('Y', 7);

    // Physical movement advances both coordinate frames.
    await dro.simulateEncoderAbsoluteMove('X', 30);
    await dro.waitForAxisValue('X', 5);
    await dro.toggleAbsInc();
    await dro.waitForAxisValue('X', 45);
    await dro.reload();
    expect(await dro.isMmUnits()).toBe(true);
    if (await dro.isIncMode()) await dro.toggleAbsInc();
    await dro.waitForAxisValue('X', 45);
    await dro.waitForAxisValue('Y', 10);
  });

  test.describe('FluidNC under the CNCjs Grbl controller', () => {
    // FluidNC's `$$` omits `$13`; the fixture's connected-ready barrier only
    // passes once `$/report_inches` and a fresh WCO establish native ABS.
    test.use({ controllerFirmware: 'fluidnc', workingUnit: 'G21' });

    test('ABS shows controller work coordinates instead of no Conn', async ({ dro }) => {
      await dro.simulateEncoderAbsoluteMove('X', 25);
      await dro.waitForAxisValue('X', 25);
      await dro.simulateExternalWorkPosition('X', 40);
      await dro.waitForAxisValue('X', 40);

      // ABS preset writes G10 and confirms against FluidNC's intermittent WCO.
      await dro.selectAxis('X');
      await dro.enterNumber('12');
      await dro.enterButton.click();
      await dro.waitForAxisValue('X', 12);
      await dro.waitForConnectedReady();

      await dro.reload();
      await dro.waitForAxisValue('X', 12);
    });
  });

  /**
   * Verify manual mode allows value entry when no external source.
   * Uses base test (not dro fixture) to navigate without CNCjs params.
   */
  baseTest('should allow manual entry in disconnected state', async ({ page }) => {
    // Navigate without source parameter (defaults to manual mode)
    await page.goto('/?bootMessageMode=skip');
    await page.waitForLoadState('domcontentloaded');

    const dro = new DROPage(page);

    // Wait for display to be ready
    await dro.waitForAxisValue('X', 0);

    // Manual entry should work for all axes
    await dro.selectAxis('X');
    await dro.enterNumber('100');
    await dro.enterButton.click();
    expect(await dro.getAxisDisplayPureNumberValue('X')).toBeCloseTo(100, 0);

    await dro.selectAxis('Y');
    await dro.enterNumber('200');
    await dro.enterButton.click();
    expect(await dro.getAxisDisplayPureNumberValue('Y')).toBeCloseTo(200, 0);

    await dro.selectAxis('Z');
    await dro.enterNumber('300');
    await dro.enterButton.click();
    expect(await dro.getAxisDisplayPureNumberValue('Z')).toBeCloseTo(300, 0);
  });
});

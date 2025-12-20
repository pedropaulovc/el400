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

  /**
   * Verify manual mode allows value entry when no external source.
   * Uses base test (not dro fixture) to navigate without CNCjs params.
   */
  baseTest('should allow manual entry in disconnected state', async ({ page }) => {
    // Navigate without source parameter (defaults to manual mode)
    await page.goto('/?bootMessageMode=skip');
    await page.waitForLoadState('domcontentloaded');

    const dro = new DROPage(page);

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

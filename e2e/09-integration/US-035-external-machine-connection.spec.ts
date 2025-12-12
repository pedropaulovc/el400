import { test, expect } from '../helpers/fixtures';
import { expectAxisValues } from '../helpers/assertions';

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
   */
  test('should default to manual mode without source parameter', async ({ dro }) => {
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

    const xValue = await dro.getAxisValue('X');
    expect(xValue).toBeCloseTo(12.345, 2);
  });

  /**
   * AC35.5: Connection parameters can be specified via URL.
   * Test mock adapter loading via source parameter.
   */
  test('should parse source URL parameter', async ({ page }) => {
    // Navigate with mock source
    await page.goto('/?source=mock');
    await page.waitForLoadState('networkidle');

    // Page should load without errors
    const errorMessages = page.getByRole('alert');
    await expect(errorMessages).toHaveCount(0);
  });

  /**
   * AC35.5: Connection parameters can be specified via URL (host, port).
   * Test CNCjs configuration via URL parameters.
   */
  test('should parse cncjs URL parameters', async ({ page }) => {
    // Navigate with cncjs source parameters
    await page.goto('/?source=cncjs&host=192.168.1.100&port=8000');
    await page.waitForLoadState('networkidle');

    // Page should load (connection may fail but params should be parsed)
    const errorMessages = page.getByRole('alert');
    await expect(errorMessages).toHaveCount(0);
  });

  /**
   * Verify manual mode allows value entry when no external source.
   */
  test('should allow manual entry in disconnected state', async ({ dro }) => {
    // Manual entry should work for all axes
    await dro.selectAxis('X');
    await dro.enterNumber('100');
    await dro.enterButton.click();
    expect(await dro.getAxisValue('X')).toBeCloseTo(100, 0);

    await dro.selectAxis('Y');
    await dro.enterNumber('200');
    await dro.enterButton.click();
    expect(await dro.getAxisValue('Y')).toBeCloseTo(200, 0);

    await dro.selectAxis('Z');
    await dro.enterNumber('300');
    await dro.enterButton.click();
    expect(await dro.getAxisValue('Z')).toBeCloseTo(300, 0);
  });
});

import { test, expect } from '../helpers/fixtures';

/**
 * US-007 covers both center choices through the manual Fn -> CEntrE hierarchy.
 * All movement is driven through the visible debug controls.
 */
test.describe('US-007: Center Finding', () => {
  test('finds a line center and keeps distance-to-go live', async ({ dro }) => {
    await dro.goto({ source: 'debug', skipBootMessage: true });
    await dro.toggleUnitButton.click();

    await dro.functionButton.click();
    await expect(dro.xDisplay).toContainText('CEntrE');
    await dro.enterButton.click();
    await expect(dro.xDisplay).toContainText('CirCLE');
    await dro.key6.click();
    await expect(dro.xDisplay).toContainText('LinE');
    await dro.enterButton.click();
    await expect(dro.zDisplay).toContainText('Point 1');

    await dro.simulateEncoderAbsoluteMove('X', 0);
    await dro.key6.click();
    await expect(dro.zDisplay).toContainText('Point 2');

    await dro.simulateEncoderAbsoluteMove('X', 100);
    await dro.key6.click();
    await expect(dro.zDisplay).toContainText('CEntrE');
    await dro.waitForAxisValue('X', -50);

    await dro.simulateEncoderAbsoluteMove('X', 50);
    await dro.waitForAxisValue('X', 0);
    expect(await dro.isFnModeActive()).toBe(true);
  });

  test('finds a circle center from the default nested CirCLE choice', async ({ dro }) => {
    await dro.goto({ source: 'debug', skipBootMessage: true });
    await dro.toggleUnitButton.click();

    await dro.functionButton.click();
    await dro.enterButton.click();
    await expect(dro.xDisplay).toContainText('CirCLE');
    await dro.enterButton.click();
    await expect(dro.zDisplay).toContainText('Point 1');

    await dro.simulateEncoderAbsoluteMove('X', 10);
    await dro.simulateEncoderAbsoluteMove('Y', 0);
    await dro.key6.click();
    await expect(dro.zDisplay).toContainText('Point 2');

    await dro.simulateEncoderAbsoluteMove('X', 0);
    await dro.simulateEncoderAbsoluteMove('Y', 10);
    await dro.key6.click();
    await expect(dro.zDisplay).toContainText('Point 3');

    await dro.simulateEncoderAbsoluteMove('X', -10);
    await dro.simulateEncoderAbsoluteMove('Y', 0);
    await dro.key6.click();
    await expect(dro.zDisplay).toContainText('CEntrE');
    await dro.waitForAxisValue('X', 10);
    await dro.waitForAxisValue('Y', 0);

    await dro.simulateEncoderAbsoluteMove('X', 0);
    await dro.waitForAxisValue('X', 0);
    expect(await dro.isFnModeActive()).toBe(true);
  });

  test('C exits center finding and restores the live DRO', async ({ dro }) => {
    await dro.goto({ source: 'debug', skipBootMessage: true });
    await dro.simulateEncoderAbsoluteMove('X', 12);

    await dro.functionButton.click();
    await dro.enterButton.click();
    await dro.enterButton.click();
    await dro.clearButton.click();

    await dro.waitForAxisValue('X', 12 / 25.4);
    expect(await dro.isFnModeActive()).toBe(false);
  });
});

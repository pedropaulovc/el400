import { test, expect } from '../helpers/fixtures';

/**
 * Manual-fidelity regressions for the three-point center macro. Movement uses
 * only the visible debug controls; the state store is never injected.
 */
test.describe('US-015: Center Circle Macro', () => {
  test('collinear points show INVALID and the operator can redo from Point 1', async ({ dro }) => {
    await dro.goto({ source: 'debug', skipBootMessage: true });
    await dro.toggleUnitButton.click();

    await dro.functionButton.click();
    await dro.enterButton.click();
    await expect(dro.xDisplay).toContainText('CirCLE');
    await dro.enterButton.click();

    await dro.simulateEncoderAbsoluteMove('X', 0);
    await dro.simulateEncoderAbsoluteMove('Y', 0);
    await dro.key6.click();
    await dro.simulateEncoderAbsoluteMove('X', 10);
    await dro.key6.click();
    await dro.simulateEncoderAbsoluteMove('X', 20);
    await dro.key6.click();

    await expect(dro.xDisplay).toContainText('inuAL d');
    await expect(dro.zDisplay).toContainText('Point 1');

    // A real encoder update must not erase the rejection before it can be read.
    await dro.simulateEncoderAbsoluteMove('X', 21);
    await expect(dro.xDisplay).toContainText('inuAL d');
    await expect(dro.zDisplay).toContainText('Point 1');

    // The next real capture acknowledges INVALID and starts a fresh valid set.
    await dro.key6.click();
    await expect(dro.zDisplay).toContainText('Point 2');
    await dro.simulateEncoderAbsoluteMove('X', 10);
    await dro.simulateEncoderAbsoluteMove('Y', 11);
    await dro.key6.click();
    await dro.simulateEncoderAbsoluteMove('X', -1);
    await dro.simulateEncoderAbsoluteMove('Y', 0);
    await dro.key6.click();

    await expect(dro.zDisplay).toContainText('CEntrE');
    await dro.waitForAxisValue('X', 11);
    await dro.waitForAxisValue('Y', 0);
  });

});

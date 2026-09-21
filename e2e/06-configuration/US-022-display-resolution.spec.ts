import { test, expect } from '../helpers/fixtures';
import type { DROPage } from '../helpers/dro-page';

/**
 * E2E Tests: US-022 Setup Menu - Display Resolution (dP)
 *
 * Critical happy path: enter setup, reach dP, see the 5-micron mill default,
 * then coarsen to 50 micron, save with SAU CHG, and confirm the LIVE readout
 * drops a decimal place (0.0002" -> 0.002", i.e. 4 -> 3 fractional digits).
 * Proves the operator key sequence end to end and that dP is a display-only
 * transform independent of scale resolution (AC22.3/22.5).
 *
 * The 7-segment panel renders dP choices with the "dP" prefix and a one-decimal
 * micron value, e.g. "dP 5.0" (matching the device's section 6.2 display).
 *
 * @see project/user-stories/06-configuration/US-022-display-resolution.md
 */

/** Count fractional digits in a readout string like " 0.0000". */
function decimalsOf(text: string): number {
  const trimmed = text.trim();
  const dot = trimmed.indexOf('.');
  return dot === -1 ? 0 : trimmed.length - dot - 1;
}

/** Open setup, pick X, and scroll up to the dP parameter. */
async function gotoDP(dro: DROPage) {
  await dro.settingsButton.click();
  await dro.waitForAxisPureTextValue('X', 'SELECt');
  await dro.selectAxis('X');
  await dro.waitForAxisPureTextValue('X', 'LinEAr');
  // Scroll up until the dP parameter is highlighted.
  while (!(await dro.getAxisRawText('X')).startsWith('dP')) {
    await dro.key8.click();
  }
}
/** Commit the setup draft, acknowledge StorEd, and exit back to the live DRO. */
async function saveAndExitSetup(dro: DROPage) {
  let guard = 0;
  while ((await dro.getAxisRawText('X')) !== 'SAU ChG') {
    await dro.key2.click();
    if (++guard > 40) throw new Error('SAU ChG row not reachable');
  }
  await dro.enterButton.click();
  await dro.waitForAxisPureTextValue('X', 'StorEd');
  await dro.clearButton.click(); // acknowledge only
  await dro.waitForAxisPureTextValue('X', 'SAU ChG');
  await dro.clearButton.click(); // exit the now-empty transaction
  await dro.waitForReady('idle');
}


test.describe('US-022: Setup Menu - Display Resolution', () => {
  test.beforeEach(async ({ dro }) => {
    await dro.goto({ source: 'debug', skipBootMessage: true });
  });

  test('reach dP and see the 5-micron default (AC22.1, AC22.2)', async ({ dro }) => {
    await gotoDP(dro);
    await dro.waitForAxisPureTextValue('X', 'dP 5.0');
  });

  test('coarsening dP to 50 micron drops the readout to 3 decimals (AC22.4, AC22.5)', async ({ dro }) => {
    // Sanity: default readout has 4 decimals.
    expect(decimalsOf(await dro.getAxisRawText('X'))).toBe(4);

    await gotoDP(dro);
    await dro.waitForAxisPureTextValue('X', 'dP 5.0');

    // Right arrow coarsens: 5 -> 10 -> 20 -> 50 micron.
    await dro.key6.click();
    await dro.waitForAxisPureTextValue('X', 'dP 10.0');
    await dro.key6.click();
    await dro.key6.click();
    await dro.waitForAxisPureTextValue('X', 'dP 50.0');

    await saveAndExitSetup(dro);

    // Live readout now renders 3 fractional digits (display-only change).
    await expect
      .poll(async () => decimalsOf(await dro.getAxisRawText('X')))
      .toBe(3);
  });
});

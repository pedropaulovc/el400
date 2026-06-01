import { test, expect } from '../helpers/fixtures';

/**
 * E2E Tests: US-022 Setup Menu - Display Resolution (dP)
 *
 * Critical happy path: enter setup, reach dP, see the 5-micron mill default,
 * then coarsen to 50 micron and confirm the LIVE readout drops a decimal place
 * (0.0002" -> 0.002", i.e. 4 -> 3 fractional digits). Proves the operator key
 * sequence end to end and that dP is a display-only transform that takes effect
 * on exit (commit-on-change), independent of scale resolution (AC22.3/22.5).
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
async function gotoDP(dro: import('../helpers/dro-page').DROPage) {
  await dro.settingsButton.click();
  await dro.waitForAxisPureTextValue('X', 'SELECt');
  await dro.selectAxis('X');
  await dro.waitForAxisPureTextValue('X', 'LinEAr');
  // Scroll up until the dP parameter is highlighted.
  while (!(await dro.getAxisRawText('X')).startsWith('dP')) {
    await dro.key8.click();
  }
}

test.describe('US-022: Setup Menu - Display Resolution', () => {
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

    // Exit setup: re-press the wrench to SELECT, then CLEAR to idle.
    await dro.settingsButton.click();
    await dro.waitForAxisPureTextValue('X', 'SELECt');
    await dro.clearButton.click();

    // Live readout now renders 3 fractional digits (display-only change).
    await expect
      .poll(async () => decimalsOf(await dro.getAxisRawText('X')))
      .toBe(3);
  });
});

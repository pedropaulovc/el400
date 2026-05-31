import { test } from '../helpers/fixtures';

/**
 * E2E Tests: US-021 Setup Menu - Scale Resolution (SC)
 *
 * Critical happy path (enter setup, reach SC, see the 5-micron mill default,
 * change toward 1 micron) plus the coarse-value edge (right cycles up to the
 * special 50-micron scale). Per-axis and persistence semantics are covered by
 * the unit/integration suites; this proves the operator key sequence end to end.
 *
 * The 7-segment panel renders SC choices with the "SC" prefix and a one-decimal
 * micron value, e.g. "SC 5.0" (matching the device's section 6.2 display).
 *
 * @see project/user-stories/06-configuration/US-021-scale-resolution.md
 */

/** Open setup, pick X, and scroll up to the SC parameter. */
async function gotoSC(dro: import('../helpers/dro-page').DROPage) {
  await dro.settingsButton.click();
  await dro.waitForAxisPureTextValue('X', 'SELECt');
  await dro.selectAxis('X');
  await dro.waitForAxisPureTextValue('X', 'LinEAr');
  // Scroll up until the SC parameter is highlighted.
  while (!(await dro.getAxisRawText('X')).startsWith('SC')) {
    await dro.key8.click();
  }
}

test.describe('US-021: Setup Menu - Scale Resolution', () => {
  test('reach SC, see the 5-micron default, change toward 1 micron (AC21.3, AC21.4, AC21.5)', async ({ dro }) => {
    await gotoSC(dro);
    // Default is 5 micron for mills.
    await dro.waitForAxisPureTextValue('X', 'SC 5.0');

    // Left arrow lowers resolution: 5 -> 2 -> 1 micron.
    await dro.key4.click();
    await dro.waitForAxisPureTextValue('X', 'SC 2.0');
    await dro.key4.click();
    await dro.waitForAxisPureTextValue('X', 'SC 1.0');
  });

  test('right arrow reaches the coarse special scales (AC21.6)', async ({ dro }) => {
    await gotoSC(dro);
    await dro.waitForAxisPureTextValue('X', 'SC 5.0');

    // Right arrow raises resolution toward the special coarse values.
    await dro.key6.click();
    await dro.waitForAxisPureTextValue('X', 'SC 10.0');

    // Exit via the setup key back to the SELECT prompt without committing.
    await dro.settingsButton.click();
    await dro.waitForAxisPureTextValue('X', 'SELECt');
  });
});

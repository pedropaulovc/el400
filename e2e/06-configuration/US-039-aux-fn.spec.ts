import { test, expect } from '../helpers/fixtures';
import type { DROPage } from '../helpers/dro-page';

/**
 * E2E Test: AUX Fn (`AUX Fn`) hardware-absent dwell — manual §6.2.
 *
 * The §6.2 setup table lists `AUX Fn` ("Auxiliary function settings") as a
 * terminal-entry row whose action is "Press for Auxiliary Function Menu"
 * (Section 10). The backing hardware — an optional DB15 connector — is "not
 * present on current displays" (video manual §1.11), so pressing ENT flashes a
 * brief `no Conn` ("no connector") message and returns to the row rather than
 * entering a sub-menu.
 *
 * Proves the flow end to end through real operator key presses: scroll down to
 * `AUX Fn`, ENT shows `no Conn`, and the dwell auto-returns to the highlighted
 * `AUX Fn` row.
 *
 * @see docs/plans/2026-06-04-aux-fn-setup-menu-hardware-absent-design.md
 */

/** Open setup, pick X, and scroll DOWN to an exact parameter label. */
async function gotoLabel(dro: DROPage, label: string) {
  await dro.settingsButton.click();
  await dro.waitForAxisPureTextValue('X', 'SELECt');
  await dro.selectAxis('X');
  await dro.waitForAxisPureTextValue('X', 'LinEAr');
  let guard = 0;
  while ((await dro.getAxisRawText('X')) !== label) {
    await dro.key2.click();
    guard += 1;
    if (guard > 30) throw new Error(`label ${label} not reachable`);
  }
}

test.describe('AUX Fn: hardware-absent dwell', () => {
  test('ENT on AUX Fn flashes no Conn, then returns to the row', async ({ dro }) => {
    await gotoLabel(dro, 'AUX Fn');

    // ENT: the optional auxiliary connector is absent, so `no Conn` is shown.
    await dro.enterButton.click();
    await dro.waitForAxisPureTextValue('X', 'no Conn');

    // The dwell auto-dismisses (~1.5s) back to the highlighted AUX Fn row.
    await dro.waitForAxisPureTextValue('X', 'AUX Fn', 3000);
  });

  test('a key press dismisses the no Conn dwell early', async ({ dro }) => {
    await gotoLabel(dro, 'AUX Fn');
    await dro.enterButton.click();
    await dro.waitForAxisPureTextValue('X', 'no Conn');

    // An impatient front-panel key (CLEAR) returns to the row immediately.
    await dro.clearButton.click();
    await expect.poll(() => dro.getAxisRawText('X')).toBe('AUX Fn');
  });
});

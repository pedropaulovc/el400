import { test } from '../helpers/fixtures';
import type { DROPage } from '../helpers/dro-page';

/**
 * E2E Tests: US-027 Setup Menu — Save Changes (SAV CHG)
 *
 * Proves the draft/commit split end to end through real operator key presses:
 * a draft-only parameter (SC scale-resolution) is changed, then SAV CHG + ENT
 * persists it (AC27.2/27.3), a confirmation is shown (AC27.4), and the value
 * survives a real page reload (AC27.5). The discard path — exiting setup WITHOUT
 * SAV CHG — leaves the setting at its default after reload (AC27.6).
 *
 * SC is the ideal draft-only probe: it has no commit-on-change hook, so the only
 * way its value reaches nvMem/localStorage is through SAV CHG.
 *
 * The 7-segment panel renders the SAV CHG item as "SAU ChG" (no lowercase 'u'
 * glyph) and the post-save confirmation as "StorEd".
 *
 * @see project/user-stories/06-configuration/US-027-save-changes.md
 */

/** Open setup, pick X, and scroll up to the SC parameter. */
async function gotoSC(dro: DROPage) {
  await dro.settingsButton.click();
  await dro.waitForAxisPureTextValue('X', 'SELECt');
  await dro.selectAxis('X');
  await dro.waitForAxisPureTextValue('X', 'LinEAr');
  while (!(await dro.getAxisRawText('X')).startsWith('SC')) {
    await dro.key8.click();
  }
}

/** Scroll up to an exact parameter label. */
async function scrollToLabel(dro: DROPage, label: string) {
  let guard = 0;
  while ((await dro.getAxisRawText('X')) !== label) {
    await dro.key8.click();
    guard += 1;
    if (guard > 30) throw new Error(`label ${label} not reachable`);
  }
}

test.describe('US-027: Setup Menu - Save Changes', () => {
  test('SAV CHG persists an SC change that survives a power cycle (AC27.2-27.5)', async ({ dro }) => {
    await gotoSC(dro);
    await dro.waitForAxisPureTextValue('X', 'SC 5.0');

    // Lower resolution to 1 micron (draft only): 5 -> 2 -> 1.
    await dro.key4.click();
    await dro.waitForAxisPureTextValue('X', 'SC 2.0');
    await dro.key4.click();
    await dro.waitForAxisPureTextValue('X', 'SC 1.0');

    // Scroll to SAV CHG and confirm with ENT.
    await scrollToLabel(dro, 'SAU ChG');
    await dro.enterButton.click();

    // Confirmation message (AC27.4).
    await dro.waitForAxisPureTextValue('X', 'StorEd');

    // Power cycle: reload the page. nvMem rehydrates from localStorage.
    await dro.reload();
    await dro.waitForAxisValue('X', 0);

    // Re-enter setup: SC now reads the saved 1-micron value (AC27.5).
    await gotoSC(dro);
    await dro.waitForAxisPureTextValue('X', 'SC 1.0');
  });

  test('exiting via End WITHOUT SAV CHG discards the change across a power cycle (AC27.6)', async ({ dro }) => {
    await gotoSC(dro);
    await dro.waitForAxisPureTextValue('X', 'SC 5.0');

    // Change SC to 2.0 (draft), then exit via End WITHOUT saving.
    await dro.key4.click();
    await dro.waitForAxisPureTextValue('X', 'SC 2.0');
    await scrollToLabel(dro, 'End');
    await dro.enterButton.click();
    await dro.waitForAxisValue('X', 0);

    // Power cycle, re-enter setup: SC is back at the 5-micron default (AC27.6).
    await dro.reload();
    await dro.waitForAxisValue('X', 0);
    await gotoSC(dro);
    await dro.waitForAxisPureTextValue('X', 'SC 5.0');
  });
});

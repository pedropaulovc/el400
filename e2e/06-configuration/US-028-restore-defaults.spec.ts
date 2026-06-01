import { test, expect } from '../helpers/fixtures';
import type { DROPage } from '../helpers/dro-page';

/**
 * E2E Tests: US-028 Setup Menu — Restore Defaults (`rSt oEm`)
 *
 * Proves end to end, through real operator key presses, that:
 * - the `rSt oEm` row is reachable in setup (AC28.1-28.3);
 * - ENT runs the restore and shows `IN ProG` (AC28.7/28.8), which auto-returns to
 *   the normal screen after the dwell (AC28.9);
 * - settings come back to factory defaults (AC28.10) — a `bEEP oFF` set first is
 *   `bEEP on` again after restore;
 * - when an OEM baseline exists, restore returns to THAT baseline (AC44.4).
 *
 * Design note: per the el400-operation-manual §6.2 tie-breaker, `rSt oEñ`
 * ("Restore default settings") is its own setup row, separate from the adjacent
 * password-protected `oEñ ñod` (OEM mode, US-044). The story's password/3 AXIS/
 * MILL/OPT OFF confirm chain is OCR-era conflation of those two rows; see the
 * story's "Notes — Manual reconciliation" block.
 *
 * @see project/user-stories/06-configuration/US-028-restore-defaults.md
 */

/** Open setup, pick X, scroll the 2-key to the `rSt oEm` row. */
async function gotoRestoreRow(dro: DROPage) {
  await dro.settingsButton.click();
  await dro.waitForAxisPureTextValue('X', 'SELECt');
  await dro.selectAxis('X');
  let guard = 0;
  while ((await dro.getAxisRawText('X')) !== 'rSt oEm') {
    await dro.key2.click();
    guard += 1;
    if (guard > 40) throw new Error('rSt oEm row not reachable in setup');
  }
}

/** Cycle the BEEP row to `bEEP oFF`, then exit setup (commit-on-change). */
async function setBeepOff(dro: DROPage) {
  await dro.settingsButton.click();
  await dro.waitForAxisPureTextValue('X', 'SELECt');
  await dro.selectAxis('X');
  let guard = 0;
  while (
    (await dro.getAxisRawText('X')) !== 'bEEP on' &&
    (await dro.getAxisRawText('X')) !== 'bEEP oFF'
  ) {
    await dro.key2.click();
    guard += 1;
    if (guard > 40) throw new Error('bEEP row not reachable');
  }
  guard = 0;
  while ((await dro.getAxisRawText('X')) !== 'bEEP oFF') {
    await dro.key6.click();
    guard += 1;
    if (guard > 4) throw new Error('bEEP oFF not reachable by cycling');
  }
  await dro.clearButton.click(); // exit (beep is already committed)
  await dro.waitForAxisValue('X', 0);
}

/** Read nvMem.beepEnabled from the persisted store. */
async function persistedBeepEnabled(dro: DROPage): Promise<boolean | undefined> {
  return dro.page.evaluate(() => {
    const raw = localStorage.getItem('el400-dro-non-volatile-memory');
    return raw ? JSON.parse(raw)?.state?.nvMem?.beepEnabled : undefined;
  });
}

test.describe('US-028: Setup Menu - Restore Defaults', () => {
  test('restores factory defaults via the rSt oEm row (AC28.3/28.7/28.8/28.10)', async ({ dro }) => {
    // Move a setting away from factory first (beep off), then restore.
    await setBeepOff(dro);
    expect(await persistedBeepEnabled(dro)).toBe(false);

    await gotoRestoreRow(dro);
    await dro.enterButton.click();

    // IN ProG is shown while the restore runs (AC28.8).
    await dro.waitForAxisPureTextValue('X', 'In ProG');

    // The restore returns the beep to its factory default (on) (AC28.10).
    await expect.poll(() => persistedBeepEnabled(dro)).toBe(true);

    // The IN ProG screen auto-returns to the normal position display (AC28.9).
    await dro.waitForAxisValue('X', 0, 5000);
  });

  test('AC44.4: restores to the captured OEM baseline', async ({ dro }) => {
    // Define an OEM baseline with beep OFF (so the baseline differs from factory),
    // driven entirely through the real device: set beep off in setup, then store
    // it as the OEM baseline via the password-gated OEM mode (US-044).
    await setBeepOff(dro);
    await gotoOemRowAndStore(dro);

    // Now flip beep back ON (away from the baseline), then restore.
    await setBeepOn(dro);
    expect(await persistedBeepEnabled(dro)).toBe(true);

    await gotoRestoreRow(dro);
    await dro.enterButton.click();
    await dro.waitForAxisPureTextValue('X', 'In ProG');

    // Restore returned beep to the OEM baseline value (OFF), not factory (on).
    await expect.poll(() => persistedBeepEnabled(dro)).toBe(false);
  });
});

/** Enter OEM mode (password 35726) from the `oEm mod` row and STORE the baseline. */
async function gotoOemRowAndStore(dro: DROPage) {
  await dro.settingsButton.click();
  await dro.waitForAxisPureTextValue('X', 'SELECt');
  await dro.selectAxis('X');
  let guard = 0;
  while ((await dro.getAxisRawText('X')) !== 'oEm mod') {
    await dro.key2.click();
    guard += 1;
    if (guard > 40) throw new Error('oEm mod row not reachable');
  }
  await dro.enterButton.click();
  await dro.waitForAxisPureTextValue('X', 'PASS');
  await dro.key3.click();
  await dro.key5.click();
  await dro.key7.click();
  await dro.key2.click();
  await dro.key6.click();
  await dro.enterButton.click();
  await dro.waitForAxisPureTextValue('X', 'oEm');
  await dro.enterButton.click(); // STORE baseline
  await dro.waitForAxisPureTextValue('X', 'StorEd');
  // StorEd auto-returns to the setup menu (oEm mod row); exit to idle so the
  // next setup entry starts cleanly from the SELECT prompt.
  await dro.waitForAxisPureTextValue('X', 'oEm mod', 3000);
  await dro.clearButton.click();
  await dro.waitForAxisValue('X', 0);
}

/** Cycle the BEEP row to `bEEP on`, then exit setup (commit-on-change). */
async function setBeepOn(dro: DROPage) {
  await dro.settingsButton.click();
  await dro.waitForAxisPureTextValue('X', 'SELECt');
  await dro.selectAxis('X');
  let guard = 0;
  while (
    (await dro.getAxisRawText('X')) !== 'bEEP on' &&
    (await dro.getAxisRawText('X')) !== 'bEEP oFF'
  ) {
    await dro.key2.click();
    guard += 1;
    if (guard > 40) throw new Error('bEEP row not reachable');
  }
  guard = 0;
  while ((await dro.getAxisRawText('X')) !== 'bEEP on') {
    await dro.key6.click();
    guard += 1;
    if (guard > 4) throw new Error('bEEP on not reachable by cycling');
  }
  await dro.clearButton.click();
  await dro.waitForAxisValue('X', 0);
}

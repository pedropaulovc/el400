import { test, expect } from '../helpers/fixtures';
import type { DROPage } from '../helpers/dro-page';

/**
 * E2E Tests: US-044 Setup Menu — OEM Mode (custom default baseline)
 *
 * Proves end to end, through real operator key presses, that:
 * - the `oEm mod` row is reachable in setup (AC 44.1);
 * - ENT opens a password prompt and the correct code (typed on the real keypad)
 *   enters OEM Mode, where ENT stores the live config as the OEM baseline
 *   (AC 44.2 / 44.3);
 * - the worked example holds: `EnF on` saved as the baseline is captured, and the
 *   baseline survives a real page reload / power cycle (AC 44.5 / 44.6);
 * - a wrong code is rejected and OEM Mode is NOT entered (AC 44.7).
 *
 * AC 44.4 (restore returns to THIS baseline) is the consuming side, wired in
 * US-028 (`rSt oEm`); here we prove the baseline is correctly defined + persisted.
 *
 * The 7-segment panel renders the row as "oEm mod", the prompt as "PASS", the
 * entered screen as "oEm", a wrong code as "Err", and the save confirmation as
 * the shared "StorEd".
 *
 * @see project/user-stories/06-configuration/US-044-oem-mode.md
 */

/** Open setup, pick X, scroll down to the `oEm mod` row. */
async function gotoOemRow(dro: DROPage) {
  await dro.settingsButton.click();
  await dro.waitForAxisPureTextValue('X', 'SELECt');
  await dro.selectAxis('X');
  let guard = 0;
  while ((await dro.getAxisRawText('X')) !== 'oEm mod') {
    await dro.key2.click();
    guard += 1;
    if (guard > 40) throw new Error('oEm mod row not reachable in setup');
  }
}

/** Type the correct OEM password (35726) on the real numeric keypad. */
async function typeCorrectPassword(dro: DROPage) {
  await dro.key3.click();
  await dro.key5.click();
  await dro.key7.click();
  await dro.key2.click();
  await dro.key6.click();
}

/** Turn `EnF on` via the real setup buttons, then exit setup (commit-on-change). */
async function setEnfOn(dro: DROPage) {
  await dro.settingsButton.click();
  await dro.waitForAxisPureTextValue('X', 'SELECt');
  await dro.selectAxis('X');
  let guard = 0;
  while (
    (await dro.getAxisRawText('X')) !== 'EnF oFF' &&
    (await dro.getAxisRawText('X')) !== 'EnF on'
  ) {
    await dro.key2.click();
    guard += 1;
    if (guard > 40) throw new Error('EnF row not reachable');
  }
  guard = 0;
  while ((await dro.getAxisRawText('X')) !== 'EnF on') {
    await dro.key6.click();
    guard += 1;
    if (guard > 4) throw new Error('EnF on not reachable by cycling');
  }
  await dro.clearButton.click(); // exit (EnF is already committed)
  await dro.waitForAxisValue('X', 0);
}

test.describe('US-044: Setup Menu - OEM Mode', () => {
  test('correct password stores the live config as the OEM baseline, surviving a power cycle (AC 44.1/44.2/44.3/44.5/44.6)', async ({ dro }) => {
    // Worked example: enable EnF on, then capture it as the OEM baseline.
    await setEnfOn(dro);

    await gotoOemRow(dro);
    await dro.enterButton.click();
    await dro.waitForAxisPureTextValue('X', 'PASS'); // password prompt (AC 44.2)

    await typeCorrectPassword(dro);
    await dro.enterButton.click();
    await dro.waitForAxisPureTextValue('X', 'oEm'); // entered OEM Mode

    await dro.enterButton.click(); // STORE baseline (AC 44.3)
    await dro.waitForAxisPureTextValue('X', 'StorEd');

    // Power cycle: reload. The baseline must rehydrate from localStorage (AC 44.6),
    // with EnF on captured (AC 44.5).
    await dro.reload();
    await dro.waitForAxisValue('X', 0);

    const persisted = await dro.page.evaluate(() => {
      const raw = localStorage.getItem('el400-dro-non-volatile-memory');
      return raw ? JSON.parse(raw) : null;
    });
    expect(persisted?.state?.nvMem?.oemDefaults).not.toBeNull();
    expect(persisted?.state?.nvMem?.oemDefaults?.encoderFailWarning).toBe(true);
  });

  test('a wrong password is rejected and OEM Mode is not entered (AC 44.7)', async ({ dro }) => {
    await gotoOemRow(dro);
    await dro.enterButton.click();
    await dro.waitForAxisPureTextValue('X', 'PASS');

    // Type a wrong code on the real keypad.
    await dro.key0.click();
    await dro.key0.click();
    await dro.key0.click();
    await dro.key0.click();
    await dro.enterButton.click();

    // Rejection flash — NOT the OEM Mode screen.
    await dro.waitForAxisPureTextValue('X', 'Err');

    // No baseline was captured.
    const oemDefaults = await dro.page.evaluate(() => {
      const raw = localStorage.getItem('el400-dro-non-volatile-memory');
      return raw ? JSON.parse(raw)?.state?.nvMem?.oemDefaults ?? null : null;
    });
    expect(oemDefaults).toBeNull();

    // Auto-dismiss (after the ~1s Err flash) returns to the oEm mod row;
    // OEM Mode was never entered.
    await dro.waitForAxisPureTextValue('X', 'oEm mod', 3000);
  });
});

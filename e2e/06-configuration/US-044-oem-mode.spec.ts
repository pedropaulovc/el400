import { test, expect } from '../helpers/fixtures';
import type { DROPage } from '../helpers/dro-page';

type Axis = 'X' | 'Y' | 'Z';

/**
 * E2E Tests: US-044 Setup Menu — OEM Mode (custom default baseline)
 *
 * The password flow captures saved configuration as the OEM baseline. A later
 * rSt oEm applies that baseline only to the selected axis, preserving a distinct
 * other-axis setting, global configuration, and live operator datum.
 *
 * @see project/user-stories/06-configuration/US-044-oem-mode.md
 */

async function openSetup(dro: DROPage, axis: Axis) {
  await dro.settingsButton.click();
  await dro.waitForAxisPureTextValue('X', 'SELECt');
  await dro.selectAxis(axis);
}

async function gotoExactRow(dro: DROPage, label: string) {
  let guard = 0;
  while ((await dro.getAxisRawText('X')) !== label) {
    await dro.key2.click();
    if (++guard > 40) throw new Error(`${label} row not reachable`);
  }
}

async function gotoPrefixRow(dro: DROPage, axis: Axis, prefix: string) {
  await openSetup(dro, axis);
  let guard = 0;
  while (!(await dro.getAxisRawText('X')).startsWith(prefix)) {
    await dro.key2.click();
    if (++guard > 40) throw new Error(`${prefix} row not reachable`);
  }
}

async function saveAndExitSetup(dro: DROPage) {
  await gotoExactRow(dro, 'SAU ChG');
  await dro.enterButton.click();
  await dro.waitForAxisPureTextValue('X', 'StorEd');
  await dro.clearButton.click();
  await dro.waitForAxisPureTextValue('X', 'SAU ChG');
  await dro.clearButton.click();
  await dro.waitForReady('idle');
}

async function setChoice(dro: DROPage, axis: Axis, prefix: string, target: string) {
  await gotoPrefixRow(dro, axis, prefix);
  let guard = 0;
  while ((await dro.getAxisRawText('X')) !== target) {
    await dro.key6.click();
    if (++guard > 12) throw new Error(`${target} choice not reachable`);
  }
  await saveAndExitSetup(dro);
}

async function readChoice(dro: DROPage, axis: Axis, prefix: string) {
  await gotoPrefixRow(dro, axis, prefix);
  const value = await dro.getAxisRawText('X');
  await dro.clearButton.click();
  await dro.waitForReady('idle');
  return value;
}

async function gotoOemRow(dro: DROPage) {
  await openSetup(dro, 'X');
  await gotoExactRow(dro, 'oEm mod');
}

async function typeCorrectPassword(dro: DROPage) {
  await dro.key3.click();
  await dro.key5.click();
  await dro.key7.click();
  await dro.key2.click();
  await dro.key6.click();
}

async function captureOemBaseline(dro: DROPage) {
  await gotoOemRow(dro);
  await dro.enterButton.click();
  await dro.waitForAxisPureTextValue('X', 'PASS');
  await typeCorrectPassword(dro);
  await dro.enterButton.click();
  await dro.waitForAxisPureTextValue('X', 'oEm');
  await dro.enterButton.click();
  await dro.waitForAxisPureTextValue('X', 'StorEd');
  await dro.clearButton.click();
  await dro.waitForAxisPureTextValue('X', 'oEm mod');
  await dro.clearButton.click();
  await dro.waitForReady('idle');
}

async function restoreAxis(dro: DROPage, axis: Axis) {
  await openSetup(dro, axis);
  await gotoExactRow(dro, 'rSt oEm');
  await dro.enterButton.click();
  await dro.waitForAxisPureTextValue('X', 'In ProG');
  await dro.waitForReady('idle');
}

async function setOperatorDatum(dro: DROPage, value: string) {
  await dro.selectAxis('X');
  await dro.enterNumber(value);
  await dro.enterButton.click();
  await dro.waitForAxisValue('X', Number(value));
}


test.describe('US-044: Setup Menu - OEM Mode', () => {
  test.beforeEach(async ({ dro }) => {
    await dro.goto({ source: 'debug', skipBootMessage: true });
  });

  test('correct password captures a persistent selected-axis OEM baseline', async ({ dro }) => {
    await setChoice(dro, 'X', 'SC', 'SC 1.0');
    await setChoice(dro, 'Y', 'dP', 'dP 20.0');
    await captureOemBaseline(dro);

    await setChoice(dro, 'X', 'SC', 'SC 50.0');
    await setChoice(dro, 'Y', 'dP', 'dP 10.0');
    await setChoice(dro, 'X', 'bEEP', 'bEEP oFF');
    await dro.reload();
    expect(await readChoice(dro, 'X', 'SC')).toBe('SC 50.0');
    expect(await readChoice(dro, 'Y', 'dP')).toBe('dP 10.0');

    await setOperatorDatum(dro, '8.75');
    await restoreAxis(dro, 'X');
    await dro.waitForAxisValue('X', 8.75);
    await dro.reload();

    expect(await readChoice(dro, 'X', 'SC')).toBe('SC 1.0');
    expect(await readChoice(dro, 'Y', 'dP')).toBe('dP 10.0');
    expect(await readChoice(dro, 'X', 'bEEP')).toBe('bEEP oFF');
  });

  test('a wrong password shows Err and returns to the OEM row without entering', async ({ dro }) => {
    await gotoOemRow(dro);
    await dro.enterButton.click();
    await dro.waitForAxisPureTextValue('X', 'PASS');

    await dro.key0.click();
    await dro.key0.click();
    await dro.key0.click();
    await dro.key0.click();
    await dro.enterButton.click();

    await dro.waitForAxisPureTextValue('X', 'Err');
    await dro.waitForAxisPureTextValue('X', 'oEm mod', 3000);
  });
});

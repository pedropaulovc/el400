import { test, expect } from '../helpers/fixtures';
import type { DROPage } from '../helpers/dro-page';
import type { Page } from '@playwright/test';

/**
 * E2E Tests: US-025 Setup Menu - Keypad Beep (bEEP)
 *
 * Keypad-beep detection observes the browser-native AudioBufferSourceNode path
 * used by playClickSound. The application never reads the counter. The separate
 * near-zero warning is asserted through its visible alert, without assuming it
 * uses the keypad click's audio implementation.
 *
 * @see project/user-stories/06-configuration/US-025-keypad-beep.md
 */

declare global {
  interface Window {
    __beepCount: number;
  }
}

async function instrumentBeep(page: Page) {
  await page.addInitScript(() => {
    window.__beepCount = 0;
    const prototype = AudioBufferSourceNode.prototype;
    const originalStart = prototype.start;
    prototype.start = function patchedStart(this: AudioBufferSourceNode, ...args: unknown[]) {
      window.__beepCount += 1;
      return originalStart.apply(this, args as []);
    };
  });
}

const beepCount = (page: Page) => page.evaluate(() => window.__beepCount);
const resetBeepCount = (page: Page) => page.evaluate(() => { window.__beepCount = 0; });

async function gotoBeep(dro: DROPage) {
  await dro.settingsButton.click();
  await dro.waitForAxisPureTextValue('X', 'SELECt');
  await dro.selectAxis('X');

  let guard = 0;
  while (!(await dro.getAxisRawText('X')).startsWith('bEEP')) {
    await dro.key2.click();
    if (++guard > 40) throw new Error('bEEP row not reachable');
  }
}

async function exitSetup(dro: DROPage) {
  let guard = 0;
  while ((await dro.getAxisRawText('X')) !== 'End') {
    await dro.key2.click();
    if (++guard > 40) throw new Error('End row not reachable');
  }
  await dro.enterButton.click();
  await dro.waitForReady('idle');
}

async function saveAndExitSetup(dro: DROPage) {
  let guard = 0;
  while ((await dro.getAxisRawText('X')) !== 'SAU ChG') {
    await dro.key2.click();
    if (++guard > 40) throw new Error('SAU ChG row not reachable');
  }
  await dro.enterButton.click();
  await dro.waitForAxisPureTextValue('X', 'StorEd');
  await dro.clearButton.click();
  await dro.waitForAxisPureTextValue('X', 'SAU ChG');
  await dro.clearButton.click();
  await dro.waitForReady('idle');
}

async function setBeepOff(dro: DROPage) {
  await gotoBeep(dro);
  while ((await dro.getAxisRawText('X')) !== 'bEEP oFF') {
    await dro.key6.click();
  }
  await saveAndExitSetup(dro);
}


test.describe('US-025: Keypad Beep', () => {
  test.beforeEach(async ({ page, dro }) => {
    await instrumentBeep(page);
    await dro.goto({ source: 'debug', skipBootMessage: true });
  });

  test('navigates to bEEP showing default ON and previews both choices', async ({ dro }) => {
    await gotoBeep(dro);
    expect(await dro.getAxisRawText('X')).toBe('bEEP on');

    await dro.key6.click();
    expect(await dro.getAxisRawText('X')).toBe('bEEP oFF');
    await dro.key4.click();
    expect(await dro.getAxisRawText('X')).toBe('bEEP on');
  });

  test('with bEEP on, every real key press starts one click buffer', async ({ page, dro }) => {
    await gotoBeep(dro);
    expect(await dro.getAxisRawText('X')).toBe('bEEP on');
    await exitSetup(dro);

    await resetBeepCount(page);
    await dro.key1.click();
    await dro.key2.click();
    await dro.key3.click();
    expect(await beepCount(page)).toBe(3);
  });

  test('after SAU CHG saves bEEP off, real key presses are silent', async ({ page, dro }) => {
    await setBeepOff(dro);

    await resetBeepCount(page);
    await dro.key1.click();
    await dro.key2.click();
    await dro.key3.click();
    expect(await beepCount(page)).toBe(0);
  });

  test('bEEP off silences keys without suppressing the near-zero warning', async ({ page, dro }) => {
    await dro.toggleInchMm();
    expect(await dro.isMmUnits()).toBe(true);
    await dro.simulateEncoderAbsoluteMove('X', 0);

    await setBeepOff(dro);
    await dro.enableZeroApproachWarning('X');

    await resetBeepCount(page);
    await dro.key1.click();
    await dro.key2.click();
    expect(await beepCount(page)).toBe(0);

    await dro.startDistanceToGo('X', '10');
    await dro.waitForAxisValue('X', 10);
    await dro.simulateEncoderAbsoluteMove('X', 9.97);
    await expect(dro.page.getByTestId('audio-indicator')).toBeVisible();
    expect(await beepCount(page)).toBe(0);
  });
});

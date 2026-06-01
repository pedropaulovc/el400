import { test, expect } from '../helpers/fixtures';
import type { DROPage } from '../helpers/dro-page';
import type { Page } from '@playwright/test';

/**
 * E2E Tests: US-025 Setup Menu - Keypad Beep (bEEP)
 *
 * Critical happy path: an operator toggles bEEP off through the real setup menu,
 * then real keypad presses fall silent; with bEEP on (default) every press
 * beeps.
 *
 * Beep detection is honest. We do NOT use the story draft's `window.setDistance
 * ToGo` hook or console-message sniffing (both forbidden). Instead we instrument
 * the BROWSER-NATIVE AudioBufferSourceNode.prototype.start via addInitScript and
 * count real start() calls — the same production audio node playClickSound drives
 * on a real key press. The app never reads this counter; it only observes the
 * Web Audio API the simulator actually uses.
 *
 * @see project/user-stories/06-configuration/US-025-keypad-beep.md
 */

declare global {
  interface Window {
    __beepCount: number;
  }
}

/** Install a browser-native counter of started audio sources before app load. */
async function instrumentBeep(page: Page) {
  await page.addInitScript(() => {
    window.__beepCount = 0;
    const proto = AudioBufferSourceNode.prototype;
    const originalStart = proto.start;
    proto.start = function patchedStart(this: AudioBufferSourceNode, ...args: unknown[]) {
      window.__beepCount += 1;
      return originalStart.apply(this, args as []);
    };
  });
}

const beepCount = (page: Page) => page.evaluate(() => window.__beepCount);
const resetBeepCount = (page: Page) =>
  page.evaluate(() => {
    window.__beepCount = 0;
  });

/** Open setup, pick X, and scroll to the bEEP parameter. */
async function gotoBeep(dro: DROPage) {
  await dro.settingsButton.click();
  await dro.waitForAxisPureTextValue('X', 'SELECt');
  await dro.selectAxis('X');
  await dro.waitForAxisPureTextValue('X', 'LinEAr');
  while (!(await dro.getAxisRawText('X')).startsWith('bEEP')) {
    await dro.key2.click();
  }
}

/** Exit setup back to idle via the terminal End item + ent. */
async function exitSetup(dro: DROPage) {
  while ((await dro.getAxisRawText('X')) !== 'End') {
    await dro.key2.click();
  }
  await dro.enterButton.click();
  await dro.waitForAxisValue('X', 0);
}

test.describe('US-025: Keypad Beep', () => {
  test.beforeEach(async ({ page, dro }) => {
    // Instrument first, then reload so the init script applies to the app page.
    await instrumentBeep(page);
    await dro.goto();
  });

  test('navigates to bEEP showing default ON, toggles with 4/6 (AC25.1-25.3)', async ({ dro }) => {
    await gotoBeep(dro);
    expect(await dro.getAxisRawText('X')).toBe('bEEP on');

    await dro.key6.click(); // ► toggles to OFF
    expect(await dro.getAxisRawText('X')).toBe('bEEP oFF');

    await dro.key4.click(); // ◄ toggles back to ON
    expect(await dro.getAxisRawText('X')).toBe('bEEP on');
  });

  test('with bEEP on (default), every key press beeps (AC25.4)', async ({ page, dro }) => {
    // Leave bEEP at default ON; just confirm presence and exit.
    await gotoBeep(dro);
    expect(await dro.getAxisRawText('X')).toBe('bEEP on');
    await exitSetup(dro);

    await resetBeepCount(page);
    await dro.key1.click();
    await dro.key2.click();
    await dro.key3.click();

    expect(await beepCount(page)).toBe(3);
  });

  test('after toggling bEEP off, key presses are silent (AC25.5 keypad half)', async ({ page, dro }) => {
    await gotoBeep(dro);
    await dro.key6.click(); // -> bEEP oFF
    expect(await dro.getAxisRawText('X')).toBe('bEEP oFF');
    await exitSetup(dro);

    await resetBeepCount(page);
    await dro.key1.click();
    await dro.key2.click();
    await dro.key3.click();

    expect(await beepCount(page)).toBe(0);
  });
});

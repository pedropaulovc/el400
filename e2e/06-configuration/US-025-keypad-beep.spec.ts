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
    __warningBeepCount: number;
  }
}

/**
 * Install browser-native counters of started audio sources before app load.
 * Keypad clicks drive AudioBufferSourceNode.start (playClickSound); the
 * zero-approach warning drives OscillatorNode.start (playZeroApproachBeep,
 * US-024). Counting them separately lets AC25.5 assert the warning still sounds
 * while keypad clicks are silenced — observing the real Web Audio API, no app
 * hooks.
 */
async function instrumentBeep(page: Page) {
  await page.addInitScript(() => {
    window.__beepCount = 0;
    window.__warningBeepCount = 0;

    const bufProto = AudioBufferSourceNode.prototype;
    const originalBufStart = bufProto.start;
    bufProto.start = function patchedBufStart(this: AudioBufferSourceNode, ...args: unknown[]) {
      window.__beepCount += 1;
      return originalBufStart.apply(this, args as []);
    };

    const oscProto = OscillatorNode.prototype;
    const originalOscStart = oscProto.start;
    oscProto.start = function patchedOscStart(this: OscillatorNode, ...args: unknown[]) {
      window.__warningBeepCount += 1;
      return originalOscStart.apply(this, args as []);
    };
  });
}

const beepCount = (page: Page) => page.evaluate(() => window.__beepCount);
const warningBeepCount = (page: Page) => page.evaluate(() => window.__warningBeepCount);
const resetBeepCounts = (page: Page) =>
  page.evaluate(() => {
    window.__beepCount = 0;
    window.__warningBeepCount = 0;
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

/** Toggle bEEP to OFF through the real setup menu (leaves the menu open at bEEP). */
async function setBeepOff(dro: DROPage) {
  await gotoBeep(dro);
  while ((await dro.getAxisRawText('X')) !== 'bEEP oFF') {
    await dro.key6.click();
  }
}

test.describe('US-025: Keypad Beep', () => {
  // Setup-menu changes commit to persisted nvMem; serialise so parallel workers
  // do not race on shared localStorage (matches US-024's spec).
  test.describe.configure({ mode: 'serial' });

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

    await resetBeepCounts(page);
    await dro.key1.click();
    await dro.key2.click();
    await dro.key3.click();

    expect(await beepCount(page)).toBe(3);
  });

  test('after toggling bEEP off, key presses are silent (AC25.5 keypad half)', async ({ page, dro }) => {
    await setBeepOff(dro);
    expect(await dro.getAxisRawText('X')).toBe('bEEP oFF');
    await exitSetup(dro);

    await resetBeepCounts(page);
    await dro.key1.click();
    await dro.key2.click();
    await dro.key3.click();

    expect(await beepCount(page)).toBe(0);
  });

  test('with bEEP off, the zero-approach warning still beeps while keys stay silent (AC25.5)', async ({ page, dro }) => {
    await dro.toggleInchMm(); // mm — clean magnitudes for the 0.0508 mm band
    expect(await dro.isMmUnits()).toBe(true);
    await dro.simulateEncoderAbsoluteMove('X', 0);

    // Real setup: bEEP off (exit), then Near-Zero Warning on (own session).
    await setBeepOff(dro);
    await exitSetup(dro);
    await dro.enableZeroApproachWarning(); // re-enters setup, sets bU22 on, exits

    // Keys are silent (gate active).
    await resetBeepCounts(page);
    await dro.key1.click();
    await dro.key2.click();
    expect(await beepCount(page)).toBe(0);

    // Drive a real distance-to-go approach toward the target.
    await dro.startDistanceToGo('X', '10');
    await dro.waitForAxisValue('X', 10);
    await dro.simulateEncoderAbsoluteMove('X', 9.97); // within BP DIST band

    // Warning indicator shows AND its oscillator beep fired — independent of bEEP.
    await expect(dro.page.getByTestId('audio-indicator')).toBeVisible();
    expect(await warningBeepCount(page)).toBeGreaterThan(0);
    // The keypad path never sounded.
    expect(await beepCount(page)).toBe(0);
  });
});

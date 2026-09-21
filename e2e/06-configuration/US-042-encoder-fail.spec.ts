import { test, expect } from '../helpers/fixtures';
import type { DROPage } from '../helpers/dro-page';

/**
 * E2E Tests: US-042 Setup Menu - Encoder-Fail Warning (ENF)
 *
 * An operator saves `EnF on` through SAU CHG, then uses the visible debug signal
 * controls to drop and restore an encoder. The affected axis must display
 * `no SIG`, only that axis, while the default ENF-off path remains silent.
 *
 * @see project/user-stories/06-configuration/US-042-encoder-fail-warning.md
 */

/** Open setup, pick X, and scroll to the EnF parameter. */
async function gotoEnf(dro: DROPage) {
  await dro.settingsButton.click();
  await dro.waitForAxisPureTextValue('X', 'SELECt');
  await dro.selectAxis('X');
  await dro.waitForAxisPureTextValue('X', 'LinEAr');
  // Scroll down until the EnF parameter is highlighted.
  while (!(await dro.getAxisRawText('X')).startsWith('EnF')) {
    await dro.key2.click();
  }
}

/** Set EnF on through the real menu and exit back to idle. */
async function enableEnf(dro: DROPage) {
  await gotoEnf(dro);
  while ((await dro.getAxisRawText('X')) !== 'EnF on') {
    await dro.key6.click();
  }
  // All setup choices remain drafts until SAU CHG.
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

test.describe('US-042: Encoder-Fail Warning', () => {
  test.beforeEach(async ({ dro }) => {
    await dro.goto({ source: 'debug', skipBootMessage: true });
  });

  test('with ENF on, signal loss shows no SIG on the affected axis only (AC 42.3)', async ({ dro }) => {
    await dro.simulateEncoderAbsoluteMove('X', 0);
    await enableEnf(dro);
    await dro.reload();

    await dro.simulateEncoderSignalLoss('X');
    await dro.waitForAxisPureTextValue('X', 'no SIG');
    // Other axes keep reading position.
    expect(await dro.getAxisRawText('Y')).not.toBe('no SIG');
    expect(await dro.getAxisRawText('Z')).not.toBe('no SIG');
  });

  test('reconnect clears the warning (AC 42.5)', async ({ dro }) => {
    await dro.simulateEncoderAbsoluteMove('X', 0);
    await enableEnf(dro);

    await dro.simulateEncoderSignalLoss('X');
    await dro.waitForAxisPureTextValue('X', 'no SIG');

    await dro.simulateEncoderSignalRestore('X');
    await dro.waitForAxisValue('X', 0);
  });

  test('with ENF off (default), signal loss is silent (AC 42.4)', async ({ dro }) => {
    await dro.simulateEncoderAbsoluteMove('X', 0);

    // ENF never turned on.
    await dro.simulateEncoderSignalLoss('X');
    // Nudge a position update so the display recomputes after the dropout.
    await dro.simulateEncoderAbsoluteMove('X', 0);
    await dro.waitForAxisValue('X', 0);
    expect(await dro.getAxisRawText('X')).not.toBe('no SIG');
  });
});

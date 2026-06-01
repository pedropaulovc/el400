import { test, expect } from '../helpers/fixtures';

/**
 * E2E Tests: US-042 Setup Menu - Encoder-Fail Warning (ENF)
 *
 * Critical happy path: an operator enables `EnF on` through the real setup menu,
 * then an encoder cable drops (simulated through the mock CNCjs server's
 * controller:state stream). The affected axis must display `no SIG`, only that
 * axis, and the warning must clear when the signal returns. The ENF-off case
 * (default) proves the dropout is silent.
 *
 * Signal loss travels the real adapter path: the mock server emits an encoder
 * signal-loss flag on controller:state, the CncjsMillAdapter normalizes it into
 * MillState.encoderSignal, and MILL_STATE_CHANGED drives the display override —
 * no in-app test hook.
 *
 * @see project/user-stories/06-configuration/US-042-encoder-fail-warning.md
 */

/** Open setup, pick X, and scroll to the EnF parameter. */
async function gotoEnf(dro: import('../helpers/dro-page').DROPage) {
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
async function enableEnf(dro: import('../helpers/dro-page').DROPage) {
  await gotoEnf(dro);
  while ((await dro.getAxisRawText('X')) !== 'EnF on') {
    await dro.key6.click();
  }
  // Exit via the terminal End item + ent.
  while ((await dro.getAxisRawText('X')) !== 'End') {
    await dro.key2.click();
  }
  await dro.enterButton.click();
  await dro.waitForAxisValue('X', 0);
}

test.describe('US-042: Encoder-Fail Warning', () => {
  test('with ENF on, signal loss shows no SIG on the affected axis only (AC 42.3)', async ({ dro }) => {
    await dro.simulateEncoderAbsoluteMove('X', 0);
    await enableEnf(dro);

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

import { test, expect } from '../helpers/fixtures';

/**
 * E2E Tests: US-026 Setup Menu - Display Sleep Timer
 *
 * The timeout is set through the REAL setup menu (operator key sequence: wrench
 * -> pick axis -> scroll to SLEEP T -> cycle to a value -> exit). Idle time is
 * advanced with Playwright's clock control (fake timers) so the test never waits
 * real minutes. The display sleeps via the real idle-timeout path; wake is driven
 * by a REAL key press and a REAL mock-encoder jog (the same MILL_STATE_CHANGED
 * path a physical scale uses) — never a window hook or forced state.
 *
 * @see project/user-stories/06-configuration/US-026-sleep-timer.md
 */

const ONE_MINUTE_MS = 60_000;

/** Open setup, pick X, and scroll to the SLEEP T parameter. */
async function gotoSleepT(dro: import('../helpers/dro-page').DROPage) {
  await dro.settingsButton.click();
  await dro.waitForAxisPureTextValue('X', 'SELECt');
  await dro.selectAxis('X');
  await dro.waitForAxisPureTextValue('X', 'LinEAr');
  // Scroll up until the SLEEP T parameter is highlighted (label prefix "SLP").
  while (!(await dro.getAxisRawText('X')).startsWith('SLP')) {
    await dro.key8.click();
  }
}

/** Set SLEEP T to 1 minute via the real menu, then exit setup to idle. */
async function setSleepOneMinute(dro: import('../helpers/dro-page').DROPage) {
  await gotoSleepT(dro);
  // Default is the disabled sentinel (SLP oFF). Right once cycles to 1 minute.
  await dro.waitForAxisPureTextValue('X', 'SLP oFF');
  await dro.key6.click();
  await dro.waitForAxisPureTextValue('X', 'SLP 1');
  // Exit: re-press wrench to SELECT, then CLEAR to idle.
  await dro.settingsButton.click();
  await dro.waitForAxisPureTextValue('X', 'SELECt');
  await dro.clearButton.click();
  await dro.waitForAxisValue('X', 0);
}

const panel = (dro: import('../helpers/dro-page').DROPage) =>
  dro.page.getByTestId('display-panel');

test.describe('US-026: Setup Menu - Display Sleep Timer', () => {
  test.describe.configure({ mode: 'serial' });

  test('navigate to SLEEP T and see the disabled default (AC26.1, AC26.2, AC26.8)', async ({ dro }) => {
    await dro.page.clock.install({ time: new Date('2024-01-01T00:00:00Z') });
    await dro.goto();
    await gotoSleepT(dro);
    await dro.waitForAxisPureTextValue('X', 'SLP oFF');
  });

  test('display sleeps after the idle period and the sleep LED flashes (AC26.5, AC26.6)', async ({ dro }) => {
    await dro.page.clock.install({ time: new Date('2024-01-01T00:00:00Z') });
    await dro.goto();
    await setSleepOneMinute(dro);

    // Not asleep yet.
    await expect(panel(dro)).toHaveAttribute('data-display-power', 'awake');

    // Advance one minute of idle time.
    await dro.page.clock.fastForward(ONE_MINUTE_MS);

    await expect(panel(dro)).toHaveAttribute('data-display-power', 'asleep');
    await expect(panel(dro)).toHaveClass(/sleeping/);
    await expect(dro.page.getByTestId('sleep-led')).toHaveClass(/flashing/);
  });

  test('a real key press wakes the sleeping display (AC26.7)', async ({ dro }) => {
    await dro.page.clock.install({ time: new Date('2024-01-01T00:00:00Z') });
    await dro.goto();
    await setSleepOneMinute(dro);

    await dro.page.clock.fastForward(ONE_MINUTE_MS);
    await expect(panel(dro)).toHaveAttribute('data-display-power', 'asleep');

    // A real keypad press wakes it.
    await dro.key5.click();
    await expect(panel(dro)).toHaveAttribute('data-display-power', 'awake');
  });

  test('a real axis jog wakes the sleeping display (AC26.7)', async ({ dro }) => {
    await dro.page.clock.install({ time: new Date('2024-01-01T00:00:00Z') });
    await dro.goto();
    await setSleepOneMinute(dro);

    await dro.page.clock.fastForward(ONE_MINUTE_MS);
    await expect(panel(dro)).toHaveAttribute('data-display-power', 'asleep');

    // A real mock-encoder jog (MILL_STATE_CHANGED) wakes it.
    await dro.simulateEncoderRelativeMove('X', 1.0);
    await expect(panel(dro)).toHaveAttribute('data-display-power', 'awake');
  });

  test('setting 0 keeps the display awake through a long idle period (AC26.8)', async ({ dro }) => {
    await dro.page.clock.install({ time: new Date('2024-01-01T00:00:00Z') });
    await dro.goto();
    // Default SLEEP T is 0 (disabled); leave it. Advance well past any timeout.
    await dro.page.clock.fastForward(120 * ONE_MINUTE_MS);
    await expect(panel(dro)).toHaveAttribute('data-display-power', 'awake');
  });
});

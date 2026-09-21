import { test, expect } from '../helpers/fixtures';
import type { DROPage } from '../helpers/dro-page';

/**
 * E2E Tests: US-026 Setup Menu - Display Sleep Timer
 *
 * The timeout is entered through the documented SLEEP t ENT/ENT numeric editor,
 * committed with SAU CHG, and exercised on the connected debug source. Playwright
 * advances the idle clock without waiting real minutes; wake input comes from a
 * real keypad click or the visible debug position control.
 *
 * @see project/user-stories/06-configuration/US-026-sleep-timer.md
 */

const ONE_MINUTE_MS = 60_000;

async function gotoSleepTimer(dro: DROPage) {
  await dro.settingsButton.click();
  await dro.waitForAxisPureTextValue('X', 'SELECt');
  await dro.selectAxis('X');

  let guard = 0;
  while ((await dro.getAxisRawText('X')) !== 'SLEEP t') {
    await dro.key2.click();
    if (++guard > 40) throw new Error('SLEEP t row not reachable');
  }
}

async function setSleepMinutes(dro: DROPage, minutes: number) {
  await gotoSleepTimer(dro);
  await dro.enterButton.click();
  await dro.waitForAxisPureTextValue('X', '000');
  await dro.enterButton.click();
  await dro.waitForAxisPureTextValue('X', '0');
  await dro.enterNumber(String(minutes));
  await dro.enterButton.click();
  await dro.waitForAxisPureTextValue('X', 'SAU ChG');

  await dro.enterButton.click();
  await dro.waitForAxisPureTextValue('X', 'StorEd');
  await dro.clearButton.click();
  await dro.waitForAxisPureTextValue('X', 'SAU ChG');
  await dro.clearButton.click();
  await dro.waitForReady('idle');
}

const panel = (dro: DROPage) => dro.page.getByTestId('display-panel');


test.describe('US-026: Setup Menu - Display Sleep Timer', () => {
  test.describe.configure({ mode: 'serial' });

  test('SLEEP t uses ENT/ENT numeric entry and accepts the 120-minute upper bound', async ({ dro }) => {
    await dro.page.clock.install({ time: new Date('2024-01-01T00:00:00Z') });
    await dro.goto({ source: 'debug', skipBootMessage: true });
    await gotoSleepTimer(dro);

    await dro.enterButton.click();
    await dro.waitForAxisPureTextValue('X', '000');
    await dro.enterButton.click();
    await dro.enterNumber('120');
    await dro.enterButton.click();
    await dro.waitForAxisPureTextValue('X', 'SAU ChG');

    await dro.enterButton.click();
    await dro.waitForAxisPureTextValue('X', 'StorEd');
    await dro.clearButton.click();
    await dro.waitForAxisPureTextValue('X', 'SAU ChG');
    await dro.clearButton.click();
    await dro.waitForReady('idle');
    await gotoSleepTimer(dro);
    await dro.enterButton.click();
    await dro.waitForAxisPureTextValue('X', '120');
  });

  test('display sleeps after the saved idle period and the sleep LED flashes', async ({ dro }) => {
    await dro.page.clock.install({ time: new Date('2024-01-01T00:00:00Z') });
    await dro.goto({ source: 'debug', skipBootMessage: true });
    await setSleepMinutes(dro, 1);

    await expect(panel(dro)).toHaveAttribute('data-display-power', 'awake');
    await dro.page.clock.fastForward(ONE_MINUTE_MS);
    await expect(panel(dro)).toHaveAttribute('data-display-power', 'asleep');
    await expect(panel(dro)).toHaveClass(/sleeping/);
    await expect(dro.page.getByTestId('sleep-led')).toHaveClass(/flashing/);
    for (const axis of ['X', 'Y', 'Z'] as const) await dro.waitForAxisPureTextValue(axis, '');
    await dro.page.clock.fastForward(2_000);
    await expect(panel(dro)).toHaveAttribute('data-display-power', 'asleep');
  });

  test('a real key press wakes the sleeping display', async ({ dro }) => {
    await dro.page.clock.install({ time: new Date('2024-01-01T00:00:00Z') });
    await dro.goto({ source: 'debug', skipBootMessage: true });
    await setSleepMinutes(dro, 1);

    await dro.page.clock.fastForward(ONE_MINUTE_MS);
    await expect(panel(dro)).toHaveAttribute('data-display-power', 'asleep');
    await dro.key5.click();
    await expect(panel(dro)).toHaveAttribute('data-display-power', 'awake');
    await dro.waitForReady('idle');
    await dro.selectAxis('X');
    await dro.waitForAxisValue('X', 0);
  });

  test('a visible debug axis jog wakes the sleeping display', async ({ dro }) => {
    await dro.page.clock.install({ time: new Date('2024-01-01T00:00:00Z') });
    await dro.goto({ source: 'debug', skipBootMessage: true });
    await setSleepMinutes(dro, 1);

    await dro.page.clock.fastForward(ONE_MINUTE_MS);
    await expect(panel(dro)).toHaveAttribute('data-display-power', 'asleep');
    await dro.simulateEncoderRelativeMove('X', 1);
    await expect(panel(dro)).toHaveAttribute('data-display-power', 'awake');
  });

  test('a saved numeric 0 disables sleep through a long idle period', async ({ dro }) => {
    await dro.page.clock.install({ time: new Date('2024-01-01T00:00:00Z') });
    await dro.goto({ source: 'debug', skipBootMessage: true });
    await setSleepMinutes(dro, 0);

    await dro.page.clock.fastForward(120 * ONE_MINUTE_MS);
    await expect(panel(dro)).toHaveAttribute('data-display-power', 'awake');
  });
});

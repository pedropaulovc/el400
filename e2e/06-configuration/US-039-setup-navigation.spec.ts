import { test, expect } from '../helpers/fixtures';

/**
 * E2E Tests: US-039 Setup Menu Navigation and Axis Selection
 *
 * Critical happy path + wrap-around edge case for the shared setup navigation
 * shell. Per-parameter behavior is covered by the per-parameter stories.
 *
 * Note: the 7-segment display renders the SELECT prompt as "SELECt" (the panel
 * has no uppercase T glyph; lowercase t is used, matching the real hardware).
 *
 * @see project/user-stories/06-configuration/US-039-setup-navigation.md
 */
test.describe('US-039: Setup Menu Navigation', () => {
  test.beforeEach(async ({ dro }) => {
    await dro.goto({ source: 'debug', skipBootMessage: true });
  });

  test('enter setup, select an axis, and End discards an unsaved choice', async ({ dro }) => {
    // Press the wrench/setup key -> SELECT prompt.
    await dro.settingsButton.click();
    await dro.waitForAxisPureTextValue('X', 'SELECt');

    // Select X axis -> first parameter (LinEAr).
    await dro.selectAxis('X');
    await dro.waitForAxisPureTextValue('X', 'LinEAr');

    // Preview a choice change. It remains a draft until SAU CHG.
    await dro.key6.click();
    await dro.waitForAxisPureTextValue('X', 'AnGULAr');

    // Scroll DOWN to the terminal End item and exit (AC 39.7). DOWN advances
    // toward End (manual §6.2 / video walkthrough): the second item is SC 5.0.
    // The number of middle parameters grows as setup stories land, so walk down
    // until End rather than hard-coding the press count.
    await dro.key2.click(); // SC 5.0
    await dro.waitForAxisPureTextValue('X', 'SC 5.0');
    while ((await dro.getAxisRawText('X')) !== 'End') {
      await dro.key2.click();
    }
    await dro.waitForAxisPureTextValue('X', 'End');
    await dro.enterButton.click();

    // End exits and discards the draft; the saved default is still LinEAr.
    await dro.waitForAxisValue('X', 0);
    await dro.settingsButton.click();
    await dro.selectAxis('X');
    await dro.waitForAxisPureTextValue('X', 'LinEAr');
  });

  test('down scrolls and wraps around past the last item (AC 39.3)', async ({ dro }) => {
    await dro.settingsButton.click();
    await dro.selectAxis('X');

    const first = await dro.getAxisRawText('X');
    expect(first).toBe('LinEAr');

    // Scroll DOWN through every item to End, then one more wraps to the first.
    await dro.key2.click(); // SC 5.0
    while ((await dro.getAxisRawText('X')) !== 'End') {
      await dro.key2.click();
    }
    await dro.waitForAxisPureTextValue('X', 'End');
    await dro.key2.click(); // wraps to first
    await dro.waitForAxisPureTextValue('X', first);

    // And UP from the first item wraps backward to the last (End).
    await dro.key8.click();
    await dro.waitForAxisPureTextValue('X', 'End');
  });

  test('C from a parameter row discards the full setup transaction', async ({ dro }) => {
    await dro.settingsButton.click();
    await dro.selectAxis('X');
    await dro.waitForAxisPureTextValue('X', 'LinEAr');
    await dro.key6.click();
    await dro.waitForAxisPureTextValue('X', 'AnGULAr');

    await dro.clearButton.click();
    await dro.waitForReady('idle');
    await dro.settingsButton.click();
    await dro.selectAxis('X');
    await dro.waitForAxisPureTextValue('X', 'LinEAr');
  });
});

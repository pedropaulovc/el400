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
  test('enter setup, select axis, navigate, and exit via End (AC 39.1, 39.2, 39.7)', async ({ dro }) => {
    // Press the wrench/setup key -> SELECT prompt.
    await dro.settingsButton.click();
    await dro.waitForAxisPureTextValue('X', 'SELECt');

    // Select X axis -> first parameter (LinEAr).
    await dro.selectAxis('X');
    await dro.waitForAxisPureTextValue('X', 'LinEAr');

    // Right cycles the choice to AnGULAr, left cycles back (AC 39.4).
    await dro.key6.click();
    await dro.waitForAxisPureTextValue('X', 'AnGULAr');
    await dro.key4.click();
    await dro.waitForAxisPureTextValue('X', 'LinEAr');

    // Scroll up to End and exit (AC 39.7).
    await dro.key8.click(); // EnF on
    await dro.waitForAxisPureTextValue('X', 'EnF on');
    await dro.key8.click(); // End
    await dro.waitForAxisPureTextValue('X', 'End');
    await dro.enterButton.click();

    // Back to the normal operating screen: X shows numeric 0.
    await dro.waitForAxisValue('X', 0);
  });

  test('up scrolls and wraps around past the last item (AC 39.3)', async ({ dro }) => {
    await dro.settingsButton.click();
    await dro.selectAxis('X');

    const first = await dro.getAxisRawText('X');
    expect(first).toBe('LinEAr');

    // Scroll up through every item back to the first (wrap-around).
    await dro.key8.click(); // EnF on
    await dro.key8.click(); // End
    await dro.waitForAxisPureTextValue('X', 'End');
    await dro.key8.click(); // wraps to first
    await dro.waitForAxisPureTextValue('X', first);
  });
});

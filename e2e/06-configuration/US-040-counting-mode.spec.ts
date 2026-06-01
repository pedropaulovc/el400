import { test, expect } from '../helpers/fixtures';

/**
 * E2E Tests: US-040 Setup Menu — Counting Mode (Linear vs Angular)
 *
 * Drives the feature end to end through real user actions: the counting-mode
 * change goes through the real setup menu (`dro.setAxisCountingMode`, no window
 * hooks / forced state), and table motion is emitted via the mock CNCjs server's
 * relative-move endpoint (`dro.simulateTableMove`, the same MILL_STATE_CHANGED
 * path a physical jog uses).
 *
 * Covers AC 40.1 (default LinEAr), AC 40.2 (◄/► toggle), AC 40.4 (angular axes
 * read degrees, wrapping at a full revolution), AC 40.5 (per-axis), AC 40.7
 * (the committed mode persists and applies to the live readout).
 *
 * @see project/user-stories/06-configuration/US-040-counting-mode.md
 */
test.describe('US-040: Counting Mode (Linear vs Angular)', () => {
  // Setup-menu counting-mode changes commit to persisted nvMem; run serially so
  // parallel workers do not race on shared localStorage.
  test.describe.configure({ mode: 'serial' });

  test('AC 40.1 / 40.2: default is LinEAr; ► toggles to AnGULAr and ◄ back', async ({ dro }) => {
    await dro.settingsButton.click();
    await dro.waitForAxisPureTextValue('X', 'SELECt');

    // First parameter for the selected axis is LinEAr (default, AC 40.1).
    await dro.selectAxis('X');
    await dro.waitForAxisPureTextValue('X', 'LinEAr');

    // ► (right) toggles to AnGULAr, ◄ (left) toggles back (AC 40.2).
    await dro.key6.click();
    await dro.waitForAxisPureTextValue('X', 'AnGULAr');
    await dro.key4.click();
    await dro.waitForAxisPureTextValue('X', 'LinEAr');
  });

  test('AC 40.4: an AnGULAr axis reads degrees and wraps at a full revolution', async ({ dro }) => {
    await dro.setAxisCountingMode('X', 'AnGULAr');

    // Datum the angular axis at the current encoder position, then rotate.
    await dro.zeroAxis('X');
    await dro.waitForAxisValue('X', 0);

    // 90 of motion reads 90 degrees (no inch/mm conversion — default unit is inch).
    await dro.simulateTableMove('X', 'left', 90);
    await dro.waitForAxisValue('X', 90);

    // Past a full revolution the display wraps into [0, 360): +280 more -> 370 -> 10.
    await dro.simulateTableMove('X', 'left', 280);
    await dro.waitForAxisValue('X', 10);

    // Rotating back below the datum wraps up from the top (-> 350).
    await dro.simulateTableMove('X', 'right', 20);
    await dro.waitForAxisValue('X', 350);
  });

  test('AC 40.5: counting mode is per-axis — X angular, Y stays linear', async ({ dro }) => {
    await dro.toggleInchMm(); // mm so the linear magnitude is exact
    expect(await dro.isMmUnits()).toBe(true);

    await dro.setAxisCountingMode('X', 'AnGULAr');

    await dro.zeroAxis('X');
    await dro.zeroAxis('Y');
    await dro.waitForAxisValue('X', 0);
    await dro.waitForAxisValue('Y', 0);

    // Same magnitude of motion: X reads degrees (wrapped), Y reads mm distance.
    await dro.simulateTableMove('X', 'left', 400); // 400 -> 40 degrees
    await dro.simulateTableMove('Y', 'left', 12); // 12 mm
    await dro.waitForAxisValue('X', 40);
    await dro.waitForAxisValue('Y', 12);
  });
});

import { test, expect } from '../helpers/fixtures';

/**
 * E2E Tests: US-043 Keypad Lock (`LoC`).
 *
 * Critical flows only: the lock is engaged/released through the REAL setup menu
 * (the wrench/setup key + navigation), locked keys are no-ops while the live
 * readout keeps tracking encoder moves, and the wrench still unlocks.
 *
 * Position updates use the visible debug controls through the real
 * MILL_STATE_CHANGED path. Locked controls are inspected through their native
 * disabled state, and the global keyboard shortcut exercises the reducer gate.
 *
 * @see project/user-stories/06-configuration/US-043-keypad-lock.md
 */
test.describe('US-043: Keypad Lock', () => {
  test.beforeEach(async ({ dro }) => {
    await dro.goto({ source: 'debug', skipBootMessage: true });
  });

  test('locked keypad ignores axis zero while the readout keeps tracking a jog (AC 43.3/43.5/43.7)', async ({
    dro,
  }) => {
    await dro.toggleInchMm(); // mm for exact magnitudes
    await expect.poll(() => dro.isMmUnits()).toBe(true);

    // Establish a datum: move to X=10, zero it -> readout 0.
    await dro.simulateEncoderAbsoluteMove('X', 10);
    await dro.waitForAxisValue('X', 10);
    await dro.zeroAxis('X');
    await dro.waitForAxisValue('X', 0);

    // Move to a meaningful datum-relative reading.
    await dro.simulateEncoderAbsoluteMove('X', 13);
    await dro.waitForAxisValue('X', 3);

    // Lock the panel via the real setup menu.
    await dro.setKeypadLock('on');
    await dro.waitForAxisValue('X', 3);

    // The physical key exposes its locked state. The matching real keyboard
    // command still reaches the reducer and is ignored, preserving the datum.
    await expect(dro.x0Button).toBeDisabled();
    await expect(dro.settingsButton).toBeEnabled();
    await dro.simulatorRoot.focus();
    await dro.page.keyboard.press('Shift+X');
    await dro.waitForAxisValue('X', 3);

    // The live readout still tracks a jog while locked (AC 43.5): X=18 reads 8
    // relative to the intact X=10 datum.
    await dro.simulateEncoderAbsoluteMove('X', 18);
    await dro.waitForAxisValue('X', 8);
  });

  test('wrench still enters setup while locked, and unlocking restores key input (AC 43.4)', async ({
    dro,
  }) => {
    await dro.toggleInchMm(); // mm
    await expect.poll(() => dro.isMmUnits()).toBe(true);

    // Save the lock, power-cycle, then establish a live non-zero position.
    await dro.setKeypadLock('on');
    await dro.reload();
    expect(await dro.isMmUnits()).toBe(true);
    await dro.simulateEncoderAbsoluteMove('X', 7);
    await dro.waitForAxisValue('X', 7);
    await expect(dro.x0Button).toBeDisabled();
    await expect(dro.settingsButton).toBeEnabled();
    await dro.simulatorRoot.focus();
    await dro.page.keyboard.press('Shift+X');
    await dro.waitForAxisValue('X', 7);

    // The wrench still enters setup -> unlock via the real menu (AC 43.4).
    await dro.setKeypadLock('off');
    await dro.waitForAxisValue('X', 7);
    await expect(dro.x0Button).toBeEnabled();

    // Key input works again: zeroing X re-datums so the readout reads 0.
    await dro.zeroAxis('X');
    await dro.waitForAxisValue('X', 0);
  });
});

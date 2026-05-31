import { test, expect } from '../helpers/fixtures';

/**
 * E2E Tests: US-045 Taper Calculation Function
 *
 * Critical happy-path coverage for the lathe-class taper function (manual
 * Section 9.2.2). The `tAPEr on` axis selects which display shows the included
 * angle; the paired axis shows the radius.
 *
 * @see project/user-stories/04-calculations/US-045-taper-calculation.md
 *
 * Geometry for the happy path (taper on X):
 * - Touch first end, zero X and Z, enter Taper.
 * - Move to other end: radius travel dX = 5mm, length travel dZ = 50mm.
 * - angle = atan(5 / 50) = 5.7106 deg, shown on X; radius shown on Z.
 */
test.describe('US-045: Taper Calculation', () => {
  test('computes taper angle from two ends (taper on X)', async ({ dro }) => {
    // Configure taper-on axis = X (reloads the page with the param).
    await dro.setTaperOnAxis('X');

    // Touch first end at origin and zero both relevant axes.
    await dro.simulateEncoderAbsoluteMove('X', 0);
    await dro.simulateEncoderAbsoluteMove('Z', 0);
    await dro.zeroAxis('X');
    await dro.zeroAxis('Z');

    await dro.enterTaperFunction();
    // FN LED on while the taper function is active.
    expect(await dro.isFnModeActive()).toBe(true);

    // Move the tool to the other end of the taper.
    await dro.simulateEncoderAbsoluteMove('Z', 50.0); // length along Z
    await dro.simulateEncoderAbsoluteMove('X', 5.0);  // radius change on X

    // angle = atan(5/50) = 5.7106 deg displayed on the X axis.
    await dro.waitForAxisPureNumberValue('X', 5.7106, 3, 1000);
  });

  test('C exits the taper function', async ({ dro }) => {
    await dro.setTaperOnAxis('X');
    await dro.enterTaperFunction();
    expect(await dro.isFnModeActive()).toBe(true);

    await dro.clearButton.click();

    // Back to normal display: FN LED off and X shows a numeric position.
    expect(await dro.isFnModeActive()).toBe(false);
    await dro.waitForAxisValue('X', 0);
  });
});

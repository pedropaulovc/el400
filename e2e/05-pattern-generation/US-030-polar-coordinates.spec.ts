import { test, expect } from '../helpers/fixtures';

/**
 * E2E Tests: US-030 Polar Coordinates (manual §9.1.7)
 *
 * Polar mode is a display mode: one axis shows radius (R), another shows
 * angle (θ), for a selected plane. Accessed via Fn -> PoLAr -> ENT, then
 * pick a plane (h-Y / h-Z / Y-Z) and confirm with ENT.
 *
 * @see project/user-stories/05-pattern-generation/US-030-polar-coordinates.md
 */
test.describe('US-030: Polar Coordinates', () => {
  /**
   * AC 30.1-30.5: Convert to polar coordinates on the X-Y plane.
   * X=3, Y=4 -> R=5, θ≈53.13° (mm display).
   */
  test('Convert to polar coordinates on XY plane', async ({ dro }) => {
    // Work in mm so the radius reads directly.
    await dro.toggleInchMm();
    expect(await dro.isMmUnits()).toBe(true);

    // Set position X=3, Y=4 (mm)
    await dro.simulateEncoderAbsoluteMove('X', 3.0);
    await dro.simulateEncoderAbsoluteMove('Y', 4.0);
    await dro.waitForAxisValue('X', 3.0);
    await dro.waitForAxisValue('Y', 4.0);

    // Fn -> navigate to PoLAr (center -> circle -> line -> linear -> polar)
    await dro.functionButton.click();
    await expect(dro.xDisplay).toContainText('CEntrE');
    for (let i = 0; i < 4; i++) {
      await dro.key6.click();
    }
    await expect(dro.xDisplay).toContainText('PoLAr');

    // Enter polar -> plane selection (defaults to h-Y / X-Y plane)
    await dro.enterButton.click();
    await expect(dro.xDisplay).toContainText('h-Y');
    expect(await dro.isFnModeActive()).toBe(true);

    // Confirm X-Y plane -> counting mode
    await dro.enterButton.click();

    // X shows R=5, Y shows θ≈53.13°
    await dro.waitForAxisValue('X', 5.0);
    await dro.waitForAxisValue('Y', 53.1301);
    // Fn LED stays on in polar mode
    expect(await dro.isFnModeActive()).toBe(true);
  });

  /**
   * AC 30.2 / 30.6: cycle planes, then exit polar mode back to Cartesian.
   */
  test('Cycle planes and exit polar mode returns to Cartesian', async ({ dro }) => {
    await dro.toggleInchMm();

    await dro.simulateEncoderAbsoluteMove('X', 3.0);
    await dro.simulateEncoderAbsoluteMove('Y', 4.0);
    await dro.waitForAxisValue('X', 3.0);

    // Fn -> PoLAr -> ENT
    await dro.functionButton.click();
    for (let i = 0; i < 4; i++) {
      await dro.key6.click();
    }
    await expect(dro.xDisplay).toContainText('PoLAr');
    await dro.enterButton.click();

    // Cycle plane options h-Y -> h-Z -> Y-Z -> h-Y
    await expect(dro.xDisplay).toContainText('h-Y');
    await dro.key6.click();
    await expect(dro.xDisplay).toContainText('h-Z');
    await dro.key6.click();
    await expect(dro.xDisplay).toContainText('Y-Z');
    await dro.key6.click();
    await expect(dro.xDisplay).toContainText('h-Y');

    // Confirm and enter counting mode
    await dro.enterButton.click();
    await dro.waitForAxisValue('X', 5.0);

    // Press C to exit polar mode -> Cartesian display restored
    await dro.clearButton.click();
    await dro.waitForAxisValue('X', 3.0);
    await dro.waitForAxisValue('Y', 4.0);
    expect(await dro.isFnModeActive()).toBe(false);
  });
});

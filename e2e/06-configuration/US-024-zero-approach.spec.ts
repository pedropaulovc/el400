import { test, expect } from '../helpers/fixtures';

/**
 * E2E: US-024 Setup Menu — Zero-Approach (Near-Zero) Warning.
 *
 * Drives the warning end-to-end through real user actions:
 * - Enabled via the ACTUAL setup menu (`dro.enableZeroApproachWarning`), no hooks.
 * - A target is set through the real Distance-to-Go buttons, then the machine is
 *   jogged toward it via the mock CNCjs server's encoder endpoint
 *   (`dro.simulateEncoderAbsoluteMove`, the same MILL_STATE_CHANGED path a real
 *   encoder uses). The `audio-indicator` visibility is the observed warning.
 *
 * Work in mm so the 0.002" (≈0.0508 mm) approach band has clean magnitudes.
 *
 * Covers AC24.1/.2 (enable via setup), AC24.6/.10 (fires within BP DIST, not
 * outside), and the disabled path (AC24.2 OFF).
 *
 * @see project/user-stories/06-configuration/US-024-zero-approach-warning.md
 */
test.describe('US-024: Zero-Approach Warning', () => {
  // Setup-menu changes commit to persisted nvMem; serialise so parallel workers
  // do not race on shared localStorage.
  test.describe.configure({ mode: 'serial' });

  test('warns only once the axis nears the target within BP DIST (AC24.6, AC24.10)', async ({ dro }) => {
    await dro.toggleInchMm(); // mm
    expect(await dro.isMmUnits()).toBe(true);
    await dro.simulateEncoderAbsoluteMove('X', 0);

    await dro.enableZeroApproachWarning();

    // Target X = 10 mm. Machine at 0 -> distance-to-go reads 10; no warning.
    await dro.startDistanceToGo('X', '10');
    await dro.waitForAxisValue('X', 10);
    expect(await dro.isZeroApproachWarningVisible()).toBe(false);

    // Jog to 9 mm: still 1 mm to go, outside the band -> silent.
    await dro.simulateEncoderAbsoluteMove('X', 9);
    await dro.waitForAxisValue('X', 1);
    expect(await dro.isZeroApproachWarningVisible()).toBe(false);

    // Jog to within 0.03 mm of the target -> warning appears.
    await dro.simulateEncoderAbsoluteMove('X', 9.97);
    await expect(dro.page.getByTestId('audio-indicator')).toBeVisible();
  });

  test('disabled warning never fires, even sitting on the target (AC24.2 OFF)', async ({ dro }) => {
    await dro.toggleInchMm(); // mm
    expect(await dro.isMmUnits()).toBe(true);
    await dro.simulateEncoderAbsoluteMove('X', 0);

    // Do NOT enable the warning. Set a target and land exactly on it.
    await dro.startDistanceToGo('X', '4');
    await dro.simulateEncoderAbsoluteMove('X', 4);
    await dro.waitForAxisValue('X', 0);

    await expect(dro.page.getByTestId('audio-indicator')).toHaveCount(0);
  });
});

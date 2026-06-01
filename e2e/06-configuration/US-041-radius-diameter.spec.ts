import { test, expect } from '../helpers/fixtures';

/**
 * E2E Tests: US-041 Setup Menu — Radius / Diameter Display Mode
 *
 * Drives the lathe-style radius/diameter readout end to end through real user
 * actions: table motion is emitted via the mock CNCjs server's relative-move
 * endpoint (`dro.simulateTableMove`, the same MILL_STATE_CHANGED path a physical
 * jog uses), and the measurement-mode change goes through the real setup menu
 * (`dro.setMeasurementMode`, no window hooks / forced state).
 *
 * Values are asserted in MILLIMETRES (the tests toggle to mm with the real in/mm
 * key) so the spec's clean magnitudes hold; the default unit is inches.
 *
 * Covers AC 41.2 (◄/► toggle rAd/diA), AC 41.3 (rAd is 1:1, the default),
 * AC 41.4 (diA doubles the displayed value), AC 41.5 (per-axis).
 *
 * @see project/user-stories/06-configuration/US-041-radius-diameter-mode.md
 */
test.describe('US-041: Radius/Diameter Mode', () => {
  // Setup-menu mode changes commit to persisted nvMem; run serially so parallel
  // workers do not race on shared localStorage.
  test.describe.configure({ mode: 'serial' });

  /**
   * AC 41.3: the default radius (`rAd`) mode shows actual axis movement 1:1.
   * No mode change is made — the mill default must already be radius.
   */
  test('AC 41.3: default radius mode is 1:1', async ({ dro }) => {
    await dro.toggleInchMm(); // work in mm so magnitudes match the spec
    expect(await dro.isMmUnits()).toBe(true);

    await dro.zeroAxis('X');
    await dro.waitForAxisValue('X', 0);

    await dro.simulateTableMove('X', 'left', 1);
    await dro.waitForAxisValue('X', 1);
  });

  /**
   * AC 41.4: in diameter (`diA`) mode the displayed value is doubled. The mode is
   * committed BEFORE zeroing/moving, so it must apply to the LIVE readout: a
   * 1.000 mm table move reads 2.000.
   */
  test('AC 41.4: diameter mode doubles the displayed value', async ({ dro }) => {
    await dro.toggleInchMm();
    expect(await dro.isMmUnits()).toBe(true);

    await dro.setMeasurementMode('X', 'diA');
    await dro.zeroAxis('X');
    await dro.waitForAxisValue('X', 0);

    await dro.simulateTableMove('X', 'left', 1);
    // 1.000 actual movement reads as 2.000 (the turned diameter).
    await dro.waitForAxisValue('X', 2);
  });

  /**
   * AC 41.2 (round-trip): toggling back to `rAd` restores the 1:1 reading —
   * proves the toggle is a real two-way cycle, not a one-way latch, and that a
   * later encoder update reflects the restored mode.
   */
  test('AC 41.2: toggling back to rAd restores 1:1', async ({ dro }) => {
    await dro.toggleInchMm();
    expect(await dro.isMmUnits()).toBe(true);

    await dro.setMeasurementMode('X', 'diA');
    await dro.zeroAxis('X');
    await dro.simulateTableMove('X', 'left', 4);
    await dro.waitForAxisValue('X', 8);

    await dro.setMeasurementMode('X', 'rAd');
    await dro.zeroAxis('X');
    await dro.simulateTableMove('X', 'left', 4);
    await dro.waitForAxisValue('X', 4);
  });

  /**
   * AC 41.5 (isolation): setting X to diameter must NOT affect Y. A lazy global
   * flag would fail this — Y stays 1:1 while X doubles.
   */
  test('AC 41.5: measurement mode is per-axis — diA on X leaves Y at 1:1', async ({ dro }) => {
    await dro.toggleInchMm();
    expect(await dro.isMmUnits()).toBe(true);

    await dro.setMeasurementMode('X', 'diA');

    await dro.zeroAxis('X');
    await dro.zeroAxis('Y');
    await dro.waitForAxisValue('X', 0);
    await dro.waitForAxisValue('Y', 0);

    await dro.simulateTableMove('X', 'left', 5);
    await dro.simulateTableMove('Y', 'left', 5);

    await dro.waitForAxisValue('X', 10); // doubled
    await dro.waitForAxisValue('Y', 5); // 1:1, unaffected
  });

  /**
   * AC 41.4 (persistence): the doubling must apply to EVERY subsequent encoder
   * update, not just the first move after the toggle. A one-shot impl that
   * doubled only the next reading would pass the basic test but fail here on the
   * second, cumulative jog.
   */
  test('AC 41.4: diameter doubling persists across successive jogs', async ({ dro }) => {
    await dro.toggleInchMm();
    expect(await dro.isMmUnits()).toBe(true);

    await dro.setMeasurementMode('X', 'diA');
    await dro.zeroAxis('X');
    await dro.waitForAxisValue('X', 0);

    // First jog: table-left 3 -> actual +3, diameter 6.
    await dro.simulateTableMove('X', 'left', 3);
    await dro.waitForAxisValue('X', 6);

    // Second jog (no re-toggle): another table-left 2, cumulative actual 5.
    // Doubling must still apply -> 10, proving it is a persisted setting.
    await dro.simulateTableMove('X', 'left', 2);
    await dro.waitForAxisValue('X', 10);
  });
});

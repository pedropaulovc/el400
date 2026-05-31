import { test, expect } from '../helpers/fixtures';

/**
 * E2E Tests: US-017 Bolt Hole Circle - Arc
 *
 * Critical happy path (parameter entry + navigation) plus the 0°-crossing
 * edge case. Broader coverage lives in the unit/integration tests.
 *
 * @see project/user-stories/05-pattern-generation/US-017-bolt-circle-arc.md
 * Manual §9.1.2 Arc Bolt Hole Function — angles measured CCW from +X.
 */
test.describe('US-017: Bolt Hole Arc', () => {
  /**
   * AC17.1 toggle to ARC + ENT; AC17.2-7 parameter entry (center, radius,
   * start angle, end angle, holes); AC17.8 even distribution; AC17.9 navigation.
   *
   * Parameters (mm mode): center (0,0), radius 10mm, start 0°, end 180°, 4 holes.
   * spacing = 180/3 = 60° -> angles 0, 60, 120, 180.
   * Distance-to-go = holePosition - currentPosition; current position stays at
   * the origin (no encoder movement), so the display equals the hole position.
   * Hole 1 (0°):  X = 10,  Y = 0
   * Hole 2 (60°): X = 5,   Y = 8.6603
   */
  test('arc workflow: toggle ARC, enter parameters, navigate holes', async ({ dro }) => {
    // Use mm so entered values are stored directly (no inch conversion).
    await dro.toggleUnitButton.click();
    expect(await dro.isAbsMode()).toBe(true);

    // Activate bolt hole mode
    await dro.page.click('[data-testid="btn-bolt-circle"]');
    await dro.waitForAxisPureTextValue('X', 'CirCLE', 3000);

    // Toggle CIRCLE -> ARC and confirm
    await dro.key6.click();
    await dro.waitForAxisPureTextValue('X', 'ArC');
    await dro.enterButton.click();

    // Arc center X
    await dro.waitForAxisPureTextValue('Y', 'EntCnt0');
    await dro.enterNumber('0');
    await dro.enterButton.click();

    // Arc center Y
    await dro.waitForAxisPureTextValue('X', 'EntCnt1');
    await dro.enterNumber('0');
    await dro.enterButton.click();

    // Radius = 10mm
    await dro.waitForAxisPureTextValue('X', 'rAdiUS');
    await dro.enterNumber('10');
    await dro.waitForAxisPureNumberValue('Y', 10);
    await dro.enterButton.click();

    // Start angle = 0
    await dro.waitForAxisPureTextValue('X', 'AnGLE');
    await dro.enterNumber('0');
    await dro.enterButton.click();

    // End angle = 180 (prompt shows "End")
    await dro.waitForAxisPureTextValue('X', 'End');
    await dro.enterNumber('180');
    await dro.waitForAxisPureNumberValue('Y', 180);
    await dro.enterButton.click();

    // Holes = 4
    await dro.waitForAxisPureTextValue('X', 'hoLES');
    await dro.enterNumber('4');
    await dro.waitForAxisPureNumberValue('Y', 4);
    await dro.enterButton.click();

    // Switches to INC distance-to-go to hole 1 (0°) at (10, 0) from origin
    expect(await dro.isIncMode()).toBe(true);
    await dro.waitForAxisPureNumberValue('X', 10);
    await dro.waitForAxisPureNumberValue('Y', 0);

    // Navigate to hole 2 (60°): distance-to-go from origin = hole position (5, 8.6603)
    await dro.key6.click();
    await dro.waitForAxisPureNumberValue('X', 5);
    await dro.waitForAxisPureNumberValue('Y', 8.6603);

    // Back to hole 1 (0°) = (10, 0)
    await dro.key4.click();
    await dro.waitForAxisPureNumberValue('X', 10);
    await dro.waitForAxisPureNumberValue('Y', 0);

    // Exit
    await dro.clearButton.click();
    expect(await dro.isAbsMode()).toBe(true);
  });

  /**
   * AC17.10: arc spanning across 0°. start=350°, end=10°, 4 holes.
   * span = (10 - 350 + 360) % 360 = 20°; spacing = 20/3 ≈ 6.667°.
   * Angles: 350, 356.667, 3.333, 10.
   * Hole 1 (350°): X = 10*cos350 = 9.8481, Y = 10*sin350 = -1.7365
   */
  test('arc spanning across 0 degrees distributes holes correctly (AC17.10)', async ({ dro }) => {
    await dro.toggleUnitButton.click(); // mm

    await dro.page.click('[data-testid="btn-bolt-circle"]');
    await dro.waitForAxisPureTextValue('X', 'CirCLE', 3000);
    await dro.key6.click();
    await dro.enterButton.click();

    await dro.enterNumber('0'); // center X
    await dro.enterButton.click();
    await dro.enterNumber('0'); // center Y
    await dro.enterButton.click();
    await dro.enterNumber('10'); // radius
    await dro.enterButton.click();
    await dro.enterNumber('350'); // start angle
    await dro.enterButton.click();
    await dro.enterNumber('10'); // end angle (wraps across 0°)
    await dro.enterButton.click();
    await dro.enterNumber('4'); // holes
    await dro.enterButton.click();

    // Hole 1 at 350°: distance-to-go from origin = (9.8481, -1.7365)
    expect(await dro.isIncMode()).toBe(true);
    await dro.waitForAxisPureNumberValue('X', 9.8481);
    await dro.waitForAxisPureNumberValue('Y', -1.7365);

    // Advance to hole 3 at 3.333° (wrapped past 0°). Distance-to-go from origin
    // = hole position = (10*cos3.333, 10*sin3.333) = (9.9831, 0.5814).
    // Positive Y confirms the arc wrapped across 0° into the +Y half-plane.
    await dro.key6.click(); // hole 2
    await dro.key6.click(); // hole 3
    await dro.waitForAxisPureNumberValue('X', 9.9831, 3);
    await dro.waitForAxisPureNumberValue('Y', 0.5814, 3);
  });
});

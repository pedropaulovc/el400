import { test, expect } from '../helpers/fixtures';

/**
 * E2E Tests: US-018 Arc Contouring (Step Drilling)
 *
 * Minimal e2e coverage for the critical arc contouring flow. Deeper coverage
 * lives in the unit and integration tests.
 *
 * @see project/user-stories/05-pattern-generation/US-018-arc-contouring.md
 */
test.describe('US-018: Arc Contouring (Step Drilling)', () => {
  /**
   * AC18.1-18.10: Activate arc contouring, enter every parameter, pick a cut
   * type, enter MAX CUT, and confirm the system enters point navigation in INC
   * mode after deriving the step count.
   *
   * Parameters (entered in mm for direct storage):
   * - Center (0, 0), radius 25mm, arc 0deg -> 90deg
   * - Tool diameter 5mm, MID cut, MAX CUT 5mm
   * - MID arc length = 25 * (pi/2) = 39.27mm -> ceil(39.27/5) = 8 steps -> 9 points
   */
  test('complete arc contouring workflow: parameters, cut type, navigation', async ({
    dro,
  }) => {
    expect(await dro.isAbsMode()).toBe(true);

    // Work in mm so entered values store directly.
    await dro.toggleInchMm();
    expect(await dro.isMmUnits()).toBe(true);

    // Activate arc contouring.
    await dro.page.click('[data-testid="btn-arc-contour"]');

    // Intro message, then the first parameter prompt.
    await dro.waitForAxisPureTextValue('X', 'ArC Cnt', 500);
    await dro.waitForAxisPureTextValue('Y', 'EntCnt0', 3000);

    // Center X = 0
    await dro.enterNumber('0');
    await dro.enterButton.click();
    await dro.waitForAxisPureTextValue('X', 'EntCnt1');

    // Center Y = 0
    await dro.enterNumber('0');
    await dro.enterButton.click();
    await dro.waitForAxisPureTextValue('X', 'rAdiUS');

    // Radius = 25
    await dro.enterNumber('25');
    await dro.enterButton.click();
    await dro.waitForAxisPureTextValue('X', 'Str AnG');

    // Start angle = 0
    await dro.enterNumber('0');
    await dro.enterButton.click();
    await dro.waitForAxisPureTextValue('X', 'End AnG');

    // End angle = 90
    await dro.enterNumber('90');
    await dro.enterButton.click();
    await dro.waitForAxisPureTextValue('X', 'tooL d');

    // Tool diameter = 5
    await dro.enterNumber('5');
    await dro.enterButton.click();

    // Cut type selection: default INT, cycle to MID with key 6.
    await dro.waitForAxisPureTextValue('X', 'int CUt');
    await dro.key6.click();
    await dro.waitForAxisPureTextValue('X', 'EXt CUt');
    await dro.key6.click();
    await dro.waitForAxisPureTextValue('X', 'mid CUt');
    await dro.enterButton.click();

    // MAX CUT prompt, enter 5.
    await dro.waitForAxisPureTextValue('X', 'nAX CUt');
    await dro.enterNumber('5');
    await dro.enterButton.click();

    // System derived the step count and entered navigation in INC mode.
    expect(await dro.isIncMode()).toBe(true);
    expect(await dro.isFnModeActive()).toBe(true);

    // Point 1 sits at 0deg on the MID radius: (25, 0). From origin (0,0) the
    // distance-to-go is (25, 0) -> in mm: X = 25, Y = 0.
    await dro.waitForAxisPureNumberValue('X', 25);
    await dro.waitForAxisPureNumberValue('Y', 0);

    // Advance to point 2 with key 6 - distance-to-go changes.
    await dro.key6.click();
    // Point 2 is one step along the 90deg arc (~11.25deg) -> still within MAX CUT.
    const x2 = await dro.getAxisDisplayPureNumberValue('X');
    const y2 = await dro.getAxisDisplayPureNumberValue('Y');
    const stepDist = Math.hypot(25 - x2, 0 - y2);
    expect(stepDist).toBeLessThanOrEqual(5 + 1e-3);

    // Exit with Clear -> back to idle in ABS mode.
    await dro.clearButton.click();
    expect(await dro.isAbsMode()).toBe(true);
    expect(await dro.isFnModeActive()).toBe(false);
  });

  /**
   * AC18.1: Arc contouring requires ABS mode (mirrors bolt-hole). In INC mode
   * the button is a no-op.
   */
  test('arc contouring button is ignored in INC mode', async ({ dro }) => {
    await dro.toggleAbsInc();
    expect(await dro.isIncMode()).toBe(true);

    await dro.page.click('[data-testid="btn-arc-contour"]');

    // Display stays on the normal readout; FN mode never activates.
    expect(await dro.isFnModeActive()).toBe(false);
    await dro.waitForAxisPureNumberValue('X', 0);
  });
});

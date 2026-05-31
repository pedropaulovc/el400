import { test, expect } from '../helpers/fixtures';

/**
 * E2E Tests: US-019 Angle Hole (Linear Hole Pattern)
 *
 * Minimal e2e tests covering the critical angle-hole workflow.
 * Additional coverage provided by unit and integration tests.
 *
 * @see project/user-stories/05-pattern-generation/US-019-angle-hole.md
 * @see manual §9.1.4 Angle Hole Function
 */
test.describe('US-019: Angle Hole (Linear Hole Pattern)', () => {
  /**
   * AC19.1-AC19.10: enter parameters, compute positions along the line,
   * navigate holes via distance-to-go.
   *
   * Test uses mm units so displayed distance equals stored mm position.
   * Start (10, 5), pitch 20mm, angle 30deg, 6 holes. Initial encoder (0, 0).
   * Hole 1 = start = (10, 5).
   * Hole 2 = (10 + 20*cos30, 5 + 20*sin30) = (27.3205, 15).
   */
  test('complete angle hole workflow: enter parameters and navigate holes', async ({ dro }) => {
    // Switch to mm so displayed values map 1:1 to stored mm
    await dro.toggleInchMm();
    expect(await dro.isMmUnits()).toBe(true);
    expect(await dro.isAbsMode()).toBe(true);

    // Activate angle hole mode
    await dro.angleHoleButton.click();

    // Intro display
    await dro.waitForAxisPureTextValue('X', 'AnGhoLE', 500);

    // After intro auto-advances, lands on start-X entry
    await dro.waitForAxisPureTextValue('Y', 'EntCnt0', 3000);
    await dro.waitForAxisPureNumberValue('X', 0);

    // Start X = 10
    await dro.enterNumber('10');
    await dro.waitForAxisPureNumberValue('X', 10);
    await dro.enterButton.click();

    // Start Y = 5
    await dro.waitForAxisPureTextValue('X', 'EntCnt1');
    await dro.enterNumber('5');
    await dro.waitForAxisPureNumberValue('Y', 5);
    await dro.enterButton.click();

    // Pitch = 20
    await dro.waitForAxisPureTextValue('X', 'P itCh');
    await dro.enterNumber('20');
    await dro.waitForAxisPureNumberValue('Y', 20);
    await dro.enterButton.click();

    // Angle = 30
    await dro.waitForAxisPureTextValue('X', 'AnGLE');
    await dro.enterNumber('30');
    await dro.waitForAxisPureNumberValue('Y', 30);
    await dro.enterButton.click();

    // Holes = 6
    await dro.waitForAxisPureTextValue('X', 'hoLES');
    await dro.enterNumber('6');
    await dro.waitForAxisPureNumberValue('Y', 6);
    await dro.enterButton.click();

    // Now navigating: INC mode, distance-to-go to hole 1 (start) from origin
    expect(await dro.isIncMode()).toBe(true);
    await dro.waitForAxisPureNumberValue('X', 10);
    await dro.waitForAxisPureNumberValue('Y', 5);

    // Move to hole 1 (start point)
    await dro.simulateEncoderAbsoluteMove('X', 10);
    await dro.simulateEncoderAbsoluteMove('Y', 5);
    await dro.waitForAxisPureNumberValue('X', 0);
    await dro.waitForAxisPureNumberValue('Y', 0);

    // Navigate to hole 2 with key 6
    await dro.key6.click();
    // Distance hole1 -> hole2 = (20*cos30, 20*sin30) = (17.3205, 10)
    await dro.waitForAxisPureNumberValue('X', 17.3205, 3);
    await dro.waitForAxisPureNumberValue('Y', 10);

    // Navigate back to hole 1 with key 4
    await dro.key4.click();
    await dro.waitForAxisPureNumberValue('X', 0);
    await dro.waitForAxisPureNumberValue('Y', 0);

    // Exit with Clear -> returns to idle ABS mode
    await dro.clearButton.click();
    expect(await dro.isAbsMode()).toBe(true);
  });

  /**
   * AC19.9: 0deg = horizontal right, 90deg = vertical up.
   * Horizontal line: angle 0, pitch 10, start (0,0). Hole N at (10*(N-1), 0).
   */
  test('horizontal line at 0 degrees keeps Y constant', async ({ dro }) => {
    await dro.toggleInchMm();

    await dro.angleHoleButton.click();
    await dro.waitForAxisPureTextValue('Y', 'EntCnt0', 3000);

    await dro.enterNumber('0'); // start X
    await dro.enterButton.click();
    await dro.enterNumber('0'); // start Y
    await dro.enterButton.click();
    await dro.enterNumber('10'); // pitch
    await dro.enterButton.click();
    await dro.enterNumber('0'); // angle
    await dro.enterButton.click();
    await dro.enterNumber('5'); // holes
    await dro.enterButton.click();

    // Hole 1 at origin -> distance (0, 0)
    await dro.waitForAxisPureNumberValue('X', 0);
    await dro.waitForAxisPureNumberValue('Y', 0);

    // Hole 3: x = 2*10 = 20, y = 0
    await dro.key6.click();
    await dro.key6.click();
    await dro.waitForAxisPureNumberValue('X', 20);
    await dro.waitForAxisPureNumberValue('Y', 0);
  });
});

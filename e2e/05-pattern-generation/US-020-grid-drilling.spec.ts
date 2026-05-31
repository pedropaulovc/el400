import { test, expect } from '../helpers/fixtures';

/**
 * E2E Tests: US-020 Grid Drilling Pattern
 *
 * Critical happy-path coverage for the grid drilling feature.
 * Additional coverage provided by unit + integration tests.
 *
 * @see project/user-stories/05-pattern-generation/US-020-grid-drilling.md
 *
 * Grid positions for the axis-aligned test (input + stored in mm, mm mode):
 * - Start: (0, 0), pitch X = 10mm, pitch Y = 8mm, angle = 0°, 3x3 grid
 * - Hole 1 (row 0, col 0): (0, 0)
 * - Hole 2 (row 0, col 1): (10, 0)
 * - Hole 4 (row 1, col 0): (0, 8)
 */
test.describe('US-020: Grid Drilling Pattern', () => {
  test('complete grid workflow: enter parameters and navigate holes', async ({ dro }) => {
    // Work in mm so entered values map directly to stored mm (no conversion)
    await dro.toggleInchMm();
    expect(await dro.isMmUnits()).toBe(true);
    expect(await dro.isAbsMode()).toBe(true);

    // AC20.1: activate grid mode
    await dro.page.click('[data-testid="btn-grid-hole"]');

    // Intro shows "Grid", then start prompt
    await dro.waitForAxisPureTextValue('X', 'Grid', 500);
    await dro.waitForAxisPureTextValue('Y', 'EntCnt0', 3000);

    // FN LED on during grid mode
    expect(await dro.isFnModeActive()).toBe(true);

    // AC20.2: start X = 0
    await dro.enterNumber('0');
    await dro.enterButton.click();

    // AC20.3: start Y = 0
    await dro.waitForAxisPureTextValue('X', 'EntCnt1');
    await dro.enterNumber('0');
    await dro.enterButton.click();

    // AC20.4: pitch X = 10
    await dro.waitForAxisPureTextValue('X', 'PItCh X');
    await dro.enterNumber('10');
    await dro.waitForAxisPureNumberValue('Y', 10);
    await dro.enterButton.click();

    // AC20.5: pitch Y = 8
    await dro.waitForAxisPureTextValue('X', 'PItCh Y');
    await dro.enterNumber('8');
    await dro.waitForAxisPureNumberValue('Y', 8);
    await dro.enterButton.click();

    // AC20.6: angle = 0 (axis-aligned, AC20.12)
    await dro.waitForAxisPureTextValue('X', 'AnGLE');
    await dro.enterNumber('0');
    await dro.enterButton.click();

    // AC20.7: holes X = 3
    await dro.waitForAxisPureTextValue('X', 'hoLE X');
    await dro.key3.click();
    await dro.waitForAxisPureNumberValue('Y', 3);
    await dro.enterButton.click();

    // AC20.8: holes Y = 3 (AC20.9: total = 9 holes)
    await dro.waitForAxisPureTextValue('X', 'hoLE Y');
    await dro.key3.click();
    await dro.waitForAxisPureNumberValue('Y', 3);
    await dro.enterButton.click();

    // AC20.5: now in INC mode for distance-to-go navigation
    expect(await dro.isIncMode()).toBe(true);

    // Hole 1 at origin: distance-to-go (0, 0)
    await dro.waitForAxisPureNumberValue('X', 0);
    await dro.waitForAxisPureNumberValue('Y', 0);

    // Navigate to hole 2: one pitch X over => (10, 0)
    await dro.key6.click();
    await dro.waitForAxisPureNumberValue('X', 10);
    await dro.waitForAxisPureNumberValue('Y', 0);

    // Navigate to hole 3 => (20, 0)
    await dro.key6.click();
    await dro.waitForAxisPureNumberValue('X', 20);
    await dro.waitForAxisPureNumberValue('Y', 0);

    // Navigate to hole 4 (start of row 2, AC20.11) => (0, 8)
    await dro.key6.click();
    await dro.waitForAxisPureNumberValue('X', 0);
    await dro.waitForAxisPureNumberValue('Y', 8);

    // Navigate back to hole 3 with key 4
    await dro.key4.click();
    await dro.waitForAxisPureNumberValue('X', 20);
    await dro.waitForAxisPureNumberValue('Y', 0);

    // Exit grid mode with Clear -> back to idle, ABS restored
    await dro.clearButton.click();
    expect(await dro.isFnModeActive()).toBe(false);
    expect(await dro.isAbsMode()).toBe(true);
  });

  test('grid rotated 45 degrees produces diagonal positions (AC20.10)', async ({ dro }) => {
    await dro.toggleInchMm();
    expect(await dro.isMmUnits()).toBe(true);

    await dro.page.click('[data-testid="btn-grid-hole"]');
    await dro.waitForAxisPureTextValue('Y', 'EntCnt0', 3000);

    // Start (0, 0), pitch 1mm each, angle 45, 2x2 grid
    await dro.enterNumber('0');
    await dro.enterButton.click(); // start X
    await dro.enterNumber('0');
    await dro.enterButton.click(); // start Y
    await dro.enterNumber('1');
    await dro.enterButton.click(); // pitch X
    await dro.enterNumber('1');
    await dro.enterButton.click(); // pitch Y
    await dro.enterNumber('45');
    await dro.enterButton.click(); // angle
    await dro.key2.click();
    await dro.enterButton.click(); // holes X = 2
    await dro.key2.click();
    await dro.enterButton.click(); // holes Y = 2

    expect(await dro.isIncMode()).toBe(true);

    // Hole 2 (row 0, col 1): (cos45, sin45) = (0.7071, 0.7071)
    await dro.key6.click();
    await dro.waitForAxisPureNumberValue('X', 0.7071);
    await dro.waitForAxisPureNumberValue('Y', 0.7071);

    // Hole 3 (row 1, col 0): (cos135, sin135) = (-0.7071, 0.7071)
    await dro.key6.click();
    await dro.waitForAxisPureNumberValue('X', -0.7071);
    await dro.waitForAxisPureNumberValue('Y', 0.7071);
  });
});

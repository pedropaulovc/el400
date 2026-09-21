import { test, expect } from '../helpers/fixtures';

/**
 * E2E Tests: US-014 Trigonometric Calculator Functions
 *
 * Critical happy paths for trig + inverse-trig, plus a domain-error edge case.
 * Exhaustive coverage lives in the unit and integration tests.
 *
 * The Y key cycles the calculator operation list:
 *   ADD, SUB, MULTI, DIV, SIN, COS, TAN, ASIN, ACOS, ATAN
 * so reaching SIN takes 5 presses, COS 6, ... ATAN 10.
 *
 * @see project/user-stories/04-calculations/US-014-trig-functions.md
 */
test.describe('US-014: Trigonometric Calculator Functions', () => {
  /**
   * AC14.1 / AC14.7: sin of an angle in degrees, result on X.
   */
  test('calculate sin(30) = 0.5000', async ({ dro }) => {
    await dro.page.click('[data-testid="btn-calculator"]');
    await dro.enterNumber('30');

    // Cycle Y to SIN (5 presses past idle)
    for (let i = 0; i < 5; i++) await dro.yButton.click();
    await expect(dro.yDisplay).toContainText('S in');

    await dro.enterButton.click();
    await expect(dro.xDisplay).toContainText('0.5000');
  });

  /**
   * AC14.6 / AC14.8: arctangent returns an angle in degrees.
   */
  test('calculate atan(1) = 45 degrees', async ({ dro }) => {
    await dro.page.click('[data-testid="btn-calculator"]');
    await dro.enterNumber('1');

    // Cycle Y to ATAN (10 presses past idle)
    for (let i = 0; i < 10; i++) await dro.yButton.click();
    await expect(dro.yDisplay).toContainText('AtAn');

    await dro.enterButton.click();
    await expect(dro.xDisplay).toContainText('45');
  });

  /**
   * Edge case: arcsine of a value outside [-1, 1] is a domain error.
   */
  test('asin(2) shows infinite-value error', async ({ dro }) => {
    await dro.page.click('[data-testid="btn-calculator"]');
    await dro.enterNumber('2');

    // Cycle Y to ASIN (8 presses past idle)
    for (let i = 0; i < 8; i++) await dro.yButton.click();
    await expect(dro.yDisplay).toContainText('AS in');

    await dro.enterButton.click();
    await expect(dro.xDisplay).toContainText('inF vAL');
  });

  test('debug: cos(30) result chains into multiplication by 7', async ({ dro }) => {
    await dro.goto({ source: 'debug', skipBootMessage: true });
    await dro.page.click('[data-testid="btn-calculator"]');
    await dro.enterNumber('30');

    for (let i = 0; i < 6; i++) await dro.yButton.click();
    await dro.enterButton.click();
    await expect(dro.xDisplay).toContainText('0.8660');

    for (let i = 0; i < 3; i++) await dro.yButton.click();
    await dro.enterNumber('7');
    await dro.enterButton.click();
    await expect(dro.xDisplay).toContainText('6.0622');
  });

  test('debug: tan(90) reports the singularity', async ({ dro }) => {
    await dro.goto({ source: 'debug', skipBootMessage: true });
    await dro.page.click('[data-testid="btn-calculator"]');
    await dro.enterNumber('90');

    for (let i = 0; i < 7; i++) await dro.yButton.click();
    await dro.enterButton.click();
    await expect(dro.xDisplay).toContainText('inF vAL');
  });

  test('debug: acos(0.5) returns 60 degrees', async ({ dro }) => {
    await dro.goto({ source: 'debug', skipBootMessage: true });
    await dro.page.click('[data-testid="btn-calculator"]');
    await dro.enterNumber('0.5');

    for (let i = 0; i < 9; i++) await dro.yButton.click();
    await dro.enterButton.click();
    await expect(dro.xDisplay).toContainText('60.0000');
  });
});

import { test, expect } from '../helpers/fixtures';

/**
 * E2E Tests: US-029 Linear Bolt Hole
 *
 * Critical-path coverage for the linear bolt hole macro (manual §9.1.6).
 * Additional coverage lives in the unit and integration tests.
 *
 * @see project/user-stories/05-pattern-generation/US-029-linear-bolt-hole.md
 */
test.describe('US-029: Linear Bolt Hole', () => {
  /**
   * AC 29.1 Enter the menu and select LinEAr.
   * AC 29.2 Select the pattern axis (X).
   * AC 29.3 Enter pitch (spacing between holes).
   * AC 29.4 Enter number of holes.
   * AC 29.5 Counting mode shows distance-to-go to the first hole.
   * AC 29.6 Right (key 6) advances to the next hole.
   * AC 29.7 C exits the function.
   */
  test('create a linear hole pattern on X and navigate holes', async ({ dro }) => {
    // Start at a known encoder position (5mm on X).
    await dro.simulateEncoderAbsoluteMove('X', 5);

    expect(await dro.isAbsMode()).toBe(true);

    // AC 29.1: open the function menu and navigate to LinEAr.
    await dro.functionButton.click();
    await dro.waitForAxisPureTextValue('X', 'CEntrE');
    await dro.key6.click(); // CirCLE
    await dro.key6.click(); // LinE
    await dro.key6.click(); // LinEAr
    await dro.waitForAxisPureTextValue('X', 'LinEAr');
    await dro.enterButton.click();

    // Axis-selection prompt.
    await dro.waitForAxisPureTextValue('X', 'AXIS');

    // AC 29.2: select the X axis. This resets X and switches to INC counting.
    await dro.xButton.click();
    expect(await dro.isIncMode()).toBe(true);
    await dro.waitForAxisPureTextValue('Y', 'PitCh');

    // AC 29.3: enter the pitch. Default units are inch; 0.5" = 12.7mm.
    await dro.enterNumber('0.5');
    await dro.waitForAxisPureNumberValue('X', 0.5);
    await dro.enterButton.click();
    await dro.waitForAxisPureTextValue('Y', 'hoLES');

    // AC 29.4: enter the number of holes.
    await dro.enterNumber('5');
    await dro.enterButton.click();

    // AC 29.5: distance-to-go to the first hole is 0 (we reset at the start point).
    await dro.waitForAxisPureNumberValue('X', 0);

    // AC 29.6: advance to the next hole -> distance equals the pitch (0.5").
    await dro.key6.click();
    await dro.waitForAxisPureNumberValue('X', 0.5);

    // Move halfway to hole 2 (pitch 12.7mm -> move 6.35mm).
    await dro.simulateEncoderRelativeMove('X', 6.35);
    await dro.waitForAxisPureNumberValue('X', 0.25);

    // Move the rest of the way -> arrived at hole 2 (distance 0).
    await dro.simulateEncoderRelativeMove('X', 6.35);
    await dro.waitForAxisPureNumberValue('X', 0);

    // AC 29.7: C exits back to idle/ABS.
    await dro.clearButton.click();
    expect(await dro.isAbsMode()).toBe(true);
  });

  test('clear exits the macro from axis selection', async ({ dro }) => {
    expect(await dro.isAbsMode()).toBe(true);

    await dro.functionButton.click();
    await dro.key6.click();
    await dro.key6.click();
    await dro.key6.click();
    await dro.waitForAxisPureTextValue('X', 'LinEAr');
    await dro.enterButton.click();
    await dro.waitForAxisPureTextValue('X', 'AXIS');

    // FN LED is on while the macro is active.
    expect(await dro.isFnModeActive()).toBe(true);

    await dro.clearButton.click();

    // Back to idle: FN LED off, ABS mode restored.
    expect(await dro.isFnModeActive()).toBe(false);
    expect(await dro.isAbsMode()).toBe(true);
  });
});

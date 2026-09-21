import { test, expect } from '../helpers/fixtures';

/**
 * E2E Tests: US-009 Sub Datum Memory — Learn Mode
 *
 * Critical happy-path coverage for SDM Learn. Additional coverage is provided
 * by unit + integration tests.
 *
 * Manual §8.2.2: enter SDM, navigate to Learn, enter the step number on Y,
 * press Enter, move the machine, press X once to show the step number, press
 * X again to store the position and advance to the next step. Press C to exit.
 *
 * Spec note: the story (AC 9.4) said `6►` stores; the manual says `X`, which
 * wins. Storing is therefore bound to the X axis-select button.
 *
 * @see project/user-stories/03-data-management/US-009-sdm-learn.md
 */
test.describe('US-009: SDM Learn Mode', () => {
  test('learn flow: enter, select step, capture position, advance step', async ({ dro }) => {
    // Work in mm so simulated encoder positions map directly (AC 9.3).
    await dro.toggleInchMm();
    expect(await dro.isMmUnits()).toBe(true);

    // Manual menu order: Program → Run → Learn.
    await dro.page.click('[data-testid="btn-sdm"]');
    await dro.waitForAxisPureTextValue('X', 'ProGrAn');
    await dro.key4.click();
    await dro.waitForAxisPureTextValue('X', 'LEArn');

    // SDM LED glows while in the function (manual §8.2).
    expect(await dro.isLEDOn(dro.page.getByTestId('led-sdm'))).toBe(true);

    // Confirm Learn -> step entry prompt.
    await dro.enterButton.click();
    await dro.waitForAxisPureTextValue('X', 'StEPno');

    // AC 9.2: confirm default step 1.
    await dro.enterButton.click();

    // AC 9.3: move the machine to the position to store.
    await dro.simulateEncoderAbsoluteMove('X', 10);
    await dro.waitForAxisValue('X', 10);

    // AC 9.4: first X press shows the current step number on Y (=1).
    await dro.xButton.click();
    await dro.waitForAxisPureNumberValue('Y', 1, 0, undefined, 0);

    // AC 9.4: second X press stores the position and advances to step 2.
    await dro.xButton.click();

    // Move again and reveal the new step number to confirm the advance.
    await dro.simulateEncoderAbsoluteMove('X', 20);
    await dro.waitForAxisValue('X', 20);
    await dro.xButton.click();
    await dro.waitForAxisPureNumberValue('Y', 2, 0, undefined, 0);
  });

  test('clear exits SDM back to normal operation', async ({ dro }) => {
    await dro.page.click('[data-testid="btn-sdm"]');
    await dro.waitForAxisPureTextValue('X', 'ProGrAn');
    expect(await dro.isLEDOn(dro.page.getByTestId('led-sdm'))).toBe(true);

    // Clear from the menu exits to idle; SDM LED turns off.
    await dro.clearButton.click();
    await dro.waitForAxisValue('X', 0);
    expect(await dro.isLEDOn(dro.page.getByTestId('led-sdm'))).toBe(false);
  });
});

import { test, expect } from '../helpers/fixtures';

/**
 * E2E Tests: US-010 Sub Datum Memory — Program (Direct-Entry) Mode
 *
 * Critical happy-path coverage for SDM Program. Additional coverage is provided
 * by unit + integration tests.
 *
 * Manual §8.2.1: enter SDM, navigate to Program, press Enter; step number 1 is
 * shown. Select an axis, type a coordinate, press ent to confirm each value.
 * Press 6► to save and advance to the next step. Jump to a step with Y + number
 * + ent. Press C to exit.
 *
 * @see project/user-stories/03-data-management/US-010-sdm-direct-entry.md
 */
test.describe('US-010: SDM Program Mode', () => {
  test('program flow: enter coordinates, save & advance, jump to step', async ({ dro }) => {
    // Work in mm so typed coordinates map directly to stored mm (AC 10.3).
    await dro.toggleInchMm();
    expect(await dro.isMmUnits()).toBe(true);

    // AC 10.1: enter SDM, navigate to Program, confirm.
    await dro.page.click('[data-testid="btn-sdm"]');
    await dro.waitForAxisPureTextValue('X', 'LEArn', 3000);
    expect(await dro.isLEDOn(dro.page.getByTestId('led-sdm'))).toBe(true);

    await dro.page.click('[data-testid="key-6"]'); // -> rUn
    await dro.page.click('[data-testid="key-6"]'); // -> ProGrAn
    await dro.waitForAxisPureTextValue('X', 'ProGrAn');
    await dro.enterButton.click();

    // AC 10.2: step prompt with step number 1.
    await dro.waitForAxisPureTextValue('X', 'StEP');
    await dro.waitForAxisPureNumberValue('Y', 1);

    // Confirm step 1 -> X coordinate entry (AC 10.3).
    await dro.enterButton.click();
    await dro.enterNumber('50');
    await dro.enterButton.click();
    await dro.enterNumber('25');
    await dro.enterButton.click();
    await dro.enterNumber('10');
    await dro.enterButton.click();

    // Back at the step prompt for step 1.
    await dro.waitForAxisPureTextValue('X', 'StEP');
    await dro.waitForAxisPureNumberValue('Y', 1);

    // AC 10.4: 6► saves and advances to step 2.
    await dro.page.click('[data-testid="key-6"]');
    await dro.waitForAxisPureNumberValue('Y', 2);

    // AC 10.5: jump directly to step 5 with Y + number + ent.
    await dro.yButton.click();
    await dro.enterNumber('5');
    await dro.enterButton.click();
    await dro.waitForAxisPureNumberValue('Y', 5);
  });

  test('clear exits SDM Program back to normal operation (AC 10.6)', async ({ dro }) => {
    await dro.page.click('[data-testid="btn-sdm"]');
    await dro.waitForAxisPureTextValue('X', 'LEArn', 3000);
    await dro.page.click('[data-testid="key-6"]');
    await dro.page.click('[data-testid="key-6"]');
    await dro.waitForAxisPureTextValue('X', 'ProGrAn');
    await dro.enterButton.click();
    await dro.waitForAxisPureTextValue('X', 'StEP');

    await dro.clearButton.click();
    await dro.waitForAxisValue('X', 0);
    expect(await dro.isLEDOn(dro.page.getByTestId('led-sdm'))).toBe(false);
  });
});

import { test, expect } from '../helpers/fixtures';

/**
 * E2E Tests: US-011 Sub Datum Memory — Run (Recall) Mode
 *
 * Critical happy-path coverage for SDM Run. Additional coverage is provided by
 * unit + integration tests.
 *
 * Manual §8.2.3: after selecting SDM, navigate to Run and press Enter. The run
 * menu shows step number 1; enter the required step (press Y + numeric values,
 * ent to confirm). Pressing ent displays the distance-to-go for the selected
 * step. Press 6► to advance to the next step. Press C to exit.
 *
 * @see project/user-stories/03-data-management/US-011-sdm-recall.md
 */
test.describe('US-011: SDM Run Mode', () => {
  /** Program step 1 (X=50) and step 2 (X=80) in mm via SDM Program mode. */
  async function programTwoSteps(dro: import('../helpers/dro-page').DROPage) {
    await dro.page.click('[data-testid="btn-sdm"]');
    await dro.waitForAxisPureTextValue('X', 'LEArn', 3000);
    await dro.page.click('[data-testid="key-6"]'); // -> rUn
    await dro.page.click('[data-testid="key-6"]'); // -> ProGrAn
    await dro.waitForAxisPureTextValue('X', 'ProGrAn');
    await dro.enterButton.click(); // -> step view

    // Step 1: X = 50.
    await dro.enterButton.click(); // confirm step 1 -> X entry
    await dro.enterNumber('50');
    await dro.enterButton.click(); // X -> Y
    await dro.enterButton.click(); // Y -> Z
    await dro.enterButton.click(); // Z -> step view

    // Advance to step 2 and program X = 80.
    await dro.page.click('[data-testid="key-6"]');
    await dro.waitForAxisPureNumberValue('Y', 2);
    await dro.enterButton.click(); // confirm step 2 -> X entry
    await dro.enterNumber('80');
    await dro.enterButton.click(); // X -> Y
    await dro.enterButton.click(); // Y -> Z
    await dro.enterButton.click(); // Z -> step view

    // Exit Program back to normal operation.
    await dro.clearButton.click();
    await dro.waitForAxisValue('X', 0);
  }

  test('run recall: select step, live distance-to-go, advance, exit (AC 11.1 - 11.6)', async ({ dro }) => {
    // Work in mm so typed coordinates map directly to stored mm.
    await dro.toggleInchMm();
    expect(await dro.isMmUnits()).toBe(true);

    await programTwoSteps(dro);

    // AC 11.1: enter SDM, navigate to Run, confirm.
    await dro.page.click('[data-testid="btn-sdm"]');
    await dro.waitForAxisPureTextValue('X', 'LEArn', 3000);
    await dro.page.click('[data-testid="key-6"]'); // -> rUn
    await dro.waitForAxisPureTextValue('X', 'rUn');
    await dro.enterButton.click();

    // AC 11.2: run step prompt shows step number 1.
    await dro.waitForAxisPureNumberValue('Y', 1);

    // AC 11.3: confirm step 1 -> distance-to-go. Machine at origin, step 1 X=50.
    await dro.enterButton.click();
    await dro.waitForAxisPureNumberValue('X', 50);

    // AC 11.5: SDM LED glows during run.
    expect(await dro.isLEDOn(dro.page.getByTestId('led-sdm'))).toBe(true);

    // Live update: jog the encoder to X=20 -> DTG = 30.
    await dro.simulateEncoderAbsoluteMove('X', 20);
    await dro.waitForAxisPureNumberValue('X', 30);

    // AC 11.4: 6► advances to step 2 (X=80). At X=20 -> DTG = 60.
    await dro.page.click('[data-testid="key-6"]');
    await dro.waitForAxisPureNumberValue('X', 60);

    // AC 11.6: C exits back to normal operation, SDM LED off.
    await dro.clearButton.click();
    await dro.waitForAxisValue('X', 20);
    expect(await dro.isLEDOn(dro.page.getByTestId('led-sdm'))).toBe(false);
  });

  test('operator selects a starting step number on Y (AC 11.2)', async ({ dro }) => {
    await dro.toggleInchMm();
    await programTwoSteps(dro);

    await dro.page.click('[data-testid="btn-sdm"]');
    await dro.waitForAxisPureTextValue('X', 'LEArn', 3000);
    await dro.page.click('[data-testid="key-6"]'); // -> rUn
    await dro.waitForAxisPureTextValue('X', 'rUn');
    await dro.enterButton.click();

    // Press Y to start a fresh step entry, type 2, confirm.
    await dro.yButton.click();
    await dro.enterNumber('2');
    await dro.waitForAxisPureNumberValue('Y', 2);
    await dro.enterButton.click();

    // Step 2 X=80, machine at origin -> DTG = 80.
    await dro.waitForAxisPureNumberValue('X', 80);
  });
});

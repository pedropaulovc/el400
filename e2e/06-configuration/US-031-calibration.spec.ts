import { test } from '../helpers/fixtures';
import type { DROPage } from '../helpers/dro-page';

async function openCalibration(dro: DROPage) {
  await dro.settingsButton.click();
  await dro.selectAxis('X');
  for (let row = 0; row < 5; row++) await dro.key2.click();
  await dro.waitForAxisPureTextValue('X', 'CALib');
  await dro.enterButton.click();
}

async function saveCalibration(dro: DROPage) {
  await dro.waitForAxisPureTextValue('X', 'SAU ChG');
  await dro.enterButton.click();
  await dro.waitForAxisPureTextValue('X', 'StorEd');
  await dro.clearButton.click(); // dismiss saved confirmation
  await dro.clearButton.click(); // leave setup
}

test.describe('US-031 calibration through the real debug front panel', () => {
  test.beforeEach(async ({ dro }) => {
    await dro.goto({ source: 'debug', skipBootMessage: true });
    await dro.toggleUnitButton.click();
    await dro.simulateEncoderAbsoluteMove('X', 0);
  });

  test('LEC uses measured/reference lengths, discards unsaved factors and survives reload when saved', async ({ dro }) => {
    await openCalibration(dro);
    await dro.waitForAxisPureTextValue('X', 'LEC');
    await dro.enterButton.click();
    await dro.waitForAxisPureTextValue('X', 'diSPuAL');
    await dro.enterButton.click();
    await dro.selectAxis('X');
    await dro.simulateEncoderAbsoluteMove('X', 100.125);
    await dro.waitForAxisValue('X', 100.125);
    await dro.enterButton.click();
    await dro.enterNumber('100');
    await dro.enterButton.click();
    await dro.enterButton.click();
    await dro.enterButton.click();
    await dro.clearButton.click();
    await dro.waitForAxisValue('X', 100.125);

    await dro.simulateEncoderAbsoluteMove('X', 0);
    await openCalibration(dro);
    await dro.enterButton.click();
    await dro.enterButton.click();
    await dro.selectAxis('X');
    await dro.simulateEncoderAbsoluteMove('X', 100.125);
    await dro.enterButton.click();
    await dro.enterNumber('100');
    await dro.enterButton.click();
    await dro.enterButton.click();
    await dro.enterButton.click();
    await saveCalibration(dro);
    await dro.waitForAxisValue('X', 100);
    await dro.reload();
    await dro.simulateEncoderAbsoluteMove('X', 200.25);
    await dro.waitForAxisValue('X', 200);
  });

  test('SLEC auto captures cumulative segments, edit changes a standard, and reference crossing gates saved compensation', async ({ dro }) => {
    await openCalibration(dro);
    await dro.key6.click();
    await dro.waitForAxisPureTextValue('X', 'SLEC');
    await dro.enterButton.click();
    await dro.waitForAxisPureTextValue('X', 'Auto');
    await dro.enterButton.click();
    await dro.enterButton.click();
    await dro.waitForAxisPureTextValue('Z', 'rEF'); // still waiting: no mark yet
    await dro.simulateEncoderAbsoluteMove('X', 10);
    await dro.enterButton.click(); // reference/start at10
    await dro.simulateEncoderAbsoluteMove('X', 20);
    await dro.key6.click();
    await dro.enterNumber('11');
    await dro.enterButton.click();
    await dro.simulateEncoderAbsoluteMove('X', 30);
    await dro.key6.click();
    await dro.enterNumber('21');
    await dro.enterButton.click();
    await dro.key2.click();
    await saveCalibration(dro);
    await dro.simulateEncoderAbsoluteMove('X', 15);
    await dro.waitForAxisValue('X', 15.5);

    await openCalibration(dro);
    await dro.key6.click();
    await dro.enterButton.click();
    await dro.key6.click();
    await dro.waitForAxisPureTextValue('X', 'Edit');
    await dro.enterButton.click();
    await dro.selectAxis('Y'); // reference value, not raw measured X
    await dro.enterNumber('12');
    await dro.enterButton.click();
    await dro.key6.click(); // next segment retains cumulative21
    await dro.waitForAxisValue('X', 20);
    await dro.waitForAxisValue('Y', 21);
    await dro.key2.click();
    await saveCalibration(dro);
    await dro.waitForAxisValue('X', 16);
    await dro.simulateEncoderAbsoluteMove('X', 0);
    await dro.reload();
    await dro.simulateEncoderAbsoluteMove('X', 5);
    await dro.waitForAxisValue('X', 5); // saved, but inactive until reference
    await dro.simulateEncoderAbsoluteMove('X', 15);
    await dro.waitForAxisValue('X', 16);
  });

  test('angular360 uses1296000 arcseconds and PPR decodes the installed simulated encoder counts', async ({ dro }) => {
    await dro.setAxisCountingMode('X', 'AnGULAr');
    await dro.setAxisAngularResolution('X', 'dd.dEC');
    await openCalibration(dro);
    await dro.enterButton.click();
    await dro.selectAxis('X');
    await dro.simulateEncoderAbsoluteMove('X', 359.5);
    await dro.enterButton.click();
    await dro.enterNumber('1296000');
    await dro.enterButton.click();
    await dro.enterButton.click();
    await dro.enterButton.click();
    await saveCalibration(dro);
    await dro.simulateEncoderAbsoluteMove('X', 179.75);
    await dro.waitForAxisValue('X', 180, 1000, 3);

    await openCalibration(dro);
    await dro.key6.click();
    await dro.key6.click();
    await dro.waitForAxisPureTextValue('X', 'P.P.r.');
    await dro.enterButton.click();
    await dro.enterNumber('72000');
    await dro.enterButton.click();
    await saveCalibration(dro);
    await dro.simulateEncoderAbsoluteMove('X', 90);
    await dro.waitForAxisValue('X', 90, 1000, 3); //90mm /0.005mm *360/72000
    await dro.reload();
    await dro.simulateEncoderAbsoluteMove('X', 180);
    await dro.waitForAxisValue('X', 180, 1000, 3);
  });
});

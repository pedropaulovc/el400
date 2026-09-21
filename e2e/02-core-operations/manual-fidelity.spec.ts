import { test } from '../helpers/fixtures';

test.beforeEach(async ({ dro }) => {
  await dro.goto({ source: 'debug', skipBootMessage: true });
  await dro.toggleInchMm();
});

test('connected INC zero follows live encoder travel independently of ABS', async ({ dro }) => {
  await dro.simulateEncoderAbsoluteMove('X', 12);
  await dro.toggleAbsInc();
  await dro.zeroAxis('X');
  await dro.simulateEncoderRelativeMove('X', 3);
  await dro.waitForAxisPureNumberValue('X', 3);
  await dro.toggleAbsInc();
  await dro.waitForAxisPureNumberValue('X', 15);
  await dro.toggleAbsInc();
  await dro.waitForAxisPureNumberValue('X', 3);
});

test('reversed positive preset and HALF retain the entered sign', async ({ dro }) => {
  await dro.setAxisDirection('X', 'riGht');
  await dro.simulateEncoderAbsoluteMove('X', 12);
  await dro.selectAxis('X');
  await dro.enterNumber('20');
  await dro.enterButton.click();
  await dro.waitForAxisPureNumberValue('X', 20);
  await dro.halfButton.click();
  await dro.selectAxis('X');
  await dro.waitForAxisPureNumberValue('X', 10);
  await dro.simulateEncoderRelativeMove('X', 2);
  await dro.waitForAxisPureNumberValue('X', 8);
  await dro.reload();
  await dro.simulateEncoderAbsoluteMove('X', 14);
  await dro.waitForAxisPureNumberValue('X', 8);
});

test('seven-digit overflow recovers through unit and saved decimal-resolution changes', async ({ dro }) => {
  await dro.simulateEncoderAbsoluteMove('X', 999.9999);
  await dro.waitForAxisPureNumberValue('X', 999.9999);
  await dro.simulateEncoderAbsoluteMove('X', 1000);
  await dro.waitForAxisPureTextValue('X', '-------');
  await dro.toggleInchMm();
  await dro.waitForAxisPureNumberValue('X', 39.3701);
  await dro.toggleInchMm();
  await dro.waitForAxisPureTextValue('X', '-------');
  await dro.settingsButton.click();
  await dro.selectAxis('X');
  for (let i = 0; i < 40 && !(await dro.getAxisRawText('X')).startsWith('dP '); i++) {
    await dro.key2.click();
  }
  await dro.waitForAxisPureTextValue('X', 'dP 5.0');
  for (let i = 0; i < 3; i++) await dro.key6.click();
  await dro.waitForAxisPureTextValue('X', 'dP 50.0');
  for (let i = 0; i < 40 && await dro.getAxisRawText('X') !== 'SAU ChG'; i++) {
    await dro.key2.click();
  }
  await dro.enterButton.click();
  await dro.clearButton.click();
  await dro.clearButton.click();
  await dro.waitForAxisPureNumberValue('X', 1000, 3, undefined, 3);
  await dro.simulateEncoderAbsoluteMove('X', 9999.999);
  await dro.waitForAxisPureNumberValue('X', 9999.999, 3, undefined, 3);
  await dro.simulateEncoderAbsoluteMove('X', 10000);
  await dro.waitForAxisPureTextValue('X', '-------');
  await dro.simulateEncoderAbsoluteMove('X', -9999.999);
  await dro.waitForAxisPureNumberValue('X', -9999.999, 3, undefined, 3);
});

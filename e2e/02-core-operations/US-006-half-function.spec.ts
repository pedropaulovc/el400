import { test, expect } from '../helpers/fixtures';

test('HALF → SELECT → axis halves the live INC datum and preserves ABS', async ({ dro }) => {
  await dro.goto({ source: 'debug', skipBootMessage: true });
  await dro.toggleInchMm();
  await dro.simulateEncoderAbsoluteMove('X', 12);
  await dro.toggleAbsInc();
  await dro.zeroAxis('X');
  await dro.simulateEncoderRelativeMove('X', 20);
  await dro.waitForAxisPureNumberValue('X', 20);
  await dro.halfButton.click();
  await dro.waitForAxisPureTextValue('X', 'SELECt');
  await dro.selectAxis('X');
  await dro.waitForAxisPureNumberValue('X', 10);
  await dro.simulateEncoderRelativeMove('X', -10);
  await dro.waitForAxisPureNumberValue('X', 0);
  await dro.toggleAbsInc();
  expect(await dro.isAbsMode()).toBe(true);
  await dro.waitForAxisPureNumberValue('X', 22);
});

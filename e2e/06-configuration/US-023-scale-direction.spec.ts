import { test } from '../helpers/fixtures';

test('US-023: saved direction recomputes the current reading and persists; an unsaved reversal is discarded', async ({ dro }) => {
  await dro.goto({ source: 'debug', skipBootMessage: true });
  await dro.toggleUnitButton.click();
  await dro.simulateEncoderAbsoluteMove('X', 12);
  await dro.simulateEncoderAbsoluteMove('Y', 7);
  await dro.waitForAxisValue('X', 12);

  await dro.settingsButton.click();
  await dro.selectAxis('X');
  for (let row = 0; row < 4; row++) await dro.key2.click();
  await dro.waitForAxisPureTextValue('X', 'LEFt');
  await dro.key6.click();
  await dro.clearButton.click();
  await dro.waitForAxisValue('X', 12);

  await dro.setAxisDirection('X', 'riGht');
  await dro.waitForAxisValue('X', -12);
  await dro.waitForAxisValue('Y', 7);
  await dro.simulateEncoderAbsoluteMove('X', 13);
  await dro.waitForAxisValue('X', -13);
  await dro.reload();
  await dro.simulateEncoderAbsoluteMove('X', 14);
  await dro.waitForAxisValue('X', -14);
});

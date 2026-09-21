import { test, expect } from '../helpers/fixtures';

test('Home → Set MC → reload → Recall restores the arbitrary saved datum', async ({ dro }) => {
  await dro.goto({ source: 'debug', skipBootMessage: true });
  await dro.toggleInchMm();
  await dro.toggleAbsInc();
  await dro.referenceButton.click();
  expect(await dro.isAbsMode()).toBe(true);
  await dro.enterButton.click();
  await dro.selectAxis('X');
  await dro.simulateEncoderAbsoluteMove('X', 9);
  await dro.waitForAxisPureNumberValue('X', 0);
  await dro.simulateEncoderAbsoluteMove('X', 12);
  await dro.waitForAxisPureNumberValue('X', 2);
  await dro.simulateEncoderAbsoluteMove('X', 37.25);
  await dro.referenceButton.click();
  await dro.key6.click();
  await dro.waitForAxisPureTextValue('X', 'SEt nC');
  await dro.enterButton.click();
  await dro.selectAxis('X');
  await dro.waitForAxisPureNumberValue('X', 0);
  await dro.reload();
  await dro.referenceButton.click();
  await dro.key4.click();
  await dro.waitForAxisPureTextValue('X', 'nC rEF');
  await dro.enterButton.click();
  await dro.selectAxis('X');
  await dro.simulateEncoderAbsoluteMove('X', 11);
  await dro.waitForAxisPureNumberValue('X', -26.25);
  await dro.simulateEncoderAbsoluteMove('X', 37.25);
  await dro.waitForAxisPureNumberValue('X', 0);
});

test('Set MC requires an observed encoder mark and cancel preserves the datum', async ({ dro }) => {
  await dro.goto({ source: 'debug', skipBootMessage: true });
  await dro.toggleInchMm();
  await dro.simulateEncoderAbsoluteMove('X', 5);
  await dro.referenceButton.click();
  await dro.key6.click();
  await dro.enterButton.click();
  await dro.selectAxis('X');
  await dro.waitForAxisPureTextValue('X', 'no rEF');
  await dro.clearButton.click();
  await dro.waitForAxisPureNumberValue('X', 5);
});

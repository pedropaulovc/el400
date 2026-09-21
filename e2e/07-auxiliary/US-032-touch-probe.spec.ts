import { test, expect } from '../helpers/fixtures';
import type { DROPage } from '../helpers/dro-page';

async function configureProbe(dro: DROPage, diameter: string, length: string) {
  await dro.openProbeMenu();
  await dro.key4.click(); // edge -> ConFiG
  await dro.waitForAxisPureTextValue('X', 'ConFiG');
  await dro.enterButton.click();
  await dro.enterNumber(diameter);
  await dro.enterButton.click();
  await dro.waitForAxisPureTextValue('X', 'Prb LEn');
  await dro.enterNumber(length);
  await dro.enterButton.click();
  await dro.clearButton.click();
}
async function selectFunction(dro: DROPage, rightPresses: number) {
  await dro.openProbeMenu();
  for (let index = 0; index < rightPresses; index++) await dro.key6.click();
  await dro.enterButton.click();
  await dro.xButton.click();
}
async function twoContacts(dro: DROPage, first: number, second: number) {
  await dro.simulateEncoderAbsoluteMove('X', first);
  await dro.simulateProbeContact();
  await dro.simulateProbeClear();
  // Respect the configured one-second hardware debounce before a new contact.
  await dro.page.waitForTimeout(1100);
  await dro.simulateEncoderAbsoluteMove('X', second);
  await dro.simulateProbeContact();
}

test.describe('US-032 touch probe', () => {
  test('CNCjs probe contact anchors the entered datum rather than silently zeroing', async ({ dro }) => {
    await dro.toggleInchMm();
    await selectFunction(dro, 0);
    await dro.enterButton.click(); // Edge1
    await dro.simulateEncoderAbsoluteMove('X', 50);
    await dro.simulateProbeContact();
    await dro.enterNumber('7');
    await dro.enterButton.click();
    await dro.waitForAxisValue('X', 7);
    await dro.clearButton.click();
    expect(await dro.isFnModeActive()).toBe(false);
  });

  test('debug probe configuration persists and edge datum compensates diameter and length', async ({ dro }) => {
    await dro.goto({ source: 'debug', skipBootMessage: true });
    await dro.toggleInchMm();
    await configureProbe(dro, '6', '20');
    await dro.page.reload();
    await selectFunction(dro, 0);
    await dro.enterButton.click();
    await dro.simulateEncoderAbsoluteMove('X', 50);
    await dro.simulateProbeContact();
    await dro.enterNumber('5');
    await dro.enterButton.click();
    await dro.waitForAxisValue('X', 2); // surface53 has desired coordinate5
    await dro.simulateProbeClear();
    await dro.clearButton.click();
    await dro.openProbeMenu();
    await dro.enterButton.click();
    await dro.zButton.click();
    await dro.key6.click(); // Edge2, negative approach
    await dro.enterButton.click();
    await dro.simulateEncoderAbsoluteMove('Z', 50);
    await dro.simulateProbeContact();
    await dro.enterButton.click(); // surface30 is zero
    await dro.waitForAxisValue('Z', 20);
  });

  test('debug midpoint ignores held contacts and applies a nonzero requested midpoint', async ({ dro }) => {
    await dro.goto({ source: 'debug', skipBootMessage: true });
    await dro.toggleInchMm();
    await selectFunction(dro, 1);
    await dro.simulateEncoderAbsoluteMove('X', 10);
    await dro.simulateProbeContact();
    await dro.simulateEncoderAbsoluteMove('X', 50); // still held, not second contact
    await expect(dro.simulatorRoot).toHaveAttribute('data-dro-state', 'probe-waiting');
    await dro.simulateProbeClear();
    await dro.page.waitForTimeout(1100);
    await dro.simulateProbeContact();
    await dro.enterNumber('8');
    await dro.enterButton.click();
    await dro.simulateProbeClear();
    await dro.simulateEncoderAbsoluteMove('X', 30);
    await dro.waitForAxisValue('X', 8);
    await dro.clearButton.click();
    await dro.waitForAxisValue('X', 8);
  });

  for (const flow of [{ label: 'inside', steps: 2, width: 56 }, { label: 'outside', steps: 3, width: 44 }]) {
    test(`debug ${flow.label} shows width and center`, async ({ dro }) => {
      await dro.goto({ source: 'debug', skipBootMessage: true });
      await dro.toggleInchMm();
      await configureProbe(dro, '6', '0');
      await selectFunction(dro, flow.steps);
      await twoContacts(dro, 10, 60);
      await dro.waitForAxisValue('X', flow.width);
      await dro.key6.click();
      await dro.waitForAxisValue('X', 35);
      await dro.waitForAxisPureTextValue('Z', 'CEntrE');
      await dro.key4.click();
      await dro.waitForAxisValue('X', flow.width);
      await dro.clearButton.click();
    });
  }

  test('probe delay rejects out-of-range settings and ignores a fresh contact before the saved delay', async ({ dro }) => {
    await dro.goto({ source: 'debug', skipBootMessage: true });
    await dro.toggleInchMm();
    await dro.settingsButton.click();
    await dro.xButton.click();
    for (let i = 0; i < 45 && (await dro.getAxisRawText('X')) !== 'Prb dLY'; i++) await dro.key2.click();
    await dro.waitForAxisPureTextValue('X', 'Prb dLY');
    for (const invalid of ['0', '61']) {
      await dro.enterButton.click(); // view
      await dro.enterButton.click(); // edit
      await dro.enterNumber(invalid);
      await dro.enterButton.click();
      await dro.waitForAxisPureTextValue('X', 'Error');
      await dro.clearButton.click(); // cancel this edit, stay on delay row
    }
    await dro.enterButton.click();
    await dro.enterButton.click();
    await dro.enterNumber('2');
    await dro.enterButton.click();
    for (let i = 0; i < 45 && (await dro.getAxisRawText('X')) !== 'SAU ChG'; i++) await dro.key2.click();
    await dro.waitForAxisPureTextValue('X', 'SAU ChG');
    await dro.enterButton.click();
    await dro.enterButton.click(); // dismiss StorEd
    await dro.clearButton.click();
    await selectFunction(dro, 1);
    await dro.simulateEncoderAbsoluteMove('X', 10);
    await dro.simulateProbeContact();
    await dro.simulateProbeClear();
    await dro.simulateEncoderAbsoluteMove('X', 50);
    await dro.simulateProbeContact();
    await expect(dro.simulatorRoot).toHaveAttribute('data-dro-state', 'probe-waiting');
    await dro.page.waitForTimeout(2100);
    await expect(dro.simulatorRoot).toHaveAttribute('data-dro-state', 'probe-waiting'); // held through expiry
    await dro.simulateProbeClear();
    await dro.simulateProbeContact();
    await expect(dro.simulatorRoot).toHaveAttribute('data-dro-state', 'probe-coordinate');
    await dro.enterButton.click();
    await dro.simulateProbeClear();
    await dro.simulateEncoderAbsoluteMove('X', 30);
    await dro.waitForAxisValue('X', 0);
  });

  test('debug T flashes without datum mutation; freeze resumes and rearms after release', async ({ dro }) => {
    await dro.goto({ source: 'debug', skipBootMessage: true });
    await dro.toggleInchMm();
    await dro.simulateEncoderAbsoluteMove('X', 25);
    await dro.simulateProbeContact();
    await dro.waitForAxisPureTextValue('X', 'ProbE');
    await dro.simulateEncoderAbsoluteMove('X', 30);
    await dro.waitForAxisValue('X', 30, 2000);
    await dro.goto({ source: 'debug', skipBootMessage: true, probeDroType: 'freeze' });
    if (!(await dro.isMmUnits())) await dro.toggleInchMm();
    await dro.simulateEncoderAbsoluteMove('X', 25);
    await dro.simulateProbeContact();
    await dro.simulateEncoderAbsoluteMove('X', 30);
    await dro.waitForAxisValue('X', 25);
    await dro.simulateProbeClear();
    await dro.waitForAxisValue('X', 30);
    await dro.page.waitForTimeout(1100);
    await dro.simulateProbeContact();
    await dro.simulateEncoderAbsoluteMove('X', 40);
    await dro.waitForAxisValue('X', 30);
    await dro.simulateProbeClear();
    await dro.waitForAxisValue('X', 40);
  });
});

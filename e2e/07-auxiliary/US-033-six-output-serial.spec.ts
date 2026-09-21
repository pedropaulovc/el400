import { test, expect } from '../helpers/fixtures';
import type { DROPage } from '../helpers/dro-page';

async function findSetupRow(dro: DROPage, label: string) {
  for (let i = 0; i < 45 && (await dro.getAxisRawText('X')) !== label; i++) await dro.key2.click();
  await dro.waitForAxisPureTextValue('X', label);
}
async function setChoice(dro: DROPage, currentLabel: string, nextLabel: string) {
  await dro.settingsButton.click();
  await dro.xButton.click();
  await findSetupRow(dro, currentLabel);
  await dro.key6.click();
  await dro.waitForAxisPureTextValue('X', nextLabel);
  await findSetupRow(dro, 'SAU ChG');
  await dro.enterButton.click();
  await expect(dro.simulatorRoot).toHaveAttribute('data-dro-state', 'setup-saved');
  await dro.enterButton.click(); // dismiss confirmation without changing the draft
  await dro.clearButton.click();
}
async function openOutputs(dro: DROPage) {
  await dro.functionButton.click();
  for (let i = 0; i < 12 && (await dro.getAxisRawText('X')) !== '6oP'; i++) await dro.key6.click();
  await dro.waitForAxisPureTextValue('X', '6oP');
  await dro.enterButton.click();
}
async function runOutputs(dro: DROPage) {
  await openOutputs(dro);
  await dro.waitForAxisPureTextValue('X', 'rUn');
  await dro.enterButton.click();
}
async function programOutputs(dro: DROPage, entries: { axis: 'X' | 'Y' | 'Z'; value: string }[]) {
  await openOutputs(dro);
  await dro.key6.click();
  await dro.waitForAxisPureTextValue('X', 'ProGrAn');
  await dro.enterButton.click();
  for (let i = 1; i < entries.length; i++) await dro.key6.click();
  await dro.enterButton.click();
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;
    await dro.selectAxis(entry.axis);
    await dro.enterNumber(entry.value);
    await dro.enterButton.click();
    if (i + 1 < entries.length) await dro.key6.click();
  }
  await dro.clearButton.click();
}
async function openSerial(dro: DROPage) {
  await dro.settingsButton.click();
  await dro.xButton.click();
  await findSetupRow(dro, 'AUX Fn');
  await dro.enterButton.click();
  await dro.key4.click(); // ProbE -> SErIAL
  await dro.waitForAxisPureTextValue('X', 'SErIAL');
  await dro.enterButton.click();
}

test.describe('US-033 six output and serial — real debug controls', () => {
  test.beforeEach(async ({ dro }) => {
    await dro.goto({ source: 'debug', skipBootMessage: true });
    await dro.toggleInchMm();
  });

  test('all six per-slot axis targets persist and continuous outputs compare without latching', async ({ dro }) => {
    await programOutputs(dro, [
      { axis: 'X', value: '10' }, { axis: 'Y', value: '20' }, { axis: 'Z', value: '30' },
      { axis: 'X', value: '40' }, { axis: 'Y', value: '50' }, { axis: 'Z', value: '60' },
    ]);
    await setChoice(dro, 'PULSE', 'Cont');
    await dro.page.reload();
    await expect(dro.page.getByTestId('output-6')).toContainText('Z 60 mm');
    await runOutputs(dro);
    await dro.simulateEncoderAbsoluteMove('X', 45);
    await dro.simulateEncoderAbsoluteMove('Y', 25);
    await dro.simulateEncoderAbsoluteMove('Z', 65);
    for (const index of [1, 2, 3, 4, 6]) await expect(dro.page.getByTestId(`output-${index}`).locator('output')).toHaveText('high');
    await expect(dro.page.getByTestId('output-5').locator('output')).toHaveText('low');
    await dro.simulateEncoderAbsoluteMove('X', 10); // exact equality is low
    await expect(dro.page.getByTestId('output-1').locator('output')).toHaveText('low');
    await expect(dro.page.getByTestId('output-4').locator('output')).toHaveText('low');
    await dro.clearButton.click();
    for (let index = 1; index <= 6; index++) await expect(dro.page.getByTestId(`output-${index}`).locator('output')).toHaveText('low');
  });

  test('pulse expires while stationary and retriggers crossing in the reverse direction', async ({ dro }) => {
    await programOutputs(dro, [{ axis: 'X', value: '10' }]);
    await runOutputs(dro);
    await dro.simulateEncoderAbsoluteMove('X', 15);
    const output = dro.page.getByTestId('output-1').locator('output');
    await expect(dro.page.getByTestId('axis-display-x').locator('.seg-dp').last()).toHaveClass(/seg-on/);
    await expect(output).toHaveText('high');
    await expect(output).toHaveText('low', { timeout: 2000 });
    await dro.simulateEncoderAbsoluteMove('X', 5);
    await expect(output).toHaveText('high');
    await expect(output).toHaveText('low', { timeout: 2000 });
    await dro.simulateEncoderAbsoluteMove('X', 6); // movement on same side cannot trigger
    await expect(output).toHaveText('low');
  });

  test('request ENTER delivers the manual record only to the explicitly connected virtual receiver', async ({ dro }) => {
    await dro.page.getByTestId('virtual-serial-connect').click();
    await expect(dro.page.getByRole('status').filter({ hasText: 'Serial connection:' })).toHaveText('Serial connection: virtual');
    await dro.simulateEncoderAbsoluteMove('X', 10.005);
    await dro.simulateEncoderAbsoluteMove('Y', 86.98);
    await openSerial(dro);
    const terminal = dro.page.getByTestId('serial-terminal');
    await expect(terminal).toHaveText('');
    await dro.enterButton.click();
    await expect(terminal).toHaveText('0010.005 ARMX 0086.980 ARMY 0000.000 ARMZ');
    await dro.simulateEncoderAbsoluteMove('X', 11);
    await expect(terminal).toHaveText('0010.005 ARMX 0086.980 ARMY 0000.000 ARMZ');
    await dro.enterButton.click();
    await expect(terminal).toContainText('0011.000 ARMX');
    await dro.clearButton.click();
  });

  test('continuous transmission stops on failure and C exits Pc fail; disconnected request also fails', async ({ dro }) => {
    await setChoice(dro, 'SEr iAL', 'SEr Con');
    await dro.page.getByTestId('virtual-serial-connect').click();
    await openSerial(dro);
    const terminal = dro.page.getByTestId('serial-terminal');
    await expect(terminal).toContainText('0000.000 ARMX');
    await dro.simulateEncoderAbsoluteMove('X', 12);
    await expect(terminal).toContainText('0012.000 ARMX');
    await dro.page.getByTestId('serial-failure').check();
    await dro.waitForAxisPureTextValue('X', 'Pc fail', 2000);
    const before = await terminal.textContent();
    await dro.page.waitForTimeout(600);
    await expect(terminal).toHaveText(before ?? '');
    await dro.clearButton.click();
    await expect(dro.simulatorRoot).toHaveAttribute('data-dro-state', 'idle');
    await setChoice(dro, 'SEr Con', 'SEr iAL');
    await dro.page.getByTestId('serial-disconnect').click();
    await openSerial(dro);
    await dro.enterButton.click();
    await dro.waitForAxisPureTextValue('X', 'Pc fail');
    await dro.clearButton.click();
  });
});

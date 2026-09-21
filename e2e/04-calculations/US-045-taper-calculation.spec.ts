import { test, expect } from '../helpers/fixtures';
import type { DROPage } from '../helpers/dro-page';

async function configureTaperOn(dro: DROPage, axis: 'X' | 'Y' | 'Z') {
  await dro.settingsButton.click();
  await dro.waitForAxisPureTextValue('X', 'SELECt');
  await dro.xButton.click();

  let guard = 0;
  while (!(await dro.getAxisRawText('X')).startsWith('tAPEr ')) {
    await dro.key2.click();
    if (++guard > 40) throw new Error('tAPEr setup row not reachable');
  }

  while ((await dro.getAxisRawText('X')) !== `tAPEr ${axis}`) {
    await dro.key6.click();
  }

  guard = 0;
  while ((await dro.getAxisRawText('X')) !== 'SAU ChG') {
    await dro.key2.click();
    if (++guard > 40) throw new Error('SAU ChG setup row not reachable');
  }
  await dro.enterButton.click();
  await dro.waitForAxisPureTextValue('X', 'StorEd');

  // First C acknowledges StorEd; second C exits setup with the committed value.
  await dro.clearButton.click();
  await dro.clearButton.click();
  await dro.waitForReady('idle');
}

test.describe('US-045: Taper Calculation', () => {
  test('CNCjs regression: X choice shows DMS half-angle on X and radius on Z', async ({ dro }) => {
    await dro.setTaperOnAxis('X');
    await dro.simulateEncoderAbsoluteMove('X', 0);
    await dro.simulateEncoderAbsoluteMove('Z', 0);
    await dro.enterTaperFunction();

    await dro.simulateEncoderAbsoluteMove('Z', 50);
    await dro.simulateEncoderAbsoluteMove('X', 5);

    await expect(dro.xDisplay).toContainText('5.42.38');
    await dro.waitForAxisValue('Z', 5 / 25.4);
  });

  test('debug: real setup exposes Y and routes radius/angle to the manual displays', async ({ dro }) => {
    await dro.goto({ source: 'debug', skipBootMessage: true });
    await configureTaperOn(dro, 'Y');
    await dro.toggleUnitButton.click();
    await dro.enterTaperFunction();

    await dro.simulateEncoderAbsoluteMove('X', 5);
    await dro.simulateEncoderAbsoluteMove('Z', 50);

    await dro.waitForAxisValue('X', 5);
    await expect(dro.yDisplay).toContainText('5.42.38');
  });

  test('debug: reverse travel keeps an acute half-angle and positive radius', async ({ dro }) => {
    await dro.goto({ source: 'debug', skipBootMessage: true });
    await configureTaperOn(dro, 'Z');
    await dro.toggleUnitButton.click();
    await dro.enterTaperFunction();

    await dro.simulateEncoderAbsoluteMove('X', -5);
    await dro.simulateEncoderAbsoluteMove('Z', -50);

    await dro.waitForAxisValue('X', 5);
    await expect(dro.zDisplay).toContainText('5.42.38');
  });

  test('debug: zero axial length is visibly invalid', async ({ dro }) => {
    await dro.goto({ source: 'debug', skipBootMessage: true });
    await configureTaperOn(dro, 'X');
    await dro.toggleUnitButton.click();
    await dro.enterTaperFunction();

    await expect(dro.xDisplay).toContainText('inuAL d');
    await dro.simulateEncoderAbsoluteMove('X', 5);
    await expect(dro.xDisplay).toContainText('inuAL d');
    await dro.waitForAxisValue('Z', 5);
  });

  test('C exits taper and restores the live DRO', async ({ dro }) => {
    await dro.goto({ source: 'debug', skipBootMessage: true });
    await dro.enterTaperFunction();
    expect(await dro.isFnModeActive()).toBe(true);

    await dro.clearButton.click();
    expect(await dro.isFnModeActive()).toBe(false);
    await dro.waitForAxisValue('X', 0);
  });
});

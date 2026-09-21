import { test, expect } from '../helpers/fixtures';
import type { DROPage } from '../helpers/dro-page';

/**
 * E2E: US-024 Setup Menu — Zero-Approach (Near-Zero) Warning.
 *
 * Covers both distinct manual contracts through visible controls:
 * - target-bearing functions always retain the mandatory 50 µm warning, even
 *   while the per-axis BUZZ option is off;
 * - ZEro AP opens the selected axis's nested BUZZ / BP DIST / BP TOLR editor,
 *   whose numeric values remain drafts until SAU CHG.
 *
 * @see project/user-stories/06-configuration/US-024-zero-approach-warning.md
 */

async function gotoZeroApproach(dro: DROPage, axis: 'X' | 'Y' | 'Z') {
  await dro.settingsButton.click();
  await dro.waitForAxisPureTextValue('X', 'SELECt');
  await dro.selectAxis(axis);

  let guard = 0;
  while ((await dro.getAxisRawText(axis)) !== 'ZEro AP') {
    await dro.key2.click();
    if (++guard > 40) throw new Error('ZEro AP row not reachable');
  }
}

async function saveAndExitSetup(dro: DROPage) {
  let guard = 0;
  while ((await dro.getAxisRawText('X')) !== 'SAU ChG') {
    await dro.key2.click();
    if (++guard > 40) throw new Error('SAU ChG row not reachable');
  }
  await dro.enterButton.click();
  await dro.waitForAxisPureTextValue('X', 'StorEd');
  await dro.clearButton.click();
  await dro.waitForAxisPureTextValue('X', 'SAU ChG');
  await dro.clearButton.click();
  await dro.waitForReady('idle');
}

async function configureXWarning(dro: DROPage) {
  await gotoZeroApproach(dro, 'X');

  await dro.enterButton.click();
  await dro.waitForAxisPureTextValue('X', 'bU22 oF');
  await dro.key6.click();
  await dro.waitForAxisPureTextValue('X', 'bU22 on');

  await dro.key2.click();
  await dro.waitForAxisPureTextValue('X', 'BP diSt');
  await dro.enterButton.click();
  await dro.waitForAxisPureTextValue('X', '0.0508');
  await dro.enterButton.click();
  await dro.waitForAxisPureTextValue('X', '0');
  await dro.enterNumber('0.254');
  await dro.enterButton.click();

  await dro.waitForAxisPureTextValue('X', 'BP toLr');
  await dro.enterButton.click();
  await dro.waitForAxisPureTextValue('X', '0.0000');
  await dro.enterButton.click();
  await dro.waitForAxisPureTextValue('X', '0');
  await dro.enterNumber('0.127');
  await dro.enterButton.click();

  await saveAndExitSetup(dro);
}

const blinkingDigits = (dro: DROPage, axis: 'x' | 'y' | 'z') =>
  dro.page.getByTestId(`axis-display-${axis}`).locator('[data-blinking="true"]');


test.describe('US-024: Zero-Approach Warning', () => {
  test.beforeEach(async ({ dro }) => {
    await dro.goto({ source: 'debug', skipBootMessage: true });
    await dro.toggleInchMm();
    expect(await dro.isMmUnits()).toBe(true);
  });

  test('target warning keeps the mandatory 50 µm protection with BUZZ off', async ({ dro }) => {
    await dro.simulateEncoderAbsoluteMove('X', 12);
    await dro.startDistanceToGo('X', '20');
    await dro.waitForAxisValue('X', 20);

    await dro.simulateEncoderAbsoluteMove('X', 31.94);
    await dro.waitForAxisValue('X', 0.06);
    await expect(dro.page.getByTestId('audio-indicator')).toHaveCount(0);

    await dro.simulateEncoderAbsoluteMove('X', 31.95);
    await dro.waitForAxisValue('X', 0.05);
    await expect(dro.page.getByTestId('audio-indicator')).toBeVisible();
    await expect(blinkingDigits(dro, 'x')).toBeVisible();
    await expect(blinkingDigits(dro, 'y')).toHaveCount(0);
  });

  test('nested numeric BP DIST/TOLR are per-axis and provide release hysteresis', async ({ dro }) => {
    await dro.simulateEncoderAbsoluteMove('X', 1);
    await dro.simulateEncoderAbsoluteMove('Y', 0);
    await configureXWarning(dro);

    await dro.waitForAxisValue('X', 1);
    await expect(dro.page.getByTestId('audio-indicator')).toHaveCount(0);

    // BP DIST 0.010 in = 0.254 mm: X engages, while Y at zero remains off.
    await dro.simulateEncoderAbsoluteMove('X', 0.2);
    await dro.waitForAxisValue('X', 0.2);
    await expect(dro.page.getByTestId('audio-indicator')).toBeVisible();
    await expect(blinkingDigits(dro, 'x')).toBeVisible();
    await expect(blinkingDigits(dro, 'y')).toHaveCount(0);

    // BP TOLR 0.005 in keeps the warning on through 0.381 mm, then releases.
    await dro.simulateEncoderAbsoluteMove('X', 0.3);
    await dro.waitForAxisValue('X', 0.3);
    await expect(dro.page.getByTestId('audio-indicator')).toBeVisible();

    await dro.simulateEncoderAbsoluteMove('X', 0.4);
    await dro.waitForAxisValue('X', 0.4);
    await expect(dro.page.getByTestId('audio-indicator')).toHaveCount(0);
    await expect(blinkingDigits(dro, 'x')).toHaveCount(0);
  });
});

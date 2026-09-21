import { test, expect } from '../helpers/fixtures';

/**
 * E2E Tests: US-040 follow-up — Angular display-resolution DMS formats.
 *
 * Completes AC 40.4 and the angular half of AC 40.3: once an axis is in AnGULAr
 * counting mode, the display-resolution (`dP`) parameter offers the DMS formats
 * (`dd.mn`, `dd.mn.SS`, `dd.dEC`) instead of the linear micron values, and the
 * chosen format drives how the live angular readout renders the wrapped degrees.
 *
 * Real user actions only: counting mode and dP format go through the setup
 * transaction, and rotation uses the connected debug position controls through
 * the live MILL_STATE_CHANGED path.
 *
 * @see project/user-stories/06-configuration/US-040-counting-mode.md (AC 40.3/40.4)
 */
test.describe('US-040: Angular display-resolution DMS formats', () => {
  test.beforeEach(async ({ dro }) => {
    await dro.goto({ source: 'debug', skipBootMessage: true });
  });

  test('AC 40.4: dP offers the angular DMS formats once the axis is AnGULAr', async ({ dro }) => {
    await dro.setAxisCountingMode('X', 'AnGULAr');

    // Re-open setup and scroll to the dP item: it now shows the default angular
    // format label `dd.mn`, and cycling exposes the other two DMS formats only.
    await dro.settingsButton.click();
    await dro.waitForAxisPureTextValue('X', 'SELECt');
    await dro.selectAxis('X');

    let guard = 0;
    while (!(await dro.getAxisRawText('X')).startsWith('dd.')) {
      await dro.key2.click();
      guard += 1;
      expect(guard).toBeLessThan(30);
    }
    await dro.waitForAxisPureTextValue('X', 'dd.mn'); // default (AC 40.4)
    await dro.key6.click();
    await dro.waitForAxisPureTextValue('X', 'dd.mn.SS');
    await dro.key6.click();
    await dro.waitForAxisPureTextValue('X', 'dd.dEC');
    // Wrap-around stays within the 3-format angular set.
    await dro.key6.click();
    await dro.waitForAxisPureTextValue('X', 'dd.mn');
  });

  test('AC 40.3: the chosen dd.mn.SS format drives the live DMS readout', async ({ dro }) => {
    await dro.toggleInchMm(); // mm so the raw magnitude maps 1:1 to degrees
    expect(await dro.isMmUnits()).toBe(true);

    await dro.setAxisCountingMode('X', 'AnGULAr');
    await dro.setAxisAngularResolution('X', 'dd.mn.SS');
    await dro.reload();

    // Datum the angular axis, then rotate 12.5° -> 12°30'00" -> "12.30.00".
    await dro.zeroAxis('X');
    await dro.waitForAxisPureTextValue('X', '0.00.00');
    await dro.simulateTableMove('X', 'left', 12.5);
    await dro.waitForAxisPureTextValue('X', '12.30.00');

    // A later rotation reformats live in DMS too (90° -> "90.00.00").
    await dro.simulateTableMove('X', 'left', 77.5); // 12.5 + 77.5 = 90
    await dro.waitForAxisPureTextValue('X', '90.00.00');
  });

  test('AC 40.3: the dd.dEC format renders degrees-decimal', async ({ dro }) => {
    await dro.toggleInchMm();
    await dro.setAxisCountingMode('X', 'AnGULAr');
    await dro.setAxisAngularResolution('X', 'dd.dEC');

    await dro.zeroAxis('X');
    await dro.waitForAxisPureTextValue('X', '0.000');
    await dro.simulateTableMove('X', 'left', 12.5);
    await dro.waitForAxisPureTextValue('X', '12.500');
  });
});

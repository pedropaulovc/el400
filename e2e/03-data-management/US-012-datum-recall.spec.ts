import { test, expect } from '../helpers/fixtures';
import {
  MACHINE_REFERENCE_VALUES_MM,
  REFERENCE_MARK_POSITION_MM,
} from '../../src/stores/dro/features/reference';

/**
 * E2E Tests: US-012 Datum Recall (Machine Reference)
 *
 * Critical happy paths for the two Reference flows (manual §7.7):
 * - honE / Reference Point (§7.7.1): datum set AT the encoder mark.
 * - nC rEF / Recall Machine Reference (§7.7.2.2): datum at a fixed distance
 *   from the mark.
 *
 * Most behavior is covered by unit + integration tests; these exercise the
 * full UI path including crossing the encoder reference mark — both via the
 * explicit latch hook and via real machine motion (jogging the encoder across
 * the mark, with no test hook).
 *
 * @see project/user-stories/03-data-management/US-012-datum-recall.md
 */
test.describe('US-012: Datum Recall', () => {
  /**
   * honE mode happy path (AC 12.5, 12.6, 12.3, 12.4):
   * Reference -> honE -> ENT -> SELECt -> select X -> cross mark -> reads 0.
   */
  test('Find Reference Mark (honE mode) sets datum at the mark', async ({ dro }) => {
    // Work in mm for direct value assertions
    await dro.toggleInchMm();
    expect(await dro.isMmUnits()).toBe(true);

    // Press Reference -> honE
    await dro.referenceButton.click();
    await dro.waitForAxisPureTextValue('X', 'honE', 1000);

    // Confirm honE with ENT -> SELECt
    await dro.enterButton.click();
    await dro.waitForAxisPureTextValue('X', 'SELECt', 1000);

    // Select X -> waiting (blinking zero)
    await dro.selectAxis('X');
    await dro.waitForAxisPureNumberValue('X', 0);

    // Move the encoder to the reference mark and latch there (explicit hook).
    await dro.simulateEncoderRefMark('X', REFERENCE_MARK_POSITION_MM.X);

    // Datum is AT the mark: X reads 0 in ABS mode
    expect(await dro.isAbsMode()).toBe(true);
    await dro.waitForAxisPureNumberValue('X', 0, 4, 2000);
  });

  /**
   * nC rEF recall happy path (AC 12.1, 12.2, 12.3, 12.4):
   * Reference -> right to nC rEF -> ENT -> select X -> cross mark ->
   * display jumps to the stored machine-reference value.
   */
  test('Recall Machine Reference restores stored datum value', async ({ dro }) => {
    await dro.toggleInchMm(); // mm

    // Press Reference, navigate right to nC rEF
    await dro.referenceButton.click();
    await dro.waitForAxisPureTextValue('X', 'honE', 1000);
    await dro.key6.click(); // right
    await dro.waitForAxisPureTextValue('X', 'nC rEF', 1000);

    // Confirm and select axis
    await dro.enterButton.click();
    await dro.waitForAxisPureTextValue('X', 'SELECt', 1000);
    await dro.selectAxis('X');
    await dro.waitForAxisPureNumberValue('X', 0);

    // Cross the reference mark at the mark position (explicit hook).
    await dro.simulateEncoderRefMark('X', REFERENCE_MARK_POSITION_MM.X);

    // Display jumps to the stored machine-reference value
    expect(await dro.isAbsMode()).toBe(true);
    await dro.waitForAxisPureNumberValue('X', MACHINE_REFERENCE_VALUES_MM.X, 4, 2000);
  });

  /**
   * Real-user trigger (AC 12.3): the datum latches from machine motion alone.
   * No test hook is invoked here — jogging the encoder across the mark via the
   * mill connection drives MILL_STATE_CHANGED, and the app latches the recall.
   * The reference mark sits at REFERENCE_MARK_POSITION_MM (10mm); the app boots
   * with the encoder at 0, so moving to 10mm crosses it.
   */
  test('Jogging across the mark (no hook) latches the recall', async ({ dro }) => {
    await dro.toggleInchMm(); // mm

    await dro.referenceButton.click();
    await dro.waitForAxisPureTextValue('X', 'honE', 1000);
    await dro.key6.click(); // -> nC rEF
    await dro.waitForAxisPureTextValue('X', 'nC rEF', 1000);
    await dro.enterButton.click();
    await dro.waitForAxisPureTextValue('X', 'SELECt', 1000);
    await dro.selectAxis('X');
    await dro.waitForAxisPureNumberValue('X', 0);

    // Jog the encoder to the mark (10mm) via the mill connection only — the
    // real-user path. No window hook is called.
    await dro.jogAcrossEncoderRefMark('X', REFERENCE_MARK_POSITION_MM.X);

    // Recall latched purely from machine motion: display shows the stored value.
    expect(await dro.isAbsMode()).toBe(true);
    await dro.waitForAxisPureNumberValue('X', MACHINE_REFERENCE_VALUES_MM.X, 4, 2000);
  });
});

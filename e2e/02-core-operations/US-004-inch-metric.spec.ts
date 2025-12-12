import { test, expect } from '../helpers/fixtures';

/**
 * E2E Tests: US-004 Inch and Metric Display
 *
 * Tests unit toggle between Inch and Millimeter display modes.
 *
 * @see project/user-stories/02-core-operations/US-004-inch-metric.md
 */
test.describe('US-004: Inch/Metric Mode', () => {
  /**
   * AC 4.1: Pressing the in/mm key toggles the display units.
   * AC 4.2: The Inch LED indicator glows when in Inch mode.
   * AC 4.3: The mm LED indicator glows when in Millimeter mode.
   */
  test('should toggle between inch and mm units', async ({ dro }) => {
    // Start in inch mode
    await expect(await dro.isInchUnits()).toBe(true);

    // Toggle to mm
    await dro.toggleInchMm();
    await expect(await dro.isMmUnits()).toBe(true);
    await expect(await dro.isInchUnits()).toBe(false);

    // Toggle back to inch
    await dro.toggleInchMm();
    await expect(await dro.isInchUnits()).toBe(true);
    await expect(await dro.isMmUnits()).toBe(false);
  });

  /**
   * Default unit should be inch.
   */
  test('should start in inch mode by default', async ({ dro }) => {
    await expect(await dro.isInchUnits()).toBe(true);
    await expect(await dro.isMmUnits()).toBe(false);
  });

});

import { test, expect } from '../helpers/fixtures';

/**
 * E2E Tests: US-016 Bolt Hole Circle
 *
 * Minimal e2e tests covering critical bolt hole circle functionality.
 * Additional coverage provided by integration tests.
 *
 * @see project/user-stories/05-pattern-generation/US-016-bolt-circle-full.md
 */
test.describe('US-016: Bolt Hole Circle', () => {
  /**
   * AC16.1: Must be in ABS mode to activate bolt hole
   * AC16.2: Pressing bolt hole key activates bolt hole mode
   * AC16.3: Can select between CIRCLE and ARC mode
   * AC16.4: Can enter circle parameters (center X/Y, radius, angle, holes)
   * AC16.5: After parameter entry, switches to INC mode for navigation
   * AC16.6: Can navigate between holes with arrow keys
   * AC16.7: Clear key exits bolt hole mode
   *
   * Bolt hole positions for test parameters (input in inches, stored in mm):
   * - Center: (0.5", -0.3") = (12.7mm, -7.62mm)
   * - Radius: 1.0" = 25.4mm
   * - Start angle: 45°, 8 holes (45° apart)
   * - Initial position: (0.2", 0.1") = (5.08mm, 2.54mm)
   * - Hole 1 (45°): X = 30.66mm = 1.207", Y = 10.34mm = 0.407"
   * - Hole 2 (90°): X = 12.7mm = 0.5", Y = 17.78mm = 0.7"
   * - Distance hole1->hole2: X = -17.96mm = -0.707", Y = 7.44mm = 0.293"
   */
  test('complete bolt hole circle workflow: enter parameters and navigate holes', async ({
    dro,
  }) => {
    // Set initial encoder position to non-zero values (0.2", 0.1")
    await dro.simulateEncoderAbsoluteMove('X', 5.08);
    await dro.simulateEncoderAbsoluteMove('Y', 2.54);

    // Verify starting in ABS mode
    expect(await dro.isAbsMode()).toBe(true);

    // Activate bolt hole mode
    await dro.page.click('[data-testid="btn-bolt-circle"]');

    // Assert intro display: X shows "b hoLE", Y shows 0, Z shows empty
    await dro.waitForAxisPureTextValue('X', 'b hoLE', 500);
    await dro.waitForAxisPureNumberValue('Y', 0);
    await dro.waitForAxisPureTextValue('Z', '');

    // Wait for intro to complete and verify menu display (intro is 1000ms + buffer)
    await dro.waitForAxisPureTextValue('X', 'CirCLE', 3000);
    await dro.waitForAxisPureNumberValue('Y', 0);
    await dro.waitForAxisPureTextValue('Z', '');

    // Confirm CIRCLE mode selection (default)
    await dro.enterButton.click();

    // Should now be in center-x entry: X shows buffer value, Y shows prompt
    await dro.waitForAxisPureNumberValue('X', 0);
    await dro.waitForAxisPureTextValue('Y', 'EntCnt0');
    await dro.waitForAxisPureTextValue('Z', '');

    // Enter center X = 0.5" (X displays numeric value)
    await dro.enterNumber('0.5');
    await dro.waitForAxisPureNumberValue('X', 0.5);
    await dro.waitForAxisPureTextValue('Y', 'EntCnt0');
    await dro.waitForAxisPureTextValue('Z', '');
    await dro.enterButton.click();

    // Should now be in center-y entry
    await dro.waitForAxisPureTextValue('X', 'EntCnt1');
    await dro.waitForAxisPureNumberValue('Y', 0);
    await dro.waitForAxisPureTextValue('Z', '');

    // Enter center Y = -0.3" (with negative)
    await dro.enterNumber('-0');
    await dro.waitForAxisPureNumberValue('Y', 0);

    // Simulate user mistake: typed wrong digit, use C to erase
    await dro.enterNumber('9'); // Wrong digit
    await dro.waitForAxisPureNumberValue('Y', -9);
    await dro.clearButton.click(); // Erase last digit
    await dro.waitForAxisPureNumberValue('Y', 0);

    // Continue with correct value
    await dro.enterNumber('.3');
    await dro.waitForAxisPureNumberValue('Y', -0.3);
    await dro.enterButton.click();

    // Should now be in radius entry
    await dro.waitForAxisPureTextValue('X', 'rAdiUS');
    await dro.waitForAxisPureNumberValue('Y', 0);
    await dro.waitForAxisPureTextValue('Z', '');

    // Enter radius = 1.0"
    await dro.enterNumber('1');
    await dro.waitForAxisPureNumberValue('Y', 1);
    await dro.enterButton.click();

    // Should now be in angle entry
    await dro.waitForAxisPureTextValue('X', 'AnGLE');
    await dro.waitForAxisPureNumberValue('Y', 0);
    await dro.waitForAxisPureTextValue('Z', '');

    // Enter starting angle = 45 (integer - no decimals)
    await dro.enterNumber('45');
    await dro.waitForAxisPureNumberValue('Y', 45);
    await dro.enterButton.click();

    // Should now be in holes entry
    await dro.waitForAxisPureTextValue('X', 'hoLES');
    await dro.waitForAxisPureNumberValue('Y', 0);
    await dro.waitForAxisPureTextValue('Z', '');

    // Enter hole count = 8 (integer - no decimals)
    await dro.key8.click();
    await dro.waitForAxisPureNumberValue('Y', 8);
    await dro.enterButton.click();

    // Should now be in INC mode (distance-to-go) showing distance to hole 1
    expect(await dro.isIncMode()).toBe(true);

    // Calculate expected distance-to-go from initial position (5.08mm, 2.54mm) to hole 1
    // Hole 1 (45°): X = 12.7 + 25.4*cos(45°) = 30.6605mm, Y = -7.62 + 25.4*sin(45°) = 10.3405mm
    // Distance: X = 30.6605 - 5.08 = 25.5805mm = 1.0071", Y = 10.3405 - 2.54 = 7.8005mm = 0.3071"
    await dro.waitForAxisPureNumberValue('X', 1.0071);
    await dro.waitForAxisPureNumberValue('Y', 0.3071);

    // Simulate moving halfway to hole 1
    await dro.simulateEncoderRelativeMove('X', 12.79026); // 25.5805mm / 2
    await dro.simulateEncoderRelativeMove('Y', 3.90026);  // 7.8005mm / 2

    // Assert distance-to-go is now half (remaining distance)
    await dro.waitForAxisPureNumberValue('X', 0.50355); // ~12.79026mm in inches
    await dro.waitForAxisPureNumberValue('Y', 0.15355); // ~3.90026mm in inches

    // Simulate moving the remaining half to reach hole 1
    await dro.simulateEncoderRelativeMove('X', 12.79025);
    await dro.simulateEncoderRelativeMove('Y', 3.90025);

    // Assert we've arrived at hole 1 (distance-to-go is 0)
    await dro.waitForAxisPureNumberValue('X', 0);
    await dro.waitForAxisPureNumberValue('Y', 0);

    // Navigate to next hole (hole 2) with key 6
    await dro.key6.click();

    // Assert distance from hole 1 to hole 2
    // Hole 2 (90°): X = 12.7mm = 0.5", Y = 17.78mm = 0.7"
    // Distance from hole 1 (30.6605mm, 10.3405mm) to hole 2: X = -17.9605mm = -0.7071", Y = 7.4395mm = 0.2929"
    await dro.waitForAxisPureNumberValue('X', -0.7071);
    await dro.waitForAxisPureNumberValue('Y', 0.2929);

    // Navigate to previous hole with key 4
    await dro.key4.click();

    // Exit bolt hole mode with Clear
    await dro.clearButton.click();

    // Should return to idle in ABS mode
    expect(await dro.isAbsMode()).toBe(true);

    // Verify final absolute position matches initial position (5.08mm, 2.54mm) plus total movement (25.5805mm, 7.8005mm)
    // Final position: (30.6605mm, 10.3405mm) = (1.2071", 0.4071")
    await dro.waitForAxisPureNumberValue('X', 1.2071);
    await dro.waitForAxisPureNumberValue('Y', 0.4071);
  });

  test('C key clears input buffer completely then exits to idle', async ({ dro }) => {
    // Verify starting in ABS mode
    expect(await dro.isAbsMode()).toBe(true);

    // Activate bolt hole mode
    await dro.page.click('[data-testid="btn-bolt-circle"]');

    // Wait for intro to complete (intro is 1000ms + buffer)
    await dro.waitForAxisPureTextValue('X', 'CirCLE', 3000);

    // FN LED should be on in bolt hole mode
    expect(await dro.isFnModeActive()).toBe(true);

    // Confirm CIRCLE mode selection
    await dro.enterButton.click();

    // Enter center X
    await dro.enterNumber('5');
    await dro.enterButton.click();

    // Now in center Y entry - enter some numbers (display shows numeric values)
    await dro.enterNumber('1');
    await dro.waitForAxisPureNumberValue('Y', 1);
    await dro.enterNumber('2');
    await dro.waitForAxisPureNumberValue('Y', 12);
    await dro.enterNumber('3');
    await dro.waitForAxisPureNumberValue('Y', 123);

    // Use C key to erase digits one by one
    await dro.clearButton.click();
    await dro.waitForAxisPureNumberValue('Y', 12);
    await dro.clearButton.click();
    await dro.waitForAxisPureNumberValue('Y', 1);
    await dro.clearButton.click();

    // Buffer is now empty - Y axis should show 0
    await dro.waitForAxisPureNumberValue('Y', 0);

    // Type another digit and verify Y shows it (numeric value)
    await dro.enterNumber('5');
    await dro.waitForAxisPureNumberValue('Y', 5);

    // Press C twice to exit: first clears buffer, second exits to idle
    await dro.clearButton.click();
    await dro.waitForAxisPureNumberValue('Y', 0);
    await dro.clearButton.click();

    // FN LED should be off (back to idle)
    expect(await dro.isFnModeActive()).toBe(false);

    // Should be back in ABS mode (preserved)
    expect(await dro.isAbsMode()).toBe(true);
  });
});

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
   * Bolt hole positions for test parameters (values in mm, display in inches):
   * - Center: (12.5, -7.25), Radius: 25.75, Start angle: 45, 8 holes (45 apart)
   * - Hole 1 (45): X = 30.7080mm = 1.2090", Y = 10.9580mm = 0.4314"
   * - Hole 2 (90): X = 12.5mm, Y = 18.5mm
   * - Distance hole1->hole2: X = -18.2080mm = -0.7169", Y = 7.5420mm = 0.2969"
   */
  test('complete bolt hole circle workflow: enter parameters and navigate holes', async ({
    dro,
  }) => {
    // Set initial encoder position to non-zero values
    await dro.simulateEncoderAbsoluteMove('X', 5);
    await dro.simulateEncoderAbsoluteMove('Y', 3);

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

    // Enter center X = 12.5 (X displays numeric value)
    await dro.enterNumber('12.5');
    await dro.waitForAxisPureNumberValue('X', 12.5);
    await dro.waitForAxisPureTextValue('Y', 'EntCnt0');
    await dro.waitForAxisPureTextValue('Z', '');
    await dro.enterButton.click();

    // Should now be in center-y entry
    await dro.waitForAxisPureTextValue('X', 'EntCnt1');
    await dro.waitForAxisPureNumberValue('Y', 0);
    await dro.waitForAxisPureTextValue('Z', '');

    // Enter center Y = -7.25 (with negative)
    await dro.enterNumber('-7');
    await dro.waitForAxisPureNumberValue('Y', -7);

    // Simulate user mistake: typed wrong digit, use C to erase
    await dro.enterNumber('9'); // Wrong digit
    await dro.waitForAxisPureNumberValue('Y', -79);
    await dro.clearButton.click(); // Erase last digit
    await dro.waitForAxisPureNumberValue('Y', -7);

    // Continue with correct value
    await dro.enterNumber('.25');
    await dro.waitForAxisPureNumberValue('Y', -7.25);
    await dro.enterButton.click();

    // Should now be in radius entry
    await dro.waitForAxisPureTextValue('X', 'rAdiUS');
    await dro.waitForAxisPureNumberValue('Y', 0);
    await dro.waitForAxisPureTextValue('Z', '');

    // Enter radius = 25.75
    await dro.enterNumber('25.75');
    await dro.waitForAxisPureNumberValue('Y', 25.75);
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

    // Calculate expected distance-to-go from initial position (5mm, 3mm) to hole 1
    // Hole 1 (45°): X = 12.5 + 25.75*cos(45°) = 30.708mm, Y = -7.25 + 25.75*sin(45°) = 10.958mm
    // Distance: X = 30.708 - 5 = 25.708mm = 1.01213", Y = 10.958 - 3 = 7.958mm = 0.31331"
    await dro.waitForAxisPureNumberValue('X', 1.01213, 3);
    await dro.waitForAxisPureNumberValue('Y', 0.31331, 3);

    // Simulate moving halfway to hole 1
    await dro.simulateEncoderRelativeMove('X', 12.854); // 25.708mm / 2
    await dro.simulateEncoderRelativeMove('Y', 3.979);  // 7.958mm / 2

    // Assert distance-to-go is now half (remaining distance)
    await dro.waitForAxisPureNumberValue('X', 0.50606, 3); // ~12.854mm in inches
    await dro.waitForAxisPureNumberValue('Y', 0.15666, 3); // ~3.979mm in inches

    // Simulate moving the remaining half to reach hole 1
    await dro.simulateEncoderRelativeMove('X', 12.854);
    await dro.simulateEncoderRelativeMove('Y', 3.979);

    // Assert we've arrived at hole 1 (distance-to-go is 0)
    await dro.waitForAxisPureNumberValue('X', 0);
    await dro.waitForAxisPureNumberValue('Y', 0);

    // Navigate to next hole (hole 2) with key 6
    await dro.key6.click();

    // Assert distance from hole 1 to hole 2 (Thread 1)
    // Hole 2 (90°): X = 12.5mm, Y = 18.5mm
    // Distance from hole 1 (30.708mm, 10.958mm) to hole 2: X = -18.208mm = -0.71685", Y = 7.542mm = 0.29693"
    await dro.waitForAxisPureNumberValue('X', -0.71685, 3);
    await dro.waitForAxisPureNumberValue('Y', 0.29693, 3);

    // Navigate to previous hole with key 4
    await dro.key4.click();

    // Exit bolt hole mode with Clear
    await dro.clearButton.click();

    // Should return to idle in ABS mode
    expect(await dro.isAbsMode()).toBe(true);

    // Verify final absolute position matches initial position (5mm, 3mm) plus total movement (25.708mm, 7.958mm)
    // Final position: (30.708mm, 10.958mm) = (1.20898", 0.43142")
    await dro.waitForAxisPureNumberValue('X', 1.20898, 3);
    await dro.waitForAxisPureNumberValue('Y', 0.43142, 3);
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

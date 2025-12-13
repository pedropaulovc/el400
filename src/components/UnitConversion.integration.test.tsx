import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderSimulator,
  getAxisDisplayValue,
  getInternalMemoryValue,
  enterValue,
} from '../tests/helpers/integration-test-utils';

/**
 * Integration tests for US-004: Inch/Metric Unit Conversion
 * Tests the conversion functionality between inch and mm display modes
 */
describe('Unit Conversion Integration', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.clear();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  /**
   * AC 4.4: Test conversion from inch to mm
   */
  it('should convert values from inch to mm when toggling units', async () => {
    const user = userEvent.setup();
    renderSimulator();

    // Start in inch mode, toggle to mm
    await user.click(screen.getByTestId('btn-toggle-unit'));
    expect(screen.getByTestId('led-mm').querySelector('input')).toBeChecked();

    // Select Y axis and enter 25.4 mm
    await user.click(screen.getByTestId('axis-select-y'));
    await enterValue(user, '25.4');
    
    // Verify it shows 25.4 mm
    expect(getAxisDisplayValue('Y')).toBeCloseTo(25.4, 4);

    // Toggle to inch
    await user.click(screen.getByTestId('btn-toggle-unit'));
    expect(screen.getByTestId('led-inch').querySelector('input')).toBeChecked();

    // Should now display 1.0000 inch (25.4 mm = 1 inch)
    expect(getAxisDisplayValue('Y')).toBeCloseTo(1.0000, 4);
  });

  /**
   * AC 4.4: Test conversion with negative values
   */
  it('should convert negative values correctly', async () => {
    const user = userEvent.setup();
    renderSimulator();

    // Start in inch mode (default)
    expect(screen.getByTestId('led-inch').querySelector('input')).toBeChecked();

    // Select Z axis and enter -2.0000 inch
    await user.click(screen.getByTestId('axis-select-z'));
    await user.click(screen.getByTestId('key-sign')); // Make negative first
    await enterValue(user, '2');
    
    // Verify it shows -2.0000 inch
    expect(getAxisDisplayValue('Z')).toBeCloseTo(-2.0000, 4);

    // Toggle to mm
    await user.click(screen.getByTestId('btn-toggle-unit'));
    expect(screen.getByTestId('led-mm').querySelector('input')).toBeChecked();

    // Should now display -50.8000 mm (-2 inch = -50.8 mm)
    expect(getAxisDisplayValue('Z')).toBeCloseTo(-50.8000, 4);
  });

  /**
   * AC 4.4: Test round-trip conversion accuracy
   */
  it('should maintain precision through round-trip conversion', async () => {
    const user = userEvent.setup();
    renderSimulator();

    // Start in mm mode
    await user.click(screen.getByTestId('btn-toggle-unit'));
    expect(screen.getByTestId('led-mm').querySelector('input')).toBeChecked();

    // Enter 100.0000 mm
    await user.click(screen.getByTestId('axis-select-x'));
    await enterValue(user, '100');
    
    // Verify initial value
    expect(getAxisDisplayValue('X')).toBeCloseTo(100.0000, 4);

    // Toggle to inch
    await user.click(screen.getByTestId('btn-toggle-unit'));
    expect(getAxisDisplayValue('X')).toBeCloseTo(3.937007874, 4); // 100 / 25.4

    // Toggle back to mm
    await user.click(screen.getByTestId('btn-toggle-unit'));
    expect(getAxisDisplayValue('X')).toBeCloseTo(100.0000, 4); // Should be back to 100
  });

  /**
   * AC 4.4: Test conversion with multiple axes simultaneously
   */
  it('should convert all axes when toggling units', async () => {
    const user = userEvent.setup();
    renderSimulator();

    // Start in inch mode (default)
    expect(screen.getByTestId('led-inch').querySelector('input')).toBeChecked();

    // Set different values for each axis
    await user.click(screen.getByTestId('axis-select-x'));
    await enterValue(user, '1');
    
    await user.click(screen.getByTestId('axis-select-y'));
    await enterValue(user, '2');
    
    await user.click(screen.getByTestId('axis-select-z'));
    await enterValue(user, '3');

    // Verify inch values
    expect(getAxisDisplayValue('X')).toBeCloseTo(1.0000, 4);
    expect(getAxisDisplayValue('Y')).toBeCloseTo(2.0000, 4);
    expect(getAxisDisplayValue('Z')).toBeCloseTo(3.0000, 4);

    // Toggle to mm
    await user.click(screen.getByTestId('btn-toggle-unit'));
    expect(screen.getByTestId('led-mm').querySelector('input')).toBeChecked();

    // All axes should convert
    expect(getAxisDisplayValue('X')).toBeCloseTo(25.4000, 4);
    expect(getAxisDisplayValue('Y')).toBeCloseTo(50.8000, 4);
    expect(getAxisDisplayValue('Z')).toBeCloseTo(76.2000, 4);
  });

  /**
   * Test that memory stores typed values correctly in mm regardless of display unit.
   * This verifies the conversion happens at the UI layer before storage.
   * 
   * This test directly asserts the internal memory values stored in mm,
   * not just the display values, to ensure proper unit conversion at the UI layer.
   */
  it('should store typed values in mm internally regardless of display unit', async () => {
    const user = userEvent.setup();
    renderSimulator();

    // Start in inch mode (default)
    expect(screen.getByTestId('led-inch').querySelector('input')).toBeChecked();

    // Type 2 inches on X axis
    await user.click(screen.getByTestId('axis-select-x'));
    await enterValue(user, '2');
    
    // Display shows 2.0000 in inch mode
    expect(getAxisDisplayValue('X')).toBeCloseTo(2.0000, 4);
    
    // DIRECT ASSERTION: Internal memory should store 50.8 mm (2 * 25.4)
    expect(getInternalMemoryValue('X')).toBeCloseTo(50.8000, 4);

    // Toggle to mm mode (display will change but internal storage should remain the same)
    await user.click(screen.getByTestId('btn-toggle-unit'));
    expect(screen.getByTestId('led-mm').querySelector('input')).toBeChecked();

    // Display should show 50.8 mm
    expect(getAxisDisplayValue('X')).toBeCloseTo(50.8000, 4);
    
    // DIRECT ASSERTION: Internal memory should still be 50.8 mm (unchanged)
    expect(getInternalMemoryValue('X')).toBeCloseTo(50.8000, 4);

    // Now type 254 mm on Y axis while in mm mode
    await user.click(screen.getByTestId('axis-select-y'));
    await enterValue(user, '254');
    
    // Display shows 254.0000 in mm mode
    expect(getAxisDisplayValue('Y')).toBeCloseTo(254.0000, 4);
    
    // DIRECT ASSERTION: Internal memory should store 254 mm (no conversion needed)
    expect(getInternalMemoryValue('Y')).toBeCloseTo(254.0000, 4);

    // Toggle back to inch mode
    await user.click(screen.getByTestId('btn-toggle-unit'));
    expect(screen.getByTestId('led-inch').querySelector('input')).toBeChecked();

    // X should still show 2.0000 inches
    expect(getAxisDisplayValue('X')).toBeCloseTo(2.0000, 4);
    
    // DIRECT ASSERTION: Internal memory for X should still be 50.8 mm (unchanged)
    expect(getInternalMemoryValue('X')).toBeCloseTo(50.8000, 4);

    // Y should show 10.0000 inches (254 / 25.4)
    expect(getAxisDisplayValue('Y')).toBeCloseTo(10.0000, 4);
    
    // DIRECT ASSERTION: Internal memory for Y should still be 254 mm (unchanged)
    expect(getInternalMemoryValue('Y')).toBeCloseTo(254.0000, 4);
  });
});

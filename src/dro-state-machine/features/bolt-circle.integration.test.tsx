/**
 * Integration tests for Bolt Circle (PCD) feature.
 * Tests the complete workflow with display updates.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderSimulator,
  getAxisDisplayPureTextValue,
  getAxisDisplayPureNumberValue,
} from '../../tests/helpers/integration-test-utils';

describe('Bolt Circle Integration', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.clear();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it('activates bolt circle mode from idle when in ABS mode', async () => {
    const user = userEvent.setup();
    renderSimulator();

    // Should start in ABS mode
    expect(screen.getByTestId('led-abs')).toHaveAttribute('data-is-on', 'true');

    // Click PCD button
    await user.click(screen.getByTestId('btn-bolt-circle'));

    // Should show CIRCLE menu (lowercase r to match seven-segment display)
    expect(getAxisDisplayPureTextValue('X')).toBe('CIrcLE');
  });

  it('toggles between CIRCLE and ARC modes', async () => {
    const user = userEvent.setup();
    renderSimulator();

    // Activate PCD
    await user.click(screen.getByTestId('btn-bolt-circle'));
    expect(getAxisDisplayPureTextValue('X')).toBe('CIrcLE');

    // Toggle to ARC
    await user.click(screen.getByTestId('number-6'));
    expect(getAxisDisplayPureTextValue('X')).toBe('Arc');

    // Toggle back to CIRCLE
    await user.click(screen.getByTestId('number-6'));
    expect(getAxisDisplayPureTextValue('X')).toBe('CIrcLE');
  });

  it('enters center coordinates', async () => {
    const user = userEvent.setup();
    renderSimulator();

    // Activate PCD and confirm CIRCLE mode
    await user.click(screen.getByTestId('btn-bolt-circle'));
    await user.click(screen.getByTestId('ent-button'));

    // Should prompt for center X (Cnt X)
    expect(getAxisDisplayPureTextValue('X')).toBe('Cnt  X');

    // Enter X = 1.75
    await user.click(screen.getByTestId('number-1'));
    await user.click(screen.getByTestId('number-decimal'));
    await user.click(screen.getByTestId('number-7'));
    await user.click(screen.getByTestId('number-5'));
    await user.click(screen.getByTestId('ent-button'));

    // Should prompt for center Y (Cnt Y)
    expect(getAxisDisplayPureTextValue('X')).toBe('Cnt  Y');

    // Enter Y = 1.25
    await user.click(screen.getByTestId('number-1'));
    await user.click(screen.getByTestId('number-decimal'));
    await user.click(screen.getByTestId('number-2'));
    await user.click(screen.getByTestId('number-5'));
    await user.click(screen.getByTestId('ent-button'));

    // Should advance to radius entry (we just check that we've moved on from Y entry)
    const currentDisplay = getAxisDisplayPureTextValue('X');
    expect(currentDisplay).not.toBe('Cnt  Y');
  });

  it('enters radius, angle, and hole count', async () => {
    const user = userEvent.setup();
    renderSimulator();

    // Setup: activate PCD and enter center
    await user.click(screen.getByTestId('btn-bolt-circle'));
    await user.click(screen.getByTestId('ent-button'));
    await user.click(screen.getByTestId('number-1'));
    await user.click(screen.getByTestId('number-decimal'));
    await user.click(screen.getByTestId('number-7'));
    await user.click(screen.getByTestId('number-5'));
    await user.click(screen.getByTestId('ent-button'));
    await user.click(screen.getByTestId('number-1'));
    await user.click(screen.getByTestId('number-decimal'));
    await user.click(screen.getByTestId('number-2'));
    await user.click(screen.getByTestId('number-5'));
    await user.click(screen.getByTestId('ent-button'));

    // Enter radius
    await user.click(screen.getByTestId('number-0'));
    await user.click(screen.getByTestId('number-decimal'));
    await user.click(screen.getByTestId('number-9'));
    await user.click(screen.getByTestId('number-5'));
    await user.click(screen.getByTestId('ent-button'));

    // Enter angle
    await user.click(screen.getByTestId('number-0'));
    await user.click(screen.getByTestId('ent-button'));

    // Enter hole count
    await user.click(screen.getByTestId('number-6'));
    await user.click(screen.getByTestId('ent-button'));

    // Should switch to INC mode and show distance-to-go
    expect(screen.getByTestId('led-inc')).toHaveAttribute('data-is-on', 'true');
  });

  it('navigates between holes with keys 6 and 4', async () => {
    const user = userEvent.setup();
    renderSimulator();

    // Setup: complete parameter entry with simple values
    await user.click(screen.getByTestId('btn-bolt-circle'));
    await user.click(screen.getByTestId('ent-button'));
    await user.click(screen.getByTestId('number-0'));
    await user.click(screen.getByTestId('ent-button'));
    await user.click(screen.getByTestId('number-0'));
    await user.click(screen.getByTestId('ent-button'));
    await user.click(screen.getByTestId('number-1'));
    await user.click(screen.getByTestId('ent-button'));
    await user.click(screen.getByTestId('number-0'));
    await user.click(screen.getByTestId('ent-button'));
    await user.click(screen.getByTestId('number-4'));
    await user.click(screen.getByTestId('ent-button'));

    // Should be in navigate mode
    expect(screen.getByTestId('led-inc')).toHaveAttribute('data-is-on', 'true');

    // Get initial X value (hole 1)
    const hole1X = getAxisDisplayPureNumberValue('X');

    // Press 6 to advance to next hole
    await user.click(screen.getByTestId('number-6'));
    
    // X value should change (hole 2 is at different position)
    const hole2X = getAxisDisplayPureNumberValue('X');
    expect(hole2X).not.toBe(hole1X);

    // Press 4 to go back to previous hole
    await user.click(screen.getByTestId('number-4'));
    
    // Should be back at hole 1 with original X value
    const backToHole1X = getAxisDisplayPureNumberValue('X');
    expect(backToHole1X).toBeCloseTo(hole1X, 3);
  });

  it('jumps to specific hole with key 2', async () => {
    const user = userEvent.setup();
    renderSimulator();

    // Setup: complete parameter entry
    await user.click(screen.getByTestId('btn-bolt-circle'));
    await user.click(screen.getByTestId('ent-button'));
    await user.click(screen.getByTestId('number-0'));
    await user.click(screen.getByTestId('ent-button'));
    await user.click(screen.getByTestId('number-0'));
    await user.click(screen.getByTestId('ent-button'));
    await user.click(screen.getByTestId('number-1'));
    await user.click(screen.getByTestId('ent-button'));
    await user.click(screen.getByTestId('number-0'));
    await user.click(screen.getByTestId('ent-button'));
    await user.click(screen.getByTestId('number-6'));
    await user.click(screen.getByTestId('ent-button'));

    // Press 2 to start hole jump
    await user.click(screen.getByTestId('number-2'));

    // Enter hole number 4
    await user.click(screen.getByTestId('number-4'));
    await user.click(screen.getByTestId('ent-button'));

    // Should now be at hole 4 (position will be different from hole 1)
    // We just verify that the operation completed without error
    expect(screen.getByTestId('led-inc')).toHaveAttribute('data-is-on', 'true');
  });

  it('exits macro with C key', async () => {
    const user = userEvent.setup();
    renderSimulator();

    // Activate PCD
    await user.click(screen.getByTestId('btn-bolt-circle'));
    expect(getAxisDisplayPureTextValue('X')).toBe('CIrcLE');

    // Press C to clear/exit
    await user.click(screen.getByTestId('clear-button'));

    // Should return to idle in ABS mode
    expect(screen.getByTestId('led-abs')).toHaveAttribute('data-is-on', 'true');
    // Display should show normal position (not menu text)
    expect(getAxisDisplayPureTextValue('X')).not.toBe('CIrcLE');
  });

  it('can exit at any point during parameter entry', async () => {
    const user = userEvent.setup();
    renderSimulator();

    // Activate PCD and start entering parameters
    await user.click(screen.getByTestId('btn-bolt-circle'));
    await user.click(screen.getByTestId('ent-button'));
    await user.click(screen.getByTestId('number-1'));
    await user.click(screen.getByTestId('number-decimal'));
    await user.click(screen.getByTestId('number-7'));
    await user.click(screen.getByTestId('number-5'));
    await user.click(screen.getByTestId('ent-button'));

    // Exit during Y entry
    await user.click(screen.getByTestId('clear-button'));

    // Should return to idle
    expect(screen.getByTestId('led-abs')).toHaveAttribute('data-is-on', 'true');
  });

  it('rejects invalid parameter values', async () => {
    const user = userEvent.setup();
    renderSimulator();

    // Setup
    await user.click(screen.getByTestId('btn-bolt-circle'));
    await user.click(screen.getByTestId('ent-button'));
    await user.click(screen.getByTestId('number-0'));
    await user.click(screen.getByTestId('ent-button'));
    await user.click(screen.getByTestId('number-0'));
    await user.click(screen.getByTestId('ent-button'));

    // Should be prompting for radius - get initial state
    const beforeRadiusEntry = getAxisDisplayPureTextValue('X');
    
    // Try to enter zero radius (should be rejected)
    await user.click(screen.getByTestId('number-0'));
    await user.click(screen.getByTestId('ent-button'));

    // Should still be in radius entry state (not advanced)
    const afterRadiusEntry = getAxisDisplayPureTextValue('X');
    expect(afterRadiusEntry).toBe(beforeRadiusEntry);
  });

  it('calculates correct positions for holes around circle', async () => {
    const user = userEvent.setup();
    renderSimulator();

    // Setup: 4 holes at 90° spacing, radius 1, center at origin
    await user.click(screen.getByTestId('btn-bolt-circle'));
    await user.click(screen.getByTestId('ent-button'));
    await user.click(screen.getByTestId('number-0'));
    await user.click(screen.getByTestId('ent-button'));
    await user.click(screen.getByTestId('number-0'));
    await user.click(screen.getByTestId('ent-button'));
    await user.click(screen.getByTestId('number-1'));
    await user.click(screen.getByTestId('ent-button'));
    await user.click(screen.getByTestId('number-0'));
    await user.click(screen.getByTestId('ent-button'));
    await user.click(screen.getByTestId('number-4'));
    await user.click(screen.getByTestId('ent-button'));

    // Should be in navigate mode showing distance to hole 1
    expect(screen.getByTestId('led-inc')).toHaveAttribute('data-is-on', 'true');

    // Hole 1: 0° = (1, 0) - should show distance from current position (0, 0)
    // X should show +1.0000, Y should show 0.0000
    const xValue = getAxisDisplayPureNumberValue('X');
    const yValue = getAxisDisplayPureNumberValue('Y');

    // Check that X is approximately 1 and Y is approximately 0
    expect(xValue).toBeCloseTo(1.0, 3);
    expect(yValue).toBeCloseTo(0.0, 3);
  });

  it('does not activate when in INC mode', async () => {
    const user = userEvent.setup();
    renderSimulator();

    // Switch to INC mode
    await user.click(screen.getByTestId('btn-abs-inc'));
    expect(screen.getByTestId('led-inc')).toHaveAttribute('data-is-on', 'true');

    // Try to activate PCD
    await user.click(screen.getByTestId('btn-bolt-circle'));

    // Should remain in idle, not show PCD menu
    expect(getAxisDisplayPureTextValue('X')).not.toBe('CIrcLE');
  });
});

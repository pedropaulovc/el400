import { test, expect } from '../helpers/fixtures';

/**
 * E2E Tests: US-007 Center Finding (Circle and Line)
 *
 * Tests manual center finding for circles and lines using probing points.
 * The function is accessed via the Fn key, which displays "CEntrE" menu.
 *
 * @see project/user-stories/02-core-operations/US-007-center-finding.md
 */
test.describe('US-007: Center Finding', () => {
  /**
   * AC 7.3: Center of Line
   * - Press Fn key to access function menu (display shows "CEntrE")
   * - Press ENT to select CENTRE
   * - Select "LinE" (navigate using Right key)
   * - Press ENT to confirm
   * - Move to Point 1, press Right (6►) to store
   * - Move to Point 2, press Right (6►) to store
   * - Display shows "Distance-to-go" to the center
   */
  test('Center of Line', async ({ dro }) => {
    // Press Fn key to access function menu
    await dro.functionButton.click();
    
    // Verify display shows "CEntrE"
    await expect(dro.xDisplay).toContainText('CEntrE');
    
    // Press ENT to select CENTRE (which selects LinE by default)
    await dro.enterButton.click();
    
    // Verify display shows "LinE" (first option)
    await expect(dro.xDisplay).toContainText('LinE');
    
    // Press ENT to confirm LinE selection
    await dro.enterButton.click();
    
    // Point 1 at 0
    await dro.simulateEncoderMove('X', 0);
    await dro.waitForAxisValue('X', 0, 1);
    
    // Store Point 1 using key 6 (Right/Store)
    await dro.storePoint();
    
    // Point 2 at 100mm
    await dro.simulateEncoderMove('X', 100);
    await dro.waitForAxisValue('X', 100, 1);
    
    // Store Point 2
    await dro.storePoint();
    
    // Center should be at 50mm. Distance to go from 100mm is -50mm
    // In inch display mode: 100mm = ~3.937 inches, center = ~1.9685 inches
    // Distance to go: -50mm = ~-1.9685 inches
    await dro.waitForAxisValue('X', -1.9685, 1);
  });

  /**
   * AC 7.2: Center of Circle
   * - Press Fn key to access function menu
   * - Press ENT to select CENTRE
   * - Select "CirCLE" (navigate using Right key)
   * - Press ENT to confirm
   * - Move to Point 1, press Right (6►) to store
   * - Move to Point 2, press Right (6►) to store
   * - Move to Point 3, press Right (6►) to store
   * - Display shows "Distance-to-go" to the center
   */
  test('Center of Circle', async ({ dro }) => {
    // Press Fn key to access function menu
    await dro.functionButton.click();
    
    // Verify display shows "CEntrE"
    await expect(dro.xDisplay).toContainText('CEntrE');
    
    // Navigate to "CirCLE" option (press key 6 for Right)
    await dro.storePoint(); // Key 6 navigates in menu mode
    
    // Verify display shows "CirCLE"
    await expect(dro.xDisplay).toContainText('CirCLE');
    
    // Press ENT to confirm
    await dro.enterButton.click();
    
    // Point 1: (10, 0, 0) - Right side of circle with radius 10
    await dro.simulateEncoderMove('X', 10);
    await dro.simulateEncoderMove('Y', 0);
    await dro.simulateEncoderMove('Z', 0);
    
    // Store Point 1
    await dro.storePoint();
    
    // Point 2: (0, 10, 0) - Top of circle
    await dro.simulateEncoderMove('X', 0);
    await dro.simulateEncoderMove('Y', 10);
    
    // Store Point 2
    await dro.storePoint();
    
    // Point 3: (-10, 0, 0) - Left side of circle
    await dro.simulateEncoderMove('X', -10);
    await dro.simulateEncoderMove('Y', 0);
    
    // Store Point 3
    await dro.storePoint();
    
    // Circle center should be at (0, 0, 0)
    // Distance to go from Point 3 (-10, 0, 0) to center (0, 0, 0) is (10, -10, 0)
    // In inch mode: 10mm = ~0.3937 inches, -10mm = ~-0.3937 inches
    await dro.waitForAxisValue('X', 0.3937, 1);
    await dro.waitForAxisValue('Y', -0.3937, 1);
  });

  /**
   * AC 7.4: The Fn LED glows while in this function
   * 
   * Note: This test verifies that when the function menu is active,
   * the Fn LED indicator is lit. This requires:
   * 1. An LED indicator for Fn mode
   * 2. State management to track when function mode is active
   */
  test('Fn LED indicator glows during center finding', async ({ dro }) => {
    // Verify Fn LED is off initially
    expect(await dro.isFnModeActive()).toBe(false);
    
    // Press Fn key to activate function menu
    await dro.functionButton.click();
    
    // Verify Fn LED is on
    expect(await dro.isFnModeActive()).toBe(true);
    
    // Press ENT to select LinE
    await dro.enterButton.click();
    
    // Fn LED should remain on during function execution
    expect(await dro.isFnModeActive()).toBe(true);
    
    // Press ENT to confirm LinE
    await dro.enterButton.click();
    
    // Fn LED should still be on
    expect(await dro.isFnModeActive()).toBe(true);
  });

  /**
   * Test canceling center finding mode
   */
  test('should allow canceling center finding mode', async ({ dro }) => {
    // Press Fn key
    await dro.functionButton.click();
    await expect(dro.xDisplay).toContainText('CEntrE');
    
    // Verify Fn LED is on
    expect(await dro.isFnModeActive()).toBe(true);
    
    // Press C to cancel
    await dro.clearButton.click();
    
    // Display should return to normal position display
    await dro.waitForAxisValue('X', 0, 1);
    
    // Fn LED should be off
    expect(await dro.isFnModeActive()).toBe(false);
  });
});

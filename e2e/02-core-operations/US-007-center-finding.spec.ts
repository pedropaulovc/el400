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
    // Note: This test will fail until center finding is implemented
    // The display should show "CEntrE" on the X axis display area
    await expect(dro.xDisplay).toContainText('CEntrE');
    
    // Press ENT to select CENTRE
    await dro.enterButton.click();
    
    // Verify display shows "LinE" (first option)
    await expect(dro.xDisplay).toContainText('LinE');
    
    // LinE is already selected, press ENT to confirm
    await dro.enterButton.click();
    
    // Point 1 at 0
    await dro.simulateEncoderMove('X', 0);
    await dro.waitForAxisValue('X', 0, 1);
    
    // Press Right (6►) to store Point 1
    // Note: In the user story, this is the 6► key which stores the point
    // We need to add this functionality to DROPage
    await dro.page.keyboard.press('ArrowRight'); // Temporary placeholder
    
    // Point 2 at 100mm
    await dro.simulateEncoderMove('X', 100);
    await dro.waitForAxisValue('X', 100, 1);
    
    // Press Right (6►) to store Point 2
    await dro.page.keyboard.press('ArrowRight'); // Temporary placeholder
    
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
    
    // Press ENT to select CENTRE
    await dro.enterButton.click();
    
    // Navigate to "CirCLE" option (press Right)
    // Note: Temporary placeholder - will need proper navigation method when implemented
    await dro.page.keyboard.press('ArrowRight');
    
    // Verify display shows "CirCLE"
    await expect(dro.xDisplay).toContainText('CirCLE');
    
    // Press ENT to confirm
    await dro.enterButton.click();
    
    // Point 1: (10, 0, 0) - Right side of circle with radius 10
    await dro.simulateEncoderMove('X', 10);
    await dro.simulateEncoderMove('Y', 0);
    await dro.simulateEncoderMove('Z', 0);
    
    // Store Point 1
    // Note: Temporary placeholder - will need proper storePoint method when implemented
    await dro.page.keyboard.press('ArrowRight');
    
    // Point 2: (0, 10, 0) - Top of circle
    await dro.simulateEncoderMove('X', 0);
    await dro.simulateEncoderMove('Y', 10);
    
    // Store Point 2
    // Note: Temporary placeholder - will need proper storePoint method when implemented
    await dro.page.keyboard.press('ArrowRight');
    
    // Point 3: (-10, 0, 0) - Left side of circle
    await dro.simulateEncoderMove('X', -10);
    await dro.simulateEncoderMove('Y', 0);
    
    // Store Point 3
    // Note: Temporary placeholder - will need proper storePoint method when implemented
    await dro.page.keyboard.press('ArrowRight');
    
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
  test.skip('Fn LED indicator glows during center finding', async ({ dro }) => {
    // This test is skipped until LED indicator is implemented
    
    // Verify Fn LED is off initially
    // await expect(dro.fnLED).not.toHaveClass('text-red-400');
    
    // Press Fn key to activate function menu
    await dro.functionButton.click();
    
    // Verify Fn LED is on
    // await expect(dro.fnLED).toHaveClass('text-red-400');
    
    // Press ENT and select a function
    await dro.enterButton.click();
    await dro.enterButton.click();
    
    // Fn LED should remain on during function execution
    // await expect(dro.fnLED).toHaveClass('text-red-400');
  });

  /**
   * Test canceling center finding mode
   */
  test.skip('should allow canceling center finding mode', async ({ dro }) => {
    // Press Fn key
    await dro.functionButton.click();
    await expect(dro.xDisplay).toContainText('CEntrE');
    
    // Press C to cancel
    await dro.clearButton.click();
    
    // Display should return to normal position display
    await dro.waitForAxisValue('X', 0, 1);
  });
});

import { test, expect } from '../helpers/fixtures';

/**
 * E2E Tests: US-007 Center Finding (Circle and Line)
 *
 * Tests the center finding functionality for both circles and lines,
 * including function menu navigation, point storage, and distance-to-go display.
 *
 * @see project/user-stories/02-core-operations/US-007-center-finding.md
 */
test.describe('US-007: Center Finding', () => {
  /**
   * AC 7.1: Press f^n key to access function menu, display shows "CEntrE", press ent↵.
   * AC 7.4: The Fn LED glows while in this function.
   */
  test('should enter function menu and show CEntrE', async ({ dro }) => {
    // Press function key
    await dro.functionButton.click();

    // Fn LED should be on
    await expect(await dro.isFnActive()).toBe(true);

    // X display should show "CEntrE"
    const xText = await dro.getAxisText('X');
    expect(xText).toContain('CEntrE');
  });

  /**
   * AC 7.3: For Center of Line - Select LinE, move to points, store, display distance-to-go
   */
  test('should find center of line', async ({ dro }) => {
    // Enter function menu
    await dro.functionButton.click();
    await expect(await dro.isFnActive()).toBe(true);

    // Select CEntrE
    let xText = await dro.getAxisText('X');
    expect(xText).toContain('CEntrE');
    await dro.enterButton.click();

    // Should show LinE by default
    xText = await dro.getAxisText('X');
    expect(xText).toContain('LinE');

    // Confirm LinE selection
    await dro.enterButton.click();

    // Set Point 1 at X=0
    await dro.selectAxis('X');
    await dro.enterNumber('0');
    await dro.enterButton.click();

    // Store Point 1 (press any zero button, e.g., X0)
    await dro.x0Button.click();

    // Set Point 2 at X=100
    await dro.selectAxis('X');
    await dro.enterNumber('100');
    await dro.enterButton.click();

    // Store Point 2
    await dro.x0Button.click();

    // Center should be at X=50
    // Current position is 100, so distance to go is -50
    const xValue = await dro.getAxisValue('X');
    expect(xValue).toBeCloseTo(-50, 1);

    // Fn LED should still be on
    await expect(await dro.isFnActive()).toBe(true);
  });

  /**
   * AC 7.3: Center of Line with Y and Z axes
   */
  test('should find center of line on Y axis', async ({ dro }) => {
    // Enter function menu and select Center of Line
    await dro.functionButton.click();
    await dro.enterButton.click(); // Select CEntrE
    await dro.enterButton.click(); // Select LinE

    // Set Point 1 at Y=10
    await dro.selectAxis('Y');
    await dro.enterNumber('10');
    await dro.enterButton.click();
    await dro.y0Button.click();

    // Set Point 2 at Y=30
    await dro.selectAxis('Y');
    await dro.enterNumber('30');
    await dro.enterButton.click();
    await dro.y0Button.click();

    // Center should be at Y=20
    // Current position is 30, so distance to go is -10
    const yValue = await dro.getAxisValue('Y');
    expect(yValue).toBeCloseTo(-10, 1);
  });

  /**
   * AC 7.2: For Center of Circle - Select CirCLE, store 3 points, display distance-to-go
   */
  test('should find center of circle', async ({ dro }) => {
    // Enter function menu
    await dro.functionButton.click();
    await dro.enterButton.click(); // Select CEntrE

    // Navigate to CirCLE (press a zero button to navigate)
    await dro.x0Button.click();
    
    // Should now show CirCLE
    const xText = await dro.getAxisText('X');
    expect(xText).toContain('CirCLE');

    // Confirm CirCLE selection
    await dro.enterButton.click();

    // Set Point 1 at (100, 0)
    await dro.selectAxis('X');
    await dro.enterNumber('100');
    await dro.enterButton.click();
    await dro.selectAxis('Y');
    await dro.enterNumber('0');
    await dro.enterButton.click();
    await dro.x0Button.click(); // Store Point 1

    // Set Point 2 at (0, 100)
    await dro.selectAxis('X');
    await dro.enterNumber('0');
    await dro.enterButton.click();
    await dro.selectAxis('Y');
    await dro.enterNumber('100');
    await dro.enterButton.click();
    await dro.x0Button.click(); // Store Point 2

    // Set Point 3 at (-100, 0)
    await dro.selectAxis('X');
    await dro.enterNumber('-100');
    await dro.enterButton.click();
    await dro.selectAxis('Y');
    await dro.enterNumber('0');
    await dro.enterButton.click();
    await dro.x0Button.click(); // Store Point 3

    // Center should be at (0, 0)
    // Current position is (-100, 0), so distance to go is (100, 0)
    const xValue = await dro.getAxisValue('X');
    const yValue = await dro.getAxisValue('Y');
    expect(xValue).toBeCloseTo(100, 1);
    expect(yValue).toBeCloseTo(0, 1);

    // Fn LED should still be on
    await expect(await dro.isFnActive()).toBe(true);
  });

  /**
   * Test exiting function mode
   */
  test('should exit function mode when pressing Fn button again', async ({ dro }) => {
    // Enter function menu
    await dro.functionButton.click();
    await expect(await dro.isFnActive()).toBe(true);

    // Exit function mode
    await dro.functionButton.click();
    await expect(await dro.isFnActive()).toBe(false);

    // Display should show numeric values again
    const xValue = await dro.getAxisValue('X');
    expect(typeof xValue).toBe('number');
  });

  /**
   * Test that center finding works with negative coordinates
   */
  test('should handle negative coordinates in center of line', async ({ dro }) => {
    // Enter function menu and select Center of Line
    await dro.functionButton.click();
    await dro.enterButton.click();
    await dro.enterButton.click();

    // Set Point 1 at X=-50
    await dro.selectAxis('X');
    await dro.enterNumber('-50');
    await dro.enterButton.click();
    await dro.x0Button.click();

    // Set Point 2 at X=50
    await dro.selectAxis('X');
    await dro.enterNumber('50');
    await dro.enterButton.click();
    await dro.x0Button.click();

    // Center should be at X=0
    // Current position is 50, so distance to go is -50
    const xValue = await dro.getAxisValue('X');
    expect(xValue).toBeCloseTo(-50, 1);
  });
});

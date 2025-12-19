import { test, expect } from '../helpers/fixtures';

/**
 * E2E Tests: US-020 Grid Drilling Pattern
 *
 * Minimal E2E tests covering critical grid drilling functionality.
 * Additional coverage provided by integration tests.
 *
 * @see project/user-stories/05-pattern-generation/US-020-grid-drilling.md
 */
test.describe('US-020: Grid Drilling Pattern', () => {
  /**
   * AC20.1: Press Grid key
   * AC20.2: Enter X coordinate of first hole (ENTCNT 0)
   * AC20.3: Enter Y coordinate of first hole (ENTCNT 1)
   * AC20.4: Enter PITCH X (spacing in X direction)
   * AC20.5: Enter PITCH Y (spacing in Y direction)
   * AC20.6: Enter ANGLE (grid rotation, 0-359 degrees)
   * AC20.7: Enter HOLES X (number of holes in X direction)
   * AC20.8: Enter HOLES Y (number of holes in Y direction)
   * AC20.9: Total holes = HOLES X × HOLES Y
   */
  test('complete grid drilling workflow with 3x3 grid', async ({ dro }) => {
    // AC20.1: Activate grid drilling mode
    await dro.page.click('[data-testid="btn-grid-hole"]');

    // Verify grid drilling activated - X display should show "EntCnt 0" prompt
    await expect(dro.xDisplay).toContainText('EntCnt 0');

    // AC20.2: Enter X = 0.5
    await dro.enterNumber('0.5');
    await dro.enterButton.click();

    // AC20.3: Enter Y = 0.25
    await expect(dro.xDisplay).toContainText('EntCnt 1');
    await dro.enterNumber('0.25');
    await dro.enterButton.click();

    // AC20.4: Enter PITCH X = 0.35
    await expect(dro.xDisplay).toContainText('PItCH X');
    await dro.enterNumber('0.35');
    await dro.enterButton.click();

    // AC20.5: Enter PITCH Y = 0.35
    await expect(dro.xDisplay).toContainText('PItCH Y');
    await dro.enterNumber('0.35');
    await dro.enterButton.click();

    // AC20.6: Enter ANGLE = 0 degrees (axis-aligned grid)
    await expect(dro.xDisplay).toContainText('AngLE');
    await dro.enterNumber('0');
    await dro.enterButton.click();

    // AC20.7: Enter HOLES X = 3
    await expect(dro.xDisplay).toContainText('HoLES X');
    await dro.enterNumber('3');
    await dro.enterButton.click();

    // AC20.8: Enter HOLES Y = 3
    await expect(dro.xDisplay).toContainText('HoLES Y');
    await dro.enterNumber('3');
    await dro.enterButton.click();

    // AC20.9: Grid should be calculated (3×3 = 9 holes)
    // Verify we're in navigate mode showing hole 1/9
    await expect(dro.xDisplay).toContainText('HoLE 1/9');
  });

  /**
   * AC20.10: Grid can be rotated by ANGLE parameter
   * AC20.12: 0° angle creates axis-aligned grid
   */
  test('create rotated grid at 45 degrees', async ({ dro }) => {
    // Activate grid drilling
    await dro.page.click('[data-testid="btn-grid-hole"]');

    // Enter start position (0, 0)
    await dro.enterNumber('0');
    await dro.enterButton.click();
    await dro.enterNumber('0');
    await dro.enterButton.click();

    // Enter equal pitches (1, 1)
    await dro.enterNumber('1');
    await dro.enterButton.click();
    await dro.enterNumber('1');
    await dro.enterButton.click();

    // Enter 45 degree angle
    await dro.enterNumber('45');
    await dro.enterButton.click();

    // Create 2x2 grid
    await dro.enterNumber('2');
    await dro.enterButton.click();
    await dro.enterNumber('2');
    await dro.enterButton.click();

    // Verify navigation mode with 4 total holes
    await expect(dro.xDisplay).toContainText('HoLE 1/4');
  });

  /**
   * Test navigation between holes using arrow keys
   */
  test('navigate between holes with arrow keys', async ({ dro }) => {
    // Set up a 2x2 grid
    await dro.page.click('[data-testid="btn-grid-hole"]');
    
    // Quick setup: all zeros except 2 holes in each direction
    await dro.enterNumber('0');
    await dro.enterButton.click();
    await dro.enterNumber('0');
    await dro.enterButton.click();
    await dro.enterNumber('1');
    await dro.enterButton.click();
    await dro.enterNumber('1');
    await dro.enterButton.click();
    await dro.enterNumber('0');
    await dro.enterButton.click();
    await dro.enterNumber('2');
    await dro.enterButton.click();
    await dro.enterNumber('2');
    await dro.enterButton.click();

    // Should start at hole 1
    await expect(dro.xDisplay).toContainText('HoLE 1/4');

    // Press right arrow (KEY_6_RIGHT) to go to next hole
    await dro.key6.click();
    await expect(dro.xDisplay).toContainText('HoLE 2/4');

    // Press right arrow again
    await dro.key6.click();
    await expect(dro.xDisplay).toContainText('HoLE 3/4');

    // Press left arrow (KEY_4_LEFT) to go back
    await dro.key4.click();
    await expect(dro.xDisplay).toContainText('HoLE 2/4');
  });

  /**
   * Test canceling grid drilling with CLEAR key
   */
  test('cancel grid drilling with CLEAR key', async ({ dro }) => {
    // Activate grid drilling
    await dro.page.click('[data-testid="btn-grid-hole"]');
    await expect(dro.xDisplay).toContainText('EntCnt 0');

    // Press CLEAR to cancel
    await dro.clearButton.click();

    // Should return to idle mode showing normal axis values
    const xValue = await dro.getAxisValue('X');
    expect(typeof xValue).toBe('number');
  });
});

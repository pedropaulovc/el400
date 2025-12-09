# US-018: Arc Contouring (Step Drilling)

**Priority:** P4
**Category:** Pattern Generation
**Manual Reference:** ARC CONTOURING (lines 344-362)

## User Story

**As a** machine operator
**I want** to drill overlapping holes along an arc path
**So that** I can cut smooth curved edges

## Acceptance Criteria

- [ ] AC18.1: Press Arc Contour key
- [ ] AC18.2: Enter X coordinate of center
- [ ] AC18.3: Enter Y coordinate of center
- [ ] AC18.4: Enter RADIUS
- [ ] AC18.5: Enter radial ANGLE of first point
- [ ] AC18.6: Enter radial ANGLE of last point
- [ ] AC18.7: Enter TOOL DIAMETER
- [ ] AC18.8: Toggle 6 key to select cut type: INT CUT, EXT CUT, or MID CUT
- [ ] AC18.9: Enter MAX CUT (maximum step distance, e.g., 0.1)
- [ ] AC18.10: System calculates number of steps based on arc length and max cut
- [ ] AC18.11: INT CUT offsets path inside radius by tool radius
- [ ] AC18.12: EXT CUT offsets path outside radius by tool radius
- [ ] AC18.13: MID CUT centers tool on radius
- [ ] AC18.14: Manual warns to do dry run before cutting

## E2E Test Scenarios

```typescript
describe('US-018: Arc Contouring (Step Drilling)', () => {
  test('activate arc contouring mode', async ({ page }) => {
    await page.goto('/');

    // Press Arc Contour key
    await page.click('[data-testid="arc-contour-button"]');

    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('ARC'); // or similar
  });

  test('enter arc parameters', async ({ page }) => {
    await page.goto('/');

    // Activate arc contouring
    // ... setup ...

    // Enter center X = 1.500
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('ENTCNT 0');
    await page.evaluate(() => window.enterValue('1.500'));
    await page.click('[data-testid="ent-button"]');

    // Enter center Y = 1.200
    await page.evaluate(() => window.enterValue('1.200'));
    await page.click('[data-testid="ent-button"]');

    // Enter radius = 0.850
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('RADIUS');
    await page.evaluate(() => window.enterValue('0.850'));
    await page.click('[data-testid="ent-button"]');

    // Enter start angle = 30
    await page.evaluate(() => window.enterValue('30'));
    await page.click('[data-testid="ent-button"]');

    // Enter end angle = 120
    await page.evaluate(() => window.enterValue('120'));
    await page.click('[data-testid="ent-button"]');
  });

  test('enter tool diameter', async ({ page }) => {
    await page.goto('/');

    // After arc parameters
    // ... setup ...

    // Enter tool diameter = 0.1875 (3/16")
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('TOOL');
    await page.evaluate(() => window.enterValue('0.1875'));
    await page.click('[data-testid="ent-button"]');
  });

  test('select INT CUT offset', async ({ page }) => {
    await page.goto('/');

    // After tool diameter
    // ... setup ...

    // Toggle 6 key to INT CUT
    await page.click('[data-testid="6-key"]');
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('INT CUT');

    await page.click('[data-testid="ent-button"]');
  });

  test('select EXT CUT offset', async ({ page }) => {
    await page.goto('/');

    // After tool diameter
    // ... setup ...

    // Toggle to EXT CUT
    await page.click('[data-testid="6-key"]');
    await page.click('[data-testid="6-key"]');
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('EXT CUT');

    await page.click('[data-testid="ent-button"]');
  });

  test('select MID CUT centered', async ({ page }) => {
    await page.goto('/');

    // After tool diameter
    // ... setup ...

    // Toggle to MID CUT
    await page.click('[data-testid="6-key"]');
    await page.click('[data-testid="6-key"]');
    await page.click('[data-testid="6-key"]');
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('MID CUT');

    await page.click('[data-testid="ent-button"]');
  });

  test('system calculates step count', async ({ page }) => {
    await page.goto('/');

    // Setup: Arc from 30° to 120° (90° arc), radius 0.850
    // Arc length = radius × angle_radians = 0.850 × (90° × π/180) = 1.334"
    // Tool diameter = 0.1875", MAX CUT = 0.1"
    // Number of steps = ceil(1.334 / 0.1) = 14 steps

    // ... setup arc contouring ...

    // Enter MAX CUT = 0.1
    await expect(page.locator('[data-testid="prompt-display"]')).toContainText('MAX CUT');
    await page.evaluate(() => window.enterValue('0.1'));
    await page.click('[data-testid="ent-button"]');

    // System should calculate ~14 points
    // Verify by navigating through all points
  });

  test('max cut spacing respected', async ({ page }) => {
    await page.goto('/');

    // Setup with MAX CUT = 0.05
    // ... setup ...

    // Verify distance between consecutive points ≤ 0.05
    // Navigate to point 1, record position
    // Navigate to point 2, calculate distance
    // Distance should be ≤ MAX CUT
  });

  test('navigate through calculated points', async ({ page }) => {
    await page.goto('/');

    // In arc contouring mode
    // ... setup ...

    // Navigate to point 1
    await expect(page.locator('[data-testid="point-number"]')).toContainText('1');

    // Advance with 6 key
    await page.click('[data-testid="6-key"]');
    await expect(page.locator('[data-testid="point-number"]')).toContainText('2');

    // Continue through all points
    // ... keep pressing 6 ...
  });
});
```

## Implementation Notes

- **Purpose**: Create smooth arc by drilling overlapping holes
- **Cut types**:
  - **INT CUT**: Tool center offset inside by tool_radius
    - Actual radius = specified_radius - tool_radius
  - **EXT CUT**: Tool center offset outside by tool_radius
    - Actual radius = specified_radius + tool_radius
  - **MID CUT**: Tool center exactly on specified radius
- **Step calculation**:
  1. Calculate arc length: L = radius × angle_radians
  2. Number of steps: N = ceil(L / MAX_CUT)
  3. Actual step: arc_span / N
  4. Generate N+1 points along arc
- **Safety warning**: Manual recommends dry run with marker before cutting
- **Overlapping holes**: Creates smooth contour when tool diameter and MAX CUT chosen correctly
- **Use cases**: Custom slots, curved edges, decorative arcs

## Related Stories

- US-016: Bolt Circle Full (similar parameter entry)
- US-017: Bolt Circle Arc (similar arc definition)
- US-014: Trigonometric Functions (arc length calculations)

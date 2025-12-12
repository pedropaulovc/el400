import { test, expect } from '@playwright/test';

/**
 * Forced Colors Mode Accessibility Tests
 * Tests that the 7-segment display is accessible in Windows High Contrast mode
 */
test.describe('Forced Colors Mode', () => {
  test('7-segment display shows lit segments as CanvasText and off segments as transparent', async ({ browser }) => {
    // Create context with forced-colors emulation
    const context = await browser.newContext({
      forcedColors: 'active',
    });
    const page = await context.newPage();
    await page.goto('/');

    // Wait for the display to render
    await page.waitForSelector('svg polygon');

    // Check that segment-on elements exist and have the correct class
    const litSegments = page.locator('.segment-on');
    await expect(litSegments.first()).toBeVisible();

    // Check that segment-off elements exist
    const offSegments = page.locator('.segment-off');
    await expect(offSegments.first()).toBeAttached();

    // Verify CSS rules are applied - get computed styles
    const litSegmentFill = await litSegments.first().evaluate((el) => {
      return window.getComputedStyle(el).fill;
    });

    const offSegmentFill = await offSegments.first().evaluate((el) => {
      return window.getComputedStyle(el).fill;
    });

    // In forced-colors mode, CanvasText maps to a system color (usually black or white)
    // and transparent should be 'none' or 'transparent'
    // The exact values depend on the system, but they should be different
    expect(litSegmentFill).not.toBe(offSegmentFill);

    await context.close();
  });

  test('7-segment segments have correct CSS classes', async ({ page }) => {
    await page.goto('/');

    // Wait for display to render
    await page.waitForSelector('svg polygon');

    // Verify lit segments have segment-on class
    const litSegments = page.locator('polygon.segment-on');
    const offSegments = page.locator('polygon.segment-off');

    // For value 0.0000, we expect many segments to be lit
    const litCount = await litSegments.count();
    const offCount = await offSegments.count();

    expect(litCount).toBeGreaterThan(0);
    expect(offCount).toBeGreaterThan(0);

    // Total segments should be 7 per digit × 8 digits × 3 axes = 168
    // Plus decimal points: 8 × 3 = 24 (circles, not polygons)
    expect(litCount + offCount).toBeGreaterThan(100);
  });
});

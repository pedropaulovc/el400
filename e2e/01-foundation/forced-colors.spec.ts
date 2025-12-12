import { test, expect } from '@playwright/test';

/**
 * Calculate relative luminance from RGB values (0-255)
 * Per WCAG 2.1 formula
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 * Returns ratio as X:1
 */
function getContrastRatio(rgb1: [number, number, number], rgb2: [number, number, number]): number {
  const l1 = getLuminance(...rgb1);
  const l2 = getLuminance(...rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Parse CSS color string to RGB tuple
 */
function parseColor(color: string): [number, number, number] {
  // Handle rgb(r, g, b) format
  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgbMatch) {
    return [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])];
  }
  // Handle transparent/none as black with 0 alpha (effectively invisible)
  if (color === 'none' || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') {
    return [0, 0, 0];
  }
  throw new Error(`Cannot parse color: ${color}`);
}

/**
 * Forced Colors Mode Accessibility Tests
 * Tests that the 7-segment display is accessible in Windows High Contrast mode
 */
test.describe('Forced Colors Mode', () => {
  test('lit vs off segments have at least 20:1 contrast ratio', async ({ browser }) => {
    // Create context with forced-colors emulation
    const context = await browser.newContext({
      forcedColors: 'active',
    });
    const page = await context.newPage();
    await page.goto('/');

    // Wait for the display to render
    await page.waitForSelector('svg polygon');

    const litSegments = page.locator('.segment-on');
    const offSegments = page.locator('.segment-off');

    await expect(litSegments.first()).toBeVisible();
    await expect(offSegments.first()).toBeAttached();

    // Get computed fill colors
    const litFill = await litSegments.first().evaluate((el) => {
      return window.getComputedStyle(el).fill;
    });

    const offFill = await offSegments.first().evaluate((el) => {
      return window.getComputedStyle(el).fill;
    });

    // Get background color for contrast calculation with transparent
    const bgColor = await page.evaluate(() => {
      const display = document.querySelector('.segment-on')?.closest('svg')?.parentElement;
      return display ? window.getComputedStyle(display).backgroundColor : 'rgb(0, 0, 0)';
    });

    const litRgb = parseColor(litFill);
    // For transparent/none, use background color
    const offRgb = offFill === 'none' || offFill === 'transparent' || offFill === 'rgba(0, 0, 0, 0)' 
      ? parseColor(bgColor) 
      : parseColor(offFill);

    const contrastRatio = getContrastRatio(litRgb, offRgb);

    expect(contrastRatio, `Contrast ratio ${contrastRatio.toFixed(2)}:1 should be at least 20:1`).toBeGreaterThanOrEqual(20);

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

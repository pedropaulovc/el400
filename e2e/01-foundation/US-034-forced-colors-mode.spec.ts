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
  // Handle rgba(r, g, b, a) format
  const rgbaMatch = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
  if (rgbaMatch) {
    // If alpha is 0, it's transparent - return the RGB values anyway for reference
    return [parseInt(rgbaMatch[1]), parseInt(rgbaMatch[2]), parseInt(rgbaMatch[3])];
  }
  // Handle transparent/none
  if (color === 'none' || color === 'transparent') {
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
    // For transparent (alpha=0), use background color for contrast calculation
    const isTransparent = offFill === 'none' || offFill === 'transparent' || offFill.match(/rgba\(\d+,\s*\d+,\s*\d+,\s*0\)/);
    const offRgb = isTransparent ? parseColor(bgColor) : parseColor(offFill);

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

  test('buttons have visible borders in forced-colors mode', async ({ browser }) => {
    const context = await browser.newContext({
      forcedColors: 'active',
    });
    const page = await context.newPage();
    await page.goto('/');

    // Check various button types
    const axisButton = page.locator('button:has-text("X")').first();
    const zeroButton = page.locator('button:has-text("0")').first();
    const functionButton = page.getByRole('button', { name: 'Settings' }).first();

    await expect(axisButton).toBeVisible();
    await expect(zeroButton).toBeVisible();
    await expect(functionButton).toBeVisible();

    // Verify buttons have visible borders
    for (const button of [axisButton, zeroButton, functionButton]) {
      const borderStyle = await button.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          borderWidth: style.borderWidth,
          borderStyle: style.borderStyle,
          borderColor: style.borderColor,
        };
      });

      // Should have a visible border (not 0px and not 'none')
      expect(borderStyle.borderStyle).not.toBe('none');
      expect(borderStyle.borderWidth).not.toBe('0px');
    }

    await context.close();
  });

  test('buttons have 17:1 contrast ratio in forced-colors mode', async ({ browser }) => {
    const context = await browser.newContext({
      forcedColors: 'active',
    });
    const page = await context.newPage();
    await page.goto('/');

    const button = page.locator('button.dro-button').first();
    await expect(button).toBeVisible();

    // Get button foreground and background colors
    const colors = await button.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        color: style.color,
        backgroundColor: style.backgroundColor,
      };
    });

    const fgRgb = parseColor(colors.color);
    const bgRgb = parseColor(colors.backgroundColor);

    const contrastRatio = getContrastRatio(fgRgb, bgRgb);

    expect(contrastRatio, `Button contrast ratio ${contrastRatio.toFixed(2)}:1 should be at least 17:1`).toBeGreaterThanOrEqual(17);

    await context.close();
  });

  test('active mode indicators are visible in forced-colors mode', async ({ browser }) => {
    const context = await browser.newContext({
      forcedColors: 'active',
    });
    const page = await context.newPage();
    await page.goto('/');

    // Find active mode indicators (using the CSS class we added)
    const activeIndicator = page.locator('.mode-indicator-active').first();

    if (await activeIndicator.count() > 0) {
      await expect(activeIndicator).toBeVisible();

      const color = await activeIndicator.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.color;
      });

      // Get parent background color for contrast calculation
      const bgColor = await page.evaluate(() => {
        const indicator = document.querySelector('.mode-indicator-active');
        const parent = indicator?.parentElement?.parentElement;
        return parent ? window.getComputedStyle(parent).backgroundColor : 'rgb(0, 0, 0)';
      });

      const fgRgb = parseColor(color);
      const bgRgb = parseColor(bgColor);

      const contrastRatio = getContrastRatio(fgRgb, bgRgb);

      expect(contrastRatio, `Active mode indicator contrast ratio ${contrastRatio.toFixed(2)}:1 should be at least 17:1`).toBeGreaterThanOrEqual(17);
    }

    await context.close();
  });

  test('inactive mode indicators have approximately 1:1 contrast with background', async ({ browser }) => {
    const context = await browser.newContext({
      forcedColors: 'active',
    });
    const page = await context.newPage();
    await page.goto('/');

    // Find inactive mode indicators (using the CSS class we added)
    const inactiveIndicator = page.locator('.mode-indicator-inactive').first();

    if (await inactiveIndicator.count() > 0) {
      const color = await inactiveIndicator.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.color;
      });

      // Get parent background color
      const bgColor = await page.evaluate(() => {
        const indicator = document.querySelector('.mode-indicator-inactive');
        const parent = indicator?.parentElement?.parentElement;
        return parent ? window.getComputedStyle(parent).backgroundColor : 'rgb(0, 0, 0)';
      });

      // Check if indicator is transparent (blends with background)
      const isTransparent = color === 'transparent' || !!color.match(/rgba\(\d+,\s*\d+,\s*\d+,\s*0\)/);

      if (isTransparent) {
        // Transparent indicators automatically have 1:1 contrast
        expect(isTransparent).toBe(true);
      } else {
        // If not transparent, check contrast is close to 1:1
        const fgRgb = parseColor(color);
        const bgRgb = parseColor(bgColor);
        const contrastRatio = getContrastRatio(fgRgb, bgRgb);

        // Allow some tolerance: contrast should be less than 1.5:1 (essentially invisible)
        expect(contrastRatio, `Inactive mode indicator contrast ${contrastRatio.toFixed(2)}:1 should be approximately 1:1 (less than 1.5:1)`).toBeLessThan(1.5);
      }
    }

    await context.close();
  });

  test('unlit segments have approximately 1:1 contrast with background', async ({ browser }) => {
    const context = await browser.newContext({
      forcedColors: 'active',
    });
    const page = await context.newPage();
    await page.goto('/');

    // Wait for the display to render
    await page.waitForSelector('svg polygon');

    const offSegments = page.locator('.segment-off');
    await expect(offSegments.first()).toBeAttached();

    // Get off segment fill color
    const offFill = await offSegments.first().evaluate((el) => {
      return window.getComputedStyle(el).fill;
    });

    // Get background color
    const bgColor = await page.evaluate(() => {
      const display = document.querySelector('.segment-off')?.closest('svg')?.parentElement;
      return display ? window.getComputedStyle(display).backgroundColor : 'rgb(0, 0, 0)';
    });

    // Check if segment is transparent (blends with background)
    const isTransparent = offFill === 'none' || offFill === 'transparent' || !!offFill.match(/rgba\(\d+,\s*\d+,\s*\d+,\s*0\)/);

    if (isTransparent) {
      // Transparent segments automatically have 1:1 contrast
      expect(isTransparent).toBe(true);
    } else {
      // If not transparent, check contrast is close to 1:1
      const offRgb = parseColor(offFill);
      const bgRgb = parseColor(bgColor);
      const contrastRatio = getContrastRatio(offRgb, bgRgb);

      // Allow some tolerance: contrast should be less than 1.5:1 (essentially invisible)
      expect(contrastRatio, `Unlit segment contrast ${contrastRatio.toFixed(2)}:1 should be approximately 1:1 (less than 1.5:1)`).toBeLessThan(1.5);
    }

    await context.close();
  });
});

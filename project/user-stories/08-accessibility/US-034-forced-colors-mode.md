# US-034: Forced Colors Mode (High Contrast) Support

**Manual Reference:** Accessibility Standards (WCAG 2.1)
**Priority:** Critical (P0)

## User Story
**As a** user with low vision or visual impairment
**I want** the DRO to honor forced-colors mode (Windows High Contrast mode)
**So that** I can clearly read the display and interact with all controls using my system's high contrast theme

## Acceptance Criteria
- [ ] **AC 34.1:** When forced-colors mode is active, lit seven-segment display segments have a contrast ratio of 20:1 or greater against the background.
- [ ] **AC 34.2:** When forced-colors mode is active, unlit seven-segment display segments are visually distinct from lit segments.
- [ ] **AC 34.3:** When forced-colors mode is active, unlit seven-segment display segments and inactive mode indicators have a contrast ratio of approximately 1:1 against the background (essentially invisible/blending with background).
- [ ] **AC 34.4:** When forced-colors mode is active, all button elements have visible borders.
- [ ] **AC 34.5:** When forced-colors mode is active, button colors are visually distinct from seven-segment display colors.
- [ ] **AC 34.6:** When forced-colors mode is active, buttons have a contrast ratio of 17:1 or greater against the background.
- [ ] **AC 34.7:** All interactive elements (buttons, input areas) remain clearly identifiable and usable in forced-colors mode.
- [ ] **AC 34.8:** Active mode indicators (ABS/INC, IN/MM) are clearly visible in forced-colors mode with appropriate contrast.

## E2E Test Scenarios
```typescript
describe('US-034: Forced Colors Mode Support', () => {
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

    // Get background color for contrast calculation
    const bgColor = await page.evaluate(() => {
      const display = document.querySelector('.segment-on')?.closest('svg')?.parentElement;
      return display ? window.getComputedStyle(display).backgroundColor : 'rgb(0, 0, 0)';
    });

    const litRgb = parseColor(litFill);
    const isTransparent = offFill === 'none' || offFill === 'transparent' || offFill.match(/rgba\(\d+,\s*\d+,\s*\d+,\s*0\)/);
    const offRgb = isTransparent ? parseColor(bgColor) : parseColor(offFill);

    const contrastRatio = getContrastRatio(litRgb, offRgb);

    expect(contrastRatio, `Contrast ratio ${contrastRatio.toFixed(2)}:1 should be at least 20:1`).toBeGreaterThanOrEqual(20);

    await context.close();
  });

  test('unlit segments have approximately 1:1 contrast with background', async ({ browser }) => {
    // Create context with forced-colors emulation
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
    const isTransparent = offFill === 'none' || offFill === 'transparent' || offFill.match(/rgba\(\d+,\s*\d+,\s*\d+,\s*0\)/);

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

  test('buttons have visible borders in forced-colors mode', async ({ browser }) => {
    const context = await browser.newContext({
      forcedColors: 'active',
    });
    const page = await context.newPage();
    await page.goto('/');

    // Check various button types
    const axisButton = page.locator('button:has-text("X")').first();
    const zeroButton = page.locator('button:has-text("0")').first();
    const functionButton = page.locator('button:has-text("SETUP")').first();

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

    const button = page.locator('button').first();
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

  test('button colors are distinct from segment colors in forced-colors mode', async ({ browser }) => {
    const context = await browser.newContext({
      forcedColors: 'active',
    });
    const page = await context.newPage();
    await page.goto('/');

    // Get segment color
    const segmentColor = await page.locator('.segment-on').first().evaluate((el) => {
      return window.getComputedStyle(el).fill;
    });

    // Get button color
    const buttonColor = await page.locator('button').first().evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // Colors should be different
    expect(segmentColor).not.toBe(buttonColor);

    await context.close();
  });

  test('active mode indicators are visible in forced-colors mode', async ({ browser }) => {
    const context = await browser.newContext({
      forcedColors: 'active',
    });
    const page = await context.newPage();
    await page.goto('/');

    // Find active mode indicators (ABS/INC, IN/MM)
    const activeIndicator = page.locator('[class*="mode-indicator"][class*="active"]').first();

    if (await activeIndicator.isVisible()) {
      const colors = await activeIndicator.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          color: style.color,
          backgroundColor: style.backgroundColor,
        };
      });

      const fgRgb = parseColor(colors.color);
      const bgRgb = parseColor(colors.backgroundColor);

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

    // Find inactive mode indicators
    const inactiveIndicator = page.locator('[class*="mode-indicator"]:not([class*="active"])').first();

    if (await inactiveIndicator.count() > 0) {
      const colors = await inactiveIndicator.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          color: style.color,
          backgroundColor: style.backgroundColor,
        };
      });

      // Get parent background color
      const bgColor = await page.evaluate(() => {
        const indicator = document.querySelector('[class*="mode-indicator"]:not([class*="active"])');
        return indicator?.parentElement ? window.getComputedStyle(indicator.parentElement).backgroundColor : 'rgb(0, 0, 0)';
      });

      const fgRgb = parseColor(colors.color);
      const bgRgb = parseColor(bgColor);

      const contrastRatio = getContrastRatio(fgRgb, bgRgb);

      // Inactive indicators should blend with background (< 1.5:1)
      expect(contrastRatio, `Inactive mode indicator contrast ${contrastRatio.toFixed(2)}:1 should be approximately 1:1 (less than 1.5:1)`).toBeLessThan(1.5);
    }

    await context.close();
  });
});

// Helper functions
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(rgb1: [number, number, number], rgb2: [number, number, number]): number {
  const l1 = getLuminance(...rgb1);
  const l2 = getLuminance(...rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function parseColor(color: string): [number, number, number] {
  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgbMatch) {
    return [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])];
  }
  const rgbaMatch = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
  if (rgbaMatch) {
    return [parseInt(rgbaMatch[1]), parseInt(rgbaMatch[2]), parseInt(rgbaMatch[3])];
  }
  if (color === 'none' || color === 'transparent') {
    return [0, 0, 0];
  }
  throw new Error(`Cannot parse color: ${color}`);
}
```

## Related Stories
- US-001: First Use and Power-Up Display (initial visual presentation)
- US-021 to US-028: Configuration settings that may affect display appearance

## Technical Notes
- **Forced Colors Mode:** Windows High Contrast mode that replaces all colors with user-selected system colors
- **WCAG 2.1 Contrast Requirements:**
  - Enhanced Contrast (Level AAA): 7:1 for normal text, 4.5:1 for large text
  - This implementation exceeds WCAG requirements with 20:1 for lit segments and 17:1 for buttons
  - Unlit segments and inactive indicators have ~1:1 contrast (transparent/invisible) to avoid visual clutter
- **Implementation:** Use CSS `forced-colors` media query and `forced-color-adjust` property
- **Testing:** Playwright supports forced-colors emulation via `forcedColors: 'active'` context option

## References
- [WCAG 2.1 Contrast (Enhanced)](https://www.w3.org/WAI/WCAG21/Understanding/contrast-enhanced)
- [CSS Forced Colors Mode](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)
- [Windows High Contrast Mode](https://support.microsoft.com/en-us/windows/change-color-contrast-in-windows-fedc744c-90ac-69df-aed5-c8a90125e696)

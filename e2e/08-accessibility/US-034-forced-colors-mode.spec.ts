import { test, expect } from '@playwright/test';

import { getContrastRatio, isTransparentColor, parseColor } from '../../src/tests/contrast-utils';

/**
 * E2E smoke tests for forced-colors mode. Storybook handles detailed component checks;
 * these tests verify full-page integration under forced-colors emulation.
 */
test.describe('US-034: Forced Colors Mode', () => {
  test('smoke: UI elements render correctly under forced-colors', async ({ browser }) => {
    const context = await browser.newContext({ forcedColors: 'active' });
    const page = await context.newPage();
    await page.goto('/');

    await page.waitForSelector('.seven-segment-digit');

    // --- Seven-segment display contrast ---
    const lit = page.locator('.seg-on').first();
    const off = page.locator('.seg-off').first();
    await expect(lit).toBeVisible();
    await expect(off).toBeVisible();

    const litBg = await lit.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    const offBg = await off.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    const parentBg = await page.evaluate(() => {
      const digit = document.querySelector('.seven-segment-digit');
      return digit ? window.getComputedStyle(digit.parentElement ?? digit).backgroundColor : 'rgb(0, 0, 0)';
    });

    let effectiveParent = parentBg;
    if (!effectiveParent || isTransparentColor(effectiveParent)) {
      const canvasColor = await page.evaluate(() => {
        const temp = document.createElement('div');
        temp.style.backgroundColor = 'Canvas';
        temp.style.display = 'none';
        document.body.appendChild(temp);
        const c = window.getComputedStyle(temp).backgroundColor;
        document.body.removeChild(temp);
        return c;
      });
      effectiveParent = canvasColor;
    }

    const litRgb = parseColor(litBg);
    const effectiveParentRgb = parseColor(effectiveParent);
    if (!litRgb && !effectiveParentRgb) {
      throw new Error(`Unable to parse lit segment color: ${litBg} or fallback: ${effectiveParent}`);
    }
    const resolvedLitRgb = litRgb ?? effectiveParentRgb!;

    const offRgbSource = isTransparentColor(offBg) ? effectiveParent : offBg;
    const offRgb = parseColor(offRgbSource);
    if (!offRgb) {
      throw new Error(`Unable to parse off segment color: ${offRgbSource}`);
    }

    const segmentContrast = getContrastRatio(resolvedLitRgb, offRgb);
    expect(segmentContrast, `Segment contrast ${segmentContrast.toFixed(1)}:1 should be >= 10:1`).toBeGreaterThanOrEqual(10);

    // --- Buttons have visible 2px borders ---
    const buttons = page.locator('button.dro-button');
    const buttonCount = await buttons.count();
    expect(buttonCount, 'Should have multiple DRO buttons').toBeGreaterThan(5);

    const buttonStyle = await buttons.first().evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        borderWidth: style.borderWidth,
        borderStyle: style.borderStyle,
      };
    });
    expect(buttonStyle.borderStyle, 'Button should have border style').not.toBe('none');
    expect(buttonStyle.borderWidth, 'Button should have 2px border').toBe('2px');

    // --- BeveledFrame sections have visible 2px borders ---
    const sections = page.locator('.rounded-xl.p-1');
    const sectionCount = await sections.count();
    expect(sectionCount, 'Should have at least 5 BeveledFrame sections').toBeGreaterThanOrEqual(5);

    const sectionStyle = await sections.first().evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        borderWidth: style.borderWidth,
        borderStyle: style.borderStyle,
      };
    });
    expect(sectionStyle.borderStyle, 'Section should have border style').not.toBe('none');
    expect(sectionStyle.borderWidth, 'Section should have 2px border').toBe('2px');

    // --- Active LED indicators have no glow effect (text-shadow: none) ---
    const activeIndicators = page.locator('.mode-indicator-active');
    const indicatorCount = await activeIndicators.count();
    expect(indicatorCount, 'Should have at least 2 active indicators').toBeGreaterThanOrEqual(2);

    const textShadow = await activeIndicators.first().evaluate((el) => {
      return window.getComputedStyle(el).textShadow;
    });
    expect(textShadow, 'Active LED should not have glow in forced-colors').toBe('none');

    await context.close();
  });
});

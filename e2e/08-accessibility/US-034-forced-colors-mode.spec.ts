import { test, expect } from '@playwright/test';

import { getContrastRatio, parseColor } from '../../src/tests/contrast-utils';

/**
 * Minimal E2E smoke for forced-colors while Storybook handles detailed checks.
 */
test.describe('US-034: Forced Colors Mode', () => {
  test('smoke: seven-segment renders with contrast under forced-colors', async ({ browser }) => {
    const context = await browser.newContext({ forcedColors: 'active' });
    const page = await context.newPage();
    await page.goto('/');

    await page.waitForSelector('.seven-segment-digit');

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
    if (!effectiveParent || effectiveParent === 'transparent' || /rgba\(\d+,\s*\d+,\s*\d+,\s*0/.test(effectiveParent)) {
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

    const litRgb = parseColor(litBg) ?? parseColor(effectiveParent)!;
    const offRgb = parseColor(offBg === 'transparent' || offBg === 'none' || /rgba\(\d+,\s*\d+,\s*\d+,\s*0/.test(offBg) ? effectiveParent : offBg)!;

    const contrast = getContrastRatio(litRgb, offRgb);
    expect(contrast).toBeGreaterThanOrEqual(10);

    await context.close();
  });
});

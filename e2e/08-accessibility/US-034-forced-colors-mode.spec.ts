import { test, expect } from '@playwright/test';

import {
  getContrastRatio,
  isTransparentColor,
  parseColor,
  MIN_ACCESSIBLE_CONTRAST_RATIO,
  MIN_HIGH_CONTRAST_RATIO,
} from '../../src/tests/contrast-utils';

/**
 * E2E smoke tests for forced-colors mode. Storybook handles detailed component checks;
 * these tests verify full-page integration under forced-colors emulation.
 */
test.describe('US-034: Forced Colors Mode', () => {
  test('smoke: UI elements render correctly under forced-colors', async ({ browser }) => {
    const context = await browser.newContext({ forcedColors: 'active' });
    const page = await context.newPage();
    await page.goto('/?source=debug&bootMessageMode=skip');

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
    expect(
      segmentContrast,
      `Segment contrast ${segmentContrast.toFixed(1)}:1 should be >= ${MIN_HIGH_CONTRAST_RATIO}:1`,
    ).toBeGreaterThanOrEqual(MIN_HIGH_CONTRAST_RATIO);
    expect(
      isTransparentColor(offBg),
      'Unlit segments must disappear into the forced-color canvas',
    ).toBe(true);

    // --- Buttons have visible 2px borders ---
    const buttons = page.locator('button.dro-button');
    const buttonCount = await buttons.count();
    expect(buttonCount, 'Should have multiple DRO buttons').toBeGreaterThan(5);

    const buttonStyles = await buttons.evaluateAll((elements) =>
      elements.map((el) => {
        const style = window.getComputedStyle(el);
        return {
          borderWidth: style.borderWidth,
          borderStyle: style.borderStyle,
          color: style.color,
          backgroundColor: style.backgroundColor,
        };
      }),
    );
    expect(
      buttonStyles.every(({ borderStyle, borderWidth }) =>
        borderStyle !== 'none' && borderWidth === '2px'
      ),
      'Every DRO button should retain a visible 2px border',
    ).toBe(true);

    const buttonContrasts = buttonStyles.map(({ color, backgroundColor }) => {
      const foreground = parseColor(color);
      const background = parseColor(backgroundColor);
      if (!foreground || !background) {
        throw new Error(`Unable to parse forced-color button pair: ${color} / ${backgroundColor}`);
      }
      return getContrastRatio(foreground, background);
    });
    const minimumButtonContrast = Math.min(...buttonContrasts);
    expect(
      minimumButtonContrast,
      `Minimum button contrast ${minimumButtonContrast.toFixed(1)}:1 should be >= ${MIN_ACCESSIBLE_CONTRAST_RATIO}:1`,
    ).toBeGreaterThanOrEqual(MIN_ACCESSIBLE_CONTRAST_RATIO);

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

    // --- Active indicators retain strict contrast; inactive ones disappear ---
    const activeIndicators = page.locator('.mode-indicator-active');
    const inactiveIndicators = page.locator('.mode-indicator-inactive');
    const indicatorCount = await activeIndicators.count();
    expect(indicatorCount, 'Should have at least 2 active indicators').toBeGreaterThanOrEqual(2);
    await expect(inactiveIndicators.first()).toBeVisible();

    const activeStyle = await activeIndicators.first().evaluate((el) => {
      const style = window.getComputedStyle(el);
      let ancestor = el.parentElement;
      let backgroundColor = '';

      while (ancestor) {
        const candidate = window.getComputedStyle(ancestor).backgroundColor;
        if (
          candidate !== 'transparent' &&
          !/^rgba\([^)]*,\s*0(?:\.0+)?\)$/.test(candidate)
        ) {
          backgroundColor = candidate;
          break;
        }
        ancestor = ancestor.parentElement;
      }

      if (!backgroundColor) {
        const canvas = document.createElement('div');
        canvas.style.backgroundColor = 'Canvas';
        document.body.appendChild(canvas);
        backgroundColor = window.getComputedStyle(canvas).backgroundColor;
        canvas.remove();
      }

      return { color: style.color, textShadow: style.textShadow, backgroundColor };
    });
    const inactiveColor = await inactiveIndicators.first().evaluate(
      (el) => window.getComputedStyle(el).color,
    );
    expect(activeStyle.textShadow, 'Active LED should not have glow in forced-colors').toBe('none');
    expect(
      isTransparentColor(inactiveColor),
      'Inactive indicator must disappear into the canvas',
    ).toBe(true);

    const activeColor = parseColor(activeStyle.color);
    const activeBackground = parseColor(activeStyle.backgroundColor);
    if (!activeColor || !activeBackground) {
      throw new Error(
        `Unable to parse forced-color indicator pair: ${activeStyle.color} / ${activeStyle.backgroundColor}`,
      );
    }
    const indicatorContrast = getContrastRatio(activeColor, activeBackground);
    expect(
      indicatorContrast,
      `Active indicator contrast ${indicatorContrast.toFixed(1)}:1 should be >= ${MIN_HIGH_CONTRAST_RATIO}:1`,
    ).toBeGreaterThanOrEqual(MIN_HIGH_CONTRAST_RATIO);

    // --- Focus remains visible on an operable physical control ---
    const focusedControl = page.getByTestId('key-5');
    await expect(focusedControl).toBeEnabled();
    await focusedControl.focus();
    await expect(focusedControl).toBeFocused();
    const focusStyle = await focusedControl.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        outlineColor: style.outlineColor,
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        backgroundColor: style.backgroundColor,
      };
    });
    expect(focusStyle.outlineStyle, 'Focused control should retain a solid outline').toBe('solid');
    expect(focusStyle.outlineWidth, 'Focused control should retain a 2px outline').toBe('2px');
    expect(
      focusStyle.outlineColor,
      'Focused control outline should differ from its button face',
    ).not.toBe(focusStyle.backgroundColor);

    await context.close();
  });
});

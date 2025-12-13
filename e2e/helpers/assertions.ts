import { expect, Locator } from '@playwright/test';

/**
 * Custom assertions for EL400 DRO E2E tests
 */

/**
 * Assert that a display shows a text value (not a pure numeric value)
 * Throws an error if the content is purely numeric with at most 1 decimal point
 */
export async function expectPureTextValue(
  display: Locator,
  expectedValue: string
) {
  const text = await display.textContent();
  const trimmedText = text?.trim() || '';
  
  // Check if the content is purely numeric (matches /^[-\d.]+$/)
  // Allow [-\d.] characters only if there is at most 1 '.' in the string
  const dotCount = (trimmedText.match(/\./g) || []).length;
  if (/^[-\d.]+$/.test(trimmedText) && dotCount <= 1) {
    throw new Error(`Expected text value, but got numeric value: ${text}`);
  }
  
  expect(trimmedText).toBe(expectedValue);
}

/**
 * Assert that a display shows a specific numeric value (with tolerance for floating point)
 */
export async function expectPureNumberValue(
  display: Locator,
  expectedValue: number,
  tolerance = 0.0001
) {
  const text = await display.textContent();
  const cleanedText = text?.replace(/[^\d.-]/g, '') || '0';
  
  // Validate that there's at most 1 decimal point
  const dotCount = (cleanedText.match(/\./g) || []).length;
  if (dotCount > 1) {
    throw new Error(`Invalid numeric value with multiple decimal points: ${text}`);
  }
  
  const actualValue = parseFloat(cleanedText);
  
  if (isNaN(actualValue)) {
    throw new Error(`Could not parse numeric value from: ${text}`);
  }
  
  const diff = Math.abs(actualValue - expectedValue);

  expect(diff, `Expected ${expectedValue}, got ${actualValue}`).toBeLessThanOrEqual(tolerance);
}

/**
 * Assert that a LED indicator is on
 */
export async function expectLEDOn(led: Locator) {
  await expect(led).toBeVisible();
  // The color classes are on the span child element, not the button
  const span = led.locator('span').first();
  const classes = await span.getAttribute('class');
  expect(
    classes?.includes('text-red-400'),
    'Expected LED to be on (text-red-400)'
  ).toBeTruthy();
}

/**
 * Assert that a LED indicator is off
 */
export async function expectLEDOff(led: Locator) {
  // The color classes are on the span child element, not the button
  const span = led.locator('span').first();
  const classes = await span.getAttribute('class');
  expect(
    classes?.includes('text-red-900/60'),
    'Expected LED to be off (text-red-900/60)'
  ).toBeTruthy();
}

/**
 * Assert that a seven-segment display shows a specific digit pattern
 */
export async function expectSevenSegmentPattern(display: Locator, pattern: string) {
  await expect(display).toHaveAttribute('data-pattern', pattern);
}

/**
 * Assert axis values match expected values
 */
export async function expectAxisValues(
  xDisplay: Locator,
  yDisplay: Locator,
  zDisplay: Locator,
  expected: { x: number; y: number; z: number },
  tolerance = 0.0001
) {
  await expectPureNumberValue(xDisplay, expected.x, tolerance);
  await expectPureNumberValue(yDisplay, expected.y, tolerance);
  await expectPureNumberValue(zDisplay, expected.z, tolerance);
}

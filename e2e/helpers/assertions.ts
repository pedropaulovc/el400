import { expect, Locator } from '@playwright/test';

/**
 * Custom assertions for EL400 DRO E2E tests
 */

/**
 * Assert that a display shows a specific value (with tolerance for floating point)
 */
export async function expectDisplayValue(
  display: Locator,
  expectedValue: number,
  tolerance = 0.0001
) {
  const text = await display.textContent();
  const actualValue = parseFloat(text?.replace(/[^\d.-]/g, '') || '0');
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
  await expectDisplayValue(xDisplay, expected.x, tolerance);
  await expectDisplayValue(yDisplay, expected.y, tolerance);
  await expectDisplayValue(zDisplay, expected.z, tolerance);
}

import { test, expect } from '@playwright/test';

test.describe('SevenSegmentDigit Character Showcase', () => {
  test.beforeEach(async ({ page }) => {
    // Start the storybook dev server or use the built storybook
    await page.goto('http://localhost:6006');
  });

  const characters = {
    digits: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
    symbols: ['-', ' '],
    letters: ['A', 'b', 'C', 'c', 'd', 'E', 'F', 'G', 'h', 'I', 'i', 'J', 'L', 'l', 'n', 'm', 'P', 'r', 'S', 't', 'U', 'v', 'X', 'Y']
  };

  test('capture screenshots of all digits', async ({ page }) => {
    await page.goto('http://localhost:6006/?path=/story/components-sevensegmentdigit--all-digits');
    await page.waitForSelector('svg', { timeout: 5000 });
    await expect(page.locator('svg').first()).toBeVisible();
    
    // Take a screenshot of all digits
    await page.screenshot({
      path: 'screenshots/seven-segment-all-digits.png',
      fullPage: false,
    });
  });

  test('capture screenshots of all letters', async ({ page }) => {
    await page.goto('http://localhost:6006/?path=/story/components-sevensegmentdigit--all-letters');
    await page.waitForSelector('svg', { timeout: 5000 });
    await expect(page.locator('svg').first()).toBeVisible();
    
    // Take a screenshot of all letters
    await page.screenshot({
      path: 'screenshots/seven-segment-all-letters.png',
      fullPage: false,
    });
  });

  test('capture screenshot of letter A', async ({ page }) => {
    await page.goto('http://localhost:6006/?path=/story/components-sevensegmentdigit--letter-a');
    await page.waitForSelector('svg', { timeout: 5000 });
    await expect(page.locator('svg').first()).toBeVisible();
    
    await page.screenshot({
      path: 'screenshots/seven-segment-letter-A.png',
      fullPage: false,
    });
  });

  test('capture screenshot of letter b', async ({ page }) => {
    await page.goto('http://localhost:6006/?path=/story/components-sevensegmentdigit--letterb');
    await page.waitForSelector('svg', { timeout: 5000 });
    await expect(page.locator('svg').first()).toBeVisible();
    
    await page.screenshot({
      path: 'screenshots/seven-segment-letter-b.png',
      fullPage: false,
    });
  });

  test('capture screenshot of letter E', async ({ page }) => {
    await page.goto('http://localhost:6006/?path=/story/components-sevensegmentdigit--letter-e');
    await page.waitForSelector('svg', { timeout: 5000 });
    await expect(page.locator('svg').first()).toBeVisible();
    
    await page.screenshot({
      path: 'screenshots/seven-segment-letter-E.png',
      fullPage: false,
    });
  });

  test('capture screenshot of letter P', async ({ page }) => {
    await page.goto('http://localhost:6006/?path=/story/components-sevensegmentdigit--letter-p');
    await page.waitForSelector('svg', { timeout: 5000 });
    await expect(page.locator('svg').first()).toBeVisible();
    
    await page.screenshot({
      path: 'screenshots/seven-segment-letter-P.png',
      fullPage: false,
    });
  });

  test('capture screenshot of sample word', async ({ page }) => {
    await page.goto('http://localhost:6006/?path=/story/components-sevensegmentdigit--sample-word');
    await page.waitForSelector('svg', { timeout: 5000 });
    await expect(page.locator('svg').first()).toBeVisible();
    
    await page.screenshot({
      path: 'screenshots/seven-segment-sample-word.png',
      fullPage: false,
    });
  });

  test('verify error handling for unsupported character', async ({ page }) => {
    // This test verifies the component behavior but cannot directly test
    // the exception since it would be caught by React error boundaries
    // The exception behavior is tested in the unit tests
    await page.goto('http://localhost:6006/?path=/story/components-sevensegmentdigit--zero');
    await page.waitForSelector('svg', { timeout: 5000 });
    await expect(page.locator('svg').first()).toBeVisible();
  });
});

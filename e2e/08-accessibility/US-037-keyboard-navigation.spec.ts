import { test, expect } from '@playwright/test';

/**
 * E2E Tests: US-037 Keyboard Navigation
 *
 * Tests that the DRO can be fully operated using keyboard only.
 */
test.describe('US-037: Keyboard Navigation', () => {
  test('keypad buttons follow natural numeric tab order', async ({ page }) => {
    await page.goto('/');

    // Focus the first keypad button
    const firstKey = page.getByTestId('key-1');
    await firstKey.focus();

    // Expected tab order: 1,2,3,4,5,6,7,8,9,0,sign,decimal,clear,enter
    const expectedOrder = [
      'key-1', 'key-2', 'key-3',
      'key-4', 'key-5', 'key-6',
      'key-7', 'key-8', 'key-9',
      'key-0', 'key-sign', 'key-decimal',
      'key-clear', 'key-enter'
    ];

    // Verify first button is focused
    await expect(page.getByTestId('key-1')).toBeFocused();

    // Tab through and verify order
    for (let i = 1; i < expectedOrder.length; i++) {
      await page.keyboard.press('Tab');
      await expect(page.getByTestId(expectedOrder[i])).toBeFocused();
    }
  });

  test('can enter value using keyboard only', async ({ page }) => {
    await page.goto('/');

    // Tab to X axis button and activate it
    const xButton = page.getByTestId('axis-select-x');
    await xButton.focus();
    await page.keyboard.press('Enter');

    // Tab to keypad and enter "123.45"
    await page.getByTestId('key-1').focus();
    await page.keyboard.press('Enter'); // 1
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter'); // 2 (after tabbing past 2 to position 3, we need to go back)

    // More direct approach: focus each key and press Enter
    await page.getByTestId('key-1').focus();
    await page.keyboard.press('Enter');
    await page.getByTestId('key-2').focus();
    await page.keyboard.press('Enter');
    await page.getByTestId('key-3').focus();
    await page.keyboard.press('Enter');
    await page.getByTestId('key-decimal').focus();
    await page.keyboard.press('Enter');
    await page.getByTestId('key-4').focus();
    await page.keyboard.press('Enter');
    await page.getByTestId('key-5').focus();
    await page.keyboard.press('Enter');

    // Press Enter to confirm
    await page.getByTestId('key-enter').focus();
    await page.keyboard.press('Enter');

    // Verify value was entered
    const xValue = page.getByTestId('axis-value-x');
    await expect(xValue).toContainText('123.45');
  });

  test('can toggle modes using keyboard', async ({ page }) => {
    await page.goto('/');

    // Verify starting in ABS mode
    const absLed = page.getByTestId('led-abs');
    await expect(absLed.locator('input')).toBeChecked();

    // Focus and activate ABS/INC toggle button
    const absIncButton = page.getByTestId('btn-abs-inc');
    await absIncButton.focus();
    await page.keyboard.press('Enter');

    // Verify switched to INC mode
    const incLed = page.getByTestId('led-inc');
    await expect(incLed.locator('input')).toBeChecked();
    await expect(absLed.locator('input')).not.toBeChecked();

    // Toggle back
    await page.keyboard.press('Enter');
    await expect(absLed.locator('input')).toBeChecked();
  });

  test('can zero axis using keyboard', async ({ page }) => {
    await page.goto('/');

    // Enter a value on X axis first
    const xButton = page.getByTestId('axis-select-x');
    await xButton.focus();
    await page.keyboard.press('Enter');

    await page.getByTestId('key-5').focus();
    await page.keyboard.press('Enter');
    await page.getByTestId('key-0').focus();
    await page.keyboard.press('Enter');
    await page.getByTestId('key-enter').focus();
    await page.keyboard.press('Enter');

    // Verify value is 50
    const xValue = page.getByTestId('axis-value-x');
    await expect(xValue).toContainText('50');

    // Zero using keyboard
    const zeroXButton = page.getByTestId('axis-zero-x');
    await zeroXButton.focus();
    await page.keyboard.press('Enter');

    // Verify zeroed
    await expect(xValue).toContainText('0.0000');
  });

  test('Space key activates buttons', async ({ page }) => {
    await page.goto('/');

    // Focus X axis button and activate with Space
    const xButton = page.getByTestId('axis-select-x');
    await xButton.focus();
    await page.keyboard.press('Space');

    // Enter value using Space to activate keys
    await page.getByTestId('key-7').focus();
    await page.keyboard.press('Space');
    await page.getByTestId('key-enter').focus();
    await page.keyboard.press('Space');

    // Verify value
    const xValue = page.getByTestId('axis-value-x');
    await expect(xValue).toContainText('7');
  });

  test('focus is visible on buttons', async ({ page }) => {
    await page.goto('/');

    const button = page.getByTestId('key-5');
    await button.focus();

    // Check that focus ring styles are applied
    const outlineStyle = await button.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        outlineWidth: style.outlineWidth,
        outlineStyle: style.outlineStyle,
        boxShadow: style.boxShadow,
      };
    });

    // Button should have visible focus indicator (either outline or ring via box-shadow)
    const hasVisibleFocus =
      (outlineStyle.outlineStyle !== 'none' && outlineStyle.outlineWidth !== '0px') ||
      outlineStyle.boxShadow !== 'none';

    expect(hasVisibleFocus, 'Focused button should have visible focus indicator').toBe(true);
  });
});

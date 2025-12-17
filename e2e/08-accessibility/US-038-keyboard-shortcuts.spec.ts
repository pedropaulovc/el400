import { test, expect } from '@playwright/test';

/**
 * E2E Tests: US-038 Keyboard Shortcuts
 *
 * Tests direct keyboard shortcuts for power users.
 * Complements US-037 (Tab navigation) by testing direct key mappings.
 */
test.describe('US-038: Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Focus the simulator container to enable keyboard shortcuts
    await page.locator('[tabindex="0"]').first().focus();
  });

  test('can enter value using numpad keys directly', async ({ page }) => {
    // Press X to select axis
    await page.keyboard.press('x');

    // Enter "123.45" using numpad-style keys
    await page.keyboard.press('1');
    await page.keyboard.press('2');
    await page.keyboard.press('3');
    await page.keyboard.press('.');
    await page.keyboard.press('4');
    await page.keyboard.press('5');
    await page.keyboard.press('Enter');

    // Verify value
    const xValue = page.getByTestId('axis-value-x');
    await expect(xValue).toContainText('123.45');
  });

  test('can enter negative value using minus key', async ({ page }) => {
    // Select Y axis
    await page.keyboard.press('y');

    // Enter "-50.5"
    await page.keyboard.press('-');
    await page.keyboard.press('5');
    await page.keyboard.press('0');
    await page.keyboard.press('.');
    await page.keyboard.press('5');
    await page.keyboard.press('Enter');

    // Verify value
    const yValue = page.getByTestId('axis-value-y');
    await expect(yValue).toContainText('-50.5');
  });

  test('can toggle ABS/INC mode with A key', async ({ page }) => {
    // Verify starting in ABS mode
    const absLed = page.getByTestId('led-abs');
    await expect(absLed.locator('input')).toBeChecked();

    // Press A to toggle
    await page.keyboard.press('a');

    // Verify INC mode
    const incLed = page.getByTestId('led-inc');
    await expect(incLed.locator('input')).toBeChecked();

    // Press A again to toggle back
    await page.keyboard.press('a');

    // Verify back to ABS mode
    await expect(absLed.locator('input')).toBeChecked();
  });

  test('can zero axis with Shift+X/Y/Z', async ({ page }) => {
    // Set X to a value
    await page.keyboard.press('x');
    await page.keyboard.press('7');
    await page.keyboard.press('5');
    await page.keyboard.press('Enter');

    const xValue = page.getByTestId('axis-value-x');
    await expect(xValue).toContainText('75');

    // Zero with Shift+X
    await page.keyboard.press('Shift+x');

    // Verify zeroed
    await expect(xValue).toContainText('0.0000');
  });

  test('can zero all axes with Shift+0', async ({ page }) => {
    // Set values on all axes
    await page.keyboard.press('x');
    await page.keyboard.press('1');
    await page.keyboard.press('0');
    await page.keyboard.press('Enter');

    await page.keyboard.press('y');
    await page.keyboard.press('2');
    await page.keyboard.press('0');
    await page.keyboard.press('Enter');

    await page.keyboard.press('z');
    await page.keyboard.press('3');
    await page.keyboard.press('0');
    await page.keyboard.press('Enter');

    // Verify values
    await expect(page.getByTestId('axis-value-x')).toContainText('10');
    await expect(page.getByTestId('axis-value-y')).toContainText('20');
    await expect(page.getByTestId('axis-value-z')).toContainText('30');

    // Zero all with Shift+0
    await page.keyboard.press('Shift+0');

    // Verify all zeroed
    await expect(page.getByTestId('axis-value-x')).toContainText('0.0000');
    await expect(page.getByTestId('axis-value-y')).toContainText('0.0000');
    await expect(page.getByTestId('axis-value-z')).toContainText('0.0000');
  });

  test('can clear input with Escape key', async ({ page }) => {
    // Set a value first
    await page.keyboard.press('x');
    await page.keyboard.press('5');
    await page.keyboard.press('0');
    await page.keyboard.press('Enter');

    await expect(page.getByTestId('axis-value-x')).toContainText('50');

    // Start entering a new value
    await page.keyboard.press('9');
    await page.keyboard.press('9');

    // Clear with Escape
    await page.keyboard.press('Escape');

    // Press Enter (should do nothing since buffer is clear)
    await page.keyboard.press('Enter');

    // Value should still be 50
    await expect(page.getByTestId('axis-value-x')).toContainText('50');
  });

  test('can use half function with H key', async ({ page }) => {
    // Set X to 100
    await page.keyboard.press('x');
    await page.keyboard.press('1');
    await page.keyboard.press('0');
    await page.keyboard.press('0');
    await page.keyboard.press('Enter');

    await expect(page.getByTestId('axis-value-x')).toContainText('100');

    // Half with H key
    await page.keyboard.press('h');

    // Should be 50
    await expect(page.getByTestId('axis-value-x')).toContainText('50');
  });

  test('keyboard shortcuts only work when simulator is focused', async ({ page }) => {
    // Click outside the simulator to unfocus
    await page.locator('body').click({ position: { x: 10, y: 10 } });

    // Try to select axis with keyboard
    await page.keyboard.press('x');

    // X button should NOT be selected (aria-pressed should be false)
    const xButton = page.getByTestId('axis-select-x');
    await expect(xButton).toHaveAttribute('aria-pressed', 'false');

    // Now focus the simulator
    await page.locator('[tabindex="0"]').first().focus();

    // Press X again
    await page.keyboard.press('x');

    // Now X should be selected
    await expect(xButton).toHaveAttribute('aria-pressed', 'true');
  });
});

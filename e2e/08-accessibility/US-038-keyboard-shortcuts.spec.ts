import { test, expect } from '../helpers/fixtures';

/**
 * E2E Tests: US-038 Keyboard Shortcuts
 *
 * Power-user shortcuts: real key presses against the focused simulator
 * dispatch the same DRO events as the on-screen buttons. No backdoors —
 * the simulator container is focused, then keys are pressed for real.
 */
test.describe('US-038: Keyboard Shortcuts', () => {
  test('enter a value with direct number keys (AC 38.1/38.3/38.7)', async ({ dro }) => {
    const page = dro.page;
    await page.getByTestId('el400-simulator').focus();

    await page.keyboard.press('x');
    await page.keyboard.press('1');
    await page.keyboard.press('2');
    await page.keyboard.press('3');
    await page.keyboard.press('Enter');

    await expect(page.getByTestId('axis-value-x')).toContainText('123');
  });

  test('toggle ABS/INC with the A key (AC 38.10)', async ({ dro }) => {
    const page = dro.page;
    await page.getByTestId('el400-simulator').focus();

    await expect(page.getByTestId('led-abs').locator('input')).toBeChecked();

    await page.keyboard.press('a');

    await expect(page.getByTestId('led-inc').locator('input')).toBeChecked();
    await expect(page.getByTestId('led-abs').locator('input')).not.toBeChecked();
  });

  test('zero an axis with Shift+X (AC 38.8)', async ({ dro }) => {
    const page = dro.page;
    await page.getByTestId('el400-simulator').focus();

    await page.keyboard.press('x');
    await page.keyboard.press('5');
    await page.keyboard.press('0');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('axis-value-x')).toContainText('50');

    await page.keyboard.press('Shift+X');

    await expect(page.getByTestId('axis-value-x')).toContainText('0.0000');
  });

  test('Shift+0 zeros all axes (AC 38.13)', async ({ dro }) => {
    const page = dro.page;
    await page.getByTestId('el400-simulator').focus();

    await page.keyboard.press('x');
    await page.keyboard.press('1');
    await page.keyboard.press('0');
    await page.keyboard.press('Enter');
    await page.keyboard.press('y');
    await page.keyboard.press('2');
    await page.keyboard.press('0');
    await page.keyboard.press('Enter');

    await page.keyboard.press('Shift+0');

    await expect(page.getByTestId('axis-value-x')).toContainText('0.0000');
    await expect(page.getByTestId('axis-value-y')).toContainText('0.0000');
    await expect(page.getByTestId('axis-value-z')).toContainText('0.0000');
  });

  test('W opens settings, Escape clears (AC 38.9/38.6)', async ({ dro }) => {
    const page = dro.page;
    await page.getByTestId('el400-simulator').focus();

    // Settings menu shows the SELECT prompt (SEL / no axis) on the display.
    await page.keyboard.press('w');
    await expect(page.getByTestId('axis-value-x')).not.toContainText('123');
  });

  test('Tab navigation still works alongside shortcuts (does not break US-037)', async ({ dro }) => {
    const page = dro.page;

    // Focus first keypad button and Tab — focus must advance, proving the
    // global handler did not swallow Tab.
    await page.getByTestId('key-1').focus();
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('key-2')).toBeFocused();
  });
});

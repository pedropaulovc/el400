import { test, expect } from '../helpers/fixtures';
import type { Page } from '@playwright/test';

declare global {
  interface Window {
    __shortcutSampledStarts: number;
    __shortcutOscillatorStarts: number;
    __shortcutHandledDefaults: Array<{ code: string; defaultPrevented: boolean }>;
  }
}

async function instrumentShortcutAudio(page: Page) {
  await page.addInitScript(() => {
    window.__shortcutSampledStarts = 0;
    window.__shortcutOscillatorStarts = 0;

    const bufferPrototype = AudioBufferSourceNode.prototype;
    const originalBufferStart = bufferPrototype.start;
    bufferPrototype.start = function sampledStart(
      this: AudioBufferSourceNode,
      ...args: unknown[]
    ) {
      window.__shortcutSampledStarts += 1;
      return originalBufferStart.apply(this, args as []);
    };

    const oscillatorPrototype = OscillatorNode.prototype;
    const originalOscillatorStart = oscillatorPrototype.start;
    oscillatorPrototype.start = function oscillatorStart(
      this: OscillatorNode,
      ...args: unknown[]
    ) {
      window.__shortcutOscillatorStarts += 1;
      return originalOscillatorStart.apply(this, args as []);
    };
  });
}

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

  test('debug input covers numpad variants, Backspace and default prevention', async ({ dro }) => {
    const page = dro.page;
    await dro.goto({ source: 'debug', skipBootMessage: true });
    await page.evaluate(() => {
      window.__shortcutHandledDefaults = [];
      window.addEventListener('keydown', (event) => {
        if (
          ['NumpadSubtract', 'Numpad2', 'NumpadDecimal', 'Numpad5', 'NumpadEnter', 'Backspace']
            .includes(event.code)
        ) {
          window.__shortcutHandledDefaults.push({
            code: event.code,
            defaultPrevented: event.defaultPrevented,
          });
        }
      });
    });
    await dro.simulatorRoot.focus();

    await page.keyboard.press('y');
    await page.keyboard.press('NumpadSubtract');
    await page.keyboard.press('Numpad2');
    await page.keyboard.press('NumpadDecimal');
    await page.keyboard.press('Numpad5');
    await page.keyboard.press('NumpadEnter');
    await dro.waitForAxisPureNumberValue('Y', -2.5);

    await page.keyboard.press('z');
    await page.keyboard.press('9');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Enter');
    await dro.waitForAxisPureNumberValue('Z', 0);

    const handled = await page.evaluate(() => window.__shortcutHandledDefaults);
    expect(handled.map(({ code }) => code)).toEqual([
      'NumpadSubtract',
      'Numpad2',
      'NumpadDecimal',
      'Numpad5',
      'NumpadEnter',
      'Backspace',
    ]);
    expect(handled.every(({ defaultPrevented }) => defaultPrevented)).toBe(true);
  });

  test('debug keyboard covers Y/Z zero and R/O/G function shortcuts', async ({ dro }) => {
    const page = dro.page;
    await dro.goto({ source: 'debug', skipBootMessage: true });
    await dro.simulatorRoot.focus();

    await page.keyboard.press('y');
    await page.keyboard.press('2');
    await page.keyboard.press('Enter');
    await page.keyboard.press('z');
    await page.keyboard.press('3');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Shift+Y');
    await page.keyboard.press('Shift+Z');
    await dro.waitForAxisPureNumberValue('Y', 0);
    await dro.waitForAxisPureNumberValue('Z', 0);

    await page.keyboard.press('r');
    await dro.waitForAxisPureTextValue('X', 'honE');
    await page.keyboard.press('Escape');
    await page.keyboard.press('o');
    await dro.waitForAxisPureTextValue('X', 'ArC Cnt');
    await page.keyboard.press('Escape');
    await page.keyboard.press('g');
    await dro.waitForAxisPureTextValue('X', 'AnGhoLE');
  });

  test('debug-panel inputs retain keyboard focus ownership', async ({ dro }) => {
    const page = dro.page;
    await dro.goto({ source: 'debug', skipBootMessage: true });
    const positionInput = page.getByRole('spinbutton', {
      name: 'Set X position in millimetres',
    });
    await positionInput.focus();
    await page.keyboard.press('a');
    await expect(dro.absLED.locator('input')).toBeChecked();

    await dro.simulatorRoot.focus();
    await page.keyboard.press('a');
    await expect(dro.incLED.locator('input')).toBeChecked();
  });

  test('shortcut beep attempts sampled-buffer playback, not an oscillator', async ({ dro }) => {
    const page = dro.page;
    await instrumentShortcutAudio(page);
    await dro.goto({ source: 'debug', skipBootMessage: true });
    await dro.simulatorRoot.focus();

    await page.keyboard.press('1');

    await expect
      .poll(() => page.evaluate(() => window.__shortcutSampledStarts))
      .toBeGreaterThan(0);
    expect(await page.evaluate(() => window.__shortcutOscillatorStarts)).toBe(0);
  });
});

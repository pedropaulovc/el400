/**
 * US-038: Keyboard Shortcuts — per-story demo.
 *
 * Drives the DRO entirely from the physical keyboard. The shortcut handler lives
 * on the simulator container (tabIndex=0) and is gated to fire only when focus is
 * on that container (AC 38.22) — and explicitly NOT when a button/input owns
 * focus. So we focus the container and use real page.keyboard events throughout.
 */
import { startDemo } from './helpers.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'artifacts', 'US-038');

async function main() {
  const d = await startDemo(OUT);
  const { page, snap, note, step, ledOn, bootTo, BOOT_MS } = d;
  const kb = page.keyboard;
  // Focus the simulator container so the global shortcut handler is in scope.
  const focusSim = async () => { await page.getByTestId('el400-simulator').focus(); };

  step('US-038 setup: boot to idle (?source=manual), focus the simulator container');
  await bootTo('manual');
  await page.waitForTimeout(1100);
  await focusSim();
  await note('idle, simulator focused');
  await snap('idle-focused');

  // AC 38.7 / 38.1 / 38.3: X selects axis, digits enter value, Enter confirms.
  step('AC 38.1/38.3/38.7: press X (select), type 1 2 3, Enter — value entered via keyboard');
  await kb.press('x');
  await note('X axis selected via keyboard');
  await snap('key-x-select');
  await kb.press('1'); await kb.press('2'); await kb.press('3');
  await note('typed 1 2 3 (buffered)');
  await kb.press('Enter');
  await note('Enter confirmed → X shows 123');
  await snap('digit-entry-123');

  // AC 38.5: minus toggles sign. AC 38.4 decimal. Show via a fresh value.
  step('AC 38.4/38.5: decimal point and sign toggle on a new value (X, 4 . 5, minus, Enter)');
  await kb.press('x');
  await kb.press('4'); await kb.press('Period'); await kb.press('5');
  await kb.press('Minus'); // toggle sign
  await kb.press('Enter');
  await note('entered -4.5 via . and - keys');
  await snap('decimal-sign-entry');

  // AC 38.8: Shift+X zeros the X axis.
  step('AC 38.8: Shift+X zeros the X axis');
  await kb.press('Shift+x');
  await note('Shift+X → X zeroed');
  await snap('shift-x-zero');

  // AC 38.10: A toggles ABS/INC.
  step('AC 38.10: A toggles ABS↔INC (watch the abs/inc LEDs)');
  const absBefore = await ledOn('led-abs');
  await kb.press('a');
  await page.waitForTimeout(200);
  const incAfter = await ledOn('led-inc');
  await note(`A pressed: abs(before)=${absBefore} inc(after)=${incAfter}`);
  await snap('key-a-abs-inc');
  await kb.press('a'); // back to ABS
  await page.waitForTimeout(150);

  // AC 38.11: U toggles unit inch/mm.
  step('AC 38.11: U toggles unit inch↔mm (watch the inch/mm LEDs)');
  const inchBefore = await ledOn('led-inch');
  await kb.press('u');
  await page.waitForTimeout(200);
  const mmAfter = await ledOn('led-mm');
  await note(`U pressed: inch(before)=${inchBefore} mm(after)=${mmAfter}`);
  await snap('key-u-unit');
  await kb.press('u'); // back to inch
  await page.waitForTimeout(150);

  // AC 38.13: Shift+0 zeros all axes. First enter values on Y and Z.
  step('AC 38.13: Shift+0 zeros ALL axes (set Y and Z first, then Shift+0)');
  await kb.press('y'); await kb.press('1'); await kb.press('0'); await kb.press('Enter');
  await kb.press('z'); await kb.press('2'); await kb.press('0'); await kb.press('Enter');
  await note('Y=10, Z=20 entered via keyboard');
  await snap('before-zero-all');
  await kb.press('Shift+0');
  await note('Shift+0 → all axes zeroed');
  await snap('shift-0-zero-all');

  // AC 38.9: W opens settings menu.
  step('AC 38.9: W opens the settings menu (SELECt prompt)');
  await kb.press('w');
  await note('W → setup SELECT prompt');
  await snap('key-w-settings');
  await kb.press('Escape'); // exit setup back to idle (AC 38.6 clear)
  await page.waitForTimeout(150);
  await note('Escape (clear) exited setup');

  // AC 38.2: arrow keys navigate in a function menu. Open FUNCTION (F), then arrows.
  step('AC 38.2: arrow keys navigate a function menu (F to open, Right/Left cycle)');
  await kb.press('f');
  await note('F → FUNCTION menu (CEntrE)');
  await snap('key-f-function');
  await kb.press('ArrowRight');
  await note('ArrowRight → next menu item');
  await snap('arrow-right-menu');
  await kb.press('ArrowLeft');
  await note('ArrowLeft → previous menu item');
  await kb.press('Escape'); // exit menu
  await page.waitForTimeout(150);

  // AC 38.20: S opens SDM.
  step('AC 38.20: S opens SDM');
  await kb.press('s');
  await page.waitForTimeout(1100); // SDM intro → menu
  await note('S → SDM menu');
  await snap('key-s-sdm');
  await kb.press('Escape');
  await page.waitForTimeout(150);

  // AC 38.18: K opens calculator.
  step('AC 38.18: K opens calculator');
  await kb.press('k');
  await note('K → calculator');
  await snap('key-k-calculator');
  await kb.press('k'); // exit calculator
  await page.waitForTimeout(150);

  // AC 38.14/38.17: B bolt circle, D grid hole.
  step('AC 38.14: B opens bolt circle');
  await kb.press('b');
  await page.waitForTimeout(300);
  await note('B → bolt-hole intro');
  await snap('key-b-bolt');
  await kb.press('Escape');
  await page.waitForTimeout(1100); // let any intro settle/exit

  step('AC 38.17: D opens grid hole');
  await bootTo('manual'); await page.waitForTimeout(1100); await focusSim();
  await kb.press('d');
  await page.waitForTimeout(300);
  await note('D → grid intro');
  await snap('key-d-grid');
  await kb.press('Escape');
  await page.waitForTimeout(1100);

  // AC 38.19: H halves the selected axis. Set X then H.
  step('AC 38.19: H halves the selected axis value');
  await bootTo('debug'); await page.waitForTimeout(1100); await focusSim();
  // Jog X out, select X, then H to halve.
  await d.tap('jog-x-positive'); await d.tap('jog-x-positive'); await d.tap('jog-x-positive');
  await d.tap('jog-x-positive'); await page.waitForTimeout(80);
  await focusSim();
  await kb.press('x');
  const beforeHalf = await d.readDisplay();
  await kb.press('h');
  await note(`H pressed: X ${beforeHalf.X} → halved`);
  await snap('key-h-half');

  // AC 38.22: focus gating — blur the simulator, keystrokes do nothing.
  step('AC 38.22: shortcuts only fire with simulator focused (blur → keypress is a no-op)');
  await bootTo('manual'); await page.waitForTimeout(1100);
  // Move focus OFF the simulator (focus the document body) and try a shortcut.
  await page.evaluate(() => { (document.activeElement instanceof HTMLElement) && document.activeElement.blur(); document.body.focus(); });
  const beforeBlur = await d.readDisplay();
  await kb.press('a'); // would toggle ABS/INC if focused
  await page.waitForTimeout(150);
  const absStill = await ledOn('led-abs');
  await note(`blurred: pressed 'a', abs LED still on=${absStill} (no toggle ⇒ gating works). X unchanged='${beforeBlur.X}'`);
  await snap('focus-gating-blurred');
  // Now focus and confirm it DOES work.
  await focusSim();
  await kb.press('a');
  await page.waitForTimeout(150);
  const incNow = await ledOn('led-inc');
  await note(`re-focused: 'a' now toggles → inc on=${incNow}`);
  await snap('focus-gating-refocused');

  await d.finish();
}

main().catch((e) => { console.error(e); process.exit(1); });

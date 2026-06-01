// Shared Playwright helpers for demo-presenter-2 (US-022/040/041/042/024).
// REAL UI ONLY: DOM clicks + keyboard. No window.*, no injected state.
import { chromium } from 'playwright';

export const BASE = 'http://localhost:8200';

export async function launch(opts = {}) {
  // In debug mode the DebugControlPanel is a fixed 320px-wide overlay pinned to
  // the right edge. A wide viewport keeps the centered simulator clear of it so
  // real keypad clicks land on the device, not the panel. Manual/mock flows use
  // the default width.
  const width = opts.wide ? 1760 : 1280;
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width, height: 980 } });
  const page = await ctx.newPage();
  return { browser, page };
}

// Open the simulator and wait past boot into idle.
export async function open(page, source = 'manual') {
  await page.goto(`${BASE}/?source=${source}`, { waitUntilState: 'load' });
  // Boot shows a message then transitions to idle. Wait for the keypad to be ready.
  await page.getByTestId('btn-settings').waitFor({ state: 'visible', timeout: 15000 });
  // Allow boot message dwell to clear (idle reached). axis-value testids appear in idle.
  await page.getByTestId('axis-value-x').waitFor({ state: 'attached', timeout: 15000 });
  await waitIdleValues(page);
}

// Wait until axis values are numeric (idle), not the boot text.
export async function waitIdleValues(page) {
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-testid="axis-value-x"]');
    if (!el) return false;
    const t = (el.textContent || '').trim();
    return /^-?\d/.test(t); // starts with a digit or minus => numeric readout
  }, { timeout: 15000 });
}

export async function axisValue(page, axis) {
  const el = page.getByTestId(`axis-value-${axis.toLowerCase()}`);
  return (await el.textContent())?.trim() ?? '';
}

export async function allValues(page) {
  return {
    X: await axisValue(page, 'X'),
    Y: await axisValue(page, 'Y'),
    Z: await axisValue(page, 'Z'),
  };
}

// Click a DRO button by testid (real pointer click).
export async function tap(page, testid) {
  await page.getByTestId(testid).click();
  await page.waitForTimeout(120);
}

export async function shot(page, dir, name) {
  await page.screenshot({ path: `${dir}/${name}.png` });
}

// Toggle the inch/mm unit (real in/mm key) until the readout is in mm. The device
// boots in inch; in mm a 1.000mm jog reads cleanly as 1.000 / 2.000 for the
// radius/diameter demo. Detects mm by reading the X cell after a 1mm-scale move is
// not available here, so we just toggle once (boot default is inch -> mm).
export async function toggleToMm(page) {
  await tap(page, 'btn-toggle-unit');
  await page.waitForTimeout(120);
}

// Select a debug-panel jog step size by its exact label ('0.001','0.01','0.1','1').
// Scoped to the fixed right-side debug panel so the '1' step button does not
// collide with the keypad's '1' key.
export async function setStep(page, label) {
  const panel = page.locator('div.fixed.right-0');
  await panel.getByRole('button', { name: label, exact: true }).first().click();
  await page.waitForTimeout(100);
}

// Enter setup and select an axis: wrench -> SELECt prompt -> axis button.
// On entry the X-axis value cell shows the first parameter label (e.g. 'LinEAr').
export async function enterSetup(page, axis = 'X') {
  await tap(page, 'btn-settings');
  await page.waitForTimeout(150);
  await tap(page, `axis-select-${axis.toLowerCase()}`);
  await page.waitForTimeout(150);
}

// Navigate the setup item list with the down (2) / up (8) keys.
export async function setupDown(page) { await tap(page, 'key-2'); }
export async function setupUp(page) { await tap(page, 'key-8'); }
// Cycle the highlighted parameter's choice left (4) / right (6).
export async function choiceRight(page) { await tap(page, 'key-6'); }
export async function choiceLeft(page) { await tap(page, 'key-4'); }

// Walk down the item list until the X-axis value cell shows a label matching `re`.
// Returns the number of steps taken; throws if not found within `max`.
export async function navigateToLabel(page, re, max = 20) {
  for (let i = 0; i < max; i++) {
    const v = await axisValue(page, 'X');
    if (re.test(v)) return i;
    await setupDown(page);
  }
  const v = await axisValue(page, 'X');
  if (re.test(v)) return max;
  throw new Error(`navigateToLabel: '${re}' not found; last='${v}'`);
}

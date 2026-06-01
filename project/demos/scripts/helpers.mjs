/**
 * Shared Playwright helpers for the per-story demos (demo-presenter-1).
 *
 * All interaction is through the REAL UI — DOM clicks, real keyboard events,
 * and the debug control panel's jog/probe buttons. No window.* calls, no
 * injected state, no faked localStorage, no route interception. Display values
 * are read from the screen-reader axis cells (axis-value-x/y/z), which mirror
 * the seven-segment readout exactly.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

export const BASE = 'http://localhost:8199';
export const BOOT_MS = 1100; // BOOT_MESSAGE_DURATION_MS = 1000, + margin

/** Create a demo session bound to an output directory. */
export async function startDemo(outDir) {
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('  [pageerror]', e.message));

  const log = [];
  let shotN = 0;

  const readDisplay = async () => {
    const get = async (a) => {
      try { return (await page.getByTestId(`axis-value-${a}`).textContent())?.trim() ?? ''; }
      catch { return '?'; }
    };
    return { X: await get('x'), Y: await get('y'), Z: await get('z') };
  };

  const snap = async (name) => {
    shotN += 1;
    const file = `${String(shotN).padStart(2, '0')}-${name}.png`;
    await page.waitForTimeout(120); // let React settle so the shot matches the readout
    const display = await readDisplay();
    await page.screenshot({ path: join(outDir, file) });
    console.log(`  [shot] ${file}  display=${JSON.stringify(display)}`);
    log.push({ kind: 'shot', file, display });
    return file;
  };

  const note = async (msg) => {
    const display = await readDisplay();
    console.log(`  ${msg}  ->  X='${display.X}' Y='${display.Y}' Z='${display.Z}'`);
    log.push({ kind: 'note', msg, display });
  };

  const step = (msg) => { console.log(`\n=== ${msg} ===`); log.push({ kind: 'step', msg }); };

  const tap = (tid) => page.getByTestId(tid).click();

  // Read an LED on/off state (LEDIndicator renders a disabled radio `checked={isOn}`).
  const ledOn = async (tid) => {
    try { return await page.getByTestId(tid).locator('input[type=radio]').isChecked(); }
    catch { return null; }
  };

  // Type a numeric string via the panel keypad (digits, ., -).
  const typeKeys = async (str) => {
    for (const ch of String(str)) {
      if (ch === '.') await tap('key-decimal');
      else if (ch === '-') await tap('key-sign');
      else await tap(`key-${ch}`);
      await page.waitForTimeout(40);
    }
  };

  const bootTo = async (source) => {
    await page.goto(`${BASE}/?source=${source}`);
    await page.getByTestId('el400-simulator').waitFor();
  };

  // Navigate the setup parameter list with ▲ (key-8) until X starts with a label.
  const navigateToLabel = async (labels) => {
    const matches = (x) => labels.some((l) => x.toUpperCase().startsWith(l.toUpperCase()));
    for (let i = 0; i < 24; i++) {
      const d = await readDisplay();
      if (matches(d.X)) return d;
      await page.getByTestId('key-8').click();
      await page.waitForTimeout(70);
    }
    const d = await readDisplay();
    console.log(`  [warn] navigateToLabel(${labels}) no match; at X='${d.X}'`);
    return d;
  };

  // Poll until X starts with one of `labels` (no action between polls).
  const waitForX = async (labels) => {
    const matches = (x) => labels.some((l) => x.toUpperCase().startsWith(l.toUpperCase()));
    for (let i = 0; i < 20; i++) {
      const d = await readDisplay();
      if (matches(d.X)) return d;
      await page.waitForTimeout(100);
    }
    const d = await readDisplay();
    console.log(`  [warn] waitForX(${labels}) no match; at X='${d.X}'`);
    return d;
  };

  const finish = async () => {
    writeFileSync(join(outDir, 'driver-log.json'), JSON.stringify(log, null, 2));
    await browser.close();
    console.log('\nDemo complete.');
  };

  return {
    page, browser, log, outDir,
    readDisplay, snap, note, step, tap, ledOn, typeKeys, bootTo,
    navigateToLabel, waitForX, finish,
  };
}

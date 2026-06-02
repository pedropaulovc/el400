/**
 * Forced-colors (Windows High Contrast) demo capture + AC verification for US-034.
 * Drives the REAL app under Playwright's forced-colors emulation — the same
 * `@media (forced-colors: active)` path Windows High Contrast triggers — takes a
 * real keypad entry, screenshots dark + light high-contrast themes plus a normal
 * baseline, and computes the AC contrast ratios using the project's contrast-utils.
 */
import { chromium, type BrowserContext } from '@playwright/test';

import {
  getContrastRatio,
  isTransparentColor,
  parseColor,
} from '../../../src/tests/contrast-utils';

const BASE = 'http://localhost:9123/';
const DIR = 'spec/demo/us-034-forced-colors-mode';

type Rgb = [number, number, number];

const resolve = (raw: string, fallback: Rgb): Rgb =>
  isTransparentColor(raw) ? fallback : (parseColor(raw) ?? fallback);

async function probe(ctx: BrowserContext, label: string, file: string) {
  const page = await ctx.newPage();
  // esbuild/tsx injects a __name helper into evaluate() bodies; define it in-page.
  await page.addInitScript('globalThis.__name = globalThis.__name || function (f) { return f; };');
  await page.goto(BASE);
  await page.waitForSelector('.seven-segment-digit');
  // Wait for boot to finish so we capture the live readout, not the boot splash.
  await page.waitForSelector('[data-dro-state="idle"]', { timeout: 5000 });

  // Real user action: select the X axis. The selected button renders with the
  // system Highlight color, demonstrating accent colors survive forced-colors.
  await page.getByRole('button', { name: /select x axis/i }).click();
  await page.waitForTimeout(150);

  await page.screenshot({ path: `${DIR}/${file}`, fullPage: true });

  // Resolve system colors as the page sees them.
  const sys = await page.evaluate(() => {
    const read = (c: string) => {
      const el = document.createElement('div');
      el.style.color = c;
      el.style.display = 'none';
      document.body.appendChild(el);
      const v = getComputedStyle(el).color;
      el.remove();
      return v;
    };
    return { Canvas: read('Canvas'), CanvasText: read('CanvasText'), ButtonText: read('ButtonText'), ButtonFace: read('ButtonFace') };
  });
  const canvas = parseColor(sys.Canvas) ?? [0, 0, 0];
  const buttonFace = parseColor(sys.ButtonFace) ?? canvas;

  const m = await page.evaluate(() => {
    const cs = (sel: string, prop: string) => {
      const el = document.querySelector(sel) as HTMLElement | null;
      return el ? getComputedStyle(el)[prop as never] as string : '';
    };
    const seg = document.querySelector('.seven-segment-digit') as HTMLElement | null;
    return {
      litBg: cs('.seg-on', 'backgroundColor'),
      offBg: cs('.seg-off', 'backgroundColor'),
      segParentBg: seg ? getComputedStyle(seg.parentElement ?? seg).backgroundColor : '',
      btnBorderWidth: cs('button.dro-button', 'borderTopWidth'),
      btnBorderStyle: cs('button.dro-button', 'borderTopStyle'),
      btnBorderColor: cs('button.dro-button', 'borderTopColor'),
      btnColor: cs('button.dro-button', 'color'),
      btnBg: cs('button.dro-button', 'backgroundColor'),
      activeColor: cs('.mode-indicator-active', 'color'),
      activeShadow: cs('.mode-indicator-active', 'textShadow'),
      inactiveColor: cs('.mode-indicator-inactive', 'color'),
    };
  });

  const segBg = resolve(m.segParentBg, canvas);
  const lit = resolve(m.litBg, canvas);
  const off = resolve(m.offBg, segBg);
  const active = resolve(m.activeColor, canvas);
  const inactive = resolve(m.inactiveColor, segBg);
  const btnText = resolve(m.btnColor, canvas);

  const segContrast = getContrastRatio(lit, segBg);
  const offContrast = getContrastRatio(off, segBg);
  const btnContrast = getContrastRatio(btnText, buttonFace);
  const activeContrast = getContrastRatio(active, segBg);
  const inactiveContrast = getContrastRatio(inactive, segBg);

  console.log(`\n=== ${label} ===`);
  console.log(`system: Canvas=${sys.Canvas} CanvasText=${sys.CanvasText} ButtonText=${sys.ButtonText} ButtonFace=${sys.ButtonFace}`);
  console.log(`AC 34.1 lit-seg vs bg contrast      : ${segContrast.toFixed(1)}:1  (>= 20 ${segContrast >= 20 ? 'PASS' : 'check'})`);
  console.log(`AC 34.2/34.3 off-seg vs bg contrast : ${offContrast.toFixed(2)}:1 (~1:1, <1.5 ${offContrast < 1.5 ? 'PASS' : 'check'}; off raw="${m.offBg}")`);
  console.log(`AC 34.4 button border               : ${m.btnBorderWidth} ${m.btnBorderStyle} ${m.btnBorderColor} (${m.btnBorderWidth === '2px' && m.btnBorderStyle !== 'none' ? 'PASS' : 'check'})`);
  console.log(`AC 34.6 button text vs face contrast: ${btnContrast.toFixed(1)}:1  (>= 17 ${btnContrast >= 17 ? 'PASS' : 'check'})`);
  console.log(`AC 34.5 button-face vs lit-seg fill  : btnBg=${m.btnBg} litSeg=${m.litBg} (${m.btnBg !== m.litBg ? 'distinct PASS' : 'SAME'})`);
  console.log(`AC 34.8 active indicator contrast   : ${activeContrast.toFixed(1)}:1 (>= 17 ${activeContrast >= 17 ? 'PASS' : 'check'}); glow textShadow="${m.activeShadow}" (${m.activeShadow === 'none' ? 'no-glow PASS' : 'check'})`);
  console.log(`AC 34.3 inactive indicator contrast : ${inactiveContrast.toFixed(2)}:1 (~1:1, <1.5 ${inactiveContrast < 1.5 ? 'PASS' : 'check'})`);

  await page.close();
}

(async () => {
  const browser = await chromium.launch();

  const normal = await browser.newContext({ colorScheme: 'dark' });
  await probe(normal, 'NORMAL (no forced colors, baseline)', '01-normal-baseline.png');
  await normal.close();

  const dark = await browser.newContext({ forcedColors: 'active', colorScheme: 'dark' });
  await probe(dark, 'FORCED-COLORS active + dark theme', '02-forced-colors-dark.png');
  await dark.close();

  const light = await browser.newContext({ forcedColors: 'active', colorScheme: 'light' });
  await probe(light, 'FORCED-COLORS active + light theme', '03-forced-colors-light.png');
  await light.close();

  await browser.close();
  console.log('\nScreenshots written to', DIR);
})();

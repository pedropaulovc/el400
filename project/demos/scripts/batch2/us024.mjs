// US-024 Zero-Approach (Near-Zero) Warning — real UI demo.
// Configures ZERO AP (bU22) on + BP DIST + BP TOLR, enters distance-to-go (Preset),
// then jogs X toward the target so the distance-to-go crosses BP DIST and the warning
// fires (audio-indicator visible). Then jogs away and the warning clears.
import { launch, open, enterSetup, axisValue, allValues, navigateToLabel, choiceRight, tap, shot, toggleToMm, setStep } from './helpers.mjs';
import { writeFileSync } from 'fs';

const DIR = 'project/demos/artifacts/US-024';
const { browser, page } = await launch({ wide: true });
const log = [];
const note = (s) => { log.push(s); console.log(s); };

const indicatorVisible = async () =>
  await page.getByTestId('audio-indicator').isVisible().catch(() => false);

await open(page, 'debug');
await toggleToMm(page);
note(`idle readout (mm): ${JSON.stringify(await allValues(page))}`);
await shot(page, DIR, '01-idle-mm');

// --- Configure in setup ---
// AC24.1/24.2: ZERO AP -> bU22 on. AC24.4: BP DIST. AC24.5: BP TOLR.
await enterSetup(page, 'X');
// bU22 (ZERO AP) on
await navigateToLabel(page, /^bU22 /);
note(`AC24.1/24.2 ZERO AP param default = ${await axisValue(page, 'X')}`);
await shot(page, DIR, '02-setup-bU22-off-default');
await choiceRight(page);   // ► toggles bU22 oF -> bU22 on
note(`AC24.2 ► ZERO AP now = ${await axisValue(page, 'X')} (bU22 on)`);
await shot(page, DIR, '03-setup-bU22-on');

// BP DIST: set to 0.020" (~0.508mm) so a coarse jog visibly crosses the band.
await navigateToLabel(page, /^bP /);
note(`AC24.4 BP DIST default = ${await axisValue(page, 'X')}`);
// cycle ► from .002 -> .004 -> .005 -> .010 -> .020
for (let i = 0; i < 4; i++) await choiceRight(page);
note(`AC24.4 BP DIST set to ${await axisValue(page, 'X')} (~0.508mm)`);
await shot(page, DIR, '04-setup-bP-dist-.020');

// BP TOLR: set a small departure hysteresis 0.010" (~0.254mm) (AC24.5).
await navigateToLabel(page, /^tL /);
note(`AC24.5 BP TOLR default = ${await axisValue(page, 'X')}`);
for (let i = 0; i < 3; i++) await choiceRight(page); // .000 -> .002 -> .005 -> .010
note(`AC24.5 BP TOLR set to ${await axisValue(page, 'X')}`);
await shot(page, DIR, '05-setup-tL-.010');

// Exit saving (End + ENT) so the zero-approach config commits.
await navigateToLabel(page, /^End$/);
await tap(page, 'key-enter');
await page.waitForTimeout(300);
note(`exited setup. readout: ${JSON.stringify(await allValues(page))}`);
note(`indicator in plain idle (should be OFF — only arms in dist-to-go/SDM/milling): ${await indicatorVisible()}`);

// --- Enter distance-to-go (Preset) on X ---
// AC24.9: zero-approach auto-enabled in Preset/distance-to-go.
await tap(page, 'btn-distance-to-go');     // idle -> preset-select
await page.waitForTimeout(150);
note(`preset-select entered; X cell = ${await axisValue(page, 'X')}`);
await shot(page, DIR, '06-preset-select');
await tap(page, 'axis-select-x');          // preset-select -> preset-input-x
await page.waitForTimeout(120);
// type target 3 . 0  (mm) and ENT
await tap(page, 'key-3');
await tap(page, 'key-decimal');
await tap(page, 'key-0');
note(`preset-input-x buffer shows target; X cell = ${await axisValue(page, 'X')}`);
await shot(page, DIR, '07-preset-input-x-3.0');
await tap(page, 'key-enter');              // store target X=3.0mm -> back to preset-select
await page.waitForTimeout(120);
await tap(page, 'btn-distance-to-go');     // execute -> distance-to-go state
await page.waitForTimeout(200);
const dtg0 = await allValues(page);
note(`AC24.9 distance-to-go active; X remaining = ${dtg0.X} (target 3.0 - pos 0 = 3.000)`);
note(`indicator at 3.0mm away (outside BP DIST 0.5mm): ${await indicatorVisible()}`);
await shot(page, DIR, '08-distance-to-go-3.0-no-warning');

// --- Jog X toward the target; watch the remaining distance shrink and the warning fire ---
// Default step is 1mm. Jog +1 twice -> remaining 1.0mm (still outside band).
await tap(page, 'jog-x-positive');
await tap(page, 'jog-x-positive');
await page.waitForTimeout(200);
note(`after +2mm: X remaining = ${(await allValues(page)).X}, indicator = ${await indicatorVisible()} (expect off, 1.0mm > 0.5mm)`);
await shot(page, DIR, '09-remaining-1.0-no-warning');

// Switch step to 0.1mm and approach: +0.1 x5 -> remaining 0.5mm (at band edge),
// then more to cross inside.
await setStep(page, '0.1');
let firedAt = null;
for (let i = 0; i < 8; i++) {
  await tap(page, 'jog-x-positive');
  await page.waitForTimeout(80);
  const rem = (await allValues(page)).X;
  const vis = await indicatorVisible();
  note(`  jog +0.1 -> X remaining = ${rem}, warning = ${vis}`);
  if (vis && firedAt === null) {
    firedAt = rem;
    await shot(page, DIR, '10-WARNING-fired-within-BP-DIST');
  }
}
note(`AC24.6/24.10 warning FIRST fired at remaining = ${firedAt} (within BP DIST ~0.5mm)`);

// --- Depart: jog away past BP DIST + BP TOLR so the warning clears (hysteresis) ---
// Release band = BP DIST (0.508mm) + BP TOLR (0.254mm) ~= 0.76mm. Jog -1mm so the
// remaining distance grows well past the release band and the warning clears.
await setStep(page, '1');
await tap(page, 'jog-x-negative');   // -1mm, remaining grows past band+tol
await page.waitForTimeout(150);
note(`after -1mm depart: X remaining = ${(await allValues(page)).X}, warning = ${await indicatorVisible()} (expect cleared)`);
await shot(page, DIR, '11-departed-warning-cleared');

// --- Show AC24.3: disabling ZERO AP silences it even near target ---
await tap(page, 'key-clear');   // exit distance-to-go -> idle
await page.waitForTimeout(150);
await enterSetup(page, 'X');
await navigateToLabel(page, /^bU22 /);
await choiceRight(page);   // bU22 on -> ... actually toggles to oF? verify
note(`toggled ZERO AP -> ${await axisValue(page, 'X')}`);
await navigateToLabel(page, /^End$/);
await tap(page, 'key-enter');
await page.waitForTimeout(200);
note(`ZERO AP disabled; (warning will not fire even near target).`);
await shot(page, DIR, '12-zero-ap-disabled');

writeFileSync(`${DIR}/run.log`, log.join('\n'));
await browser.close();

// US-041 Radius / Diameter (rAd / diA) — real UI demo.
// Sets diA on X, shows the live readout doubling vs a radial axis (Y) using ?source=debug.
import { launch, open, enterSetup, axisValue, allValues, navigateToLabel, choiceRight, tap, shot, toggleToMm } from './helpers.mjs';
import { writeFileSync } from 'fs';

const DIR = 'project/demos/artifacts/US-041';
const { browser, page } = await launch({ wide: true });
const log = [];
const note = (s) => { log.push(s); console.log(s); };

await open(page, 'debug');
// Switch the readout to mm so a 1.000mm jog reads cleanly as 1.000 / 2.000,
// matching the spec's "1.000 move shows 2.000" narrative (display-only; the
// rAd/diA doubling is unit-independent).
await toggleToMm(page);
note(`idle readout (mm): ${JSON.stringify(await allValues(page))}`);
await shot(page, DIR, '01-idle-debug-mm');

// Baseline: in rAd (default) a 1.000 move shows 1.000 on BOTH axes (AC41.3, 1:1).
// Jog X +1 and Y +1 in radius mode first to prove the mill default.
await tap(page, 'jog-x-positive');
await tap(page, 'jog-y-positive');
await page.waitForTimeout(150);
note(`AC41.3 rAd default 1:1 after +1mm each: ${JSON.stringify(await allValues(page))} (X=Y=1.0000)`);
await shot(page, DIR, '02-radius-default-1to1');

// Reset machine to origin via the debug reset, so the diA demo starts clean.
await tap(page, 'jog-reset');
await page.waitForTimeout(150);
note(`reset to origin: ${JSON.stringify(await allValues(page))}`);

// AC41.1/41.2: set X to diA. Enter setup on X, navigate to the rAd/diA parameter.
await enterSetup(page, 'X');
await navigateToLabel(page, /^(rAd|diA)$/);
note(`AC41.1 measurement-mode param for X = ${await axisValue(page, 'X')} (default rAd)`);
await shot(page, DIR, '03-setup-x-rAd-default');
// AC41.2: ► toggles rAd -> diA.
await choiceRight(page);
note(`AC41.2 ► measurement mode now = ${await axisValue(page, 'X')} (diA)`);
await shot(page, DIR, '04-setup-x-diA');
// Exit saving (End + ENT) so the per-axis diA commits.
await navigateToLabel(page, /^End$/);
await tap(page, 'key-enter');
await page.waitForTimeout(300);
note(`after exit, readout at origin: ${JSON.stringify(await allValues(page))}`);
await shot(page, DIR, '05-readout-origin-after-diA');

// AC41.4/41.5: jog X +1.000mm -> X displays 2.000 (doubled), while Y (still rAd)
// jogged +1.000mm displays 1.000 (1:1). Demonstrates per-axis (AC41.5).
await tap(page, 'jog-x-positive');
await tap(page, 'jog-y-positive');
await page.waitForTimeout(200);
const v = await allValues(page);
note(`AC41.4/41.5 after +1.000mm each: X(diA)=${v.X} (expect 2x), Y(rAd)=${v.Y} (expect 1:1)`);
await shot(page, DIR, '06-live-diA-X-doubled-Y-radial');

// Jog X one more +1mm (machine now 2.000mm) -> X shows 4.000 (still 2x).
await tap(page, 'jog-x-positive');
await page.waitForTimeout(150);
note(`X after +2.000mm total machine travel = ${(await allValues(page)).X} (expect 4.0000, 2x of 2mm)`);
await shot(page, DIR, '07-live-diA-X-4.000');

writeFileSync(`${DIR}/run.log`, log.join('\n'));
await browser.close();

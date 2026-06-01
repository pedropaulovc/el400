// US-040 Counting Mode (LinEAr / AnGULAr) + angular dP DMS formats — real UI demo.
// Includes the US-040-dms follow-up: angular axis dP offers dd.mn / dd.mn.SS / dd.dEC,
// and the chosen format drives the live readout (jog via ?source=debug).
import { launch, open, enterSetup, axisValue, allValues, navigateToLabel, choiceRight, choiceLeft, setupDown, tap, shot } from './helpers.mjs';
import { writeFileSync } from 'fs';

const DIR = 'project/demos/artifacts/US-040';
const { browser, page } = await launch({ wide: true });
const log = [];
const note = (s) => { log.push(s); console.log(s); };

// Use debug source so we can jog the X axis to demonstrate the live angular readout.
await open(page, 'debug');
note(`idle readout (linear default): ${JSON.stringify(await allValues(page))}`);
await shot(page, DIR, '01-idle-debug');

// AC 40.1: first setup parameter for a selected axis is LinEAr (default).
await enterSetup(page, 'X');
note(`AC40.1 first param for X = ${await axisValue(page, 'X')} (default LinEAr)`);
await shot(page, DIR, '02-counting-mode-LinEAr-default');

// AC 40.2: ► toggles LinEAr <-> AnGULAr.
await choiceRight(page);
note(`AC40.2 ► counting mode now = ${await axisValue(page, 'X')}`);
await shot(page, DIR, '03-counting-mode-AnGULAr');

// AC 40.3/40.4: with AnGULAr selected, navigate to dP — it now offers the angular
// DMS formats instead of the linear micron values.
await navigateToLabel(page, /^dd\./);
note(`AC40.4 dP for angular axis first format = ${await axisValue(page, 'X')} (dd.mn, the angular default)`);
await shot(page, DIR, '04-angular-dP-dd.mn');
await choiceRight(page);
note(`► dP = ${await axisValue(page, 'X')}`);
await shot(page, DIR, '05-angular-dP-dd.mn.SS');
const fmt2 = await axisValue(page, 'X');
await choiceRight(page);
note(`► dP = ${await axisValue(page, 'X')}`);
await shot(page, DIR, '06-angular-dP-dd.dEC');
// Pick dd.mn.SS (degrees-minutes-seconds) for the live readout demo.
await choiceLeft(page);
note(`◄ back to ${await axisValue(page, 'X')} (selected for readout)`);
await shot(page, DIR, '07-angular-dP-selected-dd.mn.SS');

// Exit setup saving the committed angular mode + format (End + ENT).
await navigateToLabel(page, /^End$/);
await tap(page, 'key-enter');
await page.waitForTimeout(300);
note(`after exit, X readout (angular, 0deg) = ${(await allValues(page)).X}`);
await shot(page, DIR, '08-readout-angular-zero');

// Open the debug control panel and jog X to 12.5 mm -> read as 12.5 degrees -> 12.30.00.
// The debug panel auto-shows in ?source=debug. Jog using step 0.1 x125, or set step.
// Use the jog-x-positive button. First set step size to 0.1 then click 125 times is slow;
// instead use the step buttons: default step is 1 (1 unit). 12 clicks of +1 then 5 of +0.1.
// Set step size: the panel has STEP_SIZES [0.001,0.01,0.1,1]; default selected is 1.
// Jog +1 twelve times.
for (let i = 0; i < 12; i++) await tap(page, 'jog-x-positive');
note(`after 12x jog +1 (12mm -> 12deg), X = ${(await allValues(page)).X}`);
// Now switch step to 0.1 and jog +0.1 five times to reach 12.5.
await page.getByRole('button', { name: '0.1', exact: true }).click();
await page.waitForTimeout(100);
for (let i = 0; i < 5; i++) await tap(page, 'jog-x-positive');
await page.waitForTimeout(200);
const x125 = (await allValues(page)).X;
note(`LIVE angular readout at 12.5deg in dd.mn.SS = ${x125} (expect 12.30.00 = 12 deg 30' 00")`);
await shot(page, DIR, '09-live-readout-12.30.00');

// Demonstrate wrap at 360: jog further would be many clicks; instead show another angle.
// Jog to a non-integer to show seconds: +0.1 once more -> 12.6deg = 12.36.00.
await tap(page, 'jog-x-positive');
await page.waitForTimeout(150);
note(`12.6deg in dd.mn.SS = ${(await allValues(page)).X} (expect 12.36.00)`);
await shot(page, DIR, '10-live-readout-12.36.00');

writeFileSync(`${DIR}/run.log`, log.join('\n'));
await browser.close();

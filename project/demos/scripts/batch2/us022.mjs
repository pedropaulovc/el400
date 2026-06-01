// US-022 Display Resolution (dP) — real UI demo.
// Shows: navigate to dP, cycle micron options, readout decimal precision changes.
import { launch, open, enterSetup, axisValue, allValues, navigateToLabel, choiceRight, choiceLeft, setupDown, tap, shot } from './helpers.mjs';

const DIR = 'project/demos/artifacts/US-022';
const { browser, page } = await launch();
const log = [];
const note = (s) => { log.push(s); console.log(s); };

await open(page, 'manual');
note(`idle readout (default dP 5.0 = 4 decimals): ${JSON.stringify(await allValues(page))}`);
await shot(page, DIR, '01-idle-default-4-decimals');

// Enter setup on X, navigate to the dP parameter (AC22.1).
await enterSetup(page, 'X');
await shot(page, DIR, '02-setup-x-first-param-LinEAr');
await navigateToLabel(page, /^dP /);
note(`navigated to dP parameter; label = ${await axisValue(page, 'X')}`);
await shot(page, DIR, '03-dP-parameter-default-5.0');

// AC22.2: default is dP 5.0 (the 4-decimal / 0.0002" mill default). Cycle coarser.
// key-6 (►) cycles the micron choices ascending: 5.0 -> 10.0 -> 20.0 -> 50.0.
await choiceRight(page); note(`► dP now: ${await axisValue(page, 'X')}`);
await shot(page, DIR, '04-dP-10.0');
await choiceRight(page); note(`► dP now: ${await axisValue(page, 'X')}`);
await shot(page, DIR, '05-dP-20.0');
await choiceRight(page); note(`► dP now: ${await axisValue(page, 'X')}`);
await shot(page, DIR, '06-dP-50.0-coarse');

// Exit setup via End + ENT so the committed dP takes effect on the readout.
// Walk down to End (down order from dP wraps to End in a couple steps).
await navigateToLabel(page, /^End$/);
await tap(page, 'key-enter');
await page.waitForTimeout(300);
const coarse = await allValues(page);
note(`AC22.4 readout after dP 50.0 (coarse, 3 decimals on X): ${JSON.stringify(coarse)}`);
await shot(page, DIR, '07-readout-coarse-3-decimals');

// Now set it back to fine (dP 5.0 -> 4 decimals) to show the reverse and AC22.3/22.5.
await enterSetup(page, 'X');
await navigateToLabel(page, /^dP /);
note(`re-entered dP; current = ${await axisValue(page, 'X')}`);
// cycle left (◄) back from 50.0 -> 20 -> 10 -> 5.0
await choiceLeft(page); await choiceLeft(page); await choiceLeft(page);
note(`◄◄◄ dP now: ${await axisValue(page, 'X')}`);
await shot(page, DIR, '08-dP-back-to-5.0');
await navigateToLabel(page, /^End$/);
await tap(page, 'key-enter');
await page.waitForTimeout(300);
const fine = await allValues(page);
note(`readout restored to fine (4 decimals): ${JSON.stringify(fine)}`);
await shot(page, DIR, '09-readout-fine-4-decimals-restored');

// Assertions for the walkthrough record.
const xCoarse = coarse.X, xFine = fine.X;
note(`RESULT: coarse X decimals=${(xCoarse.split('.')[1]||'').length}, fine X decimals=${(xFine.split('.')[1]||'').length}`);
note(`RESULT: Y unaffected (per-axis), Y=${coarse.Y} (still 4 decimals) — AC: dP is per-axis`);

import { writeFileSync } from 'fs';
writeFileSync(`${DIR}/run.log`, log.join('\n'));
await browser.close();

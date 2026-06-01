// US-042 Encoder-Fail Warning (EnF on/oFF) — real UI demo.
// Toggles EnF on in setup, then uses the debug panel's encoder signal-loss button
// to drop X's signal -> X shows `no SIG`; restoring clears it. Also shows EnF oFF silent.
import { launch, open, enterSetup, axisValue, allValues, navigateToLabel, choiceRight, tap, shot } from './helpers.mjs';
import { writeFileSync } from 'fs';

const DIR = 'project/demos/artifacts/US-042';
const { browser, page } = await launch({ wide: true });
const log = [];
const note = (s) => { log.push(s); console.log(s); };

await open(page, 'debug');
note(`idle readout: ${JSON.stringify(await allValues(page))}`);
await shot(page, DIR, '01-idle-debug');

// FIRST: show AC42.4 — with EnF oFF (default), a lost signal is SILENT.
note('--- AC42.4: EnF oFF (default) -> signal loss is silent ---');
await tap(page, 'signal-toggle-x');   // drop X encoder signal while EnF is off
await page.waitForTimeout(200);
note(`AC42.4 EnF oFF, X signal dropped: X readout = ${(await allValues(page)).X} (still numeric, no warning)`);
await shot(page, DIR, '02-EnF-off-signal-lost-silent');
// restore X signal before configuring
await tap(page, 'signal-toggle-x');
await page.waitForTimeout(150);
note(`restored X signal: ${JSON.stringify(await allValues(page))}`);

// AC42.1/42.2/42.6: enable EnF in setup. EnF is global (applies to all axes).
await enterSetup(page, 'X');
await navigateToLabel(page, /^EnF /);
note(`AC42.1 EnF param default = ${await axisValue(page, 'X')} (EnF oFF)`);
await shot(page, DIR, '03-setup-EnF-oFF-default');
await choiceRight(page);   // ► toggles EnF oFF -> EnF on
note(`AC42.2 ► EnF now = ${await axisValue(page, 'X')} (EnF on)`);
await shot(page, DIR, '04-setup-EnF-on');
// Exit saving (End + ENT). EnF commits on change (recommended on, AC42.6).
await navigateToLabel(page, /^End$/);
await tap(page, 'key-enter');
await page.waitForTimeout(300);
note(`exited setup, EnF on. readout: ${JSON.stringify(await allValues(page))}`);

// AC42.3: with EnF on, drop X's encoder signal -> X shows `no SIG`.
note('--- AC42.3: EnF on -> signal loss shows `no SIG` ---');
await tap(page, 'signal-toggle-x');
await page.waitForTimeout(250);
const lost = await allValues(page);
note(`AC42.3 X signal lost with EnF on: X = "${lost.X}" (expect "no SIG"), Y = ${lost.Y} (unaffected)`);
await shot(page, DIR, '05-EnF-on-X-no-SIG');

// AC42.2 global: drop Y too -> Y also shows `no SIG` (global setting, all axes).
await tap(page, 'signal-toggle-y');
await page.waitForTimeout(200);
const lost2 = await allValues(page);
note(`AC42.2 global: Y signal also lost: X="${lost2.X}" Y="${lost2.Y}" Z=${lost2.Z}`);
await shot(page, DIR, '06-EnF-on-X-and-Y-no-SIG');

// AC42.5: restore X's signal -> warning clears automatically on X (Y still no SIG).
await tap(page, 'signal-toggle-x');
await page.waitForTimeout(250);
const restoredX = await allValues(page);
note(`AC42.5 X signal restored: X = ${restoredX.X} (numeric again), Y still "${restoredX.Y}"`);
await shot(page, DIR, '07-EnF-on-X-restored-Y-still-no-SIG');

// restore Y too.
await tap(page, 'signal-toggle-y');
await page.waitForTimeout(200);
note(`both restored: ${JSON.stringify(await allValues(page))}`);
await shot(page, DIR, '08-both-restored');

writeFileSync(`${DIR}/run.log`, log.join('\n'));
await browser.close();

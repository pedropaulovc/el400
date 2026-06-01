/**
 * US-010: SDM Direct Entry (Program Mode) — per-story demo.
 *
 * Manual §8.2.1. Program sub-datum points by typing coordinates, advancing with
 * 6►, and jumping to a specific step with Y. ?source=manual is enough (direct
 * entry needs no machine motion); coordinates are typed on the keypad.
 */
import { startDemo } from './helpers.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'artifacts', 'US-010');

async function main() {
  const d = await startDemo(OUT);
  const { page, snap, note, step, tap, typeKeys, bootTo } = d;

  step('US-010 setup: boot to idle (?source=manual)');
  await bootTo('manual');
  await page.waitForTimeout(1100);
  await snap('idle');

  // AC 10.1: SDM → ProGrAn → ENT.
  step('AC 10.1: enter SDM, navigate to ProGrAn, press ENT');
  await tap('btn-sdm');
  await page.waitForTimeout(1100); // SDM intro → menu (LEArn)
  await note('SDM menu opens at LEArn');
  await snap('sdm-menu-learn');
  // Ring: learn → run → program. ►► reaches Program.
  await tap('key-6'); await page.waitForTimeout(80);
  await tap('key-6'); await page.waitForTimeout(80);
  await note('cycled to ProGrAn');
  await snap('sdm-menu-program');
  await tap('key-enter');

  // AC 10.2: display shows the step prompt (StEP / step number).
  await note('AC 10.2: step prompt shown (StEP / 1)');
  await snap('step-prompt');

  // AC 10.3: enter coordinates for X, Y, Z for step 1.
  step('AC 10.3: program step 1 coordinates X=50, Y=25, Z=10');
  await tap('key-enter'); // enter coordinate entry, editing X
  await note('editing X coordinate');
  await snap('step1-edit-x');
  await typeKeys('50');
  await note('typed X=50');
  await snap('step1-x-50');
  await tap('key-enter'); // confirm X → edit Y
  await typeKeys('25');
  await tap('key-enter'); // confirm Y → edit Z
  await typeKeys('10');
  await note('typed Y=25, Z=10');
  await snap('step1-coords');
  await tap('key-enter'); // confirm Z → back to step view (step 1 stored)
  await note('step 1 stored, back at step view');
  await snap('step1-stored');

  // AC 10.4: 6► saves and advances to the next step.
  step('AC 10.4: press 6► to advance to step 2');
  await tap('key-6');
  await note('advanced to step 2 (StEP / 2)');
  await snap('step2-view');
  // Program a quick step 2 to show the sequence continuing.
  await tap('key-enter'); await typeKeys('100'); await tap('key-enter'); // X=100
  await typeKeys('0'); await tap('key-enter'); // Y=0
  await typeKeys('0'); await tap('key-enter'); // Z=0 → back to step 2 view
  await note('step 2 programmed X=100');
  await snap('step2-stored');

  // AC 10.5: jump to a specific step with Y, then a number, then ENT.
  step('AC 10.5: jump to step 5 via Y → 5 → ENT');
  await tap('axis-select-y'); // open jump prompt
  await note('jump-to-step prompt opened');
  await snap('jump-prompt');
  await typeKeys('5');
  await note('typed target step 5');
  await snap('jump-typed-5');
  await tap('key-enter');
  await note('jumped to step 5 (StEP / 5)');
  await snap('jumped-step5');

  // AC 10.6: C exits.
  step('AC 10.6: press C to exit Program mode');
  await tap('key-clear');
  await page.waitForTimeout(150);
  await note('exited to idle');
  await snap('exited-idle');

  await d.finish();
}

main().catch((e) => { console.error(e); process.exit(1); });

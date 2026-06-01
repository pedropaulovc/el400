/**
 * US-011: SDM Recall (Run Mode) — per-story demo.
 *
 * Manual §8.2.3. First program two sub-datum points (so there is something to
 * recall), then enter Run mode, select a step, and watch the live distance-to-go
 * track the machine as we jog toward zero. ?source=debug for real motion.
 */
import { startDemo } from './helpers.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'artifacts', 'US-011');

async function programStep(d, coords) {
  // Assumes we are at the sdm-program-step view. Enter coords for X,Y,Z.
  const { tap, typeKeys } = d;
  await tap('key-enter'); // edit X
  await typeKeys(coords.x); await tap('key-enter');
  await typeKeys(coords.y); await tap('key-enter');
  await typeKeys(coords.z); await tap('key-enter'); // back to step view
}

async function main() {
  const d = await startDemo(OUT);
  const { page, snap, note, step, tap, bootTo } = d;

  step('US-011 setup: boot (?source=debug), program steps 1 (X10 Y20 Z5) and 2 (X30 Y0 Z0)');
  await bootTo('debug');
  await page.waitForTimeout(1100);
  await tap('btn-sdm');
  await page.waitForTimeout(1100); // intro → menu
  await tap('key-6'); await page.waitForTimeout(80); // run
  await tap('key-6'); await page.waitForTimeout(80); // program
  await tap('key-enter'); // step 1 prompt
  await tap('key-enter'); // (re-enter to coord entry at step 1)... see note
  // Actually after the first ENT we are at the step prompt; the helper expects
  // the step-view. Step 1: program coords now.
  // (programStep enters coord entry via its own first ENT)
  // To avoid a double-enter, program directly here:
  await d.typeKeys('10'); await tap('key-enter'); // X=10
  await d.typeKeys('20'); await tap('key-enter'); // Y=20
  await d.typeKeys('5');  await tap('key-enter'); // Z=5 → back to step view (step 1)
  await note('step 1 programmed X10 Y20 Z5');
  await tap('key-6'); await page.waitForTimeout(80); // advance to step 2
  await programStep(d, { x: '30', y: '0', z: '0' });
  await note('step 2 programmed X30 Y0 Z0');
  await tap('key-clear'); // exit program mode
  await page.waitForTimeout(150);
  await snap('after-programming');

  // AC 11.1: enter Run mode.
  step('AC 11.1: SDM → navigate to rUn → ENT');
  await tap('btn-sdm');
  await page.waitForTimeout(1100); // intro → menu (LEArn)
  await tap('key-6'); await page.waitForTimeout(80); // run
  await note('SDM menu at rUn');
  await snap('sdm-menu-run');
  await tap('key-enter'); // run step-select prompt

  // AC 11.2: enter / start at step 1.
  await note('AC 11.2: run step-select prompt (rUn / 1)');
  await snap('run-step-select');

  // AC 11.3: ENT shows Distance-to-Go for the selected step.
  step('AC 11.3: ENT → distance-to-go for step 1 (target X10 Y20 Z5 minus live pos)');
  await tap('key-enter');
  await note('DTG for step 1 (machine at origin)');
  await snap('run-dtg-step1');

  // AC 11.5: the SDM LED glows during Run operation.
  step('AC 11.5: confirm the SDM LED glows during Run');
  const sdmLed = await d.ledOn('led-sdm');
  await note(`SDM LED on during Run = ${sdmLed}`);
  await snap('run-sdm-led');

  // Jog toward the target so the DTG visibly shrinks (live recall, §8.2.3).
  step('AC 11.3 (live): jog X toward the target; distance-to-go shrinks');
  for (let i = 0; i < 5; i++) { await tap('jog-x-positive'); await page.waitForTimeout(50); }
  await note('jogged X +5mm toward target; DTG X decreased');
  await snap('run-dtg-after-jog');

  // AC 11.4: 6► advances to the next step.
  step('AC 11.4: 6► advances to step 2 (target X30 Y0 Z0)');
  await tap('key-6');
  await note('advanced to step 2; DTG recomputed');
  await snap('run-dtg-step2');

  // AC 11.6: C exits.
  step('AC 11.6: C exits Run mode');
  await tap('key-clear');
  await page.waitForTimeout(150);
  await note('exited to idle');
  await snap('exited-idle');

  await d.finish();
}

main().catch((e) => { console.error(e); process.exit(1); });

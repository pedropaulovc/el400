/**
 * US-032: Touch Probe — per-story demo.
 *
 * Manual §10.1. Covers: probe DRO-type config (dro t / dro F) in setup; the Edge,
 * Midpoint, Inside and Outside probe functions; the triggered indication (prb
 * LED); Freeze-mode display halt; and C-to-exit. ?source=debug provides real axis
 * motion (jog) and a probe-contact toggle. A contact is a RISING edge of the probe
 * pin, so each capture is toggle-ON; for multi-edge functions we toggle OFF, jog,
 * then ON again for the next edge.
 */
import { startDemo } from './helpers.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'artifacts', 'US-032');

async function main() {
  const d = await startDemo(OUT);
  const { page, snap, note, step, tap, typeKeys, bootTo, navigateToLabel, waitForX, ledOn } = d;

  const probeOn = async () => { await tap('probe-toggle'); await page.waitForTimeout(200); };
  const probeOff = async () => { await tap('probe-toggle'); await page.waitForTimeout(200); };
  const jogX = async (n) => { for (let i = 0; i < n; i++) { await tap('jog-x-positive'); await page.waitForTimeout(40); } };
  // Enter Fn → ProbE → ENT, then cycle the sub-function ring to `label`.
  const enterProbeFunction = async (cyclePresses) => {
    await tap('btn-function');
    await page.waitForTimeout(120);
    // Ring: center, circle, line, linear, polar, taper, probe → 6 ► presses.
    for (let i = 0; i < 6; i++) { await tap('key-6'); await page.waitForTimeout(50); }
    await tap('key-enter'); // → probe-menu-function (Prob Ed default)
    for (let i = 0; i < cyclePresses; i++) { await tap('key-6'); await page.waitForTimeout(60); }
  };

  // ── AC 32.1: configure probe DRO type in setup (dro t / dro F) ────────────
  step('AC 32.1: configure probe DRO type in setup — dro t (Transmit) / dro F (Freeze)');
  await bootTo('debug');
  await page.waitForTimeout(1100);
  await tap('btn-settings');
  await tap('axis-select-x');
  await navigateToLabel(['dro']);
  await note('probe DRO-type parameter (default dro t = Transmit)');
  await snap('setup-probe-type-transmit');
  await tap('key-6'); await page.waitForTimeout(80); // cycle to dro F
  await note('cycled to dro F (Freeze)');
  await snap('setup-probe-type-freeze');
  await tap('key-6'); await page.waitForTimeout(80); // back to dro t for the function demos
  await note('back to dro t (Transmit) for the probe-function demos');
  await navigateToLabel(['End']);
  await tap('key-enter'); // exit setup
  await page.waitForTimeout(150);

  // ── AC 32.4 / 32.7 / 32.8: Edge function ──────────────────────────────────
  step('AC 32.4: Probe Edge — Fn→ProbE→ENT→Prob Ed→ENT→select X→jog→contact sets datum to 0');
  await enterProbeFunction(0); // edge (default)
  await note('probe sub-function menu: Prob Ed (Edge)');
  await snap('edge-menu');
  await tap('key-enter'); // edge needs no diameter → axis select
  await tap('axis-select-x'); // arm on X → probe-waiting
  await jogX(4);
  await note('armed on X, jogged to the edge (live position)');
  await snap('edge-waiting');
  await probeOn(); // rising edge → capture, datum set so edge reads 0 (AC 32.7)
  const prbLed = await ledOn('led-probe');
  await note(`AC 32.8: probe contact captured, prb LED on=${prbLed}; X datum set to 0 at edge`);
  await snap('edge-triggered');
  await tap('key-clear'); // AC 32.10 exit
  await probeOff();
  await page.waitForTimeout(150);

  // ── AC 32.5: Midpoint function (two edges → datum at midpoint) ─────────────
  step('AC 32.5: Probe Midpoint — two contacts; datum set at the midpoint between them');
  await enterProbeFunction(1); // edge→midpoint (one ► cycle)
  await note('probe sub-function: Prob nd (Midpoint)');
  await snap('midpoint-menu');
  await tap('key-enter'); // midpoint needs no diameter → axis select
  await tap('axis-select-x'); // arm on X
  await jogX(2);
  await note('at edge 1');
  await probeOn();  // capture edge 1
  await snap('midpoint-edge1');
  await probeOff(); // release so the next ON is a fresh rising edge
  await jogX(8);
  await note('jogged to edge 2');
  await probeOn();  // capture edge 2 → datum at midpoint
  await note('two edges captured → X reads distance to the midpoint');
  await snap('midpoint-result');
  await tap('key-clear');
  await probeOff();
  await page.waitForTimeout(150);

  // ── AC 32.6: Inside function (probe tip diameter compensation, +dia) ───────
  step('AC 32.6: Inside — enter probe tip diameter, two inner walls → inside width = span + dia');
  // Switch to mm so the typed tip diameter (6) is in mm and the result is clean.
  await tap('btn-toggle-unit'); // inch → mm
  await page.waitForTimeout(150);
  await enterProbeFunction(2); // edge→midpoint→inside (two ► cycles)
  await note('probe sub-function: inS dE (Inside)');
  await snap('inside-menu');
  await tap('key-enter'); // inside → diameter prompt
  await note('probe tip-diameter prompt (Prb d A)');
  await snap('inside-diameter-prompt');
  await typeKeys('6'); // 6 mm probe tip
  await tap('key-enter'); // → axis select
  await tap('axis-select-x');
  await note('armed on X for inside measurement');
  await probeOn();  // inner wall 1
  await snap('inside-wall1');
  await probeOff();
  await jogX(10);   // move across the bore (10 mm)
  await probeOn();  // inner wall 2 → result = span + 6mm
  await note('two inner walls captured → inside width = span + 6mm tip');
  await snap('inside-result');
  await tap('key-clear');
  await probeOff();
  await page.waitForTimeout(150);

  // ── AC 32.6: Outside function (−dia) ───────────────────────────────────────
  step('AC 32.6: Outside — two outer faces → outside width = span − dia');
  await enterProbeFunction(3); // edge→midpoint→inside→outside (three ► cycles)
  await note('probe sub-function: oUtS dE (Outside)');
  await snap('outside-menu');
  await tap('key-enter'); // outside → diameter prompt
  await typeKeys('6');
  await tap('key-enter'); // → axis select
  await tap('axis-select-x');
  await probeOn();  // outer face 1
  await snap('outside-face1');
  await probeOff();
  await jogX(10);
  await probeOn();  // outer face 2 → result = span − 6mm
  await note('two outer faces captured → outside width = span − 6mm tip');
  await snap('outside-result');
  await tap('key-clear');
  await probeOff();
  await page.waitForTimeout(150);

  // ── AC 32.2 / 32.3: Transmit vs Freeze behaviour at idle ───────────────────
  step('AC 32.3: Freeze mode — set dro F, then a probe contact FREEZES the readout');
  await tap('btn-settings');
  await tap('axis-select-x');
  await navigateToLabel(['dro']);
  let dt = await d.readDisplay();
  if (!/F/.test(dt.X)) { await tap('key-6'); await page.waitForTimeout(80); } // → dro F
  await note('configured dro F (Freeze)');
  await snap('freeze-configured');
  await navigateToLabel(['End']);
  await tap('key-enter'); // exit setup to idle
  await page.waitForTimeout(150);
  // Jog so the readout is at a known value, then trigger to freeze.
  await jogX(5);
  const beforeFreeze = await d.readDisplay();
  await note(`idle readout before freeze: X='${beforeFreeze.X}'`);
  await snap('freeze-before');
  await probeOn(); // contact → display freezes (AC 32.3)
  const frozen = await d.readDisplay();
  await note(`probe contact: display frozen at X='${frozen.X}'`);
  await snap('freeze-on-contact');
  await jogX(5); // keep moving; frozen display should NOT update
  const stillFrozen = await d.readDisplay();
  await note(`kept jogging while held: X='${stillFrozen.X}' (unchanged ⇒ frozen)`);
  await snap('freeze-held-while-moving');
  await probeOff(); // release → counting resumes
  await page.waitForTimeout(200);
  const resumed = await d.readDisplay();
  await note(`probe released: counting resumes, X='${resumed.X}'`);
  await snap('freeze-released-resumes');

  await d.finish();
}

main().catch((e) => { console.error(e); process.exit(1); });

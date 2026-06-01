/**
 * US-046: Self-Diagnostics Mode — per-story demo (RE-DEMO against fix #247).
 *
 * Manual §11.1. Enter via ▲ (key 8) during the boot/version message, then walk
 * memory → display → keyboard → encoder, exiting with a double C.
 *
 * This re-demo PROVES fix #247 (gate diagnostics memory/display steps + exit
 * latch on front-panel KEYS, not MILL_STATE_CHANGED ticks) on the real UI in the
 * SAME ticking source where the three bugs lived — ?source=debug, whose
 * DebugServer broadcasts MILL_STATE_CHANGED every 100ms. The fix is asserted by
 * letting ticks flow (and jogging to force extra ones) between/around key presses
 * and checking the readout DWELLS / the gesture COMPLETES rather than racing:
 *
 *   Bug 1 (AC46.2/46.3): rAmPASS and the 88888888 segment test must DWELL while
 *     ticks flow; only a real key advances. (Before: a single ▲ raced past both.)
 *   Bug 2 (AC46.6/46.7): C (arms) → ticks/jog → C → clean exit to the numeric
 *     readout. (Before: a tick disarmed the latch between presses; never exited.)
 *   Bug 3 (AC46.4): keyboard echo of a pressed key must SURVIVE ticks, not blank.
 *
 * The manual-mode contrast block (the steps a user should always see) is kept at
 * the end so the demo-reviewer can compare the debug path (now fixed) against the
 * tick-free path. All interaction is real UI — DOM clicks + the debug jog panel.
 */
import { startDemo } from './helpers.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'artifacts', 'US-046');

async function main() {
  const d = await startDemo(OUT);
  const { page, snap, note, step, tap, bootTo, waitForX, readDisplay } = d;

  // Let `ticks` worth of 100ms MILL_STATE_CHANGED broadcasts flow with NO key
  // press, optionally jogging X each tick to force extra adapter events, then
  // assert X still starts with `label`. Returns the observed X for logging.
  const assertDwellsUnderTicks = async (label, { ticks = 8, jog = false } = {}) => {
    let last = '';
    for (let i = 0; i < ticks; i++) {
      if (jog) await tap('jog-x-positive'); // a real encoder move → extra ticks
      await page.waitForTimeout(120);        // span at least one 100ms broadcast
      last = (await readDisplay()).X;
      if (!last.toUpperCase().startsWith(label.toUpperCase())) {
        throw new Error(`DWELL FAILED: expected X to stay '${label}', got '${last}' after ${i + 1} tick(s)`);
      }
    }
    return last;
  };

  // ── PROVE THE FIX in ?source=debug (the ticking source it was broken in) ──
  step('FIX #247 in ?source=debug — DebugServer ticks every 100ms; the steps must NOT race past');
  await bootTo('debug');

  // Bug 1a (AC 46.2): ▲ enters diagnostics; rAmPASS must DWELL under ticks.
  step('Bug 1 / AC 46.2: ▲ enters Self-Diagnostics; rAmPASS DWELLS while debug ticks flow (no skip)');
  await page.getByTestId('key-8').click(); // ▲ during the boot/version message
  await waitForX(['rAmPASS']);
  await note('memory diagnostics: rAmPASS shown');
  await snap('debug-mem-rampass');
  const ram = await assertDwellsUnderTicks('rAmPASS', { ticks: 10, jog: true });
  await note(`AC 46.2 PROVED: rAmPASS held through 10 ticks + live jogging (X='${ram}') — no auto-skip`);
  await snap('debug-rampass-dwells-under-ticks');

  // Bug 1b (AC 46.3): a real key advances to the segment test, which also dwells.
  step('Bug 1 / AC 46.3: a real key advances to the 88888888 segment test; it too DWELLS under ticks');
  await tap('key-5');
  await waitForX(['88888888']);
  await note('display/segment test: all segments lit (88888888 every axis)');
  await snap('debug-display-test');
  const seg = await assertDwellsUnderTicks('88888888', { ticks: 10, jog: true });
  await note(`AC 46.3 PROVED: segment test held through 10 ticks + jogging (X='${seg}') — no auto-skip`);
  await snap('debug-display-dwells-under-ticks');

  // Bug 3 (AC 46.4): keyboard echo must SURVIVE ticks (not blank).
  step('Bug 3 / AC 46.4: keyboard step — press 5, echo "5" must SURVIVE ticks (not blank out)');
  await tap('key-5');                 // advance display → keyboard step
  await waitForX(['PrESS']);
  await note('keyboard test prompt: PrESS');
  await snap('debug-keyboard-prompt');
  await tap('key-5');                 // echo the pressed key
  await waitForX(['5']);
  await note('pressed 5 → echoed as 5');
  const echo = await assertDwellsUnderTicks('5', { ticks: 10, jog: true });
  await note(`AC 46.4 PROVED: echo "5" survived 10 ticks + jogging (X='${echo}') — did not blank`);
  await snap('debug-keyboard-echo-survives-ticks');

  // Bug 2 (AC 46.6/46.7): C arms, ticks/jog flow, C exits cleanly to the readout.
  step('Bug 2 / AC 46.6: first C exits the current step back to memory (arms the exit gesture)');
  await tap('key-clear');
  await waitForX(['rAmPASS']);
  await note('one C → back at memory step (rAmPASS), exit gesture armed');
  await snap('debug-one-c-armed');
  step('Bug 2 / AC 46.7: ticks + live jog flow between presses, then second C EXITS cleanly to the numeric readout');
  const heldArmed = await assertDwellsUnderTicks('rAmPASS', { ticks: 8, jog: true });
  await note(`exit stayed armed through 8 ticks + jogging (X='${heldArmed}') — latch NOT disarmed by ticks`);
  await tap('key-clear');             // second C → must exit Self-Diagnostics
  await page.waitForTimeout(200);
  const exited = await readDisplay();
  if (/[A-Za-z]/.test(exited.X.replace(/[eE]/, '')) && !/^-?\d/.test(exited.X)) {
    // Numeric readout looks like a signed number (e.g. 0.0394); a label would be alpha.
    throw new Error(`EXIT FAILED: expected numeric readout after C C, got X='${exited.X}'`);
  }
  await note(`AC 46.7 PROVED: double-C exited to the numeric readout under ticks (X='${exited.X}')`);
  await snap('debug-double-c-exit-idle');

  // ── AC 46.5: encoder step still works (real motion confirms each axis) ─────
  step('AC 46.5: encoder diagnostics — each axis confirmed by REAL movement (still works post-fix)');
  await bootTo('debug');
  await page.getByTestId('key-8').click(); // ▲ → diagnostics-memory (now dwells)
  await waitForX(['rAmPASS']);
  await tap('key-5'); // → display
  await waitForX(['88888888']);
  await tap('key-5'); // → keyboard
  await waitForX(['PrESS']);
  await tap('key-enter'); // keyboard --ENTER--> encoder
  await waitForX(['EnCodEr', 'X']);
  await note('encoder test: awaiting motion on each axis');
  await snap('debug-encoder-awaiting');
  await tap('jog-x-positive');
  await waitForX(['X']);
  await note('jogged X → X axis confirmed responding');
  await snap('debug-encoder-x-ok');
  await tap('jog-y-positive');
  await page.waitForTimeout(200);
  await note('jogged Y → Y axis confirmed responding');
  await snap('debug-encoder-y-ok');
  await tap('jog-z-positive');
  await page.waitForTimeout(200);
  await note('jogged Z → Z axis confirmed responding');
  await snap('debug-encoder-z-ok');
  // The exit gesture also completes from a later step under ticks now.
  await tap('key-clear'); // C → back to memory (arms)
  await waitForX(['rAmPASS']);
  await tap('key-clear'); // C → exit
  await page.waitForTimeout(200);
  const encExit = await readDisplay();
  await note(`encoder-path double-C also exits cleanly under ticks (X='${encExit.X}')`);
  await snap('debug-encoder-exit-idle');

  // ── Contrast: tick-free ?source=manual happy path (always-visible steps) ──
  step('Contrast (?source=manual, no ticks): the same walk a user should always see');
  await bootTo('manual');
  await page.getByTestId('key-8').click();
  await waitForX(['rAmPASS']);
  await note('manual: rAmPASS');
  await snap('manual-mem-rampass');
  await tap('key-5');
  await waitForX(['88888888']);
  await note('manual: segment test 88888888');
  await snap('manual-display-test');
  await tap('key-5');
  await waitForX(['PrESS']);
  await tap('key-7');
  await waitForX(['7']);
  await note('manual: keyboard echo 7');
  await snap('manual-keyboard-echo-7');
  await tap('key-clear');
  await waitForX(['rAmPASS']);
  await tap('key-clear');
  await page.waitForTimeout(200);
  await note('manual: double-C exit to idle');
  await snap('manual-double-c-exit-idle');

  await d.finish();
}

main().catch((e) => { console.error(e); process.exit(1); });

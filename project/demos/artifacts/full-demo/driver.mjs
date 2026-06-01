/**
 * Full end-to-end demo driver for the EL400 DRO simulator.
 *
 * Drives the REAL UI via DOM clicks + keyboard only. No window.* calls, no
 * injected state, no route interception, no faked localStorage. Reads what the
 * DRO "shows" from the screen-reader axis-value cells (axis-value-x/y/z), which
 * mirror the seven-segment readout exactly.
 *
 * Run: node project/demos/artifacts/full-demo/driver.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = __dirname;
mkdirSync(OUT, { recursive: true });

const BASE = 'http://localhost:8199';
const BOOT_MS = 1100; // BOOT_MESSAGE_DURATION_MS = 1000

let shotN = 0;
const log = [];

function step(msg) {
  console.log(`\n=== ${msg} ===`);
  log.push({ kind: 'step', msg });
}

async function snap(page, name) {
  shotN += 1;
  const file = `${String(shotN).padStart(2, '0')}-${name}.png`;
  // Let React settle so the screenshot matches the reported display.
  await page.waitForTimeout(120);
  const disp = await readDisplay(page);
  await page.screenshot({ path: join(OUT, file) });
  console.log(`  [shot] ${file}  display=${JSON.stringify(disp)}`);
  log.push({ kind: 'shot', file, display: disp });
  return file;
}

async function readDisplay(page) {
  const get = async (a) => {
    try { return (await page.getByTestId(`axis-value-${a}`).textContent())?.trim() ?? ''; }
    catch { return '?'; }
  };
  return { X: await get('x'), Y: await get('y'), Z: await get('z') };
}

async function note(page, msg) {
  const disp = await readDisplay(page);
  console.log(`  ${msg}  ->  X='${disp.X}' Y='${disp.Y}' Z='${disp.Z}'`);
  log.push({ kind: 'note', msg, display: disp });
}

// Click a panel button by data-testid
const tap = (page, tid) => page.getByTestId(tid).click();

// Read an LED on/off state (LEDIndicator renders a disabled radio `checked={isOn}`).
async function ledOn(page, tid) {
  try { return await page.getByTestId(tid).locator('input[type=radio]').isChecked(); }
  catch { return null; }
}

// Type a numeric string through the panel keypad (digits, ., -).
async function typeKeys(page, str) {
  for (const ch of String(str)) {
    if (ch === '.') { await tap(page, 'key-decimal'); }
    else if (ch === '-') { await tap(page, 'key-sign'); }
    else { await tap(page, `key-${ch}`); }
    await page.waitForTimeout(40);
  }
}

async function bootTo(page, source) {
  await page.goto(`${BASE}/?source=${source}`);
  await page.getByTestId('el400-simulator').waitFor();
}

async function main() {
  const browser = await chromium.launch();
  // 1600 wide so the debug control panel (fixed 320px overlay on the right) does
  // not cover the simulator's secondary-function buttons (SDM/calculator/etc.).
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('  [pageerror]', e.message));

  // ───────────────────────────────────────────────────────────────────
  // 1. BOOT SEQUENCE -> IDLE
  // ───────────────────────────────────────────────────────────────────
  step('1. Boot sequence -> idle readout (?source=manual)');
  await bootTo(page, 'manual');
  await snap(page, 'boot-message');           // model/version boot message
  await page.waitForTimeout(BOOT_MS);
  await note(page, 'after boot timeout, idle');
  await snap(page, 'idle-readout');

  // ───────────────────────────────────────────────────────────────────
  // 2. CORE DRO OPS  (?source=debug, real jog motion)
  // ───────────────────────────────────────────────────────────────────
  step('2. Core DRO ops with real motion (?source=debug)');
  await bootTo(page, 'debug');
  await page.waitForTimeout(BOOT_MS);
  await note(page, 'debug idle (mill at 0,0,0)');
  await snap(page, 'debug-idle');

  // Jog X+ a few mm using the debug panel; step size defaults to 1mm.
  step('2a. Jog X then Y then Z (debug jog buttons drive real encoder motion)');
  for (let i = 0; i < 5; i++) { await tap(page, 'jog-x-positive'); await page.waitForTimeout(50); }
  for (let i = 0; i < 3; i++) { await tap(page, 'jog-y-positive'); await page.waitForTimeout(50); }
  for (let i = 0; i < 2; i++) { await tap(page, 'jog-z-negative'); await page.waitForTimeout(50); }
  await note(page, 'after jog X+5 Y+3 Z-2');
  await snap(page, 'jogged-position');

  step('2b. Select X axis, then ZERO X');
  await tap(page, 'axis-select-x');
  await snap(page, 'x-selected');
  await tap(page, 'axis-zero-x');
  await note(page, 'X zeroed (Y/Z retain offset)');
  await snap(page, 'x-zeroed');

  step('2c. HALF on X (centre-find: halves the displayed value)');
  // Jog X out again so HALF has something to halve.
  for (let i = 0; i < 4; i++) { await tap(page, 'jog-x-positive'); await page.waitForTimeout(50); }
  await note(page, 'X jogged to ~4 before HALF');
  await tap(page, 'axis-select-x');
  await tap(page, 'btn-half');
  await note(page, 'after HALF on X');
  await snap(page, 'half-x');

  step('2d. ZERO ALL');
  // Reset offsets: zero each axis. (No single ZERO-ALL testid; zero X,Y,Z.)
  await tap(page, 'axis-zero-x');
  await tap(page, 'axis-zero-y');
  await tap(page, 'axis-zero-z');
  await note(page, 'all axes zeroed');
  await snap(page, 'zero-all');

  step('2e. ABS <-> INC toggle');
  await tap(page, 'btn-abs-inc');
  await page.waitForTimeout(300);
  const incOn = await ledOn(page, 'led-inc');
  await note(page, `toggled positioning mode (led-inc checked=${incOn})`);
  await snap(page, 'inc-mode');
  await tap(page, 'btn-abs-inc');
  await page.waitForTimeout(300);
  await snap(page, 'abs-mode');

  step('2f. inch <-> mm toggle');
  await tap(page, 'btn-toggle-unit');
  await note(page, 'toggled measurement unit');
  await snap(page, 'unit-toggled');
  await tap(page, 'btn-toggle-unit'); // back

  // ───────────────────────────────────────────────────────────────────
  // 3. SETUP MENU FULL WALK  (?source=manual)
  // ───────────────────────────────────────────────────────────────────
  step('3. Setup menu walk (wrench -> SELECT -> axis -> parameters)');
  await bootTo(page, 'manual');
  await page.waitForTimeout(BOOT_MS);
  await tap(page, 'btn-settings');         // wrench
  await note(page, 'setup SELECT prompt');
  await snap(page, 'setup-select');
  await tap(page, 'axis-select-x');        // configure X
  await note(page, 'first parameter highlighted (LinEAr / counting mode)');
  await snap(page, 'setup-param-counting');

  // Walk the parameter list with KEY_8 (up) and screenshot each label.
  const setupShots = [
    'counting-mode', 'enf', 'beep', 'scale-res', 'display-res', 'taper',
    'direction', 'z-depth', 'zero-approach', 'bp-dist', 'bp-tolr',
    'measurement-mode', 'probe-type', 'keypad-lock', 'sleep-timer',
    'restore', 'oem-mode', 'save-changes', 'end',
  ];
  for (let i = 1; i < setupShots.length; i++) {
    await tap(page, 'key-8'); // up = next param
    await page.waitForTimeout(80);
    await snap(page, `setup-walk-${setupShots[i]}`);
  }

  // Demonstrate choice cycling on a couple of params, then change one for real.
  step('3a. Navigate back to counting-mode and cycle LinEAr <-> AnGULAr');
  // We are at 'End' (last item). key-8 (up) wraps forward to the first item.
  await tap(page, 'key-8');
  await page.waitForTimeout(80);
  await navigateToLabel(page, ['LinEAr', 'AnGULAr']);
  await note(page, 'at first param (counting-mode)');
  await snap(page, 'setup-back-to-counting');
  await tap(page, 'key-6'); // right: cycle choice -> AnGULAr
  await page.waitForTimeout(80);
  await note(page, 'cycled counting-mode -> AnGULAr');
  await snap(page, 'setup-counting-angular');
  await tap(page, 'key-4'); // left: back to LinEAr
  await page.waitForTimeout(80);

  // ───────────────────────────────────────────────────────────────────
  // 3b. CHANGE A SAVE-ON-SAV-CHG PARAM, SAV CHG, RELOAD, RE-VERIFY
  //     Use SC (scale resolution) which is draft-only -> persisted by SAV CHG.
  // ───────────────────────────────────────────────────────────────────
  step('3b. Change SC scale resolution (draft-only), SAV CHG, then reload to prove persistence');
  // Navigate to the SC (scale resolution) row by polling its label.
  await navigateToLabel(page, ['SC ']);
  await note(page, 'at SC (scale resolution), seeded value');
  await snap(page, 'sc-before');
  // Cycle right twice to a distinct value, note it.
  await tap(page, 'key-6'); await page.waitForTimeout(60);
  await tap(page, 'key-6'); await page.waitForTimeout(60);
  const scChanged = await readDisplay(page);
  await note(page, `SC cycled to draft value (X='${scChanged.X}')`);
  await snap(page, 'sc-changed-draft');

  // Navigate to SAV CHG and ENT to persist the draft.
  await navigateToLabel(page, ['SAU', 'SAV']);
  await note(page, 'at SAV CHG row');
  await snap(page, 'sav-chg-row');
  await tap(page, 'key-enter');
  await page.waitForTimeout(400);
  await note(page, 'SAV CHG confirmed (StorEd)');
  await snap(page, 'sav-chg-stored');

  step('3c. RELOAD page (real power-cycle) and re-enter setup to confirm SC persisted');
  await page.waitForTimeout(700); // let StorEd dwell return to setup
  await bootTo(page, 'manual');
  await page.waitForTimeout(BOOT_MS);
  await tap(page, 'btn-settings');
  await tap(page, 'axis-select-x');
  await navigateToLabel(page, ['SC ']);
  const scAfter = await readDisplay(page);
  await note(page, `after reload, SC seeds from persisted value (X='${scAfter.X}') expected to match '${scChanged.X}'`);
  await snap(page, 'sc-after-reload');
  // Exit setup without changes.
  await navigateToLabel(page, ['End']);
  await tap(page, 'key-enter');
  await page.waitForTimeout(200);

  // ───────────────────────────────────────────────────────────────────
  // 4. OEM CHAIN: define baseline (EnF on) -> change EnF off -> rSt oEm restores
  // ───────────────────────────────────────────────────────────────────
  step('4. OEM chain — define baseline, change, restore');
  await bootTo(page, 'manual');
  await page.waitForTimeout(BOOT_MS);
  await tap(page, 'btn-settings');
  await tap(page, 'axis-select-x');
  await navigateToLabel(page, ['EnF']);
  await note(page, 'at EnF (encoder-fail warning)');
  await snap(page, 'oem-enf-initial');
  // Ensure EnF on (default is off; cycle right once to 'on').
  let enf = await readDisplay(page);
  if (!/on/i.test(enf.X)) { await tap(page, 'key-6'); await page.waitForTimeout(80); }
  await note(page, 'set EnF on (will be captured into OEM baseline)');
  await snap(page, 'oem-enf-on');

  step('4a. Enter oEm mod with password 3 5 7 2 6, store baseline');
  await navigateToLabel(page, ['oEm mod', 'oEm']);
  await note(page, 'at oEm mod row');
  await snap(page, 'oem-row');
  await tap(page, 'key-enter');        // open password gate
  await note(page, 'OEM password prompt (PASS)');
  await snap(page, 'oem-password-prompt');
  await typeKeys(page, '35726');       // password
  await tap(page, 'key-enter');        // validate -> oem-mode
  await note(page, 'OEM mode entered (oEm)');
  await snap(page, 'oem-entered');
  await tap(page, 'key-enter');        // store baseline -> StorEd
  await page.waitForTimeout(400);
  await note(page, 'OEM baseline stored (StorEd) with EnF on');
  await snap(page, 'oem-baseline-stored');

  step('4b. Change EnF off, then rSt oEm to restore baseline (EnF back on)');
  await page.waitForTimeout(700); // StorEd dwell returns to setup at oEm row
  // Navigate to ENF and turn it off.
  await navigateToLabel(page, ['EnF']);
  let enf2 = await readDisplay(page);
  if (/on/i.test(enf2.X)) { await tap(page, 'key-6'); await page.waitForTimeout(80); }
  await note(page, 'EnF now off (diverged from baseline)');
  await snap(page, 'oem-enf-off');

  // Trigger rSt oEm (separate non-password restore row).
  await navigateToLabel(page, ['rSt oEm', 'rSt']);
  await note(page, 'at rSt oEm row');
  await snap(page, 'restore-row');
  await tap(page, 'key-enter');
  await note(page, 'restore IN ProG dwell');
  await snap(page, 'restore-in-progress');
  await page.waitForTimeout(1700); // RESTORE_DURATION_MS = 1500
  await note(page, 'restore complete, back to idle');
  await snap(page, 'restore-complete');

  // Re-enter setup to confirm EnF was restored to baseline (on).
  await tap(page, 'btn-settings');
  await tap(page, 'axis-select-x');
  await navigateToLabel(page, ['EnF']);
  const enfRestored = await readDisplay(page);
  await note(page, `after restore, EnF = '${enfRestored.X}' (expected EnF on)`);
  await snap(page, 'restore-verified-enf-on');
  await navigateToLabel(page, ['End']);
  await tap(page, 'key-enter');
  await page.waitForTimeout(200);

  // ───────────────────────────────────────────────────────────────────
  // 5. FEATURE SAMPLING
  // ───────────────────────────────────────────────────────────────────

  // 5a. SDM program a sub-datum + run/recall (?source=debug for live DTG)
  step('5a. SDM — Program a sub-datum (direct entry), then Run/recall it');
  await bootTo(page, 'debug');
  await page.waitForTimeout(BOOT_MS);
  await tap(page, 'btn-sdm');
  await page.waitForTimeout(1100); // SDM intro -> menu (LEArn)
  await note(page, 'SDM menu (LEArn shown first)');
  await snap(page, 'sdm-menu');
  // Cycle right to Program (ring: learn -> run -> program).
  await tap(page, 'key-6'); await page.waitForTimeout(80); // run
  await tap(page, 'key-6'); await page.waitForTimeout(80); // program
  await note(page, 'SDM menu -> ProGrAn');
  await snap(page, 'sdm-program-menu');
  await tap(page, 'key-enter'); // step prompt (step 1)
  await note(page, 'SDM program step prompt (StEP / 1)');
  await snap(page, 'sdm-step-prompt');
  await tap(page, 'key-enter'); // enter coordinate entry for X
  await typeKeys(page, '10');   // X = 10
  await tap(page, 'key-enter');
  await typeKeys(page, '20');   // Y = 20
  await tap(page, 'key-enter');
  await typeKeys(page, '5');    // Z = 5
  await tap(page, 'key-enter'); // back to step view, point stored
  await note(page, 'SDM step 1 programmed X10 Y20 Z5');
  await snap(page, 'sdm-programmed');
  await tap(page, 'key-clear'); // exit SDM
  await page.waitForTimeout(150);

  // Run/recall: SDM -> Run -> step 1 -> live DTG
  step('5b. SDM Run/recall step 1 (live distance-to-go from current position)');
  await tap(page, 'btn-sdm');
  await page.waitForTimeout(1100);
  await tap(page, 'key-6'); await page.waitForTimeout(80); // run
  await note(page, 'SDM menu -> rUn');
  await snap(page, 'sdm-run-menu');
  await tap(page, 'key-enter'); // run step-select (step 1)
  await snap(page, 'sdm-run-step');
  await tap(page, 'key-enter'); // show DTG for step 1
  await note(page, 'SDM Run DTG for step 1 (target X10 Y20 Z5 minus live pos)');
  await snap(page, 'sdm-run-dtg');
  await tap(page, 'key-clear');
  await page.waitForTimeout(150);

  // 5c. Calculator: 12 + 8 = 20
  step('5c. Calculator — 12 + 8 = 20');
  await bootTo(page, 'manual');
  await page.waitForTimeout(BOOT_MS);
  await tap(page, 'btn-calculator');
  await note(page, 'calculator idle');
  await snap(page, 'calc-idle');
  // Real keypad order (per the integration test): first operand -> ENTER stores
  // it -> Y selects the operation -> second operand -> ENTER computes.
  await typeKeys(page, '12');
  await tap(page, 'key-enter');     // store first operand 12
  await tap(page, 'axis-select-y'); // Y cycles operation -> ADD
  await note(page, 'first operand 12 stored, operation ADD selected');
  await snap(page, 'calc-add-op');
  await typeKeys(page, '8');
  await tap(page, 'key-enter');     // compute 12 + 8
  await note(page, 'calculator result (12 + 8 = 20)');
  await snap(page, 'calc-result');
  await tap(page, 'btn-calculator'); // exit

  // 5d. Center-finding (line, two points) via debug jog
  step('5d. Center finding — line, two points (jog to each, FUNCTION menu)');
  await bootTo(page, 'debug');
  await page.waitForTimeout(BOOT_MS);
  await tap(page, 'btn-function');
  await note(page, 'FUNCTION menu opened (CEntrE first)');
  await snap(page, 'function-menu');
  await tap(page, 'key-enter'); // CEntrE -> line center finding, point 1
  await note(page, 'center-line: collecting point 1 (live position shown)');
  await snap(page, 'center-point1-await');
  // Jog to first edge, capture with key-6 (KEY_6_RIGHT stores the point).
  for (let i = 0; i < 4; i++) { await tap(page, 'jog-x-positive'); await page.waitForTimeout(40); }
  await note(page, 'jogged to edge 1 (X+4)');
  await snap(page, 'center-edge1');
  await tap(page, 'key-6'); // store point 1
  await note(page, 'point 1 captured; now collecting point 2');
  await snap(page, 'center-point2-await');
  // Jog to opposite edge.
  for (let i = 0; i < 8; i++) { await tap(page, 'jog-x-positive'); await page.waitForTimeout(40); }
  await note(page, 'jogged to edge 2 (X+12 total)');
  await snap(page, 'center-edge2');
  await tap(page, 'key-6'); // store point 2 -> result (DTG to midpoint)
  await note(page, 'center result: distance-to-go to the line midpoint');
  await snap(page, 'center-result');
  await tap(page, 'key-clear');
  await page.waitForTimeout(150);

  // 5e. Bolt-hole pattern: intro screen, then first parameter-entry screen.
  step('5e. Bolt-hole (PCD) pattern — intro then parameter entry');
  await bootTo(page, 'manual');
  await page.waitForTimeout(BOOT_MS);
  await tap(page, 'btn-bolt-circle');
  await page.waitForTimeout(250); // catch the "b hoLE" intro before it auto-advances
  await note(page, 'bolt-hole intro screen (b hoLE)');
  await snap(page, 'bolt-hole-intro');
  await page.waitForTimeout(1000); // intro auto-advances (~1s) to parameter entry
  await note(page, 'bolt-hole first parameter-entry screen');
  await snap(page, 'bolt-hole-entry');
  await tap(page, 'key-clear'); // exit
  await page.waitForTimeout(120);

  // 5f. Grid (linear/grid pattern): intro then first parameter-entry screen.
  step('5f. Grid drilling pattern — intro then parameter entry');
  await bootTo(page, 'manual');
  await page.waitForTimeout(BOOT_MS);
  await tap(page, 'btn-grid-hole');
  await page.waitForTimeout(250); // catch the "Grid" intro
  await note(page, 'grid intro screen (Grid)');
  await snap(page, 'grid-intro');
  await page.waitForTimeout(1000); // intro auto-advances to "EntCnt0" (count entry)
  await note(page, 'grid first parameter-entry screen (EntCnt0)');
  await snap(page, 'grid-entry');
  await tap(page, 'key-clear'); // exit
  await page.waitForTimeout(120);

  // 5g. Self-diagnostics: press ▲ (8) during boot.
  // The memory/display/keyboard steps advance on ANY event (diagnostics.ts), so in
  // a CONNECTED source (?source=debug) the DebugServer's 100ms encoder ticks
  // auto-skip the RAM-pass and display-test steps (see WALKTHROUGH "Observations").
  // To show those steps faithfully we run the static walk in ?source=manual (no
  // ticks), then do the ENCODER step (which needs motion) in ?source=debug.
  step('5g. Self-diagnostics (static steps) — ▲ during boot, ?source=manual');
  await bootTo(page, 'manual');
  // Boot message is up for ~1s; ▲ (key-8) enters Self-Diagnostics (AC 46.1).
  await page.getByTestId('key-8').click();
  await waitForDisplayX(page, ['rAmPASS'], null);
  await note(page, 'diagnostics memory step (rAmPASS) — RAM OK');
  await snap(page, 'diag-mem');
  await tap(page, 'key-5'); // any key -> display test
  await waitForDisplayX(page, ['88888888'], null);
  await note(page, 'diagnostics display test (all segments lit, 88888888)');
  await snap(page, 'diag-display');
  await tap(page, 'key-5'); // any key -> keyboard test
  await waitForDisplayX(page, ['PrESS'], null);
  await note(page, 'diagnostics keyboard test (PrESS a key)');
  await snap(page, 'diag-keyboard');
  await tap(page, 'key-7'); // echo a key
  await waitForDisplayX(page, ['7'], null);
  await note(page, 'keyboard echo of pressed key 7');
  await snap(page, 'diag-keyboard-echo');
  await tap(page, 'key-clear'); // exit step
  await tap(page, 'key-clear'); // exit diagnostics
  await page.waitForTimeout(150);

  step('5g(ii). Self-diagnostics encoder step — ?source=debug (real axis motion)');
  await bootTo(page, 'debug');
  // One ▲ enters diagnostics; the 100ms ticks fast-forward past memory/display to
  // the keyboard step. From there KEY_ENTER advances to the encoder test.
  await page.getByTestId('key-8').click();
  await waitForDisplayX(page, ['PrESS'], null);
  await tap(page, 'key-enter'); // keyboard -> encoder
  await waitForDisplayX(page, ['EnCodEr'], null);
  await note(page, 'diagnostics encoder test (awaiting motion)');
  await snap(page, 'diag-encoder');
  // Jog to confirm an axis responds (its label appears when it moves).
  await tap(page, 'jog-x-positive');
  await waitForDisplayX(page, ['X'], null);
  await note(page, 'encoder X responded after jog (X label shown)');
  await snap(page, 'diag-encoder-x');
  await tap(page, 'key-clear'); // exit current step
  await tap(page, 'key-clear'); // exit diagnostics
  await page.waitForTimeout(150);
  await note(page, 'exited diagnostics to idle');
  await snap(page, 'diag-exit');

  // 5h. Keypad lock engaged, then setup still reachable
  step('5h. Keypad lock (LoC on) — keypad ignored but wrench/setup still reachable');
  await bootTo(page, 'debug');
  await page.waitForTimeout(BOOT_MS);
  // Jog X out so we can prove a zero attempt is blocked while locked.
  for (let i = 0; i < 6; i++) { await tap(page, 'jog-x-positive'); await page.waitForTimeout(40); }
  await note(page, 'X jogged out before locking');
  await tap(page, 'btn-settings');
  await tap(page, 'axis-select-x');
  await navigateToLabel(page, ['LoC']);
  let loc = await readDisplay(page);
  if (!/on/i.test(loc.X)) { await tap(page, 'key-6'); await page.waitForTimeout(80); }
  await note(page, 'LoC on (keypad lock engaged)');
  await snap(page, 'keypad-lock-on');
  await navigateToLabel(page, ['End']);
  await tap(page, 'key-enter'); // exit setup
  await page.waitForTimeout(200);
  const beforeLockZero = await readDisplay(page);
  await note(page, `locked idle, X='${beforeLockZero.X}'`);
  // Try a keypad action (zero X) — should be a no-op while locked.
  await tap(page, 'axis-select-x');
  await tap(page, 'axis-zero-x');
  const afterLockZero = await readDisplay(page);
  await note(page, `attempted ZERO X while locked: X='${afterLockZero.X}' (unchanged = lock works)`);
  await snap(page, 'keypad-lock-blocked');
  // Live readout still tracks the encoder even while locked (AC 43.5): jog more.
  await tap(page, 'jog-x-positive');
  await page.waitForTimeout(120);
  await note(page, 'readout still tracks encoder while locked (jogged X+1)');
  await snap(page, 'keypad-lock-readout-live');
  // Wrench still reachable:
  await tap(page, 'btn-settings');
  await note(page, 'setup still reachable while locked (SELECT shown)');
  await snap(page, 'keypad-lock-setup-reachable');
  // Unlock for cleanliness.
  await tap(page, 'axis-select-x');
  await navigateToLabel(page, ['LoC']);
  let loc2 = await readDisplay(page);
  if (/on/i.test(loc2.X)) { await tap(page, 'key-6'); await page.waitForTimeout(80); }
  await navigateToLabel(page, ['End']);
  await tap(page, 'key-enter');
  await page.waitForTimeout(200);

  // 5i. Touch probe trigger via the Edge probe function (prb LED lights on contact)
  step('5i. Touch probe — Edge function; trigger debug probe; prb LED lights on contact');
  await bootTo(page, 'debug');
  await page.waitForTimeout(BOOT_MS);
  const prbIdle = await ledOn(page, 'led-probe');
  await note(page, `idle: probe toggle alone does NOT light prb (it needs an active probe function). led-probe=${prbIdle}`);
  // Enter the touch-probe function: FUNCTION -> navigate ring to ProbE -> ENTER.
  await tap(page, 'btn-function');
  await page.waitForTimeout(120);
  // Ring: center, circle, line, linear, polar, taper, probe -> 6 right presses.
  for (let i = 0; i < 6; i++) { await tap(page, 'key-6'); await page.waitForTimeout(60); }
  await note(page, 'FUNCTION ring at ProbE');
  await snap(page, 'probe-function');
  await tap(page, 'key-enter'); // -> probe-menu-function (Prob Ed = Edge default)
  await note(page, 'probe sub-function menu (Prob Ed = Edge)');
  await snap(page, 'probe-edge-menu');
  await tap(page, 'key-enter'); // Edge needs no diameter -> probe-axis-select
  await tap(page, 'axis-select-x'); // select X axis -> probe-waiting
  await note(page, 'probe armed on X, waiting for contact (live position shown)');
  await snap(page, 'probe-waiting');
  // Trigger the debug probe: rising edge captures the edge, lights prb (AC 32.8).
  await tap(page, 'probe-toggle');
  await page.waitForTimeout(200);
  const prbOn = await ledOn(page, 'led-probe');
  await note(page, `probe contact captured (led-probe checked=${prbOn})`);
  await snap(page, 'probe-triggered');
  await tap(page, 'key-clear'); // exit probe function
  await page.waitForTimeout(150);
  await snap(page, 'probe-exit');

  step('DONE — writing log');
  const fs = await import('fs');
  fs.writeFileSync(join(OUT, 'driver-log.json'), JSON.stringify(log, null, 2));
  await browser.close();
  console.log('\nAll steps complete.');
}

/**
 * Navigate the setup parameter list by pressing key-8 (up) until the X display
 * starts with one of the target labels. Polls up to a full loop of the registry.
 */
async function navigateToLabel(page, labels) {
  const matches = (x) => labels.some((l) => x.toUpperCase().startsWith(l.toUpperCase()));
  for (let i = 0; i < 22; i++) {
    const d = await readDisplay(page);
    if (matches(d.X)) return d;
    await page.getByTestId('key-8').click();
    await page.waitForTimeout(70);
  }
  const d = await readDisplay(page);
  console.log(`  [warn] navigateToLabel(${labels}) did not match; at X='${d.X}'`);
  return d;
}

/**
 * Poll until the X display starts with one of `labels`, re-running `action`
 * before each check. Used for timing-sensitive entries (e.g. ▲ during boot).
 */
async function waitForDisplayX(page, labels, action) {
  const matches = (x) => labels.some((l) => x.toUpperCase().startsWith(l.toUpperCase()));
  for (let i = 0; i < 15; i++) {
    if (action) await action();
    await page.waitForTimeout(120);
    const d = await readDisplay(page);
    if (matches(d.X)) return d;
  }
  const d = await readDisplay(page);
  console.log(`  [warn] waitForDisplayX(${labels}) did not match; at X='${d.X}'`);
  return d;
}

main().catch((e) => { console.error(e); process.exit(1); });

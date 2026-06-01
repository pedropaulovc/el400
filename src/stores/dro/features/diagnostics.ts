/**
 * Self-Diagnostics Feature Reducer (US-046, manual §11.1)
 *
 * Models the EL400's boot-time self-test. Entry is the ▲ (8) key pressed during
 * the boot/version message; the test then walks four steps:
 *
 *   diagnostics-memory   RAM check — shows "RAmPASS" when memory is OK (§11.1)
 *     --any key-->
 *   diagnostics-display  segment/lamp test — every segment of every cell lit
 *     --any key-->
 *   diagnostics-keyboard echoes each pressed key's label on the display
 *     --ENTER-->
 *   diagnostics-encoder  confirms each axis responds to real movement
 *
 * Exit (§11.1): one `C` exits the current diagnostic step (back to the memory
 * step); a second consecutive `C` exits Self-Diagnostics Mode to the normal
 * screen. Any non-`C` key disarms the double-`C` gesture.
 *
 * Encoder verification reads the live machine position from context: on entering
 * the encoder step the current position is captured as a baseline, and each
 * MILL_STATE_CHANGED marks an axis "responding" once its position differs from
 * that baseline. There is no test-only latch — a real scale/jog drives it.
 */

import type { FeatureReducer, DROStatePayload } from '../types';
import type { DiagnosticsData, DROEventPayload } from '../droStateMachine';
import {
  DIAGNOSTICS_TEXT,
  DISPLAY_TEST_PATTERN,
  INITIAL_DIAGNOSTICS_DATA,
  INITIAL_DRO_STATE_DATA,
  isDiagnosticsActive,
} from '../droStateMachine';
import { computeNormalDisplay, createDisplay } from '../utils/displayComputation';

/**
 * Label echoed on the keyboard-diagnostic display for each key (§11.1: "DRO will
 * display the pressed key"). Digit and navigation keys echo their printed digit;
 * the named buttons echo a short seven-segment-renderable label.
 */
const KEY_LABEL: Record<string, string> = {
  KEY_0: '0',
  KEY_1: '1',
  KEY_2_DOWN: '2',
  KEY_3: '3',
  KEY_4_LEFT: '4',
  KEY_5: '5',
  KEY_6_RIGHT: '6',
  KEY_7: '7',
  KEY_8_UP: '8',
  KEY_9: '9',
  KEY_DECIMAL: 'dP',
  KEY_SIGN: '-',
  KEY_ENTER: 'Ent',
  BTN_ABS_INC: 'AbS',
  BTN_INCH_MM: 'inCh',
  BTN_HALF: 'hALF',
  BTN_FUNCTION: 'Fn',
  BTN_CALCULATOR: 'CALC',
  BTN_SELECT_X: 'X',
  BTN_SELECT_Y: 'Y',
  BTN_SELECT_Z: 'Z',
  BTN_ZERO_X: 'X 0',
  BTN_ZERO_Y: 'Y 0',
  BTN_ZERO_Z: 'Z 0',
};

/** Coerce arbitrary state data to DiagnosticsData, falling back to initial. */
function asDiagnosticsData(data: DROStatePayload['stateData']): DiagnosticsData {
  return data.stateDataType === 'diagnostics' ? data : INITIAL_DIAGNOSTICS_DATA;
}

/**
 * True when `eventName` is a front-panel user key/button press (the `KEY_*` and
 * `BTN_*` families). The memory and segment steps advance on a key (§11.1: "Press
 * any key …"); internal/adapter events — chiefly the MILL_STATE_CHANGED a
 * connected source broadcasts every 100ms — are NOT keys and must not skip past
 * those steps. (Same idiom as keypad-lock.ts / sleep.ts.)
 */
function isFrontPanelKey(eventName: DROEventPayload['eventName']): boolean {
  return eventName.startsWith('KEY_') || eventName.startsWith('BTN_');
}

/** Per-axis pass/fail label for the encoder step (axis name when responding). */
function encoderDisplay(data: DiagnosticsData) {
  return createDisplay(
    data.axesMoved.X ? 'X' : DIAGNOSTICS_TEXT.encoder,
    data.axesMoved.Y ? 'Y' : '',
    data.axesMoved.Z ? 'Z' : ''
  );
}

export const diagnosticsReducer: FeatureReducer = (current, event, context) => {
  const { stateName: state, vMem } = current;
  const { eventName } = event;

  // ── Entry: ▲ (8) during the boot/version message (AC 46.1) ──────────
  if (eventName === 'KEY_8_UP' && state === 'boot-show-message') {
    return {
      stateName: 'diagnostics-memory',
      stateData: INITIAL_DIAGNOSTICS_DATA,
      vMem,
      // AC 46.2: memory OK shows RAM pass.
      display: createDisplay(DIAGNOSTICS_TEXT.memoryPass, '', ''),
    };
  }

  if (!isDiagnosticsActive(state)) return null;

  const data = asDiagnosticsData(current.stateData);

  // ── Exit gesture (AC 46.6 / 46.7) ──────────────────────────────────
  if (eventName === 'KEY_CLEAR') {
    // Second consecutive C exits Self-Diagnostics Mode to the normal screen.
    if (data.clearPhase === 'armed') {
      return {
        stateName: 'idle',
        stateData: INITIAL_DRO_STATE_DATA,
        vMem,
        display: computeNormalDisplay(vMem, context),
      };
    }
    // First C exits the current step back to the memory step, arming exit.
    return {
      stateName: 'diagnostics-memory',
      stateData: { ...data, clearPhase: 'armed' },
      vMem,
      display: createDisplay(DIAGNOSTICS_TEXT.memoryPass, '', ''),
    };
  }

  // Any non-C key disarms the double-C gesture for the steps that consume keys.
  const disarmed: DiagnosticsData = { ...data, clearPhase: 'idle' };

  // The memory and segment steps advance on a real key press only (§11.1). A
  // connected adapter's MILL_STATE_CHANGED ticks are not keys, so they hold the
  // current step — otherwise a single ▲ at boot races past RAmPASS / the segment
  // test before the operator can see them (AC 46.2 / 46.3).
  if (
    (state === 'diagnostics-memory' || state === 'diagnostics-display') &&
    !isFrontPanelKey(eventName)
  ) {
    return current;
  }

  // ── Memory step: any key advances to the display test (AC 46.3) ─────
  if (state === 'diagnostics-memory') {
    return {
      stateName: 'diagnostics-display',
      stateData: disarmed,
      vMem,
      display: createDisplay(DISPLAY_TEST_PATTERN, DISPLAY_TEST_PATTERN, DISPLAY_TEST_PATTERN),
    };
  }

  // ── Display step: any key advances to the keyboard test (AC 46.4) ───
  if (state === 'diagnostics-display') {
    return {
      stateName: 'diagnostics-keyboard',
      stateData: disarmed,
      vMem,
      display: createDisplay(DIAGNOSTICS_TEXT.keyboard, '', ''),
    };
  }

  // ── Keyboard step: ENTER advances to encoder; any other key echoes ──
  if (state === 'diagnostics-keyboard') {
    if (eventName === 'KEY_ENTER') {
      const { position } = context.millState;
      return {
        stateName: 'diagnostics-encoder',
        stateData: {
          ...disarmed,
          encoderBaseline: { x: position.x, y: position.y, z: position.z },
          axesMoved: { X: false, Y: false, Z: false },
        },
        vMem,
        display: encoderDisplay(INITIAL_DIAGNOSTICS_DATA),
      };
    }
    const label = KEY_LABEL[eventName] ?? '';
    return {
      stateName: 'diagnostics-keyboard',
      stateData: { ...disarmed, lastKey: label },
      vMem,
      display: createDisplay(label, '', ''),
    };
  }

  // ── Encoder step: real movement confirms each axis (AC 46.5) ────────
  if (state === 'diagnostics-encoder') {
    if (eventName !== 'MILL_STATE_CHANGED') return current;
    const baseline = data.encoderBaseline;
    if (baseline === null) return current;
    const { position } = context.millState;
    const axesMoved = {
      X: data.axesMoved.X || position.x !== baseline.x,
      Y: data.axesMoved.Y || position.y !== baseline.y,
      Z: data.axesMoved.Z || position.z !== baseline.z,
    };
    const nextData: DiagnosticsData = { ...data, axesMoved };
    return {
      stateName: 'diagnostics-encoder',
      stateData: nextData,
      vMem,
      display: encoderDisplay(nextData),
    };
  }

  return current;
};

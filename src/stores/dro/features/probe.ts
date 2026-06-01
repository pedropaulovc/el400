/**
 * Touch Probe Feature Reducer (US-032, manual §10.1)
 *
 * Implements the user-facing touch-probe functions of the DRO:
 *
 *  - Probe DRO type (§10.1.1, configured in setup as `dro t` / `dro F`):
 *      * 'transmit' - the readout keeps counting on a trigger (idle ownership
 *        stays with idleReducer; this reducer returns null in idle).
 *      * 'freeze'   - the readout freezes the coordinates while the probe is
 *        triggered and resumes when it clears (AC 32.3, 32.7). Handled here for
 *        the idle state.
 *
 *  - Special probe functions (§10.1.2), reached via Fn -> ProbE -> ENT:
 *      * Edge (`Prob Ed`)     - sets the selected axis datum at the trigger edge.
 *      * Midpoint (`Prob nd`) - sets the datum at the midpoint of two edges.
 *      * Inside (`inS dE`)    - internal width = |edge2 - edge1| + probe diameter.
 *      * Outside (`oUtS dE`)  - external width = |edge2 - edge1| - probe diameter.
 *
 * Probe contacts are REAL adapter events: the CncjsMillAdapter (and DebugServer)
 * compute `MillState.probe.triggered` from the controller pin state, then
 * dispatch MILL_STATE_CHANGED. This reducer detects a *rising edge* of
 * `triggered` by comparing it against `lastProbeTriggered` carried in ProbeData,
 * so a held or pre-armed probe never double-captures. `C` exits at any step
 * (AC 32.10).
 */

import type { FeatureReducer, DROReducerContext, DROStatePayload } from '../types';
import type { DROStateName, ProbeData, ProbeFunction } from '../droStateMachine';
import {
  INITIAL_DRO_STATE_DATA,
  INITIAL_PROBE_DATA,
  isProbeActive,
} from '../droStateMachine';
import type { Axis, VolatileMemoryState } from '../../../types/volatileMemory';
import {
  computeNormalDisplay,
  createDisplay,
  type DisplayState,
} from '../utils/displayComputation';
import { fromMmToAnyUnit } from '../../../utils/unitConversion';
import { appendDigit, appendDecimal, getBufferValue, KEY_TO_DIGIT } from './buffer-utils';

/** 7-segment label shown for each probe sub-function (manual §10.1.2 abbreviations). */
const PROBE_FUNCTION_LABEL: Record<ProbeFunction, string> = {
  edge: 'Prob Ed',
  midpoint: 'Prob nd',
  inside: 'inS dE',
  outside: 'oUtS dE',
};

/** Probe sub-function selection ring (cycled with the left/right keys). */
const PROBE_FUNCTION_RING: ProbeFunction[] = ['edge', 'midpoint', 'inside', 'outside'];

/** Inside/Outside need a probe-tip-diameter prompt before measuring. */
const NEEDS_DIAMETER: Record<ProbeFunction, boolean> = {
  edge: false,
  midpoint: false,
  inside: true,
  outside: true,
};

function cycleFunction(current: ProbeFunction, delta: 1 | -1): ProbeFunction {
  const idx = PROBE_FUNCTION_RING.indexOf(current);
  const len = PROBE_FUNCTION_RING.length;
  const next = PROBE_FUNCTION_RING[(idx + delta + len) % len];
  return next ?? current;
}

/** Read the probe data out of a payload, falling back to the initial shape. */
function probeDataOf(state: DROStatePayload): ProbeData {
  return state.stateData.stateDataType === 'probe' ? state.stateData : INITIAL_PROBE_DATA;
}

/** Machine position (mm) of an axis from the live mill state. */
function machinePos(axis: Axis, context: DROReducerContext): number {
  const { position } = context.millState;
  if (axis === 'X') return position.x;
  if (axis === 'Y') return position.y;
  return position.z;
}

/** Exit the probe function back to the normal idle readout. */
function exitToIdle(vMem: VolatileMemoryState, context: DROReducerContext): DROStatePayload {
  return {
    stateName: 'idle',
    stateData: INITIAL_DRO_STATE_DATA,
    vMem,
    display: computeNormalDisplay(vMem, context),
  };
}

/**
 * Set the selected axis datum so the displayed value reads `targetMm` at the
 * current machine position. Mirrors the connected-ABS path of axis-operations:
 * workOffset = machinePos - targetMm. In manual (disconnected) mode it writes
 * the manual absolute value directly.
 */
function setAxisDatumMm(
  vMem: VolatileMemoryState,
  axis: Axis,
  targetMm: number,
  context: DROReducerContext
): VolatileMemoryState {
  if (vMem.mode === 'abs' && context.millState.connected) {
    return {
      ...vMem,
      workOffsets: { ...vMem.workOffsets, [axis]: machinePos(axis, context) - targetMm },
    };
  }
  if (vMem.mode === 'abs') {
    return {
      ...vMem,
      manualAbsoluteValues: { ...vMem.manualAbsoluteValues, [axis]: targetMm },
    };
  }
  return {
    ...vMem,
    incrementalValues: { ...vMem.incrementalValues, [axis]: targetMm },
  };
}

/**
 * Set the datum so the given *machine position* (mm) reads zero on the axis,
 * regardless of where the probe currently sits. Used for midpoint, where the
 * zero point (the midpoint) is not the current probe position.
 */
function setAxisDatumAtMachinePos(
  vMem: VolatileMemoryState,
  axis: Axis,
  machinePosMm: number,
  context: DROReducerContext
): VolatileMemoryState {
  if (vMem.mode === 'abs' && context.millState.connected) {
    return {
      ...vMem,
      workOffsets: { ...vMem.workOffsets, [axis]: machinePosMm },
    };
  }
  if (vMem.mode === 'abs') {
    // Disconnected: captures are display values; place the zero relative to the
    // current manual value so the midpoint reads zero.
    const delta = machinePosMm - vMem.manualAbsoluteValues[axis];
    return {
      ...vMem,
      manualAbsoluteValues: { ...vMem.manualAbsoluteValues, [axis]: -delta },
    };
  }
  return {
    ...vMem,
    incrementalValues: { ...vMem.incrementalValues, [axis]: machinePosMm },
  };
}

/** Display showing a single measurement result on the probed axis, blanks elsewhere. */
function resultDisplay(
  axis: Axis,
  resultMm: number,
  context: DROReducerContext
): DisplayState {
  const value = fromMmToAnyUnit(resultMm, context.nvMem.defaultUnit);
  return createDisplay(
    axis === 'X' ? value : '',
    axis === 'Y' ? value : '',
    axis === 'Z' ? value : ''
  );
}

/**
 * Apply a captured contact for the active function and return the next state.
 * `captures` already includes the just-captured position.
 */
function applyCapture(
  data: ProbeData,
  axis: Axis,
  captures: number[],
  vMem: VolatileMemoryState,
  context: DROReducerContext
): DROStatePayload {
  // EDGE: one contact sets the datum at the edge (target 0).
  if (data.probeFunction === 'edge') {
    const newVMem = setAxisDatumMm(vMem, axis, 0, context);
    return {
      stateName: 'probe-result',
      stateData: { ...data, captures, probeTriggered: true, lastProbeTriggered: true },
      vMem: newVMem,
      display: computeNormalDisplay(newVMem, context),
    };
  }

  // MIDPOINT / INSIDE / OUTSIDE need two contacts; wait for the second.
  if (captures.length < 2) {
    return {
      stateName: 'probe-waiting',
      stateData: { ...data, captures, probeTriggered: true, lastProbeTriggered: true },
      vMem,
      display: computeNormalDisplay(vMem, context),
    };
  }

  const [edge1 = 0, edge2 = 0] = captures;

  if (data.probeFunction === 'midpoint') {
    // The midpoint machine position must read 0, but the probe currently sits at
    // edge2 - so set the datum (offset) directly to the midpoint machine
    // position rather than relative to the current position.
    const mid = (edge1 + edge2) / 2;
    const newVMem = setAxisDatumAtMachinePos(vMem, axis, mid, context);
    return {
      stateName: 'probe-result',
      stateData: { ...data, captures, probeTriggered: true, lastProbeTriggered: true },
      vMem: newVMem,
      display: computeNormalDisplay(newVMem, context),
    };
  }

  // INSIDE: add probe diameter; OUTSIDE: subtract it (§10.1, tip compensation).
  const span = Math.abs(edge2 - edge1);
  const sign = data.probeFunction === 'inside' ? 1 : -1;
  const resultMm = span + sign * data.probeDiameterMm;
  return {
    stateName: 'probe-result',
    stateData: { ...data, captures, resultMm, probeTriggered: true, lastProbeTriggered: true },
    vMem,
    display: resultDisplay(axis, resultMm, context),
  };
}

/**
 * Handle a MILL_STATE_CHANGED tick while waiting for probe contact. Captures on a
 * rising edge of the probe trigger; otherwise just tracks the trigger state.
 */
function handleWaitingTick(
  data: ProbeData,
  state: DROStatePayload,
  context: DROReducerContext
): DROStatePayload {
  const triggered = context.millState.probe.triggered;
  const risingEdge = triggered && !data.lastProbeTriggered;
  const axis = data.probeAxis;

  // No axis selected yet (defensive) or no fresh trigger: just track the edge.
  if (axis === null || !risingEdge) {
    return {
      ...state,
      stateData: { ...data, lastProbeTriggered: triggered, probeTriggered: false },
      display: computeNormalDisplay(state.vMem, context),
    };
  }

  const captures = [...data.captures, machinePos(axis, context)];
  return applyCapture(data, axis, captures, state.vMem, context);
}

/**
 * Freeze-mode idle handler (AC 32.3): while the probe is triggered, hold the
 * display at the value captured on the contact tick; resume normal counting when
 * the probe clears. Returns null in transmit mode so idleReducer keeps counting.
 */
function handleIdleFreeze(
  state: DROStatePayload,
  context: DROReducerContext
): DROStatePayload | null {
  if (context.nvMem.probeDroType !== 'freeze') return null;

  const triggered = context.millState.probe.triggered;
  const data = probeDataOf(state);

  if (!triggered) {
    // Probe open: normal counting, but keep tracking the edge for next contact.
    return {
      ...state,
      stateData: { ...INITIAL_PROBE_DATA, lastProbeTriggered: false },
      display: computeNormalDisplay(state.vMem, context),
    };
  }

  // Probe triggered. On the rising edge, latch the current display; while held,
  // keep the latched display unchanged regardless of further motion.
  if (!data.lastProbeTriggered) {
    return {
      ...state,
      stateData: { ...INITIAL_PROBE_DATA, lastProbeTriggered: true, probeTriggered: true },
      display: computeNormalDisplay(state.vMem, context),
    };
  }
  return {
    ...state,
    stateData: { ...data, lastProbeTriggered: true },
    // Display intentionally left unchanged (frozen) from the contact tick.
  };
}

export const probeReducer: FeatureReducer = (state, event, context) => {
  const { stateName, vMem } = state;

  // Idle freeze-mode display behaviour (AC 32.2, 32.3, 32.7).
  if (stateName === 'idle') {
    if (event.eventName !== 'MILL_STATE_CHANGED') return null;
    return handleIdleFreeze(state, context);
  }

  if (!isProbeActive(stateName)) return null;

  const data = probeDataOf(state);

  // C exits the probe function from any of its states (AC 32.10).
  if (event.eventName === 'KEY_CLEAR') {
    return exitToIdle(vMem, context);
  }

  // ── Sub-function selection menu ───────────────────────────────────────────
  if (stateName === 'probe-menu-function') {
    if (event.eventName === 'KEY_6_RIGHT' || event.eventName === 'KEY_4_LEFT') {
      const delta = event.eventName === 'KEY_6_RIGHT' ? 1 : -1;
      const probeFunction = cycleFunction(data.probeFunction, delta);
      return {
        ...state,
        stateData: { ...data, probeFunction },
        display: createDisplay(PROBE_FUNCTION_LABEL[probeFunction], '', ''),
      };
    }
    if (event.eventName === 'KEY_ENTER') {
      const next: DROStateName = NEEDS_DIAMETER[data.probeFunction]
        ? 'probe-diameter'
        : 'probe-axis-select';
      const display = next === 'probe-diameter'
        ? createDisplay('Prb d A', '', '')
        : createDisplay(PROBE_FUNCTION_LABEL[data.probeFunction], '', '');
      return { ...state, stateName: next, stateData: data, display };
    }
    return state;
  }

  // ── Probe tip diameter entry (inside/outside) ─────────────────────────────
  if (stateName === 'probe-diameter') {
    // Digit / decimal entry builds the diameter buffer (keypadReducer only owns
    // idle, so probe-diameter handles its own numeric input).
    const digit = KEY_TO_DIGIT[event.eventName];
    if (digit !== undefined) {
      return { ...state, vMem: { ...vMem, inputBuffer: appendDigit(vMem.inputBuffer, digit) } };
    }
    if (event.eventName === 'KEY_DECIMAL') {
      return { ...state, vMem: { ...vMem, inputBuffer: appendDecimal(vMem.inputBuffer) } };
    }
    if (event.eventName === 'KEY_ENTER') {
      const entered = getBufferValue(vMem.inputBuffer);
      if (entered === null) return state;
      // Stored in mm; entry is in the user's display unit.
      const probeDiameterMm = context.nvMem.defaultUnit === 'mm' ? entered : entered * 25.4;
      return {
        stateName: 'probe-axis-select',
        stateData: { ...data, probeDiameterMm },
        vMem: { ...vMem, inputBuffer: '' },
        display: createDisplay(PROBE_FUNCTION_LABEL[data.probeFunction], '', ''),
      };
    }
    return state;
  }

  // ── Axis selection ────────────────────────────────────────────────────────
  if (stateName === 'probe-axis-select') {
    const axis = event.eventName === 'BTN_SELECT_X' ? 'X'
      : event.eventName === 'BTN_SELECT_Y' ? 'Y'
      : event.eventName === 'BTN_SELECT_Z' ? 'Z'
      : null;
    if (axis === null) return state;
    return {
      stateName: 'probe-waiting',
      // Seed lastProbeTriggered from the live pin state so a probe already held
      // high on arming does not auto-fire (only a fresh rising edge captures).
      stateData: {
        ...data,
        probeAxis: axis,
        captures: [],
        resultMm: null,
        probeTriggered: false,
        lastProbeTriggered: context.millState.probe.triggered,
      },
      vMem,
      display: computeNormalDisplay(vMem, context),
    };
  }

  // ── Waiting for probe contact ─────────────────────────────────────────────
  if (stateName === 'probe-waiting') {
    if (event.eventName === 'MILL_STATE_CHANGED') {
      return handleWaitingTick(data, state, context);
    }
    return state;
  }

  // ── Result shown; only C (handled above) exits ────────────────────────────
  if (stateName === 'probe-result') {
    return state;
  }

  return state;
};

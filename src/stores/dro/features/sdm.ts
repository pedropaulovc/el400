/**
 * Sub Datum Memory (SDM) Feature Reducer (US-009 Learn + US-010 Program)
 *
 * The SDM lets the operator store up to 1000 sub-datum points, each holding
 * X/Y/Z coordinates (manual §8.2). This file implements the LEARN sub-function
 * (manual §8.2.2), the PROGRAM / direct-entry sub-function (manual §8.2.1), and
 * the RUN / recall sub-function (manual §8.2.3, US-011); all three plug into the
 * same menu ring and share the `points` map (`SdmData`).
 *
 * Learn-mode workflow (manual §8.2.2):
 *  - Intro: shows "SdM" briefly, then auto-advances to the menu.
 *  - Menu: Program / Learn / Run, navigated with left/right arrows; Enter
 *    confirms.
 *  - Step entry: the operator types a step number on the Y display and confirms
 *    with Enter (defaults to step 1).
 *  - Capture: move the machine to the desired position, press X once to show
 *    the current step number, press X again to store the live position as that
 *    step's sub-datum and advance to the next step.
 *  - Press C (clear) at any point to exit.
 *
 * Program-mode workflow (manual §8.2.1, US-010):
 *  - Confirm Program at the menu → step prompt ("StEP" on X, step number on Y),
 *    defaulting to step 1. Edit the step by typing digits and pressing Enter
 *    (or press Y to start a fresh jump-target entry).
 *  - Enter advances into per-axis coordinate entry: X, then Y, then Z. Type a
 *    coordinate in the operator's current unit and press Enter to confirm each;
 *    the value is converted to mm and stored in the same `points` map Learn uses
 *    (so US-011 Run reads either source uniformly). Pressing an axis-select
 *    button (X/Y/Z) jumps straight to that axis.
 *  - After Z the session returns to the step prompt. 6► saves and advances to
 *    the next step; 4◄ goes to the previous step (manual: "right and left key …
 *    select previous/next step"; story AC 10.4 binds save+advance to 6►).
 *  - Jump-to-step (AC 10.5): press Y, type the step number, press Enter.
 *  - Press C (clear) to exit.
 *
 * Run-mode workflow (manual §8.2.3, US-011):
 *  - Confirm Run at the menu → step-select prompt ("rUn" on X, step number on Y),
 *    defaulting to step 1. Type a step number (or press Y to start a fresh entry)
 *    and press Enter to confirm.
 *  - Enter shows the live DISTANCE-TO-GO for the selected step: the stored
 *    sub-datum (read from the shared `points` map) minus the current machine
 *    position, per axis, in the operator's unit. The display refreshes on every
 *    MILL_STATE_CHANGED so it tracks the machine as the operator jogs to zero.
 *  - 6► advances to the next step, 4◄ goes to the previous step; the DTG follows.
 *  - Press C (clear) to exit.
 *
 * Spec discrepancy: the Learn story (AC 9.4) binds "store" to `6►`; the manual
 * §8.2.2 binds it to `X`. The manual wins (per the implementer brief), so the
 * learn store/advance action is BTN_SELECT_X.
 */

import { useEffect, type Dispatch } from 'react';
import type { FeatureReducer, DROReducerContext, DROStatePayload } from '../types';
import type {
  DROStateName,
  DROEventPayload,
  SdmData,
  SdmMode,
  StoredPoint,
} from '../droStateMachine';
import {
  INITIAL_DRO_STATE_DATA,
  INITIAL_SDM_DATA,
  MAX_SDM_STEPS,
  isSdmActive,
} from '../droStateMachine';
import type { VolatileMemoryState } from '../../../types/volatileMemory';
import {
  getBufferValue,
  appendDigit,
  appendDecimal,
  toggleSign,
  removeLastChar,
  KEY_TO_DIGIT,
} from './buffer-utils';
import {
  computeNormalDisplay,
  computeAxisPositionMm,
  createDisplay,
  type DisplayState,
} from '../utils/displayComputation';
import { fromMmToAnyUnit, fromAnyUnitToMm } from '../../../utils/unitConversion';

/** Duration the "SdM" intro message shows before auto-advancing. */
export const SDM_INTRO_DURATION_MS = 1000;

/** Intro text shown when SDM mode is entered. */
export const SDM_INTRO_TEXT = 'Sdm';

/** Menu text shown for each SDM sub-function. */
const SDM_MENU_TEXT: Partial<Record<DROStateName, string>> = {
  'sdm-menu-program': 'ProGrAn',
  'sdm-menu-learn': 'LEArn',
  'sdm-menu-run': 'rUn',
};

/** Maps each menu state to the SDM sub-function it selects. */
const MENU_MODE: Record<string, SdmMode> = {
  'sdm-menu-program': 'PROGRAM',
  'sdm-menu-learn': 'LEARN',
  'sdm-menu-run': 'RUN',
};

/** Menu navigation ring - bidirectional, wraps around. */
const SDM_MENU_RING: DROStateName[] = [
  'sdm-menu-learn',
  'sdm-menu-run',
  'sdm-menu-program',
];

function getMenuState(current: DROStateName, step: number): DROStateName {
  const idx = SDM_MENU_RING.indexOf(current);
  if (idx === -1) return current;
  const len = SDM_MENU_RING.length;
  const nextIdx = (idx + step + len) % len;
  return SDM_MENU_RING[nextIdx] ?? current;
}

/** Read SDM data off the payload, falling back to the initial shape. */
function readSdmData(stateData: DROStatePayload['stateData']): SdmData {
  return stateData.stateDataType === 'sdm' ? stateData : INITIAL_SDM_DATA;
}

/** Capture the current live position (mm) for all three axes. */
function captureCurrentPosition(
  vMem: VolatileMemoryState,
  context: DROReducerContext
): StoredPoint {
  return {
    X: computeAxisPositionMm('X', vMem, context),
    Y: computeAxisPositionMm('Y', vMem, context),
    Z: computeAxisPositionMm('Z', vMem, context),
  };
}

/** Menu display: X shows the sub-function name, Y/Z blank. */
function computeMenuDisplay(state: DROStateName): DisplayState {
  return createDisplay(SDM_MENU_TEXT[state] ?? '', '', '');
}

/** Step-entry display: X shows the "StEP" prompt, Y shows the entered number. */
function computeStepEntryDisplay(vMem: VolatileMemoryState): DisplayState {
  const value = getBufferValue(vMem.inputBuffer);
  return createDisplay('StEP', value ?? 0, '');
}

/** "rUn" prompt text shown on X during run step-select (manual §8.2.3). */
const SDM_RUN_PROMPT = 'rUn';

/**
 * Run step-select display (manual §8.2.3): X shows the "rUn" prompt; Y shows the
 * buffered step number if one is being typed, otherwise the current step.
 */
function computeRunStepDisplay(data: SdmData, vMem: VolatileMemoryState): DisplayState {
  const buffered = getBufferValue(vMem.inputBuffer);
  return createDisplay(SDM_RUN_PROMPT, buffered ?? data.currentStep, '');
}

/**
 * Absolute machine position (mm) for an axis, ignoring vMem.mode — distance-to-go
 * is always measured against the absolute datum (mirrors the US-008 preset DTG).
 */
function absolutePositionMm(
  axis: ProgramAxis,
  vMem: VolatileMemoryState,
  context: DROReducerContext
): number {
  const { workOffsets, manualAbsoluteValues } = vMem;
  const { millState } = context;
  if (millState.connected) {
    const axisKey = axis.toLowerCase() as 'x' | 'y' | 'z';
    return millState.position[axisKey] - workOffsets[axis];
  }
  return manualAbsoluteValues[axis];
}

/**
 * Run distance-to-go display (manual §8.2.3): each axis shows the stored
 * sub-datum for the current step minus the live machine position, converted to
 * the operator's unit. An unstored step is treated as a zero sub-datum.
 */
function computeRunDtgDisplay(
  data: SdmData,
  vMem: VolatileMemoryState,
  context: DROReducerContext
): DisplayState {
  const unit = context.nvMem.defaultUnit;
  const stored = data.points[data.currentStep];

  const dtgFor = (axis: ProgramAxis): number => {
    const targetMm = stored?.[axis] ?? 0;
    const currentMm = absolutePositionMm(axis, vMem, context);
    return fromMmToAnyUnit(targetMm - currentMm, unit);
  };

  return createDisplay(dtgFor('X'), dtgFor('Y'), dtgFor('Z'));
}

/** Axes handled by program direct-entry, in confirmation order. */
const PROGRAM_AXES = ['X', 'Y', 'Z'] as const;
type ProgramAxis = (typeof PROGRAM_AXES)[number];

/** Map each program coordinate-entry state to its axis. */
const PROGRAM_INPUT_AXIS: Partial<Record<DROStateName, ProgramAxis>> = {
  'sdm-program-input-x': 'X',
  'sdm-program-input-y': 'Y',
  'sdm-program-input-z': 'Z',
};

/** Map an axis to its program coordinate-entry state. */
const PROGRAM_AXIS_STATE: Record<ProgramAxis, DROStateName> = {
  X: 'sdm-program-input-x',
  Y: 'sdm-program-input-y',
  Z: 'sdm-program-input-z',
};

/**
 * Program step-view display (manual §8.2.1): X shows the "StEP" prompt; Y shows
 * the buffered jump-target if one is being typed, otherwise the current step.
 */
function computeProgramStepDisplay(data: SdmData, vMem: VolatileMemoryState): DisplayState {
  const buffered = getBufferValue(vMem.inputBuffer);
  return createDisplay('StEP', buffered ?? data.currentStep, '');
}

/** Parse the buffer to a numeric value for display (empty/invalid => 0). */
function bufferToDisplayNumber(buffer: string): number {
  if (!buffer || buffer === '-' || buffer === '.' || buffer === '-.') return 0;
  const value = parseFloat(buffer);
  return isNaN(value) ? 0 : value;
}

/**
 * Program coordinate-entry display: the axis being edited shows the typed
 * buffer value; the other two axes show their stored coordinate for the step
 * (in the operator's unit), so the operator sees the point taking shape.
 */
function computeProgramInputDisplay(
  state: DROStateName,
  data: SdmData,
  vMem: VolatileMemoryState,
  context: DROReducerContext
): DisplayState {
  const editing = PROGRAM_INPUT_AXIS[state];
  const unit = context.nvMem.defaultUnit;
  const stored = data.points[data.currentStep];

  const valueFor = (axis: ProgramAxis): number => {
    if (axis === editing) return bufferToDisplayNumber(vMem.inputBuffer);
    return fromMmToAnyUnit(stored?.[axis] ?? 0, unit);
  };

  return createDisplay(valueFor('X'), valueFor('Y'), valueFor('Z'));
}

/** Store one coordinate (mm) for the current step, preserving the other axes. */
function storeProgramCoordinate(data: SdmData, axis: ProgramAxis, valueMm: number): SdmData {
  const existing = data.points[data.currentStep] ?? { X: 0, Y: 0, Z: 0 };
  return {
    ...data,
    points: { ...data.points, [data.currentStep]: { ...existing, [axis]: valueMm } },
  };
}

/** Position display: live position, but with the step number shown on Y once the first X is pressed. */
function computePositionDisplay(
  data: SdmData,
  vMem: VolatileMemoryState,
  context: DROReducerContext
): DisplayState {
  const normal = computeNormalDisplay(vMem, context);
  if (data.learnPhase === 'step-shown') {
    return createDisplay(normal.X, data.currentStep, normal.Z);
  }
  return normal;
}

/** Return to idle, discarding the SDM session. */
function exitToIdle(vMem: VolatileMemoryState, context: DROReducerContext): DROStatePayload {
  return {
    stateName: 'idle',
    stateData: INITIAL_DRO_STATE_DATA,
    vMem,
    display: computeNormalDisplay(vMem, context),
  };
}

/** True for the SDM menu selection states (program / learn / run). */
function isSdmMenuState(state: DROStateName): boolean {
  return state === 'sdm-menu-program' || state === 'sdm-menu-learn' || state === 'sdm-menu-run';
}

export const sdmReducer: FeatureReducer = (statePayload, eventPayload, context) => {
  const { stateName: state, vMem } = statePayload;
  const { eventName } = eventPayload;

  if (!isSdmActive(state)) return null;

  const data = readSdmData(statePayload.stateData);

  // ── intro ────────────────────────────────────────────────────────
  if (state === 'sdm-intro') {
    if (eventName === 'SDM_INTRO_TIMEOUT') {
      return {
        stateName: 'sdm-menu-learn',
        stateData: { ...data, sdmMode: 'LEARN' },
        vMem,
        display: computeMenuDisplay('sdm-menu-learn'),
      };
    }
    return statePayload;
  }

  // ── menu navigation ──────────────────────────────────────────────
  if (isSdmMenuState(state)) {
    if (eventName === 'KEY_CLEAR') return exitToIdle(vMem, context);

    if (eventName === 'KEY_6_RIGHT' || eventName === 'KEY_4_LEFT') {
      const next = getMenuState(state, eventName === 'KEY_6_RIGHT' ? 1 : -1);
      return {
        stateName: next,
        stateData: { ...data, sdmMode: MENU_MODE[next] ?? data.sdmMode },
        vMem,
        display: computeMenuDisplay(next),
      };
    }

    if (eventName === 'KEY_ENTER') {
      const newVMem = { ...vMem, inputBuffer: '' };

      if (state === 'sdm-menu-learn') {
        const learnData: SdmData = { ...data, sdmMode: 'LEARN', currentStep: 1 };
        return {
          stateName: 'sdm-learn-step',
          stateData: learnData,
          vMem: newVMem,
          display: computeStepEntryDisplay(newVMem),
        };
      }

      // Program / direct-entry (US-010, manual §8.2.1).
      if (state === 'sdm-menu-program') {
        const programData: SdmData = { ...data, sdmMode: 'PROGRAM', currentStep: 1 };
        return {
          stateName: 'sdm-program-step',
          stateData: programData,
          vMem: newVMem,
          display: computeProgramStepDisplay(programData, newVMem),
        };
      }

      // Run / recall (US-011, manual §8.2.3): step-select prompt at step 1.
      const runData: SdmData = { ...data, sdmMode: 'RUN', currentStep: 1 };
      return {
        stateName: 'sdm-run-step',
        stateData: runData,
        vMem: newVMem,
        display: computeRunStepDisplay(runData, newVMem),
      };
    }
    return statePayload;
  }

  // ── step entry ───────────────────────────────────────────────────
  if (state === 'sdm-learn-step') {
    if (eventName === 'KEY_CLEAR') {
      if (vMem.inputBuffer !== '') {
        const newVMem = { ...vMem, inputBuffer: removeLastChar(vMem.inputBuffer) };
        return { ...statePayload, vMem: newVMem, display: computeStepEntryDisplay(newVMem) };
      }
      return exitToIdle(vMem, context);
    }

    const digit = KEY_TO_DIGIT[eventName];
    if (digit !== undefined) {
      const newVMem = { ...vMem, inputBuffer: appendDigit(vMem.inputBuffer, digit) };
      return { ...statePayload, vMem: newVMem, display: computeStepEntryDisplay(newVMem) };
    }

    if (eventName === 'KEY_ENTER') {
      const typed = getBufferValue(vMem.inputBuffer);
      // Empty buffer keeps the current step (defaults to 1).
      const step = typed === null ? data.currentStep : Math.floor(typed);
      if (step < 1 || step > MAX_SDM_STEPS) return statePayload;
      const newVMem = { ...vMem, inputBuffer: '' };
      const newData: SdmData = { ...data, currentStep: step, learnPhase: 'awaiting-first-press' };
      return {
        stateName: 'sdm-learn-position',
        stateData: newData,
        vMem: newVMem,
        display: computePositionDisplay(newData, newVMem, context),
      };
    }
    return statePayload;
  }

  // ── learn capture (two X presses) ────────────────────────────────
  if (state === 'sdm-learn-position') {
    if (eventName === 'KEY_CLEAR') return exitToIdle(vMem, context);

    if (eventName === 'MILL_STATE_CHANGED') {
      return { ...statePayload, display: computePositionDisplay(data, vMem, context) };
    }

    if (eventName === 'BTN_SELECT_X') {
      // First press: reveal the current step number, store nothing yet.
      if (data.learnPhase === 'awaiting-first-press') {
        const newData: SdmData = { ...data, learnPhase: 'step-shown' };
        return {
          ...statePayload,
          stateData: newData,
          display: computePositionDisplay(newData, vMem, context),
        };
      }

      // Second press: store the live position and advance to the next step.
      const point = captureCurrentPosition(vMem, context);
      const nextStep = Math.min(data.currentStep + 1, MAX_SDM_STEPS);
      const newPoints = { ...data.points, [data.currentStep]: point };
      const newData: SdmData = {
        ...data,
        points: newPoints,
        currentStep: nextStep,
        learnPhase: 'awaiting-first-press',
      };
      return {
        ...statePayload,
        stateData: newData,
        vMem: { ...vMem, sdmPoints: newPoints },
        display: computePositionDisplay(newData, vMem, context),
      };
    }
    return statePayload;
  }

  // ── program: step view (manual §8.2.1) ───────────────────────────
  if (state === 'sdm-program-step') {
    if (eventName === 'KEY_CLEAR') {
      if (vMem.inputBuffer !== '') {
        const newVMem = { ...vMem, inputBuffer: removeLastChar(vMem.inputBuffer) };
        return { ...statePayload, vMem: newVMem, display: computeProgramStepDisplay(data, newVMem) };
      }
      return exitToIdle(vMem, context);
    }

    if (eventName === 'MILL_STATE_CHANGED') {
      return { ...statePayload, display: computeProgramStepDisplay(data, vMem) };
    }

    // Y opens a jump-to-step prompt (AC 10.5): type the target step, Enter jumps.
    if (eventName === 'BTN_SELECT_Y') {
      const newVMem = { ...vMem, inputBuffer: '' };
      return {
        stateName: 'sdm-program-jump',
        stateData: data,
        vMem: newVMem,
        display: computeProgramStepDisplay(data, newVMem),
      };
    }

    // 6► / 4◄ save the current step and move to the next / previous step.
    if (eventName === 'KEY_6_RIGHT' || eventName === 'KEY_4_LEFT') {
      const delta = eventName === 'KEY_6_RIGHT' ? 1 : -1;
      const nextStep = Math.min(Math.max(data.currentStep + delta, 1), MAX_SDM_STEPS);
      const newData: SdmData = { ...data, currentStep: nextStep };
      const newVMem = { ...vMem, inputBuffer: '' };
      return {
        stateName: 'sdm-program-step',
        stateData: newData,
        vMem: newVMem,
        display: computeProgramStepDisplay(newData, newVMem),
      };
    }

    const stepDigit = KEY_TO_DIGIT[eventName];
    if (stepDigit !== undefined) {
      const newVMem = { ...vMem, inputBuffer: appendDigit(vMem.inputBuffer, stepDigit) };
      return { ...statePayload, vMem: newVMem, display: computeProgramStepDisplay(data, newVMem) };
    }

    if (eventName === 'KEY_ENTER') {
      const typed = getBufferValue(vMem.inputBuffer);
      const step = typed === null ? data.currentStep : Math.floor(typed);
      if (step < 1 || step > MAX_SDM_STEPS) return statePayload;
      const newData: SdmData = { ...data, currentStep: step };
      const newVMem = { ...vMem, inputBuffer: '' };
      return {
        stateName: 'sdm-program-input-x',
        stateData: newData,
        vMem: newVMem,
        display: computeProgramInputDisplay('sdm-program-input-x', newData, newVMem, context),
      };
    }
    return statePayload;
  }

  // ── program: jump-to-step entry (manual §8.2.1, AC 10.5) ─────────
  if (state === 'sdm-program-jump') {
    if (eventName === 'KEY_CLEAR') {
      if (vMem.inputBuffer !== '') {
        const newVMem = { ...vMem, inputBuffer: removeLastChar(vMem.inputBuffer) };
        return { ...statePayload, vMem: newVMem, display: computeProgramStepDisplay(data, newVMem) };
      }
      // Cancel the jump, returning to the step view at the current step.
      return {
        stateName: 'sdm-program-step',
        stateData: data,
        vMem,
        display: computeProgramStepDisplay(data, vMem),
      };
    }

    if (eventName === 'MILL_STATE_CHANGED') {
      return { ...statePayload, display: computeProgramStepDisplay(data, vMem) };
    }

    const jumpDigit = KEY_TO_DIGIT[eventName];
    if (jumpDigit !== undefined) {
      const newVMem = { ...vMem, inputBuffer: appendDigit(vMem.inputBuffer, jumpDigit) };
      return { ...statePayload, vMem: newVMem, display: computeProgramStepDisplay(data, newVMem) };
    }

    if (eventName === 'KEY_ENTER') {
      const typed = getBufferValue(vMem.inputBuffer);
      const step = typed === null ? data.currentStep : Math.floor(typed);
      if (step < 1 || step > MAX_SDM_STEPS) {
        // Invalid target: discard and return to the step view unchanged.
        const newVMem = { ...vMem, inputBuffer: '' };
        return {
          stateName: 'sdm-program-step',
          stateData: data,
          vMem: newVMem,
          display: computeProgramStepDisplay(data, newVMem),
        };
      }
      const newData: SdmData = { ...data, currentStep: step };
      const newVMem = { ...vMem, inputBuffer: '' };
      return {
        stateName: 'sdm-program-step',
        stateData: newData,
        vMem: newVMem,
        display: computeProgramStepDisplay(newData, newVMem),
      };
    }
    return statePayload;
  }

  // ── run: step select (manual §8.2.3) ─────────────────────────────
  if (state === 'sdm-run-step') {
    if (eventName === 'KEY_CLEAR') {
      if (vMem.inputBuffer !== '') {
        const newVMem = { ...vMem, inputBuffer: removeLastChar(vMem.inputBuffer) };
        return { ...statePayload, vMem: newVMem, display: computeRunStepDisplay(data, newVMem) };
      }
      return exitToIdle(vMem, context);
    }

    if (eventName === 'MILL_STATE_CHANGED') {
      return { ...statePayload, display: computeRunStepDisplay(data, vMem) };
    }

    // Y starts a fresh step entry (manual §8.2.3: "press Y and numeric values").
    if (eventName === 'BTN_SELECT_Y') {
      const newVMem = { ...vMem, inputBuffer: '' };
      return { ...statePayload, vMem: newVMem, display: computeRunStepDisplay(data, newVMem) };
    }

    const runDigit = KEY_TO_DIGIT[eventName];
    if (runDigit !== undefined) {
      const newVMem = { ...vMem, inputBuffer: appendDigit(vMem.inputBuffer, runDigit) };
      return { ...statePayload, vMem: newVMem, display: computeRunStepDisplay(data, newVMem) };
    }

    if (eventName === 'KEY_ENTER') {
      const typed = getBufferValue(vMem.inputBuffer);
      const step = typed === null ? data.currentStep : Math.floor(typed);
      if (step < 1 || step > MAX_SDM_STEPS) return statePayload;
      const newData: SdmData = { ...data, currentStep: step };
      const newVMem = { ...vMem, inputBuffer: '' };
      return {
        stateName: 'sdm-run-active',
        stateData: newData,
        vMem: newVMem,
        display: computeRunDtgDisplay(newData, newVMem, context),
      };
    }
    return statePayload;
  }

  // ── run: distance-to-go view (manual §8.2.3) ─────────────────────
  if (state === 'sdm-run-active') {
    if (eventName === 'KEY_CLEAR') return exitToIdle(vMem, context);

    if (eventName === 'MILL_STATE_CHANGED') {
      return { ...statePayload, display: computeRunDtgDisplay(data, vMem, context) };
    }

    // 6► / 4◄ move to the next / previous step; the DTG follows.
    if (eventName === 'KEY_6_RIGHT' || eventName === 'KEY_4_LEFT') {
      const delta = eventName === 'KEY_6_RIGHT' ? 1 : -1;
      const nextStep = Math.min(Math.max(data.currentStep + delta, 1), MAX_SDM_STEPS);
      const newData: SdmData = { ...data, currentStep: nextStep };
      return {
        ...statePayload,
        stateData: newData,
        display: computeRunDtgDisplay(newData, vMem, context),
      };
    }
    return statePayload;
  }

  // ── program: per-axis coordinate entry (manual §8.2.1) ───────────
  const inputAxis = PROGRAM_INPUT_AXIS[state];
  if (inputAxis !== undefined) {
    const refresh = (vm: VolatileMemoryState) => computeProgramInputDisplay(state, data, vm, context);

    if (eventName === 'KEY_CLEAR') {
      if (vMem.inputBuffer !== '') {
        const newVMem = { ...vMem, inputBuffer: removeLastChar(vMem.inputBuffer) };
        return { ...statePayload, vMem: newVMem, display: refresh(newVMem) };
      }
      return exitToIdle(vMem, context);
    }

    if (eventName === 'MILL_STATE_CHANGED') {
      return { ...statePayload, display: refresh(vMem) };
    }

    // Selecting an axis jumps straight to editing that axis (manual §8.2.1).
    const selectAxis =
      eventName === 'BTN_SELECT_X' ? 'X' :
      eventName === 'BTN_SELECT_Y' ? 'Y' :
      eventName === 'BTN_SELECT_Z' ? 'Z' : null;
    if (selectAxis !== null) {
      const target = PROGRAM_AXIS_STATE[selectAxis];
      const newVMem = { ...vMem, inputBuffer: '' };
      return {
        stateName: target,
        stateData: data,
        vMem: newVMem,
        display: computeProgramInputDisplay(target, data, newVMem, context),
      };
    }

    const digit = KEY_TO_DIGIT[eventName];
    if (digit !== undefined) {
      const newVMem = { ...vMem, inputBuffer: appendDigit(vMem.inputBuffer, digit) };
      return { ...statePayload, vMem: newVMem, display: refresh(newVMem) };
    }

    if (eventName === 'KEY_DECIMAL') {
      const newVMem = { ...vMem, inputBuffer: appendDecimal(vMem.inputBuffer) };
      return { ...statePayload, vMem: newVMem, display: refresh(newVMem) };
    }

    if (eventName === 'KEY_SIGN') {
      const newVMem = { ...vMem, inputBuffer: toggleSign(vMem.inputBuffer) };
      return { ...statePayload, vMem: newVMem, display: refresh(newVMem) };
    }

    if (eventName === 'KEY_ENTER') {
      const typed = getBufferValue(vMem.inputBuffer);
      // Empty buffer keeps the existing stored value for this axis.
      const stored = data.points[data.currentStep];
      const valueMm =
        typed === null
          ? stored?.[inputAxis] ?? 0
          : fromAnyUnitToMm(typed, context.nvMem.defaultUnit);
      const newData = storeProgramCoordinate(data, inputAxis, valueMm);
      // Persist to the retained store so Run (US-011) can recall it later.
      const newVMem = { ...vMem, inputBuffer: '', sdmPoints: newData.points };

      // Advance X → Y → Z → back to the step view.
      const axisIdx = PROGRAM_AXES.indexOf(inputAxis);
      const nextAxis = PROGRAM_AXES[axisIdx + 1];
      if (nextAxis === undefined) {
        return {
          stateName: 'sdm-program-step',
          stateData: newData,
          vMem: newVMem,
          display: computeProgramStepDisplay(newData, newVMem),
        };
      }
      const nextState = PROGRAM_AXIS_STATE[nextAxis];
      return {
        stateName: nextState,
        stateData: newData,
        vMem: newVMem,
        display: computeProgramInputDisplay(nextState, newData, newVMem, context),
      };
    }
    return statePayload;
  }

  return statePayload;
};

/**
 * Hook to manage the SDM intro timing.
 * Auto-advances from the intro state after SDM_INTRO_DURATION_MS.
 */
export function useSdmIntro(
  dispatch: Dispatch<DROEventPayload>,
  droState: DROStateName
) {
  useEffect(() => {
    if (droState === 'sdm-intro') {
      const timer = setTimeout(() => {
        dispatch({ eventName: 'SDM_INTRO_TIMEOUT' });
      }, SDM_INTRO_DURATION_MS);
      return () => { clearTimeout(timer); };
    }
    return undefined;
  }, [droState, dispatch]);
}

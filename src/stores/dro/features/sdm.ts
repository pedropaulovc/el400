/**
 * Sub Datum Memory (SDM) Feature Reducer (US-009 Learn Mode)
 *
 * The SDM lets the operator store up to 1000 sub-datum points, each holding
 * X/Y/Z coordinates (manual §8.2). This file implements the LEARN sub-function
 * (manual §8.2.2); the data model (`SdmData`) is shared with PROGRAM (US-010)
 * and RUN (US-011), which will plug into the same menu ring and point store.
 *
 * Learn-mode workflow (manual §8.2.2):
 *  - Intro: shows "SdM" briefly, then auto-advances to the menu.
 *  - Menu: Program / Learn / Run, navigated with left/right arrows; Enter
 *    confirms. Only Learn is implemented here.
 *  - Step entry: the operator types a step number on the Y display and confirms
 *    with Enter (defaults to step 1).
 *  - Capture: move the machine to the desired position, press X once to show
 *    the current step number, press X again to store the live position as that
 *    step's sub-datum and advance to the next step.
 *  - Press C (clear) at any point to exit.
 *
 * Spec discrepancy: the story file (AC 9.4) binds "store" to `6►`; the manual
 * §8.2.2 binds it to `X`. The manual wins (per the implementer brief), so the
 * store/advance action is BTN_SELECT_X.
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
  removeLastChar,
  KEY_TO_DIGIT,
} from './buffer-utils';
import {
  computeNormalDisplay,
  computeAxisPositionMm,
  createDisplay,
  type DisplayState,
} from '../utils/displayComputation';

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
      // Only Learn is implemented; Program (US-010) and Run (US-011) exit for now.
      if (state !== 'sdm-menu-learn') return exitToIdle(vMem, context);
      const newVMem = { ...vMem, inputBuffer: '' };
      const learnData: SdmData = { ...data, sdmMode: 'LEARN', currentStep: 1 };
      return {
        stateName: 'sdm-learn-step',
        stateData: learnData,
        vMem: newVMem,
        display: computeStepEntryDisplay(newVMem),
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
      const newData: SdmData = {
        ...data,
        points: { ...data.points, [data.currentStep]: point },
        currentStep: nextStep,
        learnPhase: 'awaiting-first-press',
      };
      return {
        ...statePayload,
        stateData: newData,
        display: computePositionDisplay(newData, vMem, context),
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

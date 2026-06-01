/**
 * Setup Menu Feature Reducer (US-039)
 *
 * The shared navigation shell for every per-axis and global configuration
 * parameter. It does NOT know about any individual parameter's semantics --
 * those live in the registry (`setup-parameters.ts`) and in the per-parameter
 * stories. This reducer only handles:
 *
 *   - Entering setup via the wrench/setup key -> `setup-select` (shows SELECT).
 *   - Selecting an axis (X/Y/Z) -> `setup-parameter`, highlighting the first
 *     parameter.
 *   - Up/down (8/2) item navigation through the registry, wrapping around.
 *   - Left/right (4/6) cycling of the highlighted parameter's choices, wrapping.
 *   - Re-pressing the setup key to return to the SELECT prompt (pick another axis).
 *   - Navigating to `End` + `ent` to exit to idle, discarding the draft.
 *
 * Commit semantics (SAU CHG) are owned by US-027; this reducer keeps changes in
 * the in-memory `draftValues` map so exiting via `End` discards them (AC 39.8).
 */

import type { DROReducerContext, DROStatePayload, FeatureReducer } from '../types';
import type { DROEventPayload, SetupData } from '../droStateMachine';
import type { VolatileMemoryState } from '../../../types/volatileMemory';
import type { NonVolatileMemory } from '../../../types/nonVolatileMemory';
import {
  INITIAL_DRO_STATE_DATA,
  INITIAL_SETUP_DATA,
  isSetupActive,
} from '../droStateMachine';
import { computeNormalDisplay, createDisplay, type DisplayState } from '../utils/displayComputation';
import { useSettingsStore } from '../../settingsStore';
import {
  getParameterAt,
  wrapItemIndex,
  choiceIndexOf,
  wrapChoiceIndex,
  labelForValue,
  commitDrafts,
  resolveChoices,
  SETUP_END_ID,
  SAVE_CHANGES_ID,
  type SetupParameter,
  type SetupReadContext,
} from './setup-parameters';
import { SETUP_SAVED_TEXT } from './save-changes';

/** 7-segment text shown on the SELECT prompt. */
export const SETUP_SELECT_TEXT = 'SELECt';

type Axis = 'X' | 'Y' | 'Z';

/** Build the draft key for a parameter given the currently selected axis. */
function draftKey(param: SetupParameter, axis: SetupData['selectedAxis']): string {
  const scopeKey = param.scope === 'per-axis' ? (axis ?? 'X') : 'GLOBAL';
  return `${scopeKey}:${param.id}`;
}

/** Build the read context for the parameter currently being viewed. */
function readContextFor(data: SetupData, nvMem: NonVolatileMemory): SetupReadContext {
  return { nvMem, axis: data.selectedAxis };
}

/**
 * Current draft value for a parameter: the stored draft if present, otherwise
 * the committed value seeded from nvMem via the parameter's readValue (which is
 * scoped to the selected axis for per-axis params like SC).
 */
function currentValue(param: SetupParameter, data: SetupData, nvMem: NonVolatileMemory): string {
  const key = draftKey(param, data.selectedAxis);
  return data.draftValues[key] ?? param.readValue(readContextFor(data, nvMem));
}

/** Display for the SELECT prompt: X shows SELECT, Y/Z blank. */
function computeSelectDisplay(): DisplayState {
  return createDisplay(SETUP_SELECT_TEXT, '', '');
}

/**
 * Display while navigating parameters: X shows the chosen value's label for the
 * highlighted parameter, Y/Z blank.
 */
function computeParameterDisplay(data: SetupData, nvMem: NonVolatileMemory): DisplayState {
  const param = getParameterAt(data.currentParamIndex);
  const value = currentValue(param, data, nvMem);
  // Pass the read context so a parameter with conditional choices (dP, US-040)
  // draws its label from the active set (angular DMS labels on an angular axis).
  return createDisplay(labelForValue(param, value, readContextFor(data, nvMem)), '', '');
}

/** Map an axis-select event to its axis, or null if not an axis event. */
function axisFromEvent(eventName: DROEventPayload['eventName']): Axis | null {
  if (eventName === 'BTN_SELECT_X') return 'X';
  if (eventName === 'BTN_SELECT_Y') return 'Y';
  if (eventName === 'BTN_SELECT_Z') return 'Z';
  return null;
}

/** Leave setup, returning to idle with the normal position display. */
function exitToIdle(vMem: VolatileMemoryState, context: DROReducerContext): DROStatePayload {
  return {
    stateName: 'idle',
    stateData: INITIAL_DRO_STATE_DATA,
    vMem,
    display: computeNormalDisplay(vMem, context),
  };
}

/** Handle events while showing the SELECT prompt (no axis chosen yet). */
function reduceSelect(
  eventName: DROEventPayload['eventName'],
  data: SetupData,
  vMem: VolatileMemoryState,
  nvMem: NonVolatileMemory,
  context: DROReducerContext
): DROStatePayload | null {
  // Axis selection -> first parameter highlighted (AC 39.2).
  const axis = axisFromEvent(eventName);
  if (axis !== null) {
    const newData: SetupData = { ...data, selectedAxis: axis, currentParamIndex: 0 };
    return {
      stateName: 'setup-parameter',
      stateData: newData,
      vMem,
      display: computeParameterDisplay(newData, nvMem),
    };
  }

  // KEY_CLEAR exits setup back to idle (discard draft).
  if (eventName === 'KEY_CLEAR') {
    return exitToIdle(vMem, context);
  }

  return null;
}

/** Handle events while navigating/changing a parameter for the selected axis. */
function reduceParameter(
  eventName: DROEventPayload['eventName'],
  data: SetupData,
  vMem: VolatileMemoryState,
  nvMem: NonVolatileMemory,
  context: DROReducerContext
): DROStatePayload | null {
  // Re-pressing the setup key returns to the SELECT prompt (AC 39.6).
  if (eventName === 'BTN_SETUP') {
    const newData: SetupData = { ...data, selectedAxis: null, currentParamIndex: 0 };
    return {
      stateName: 'setup-select',
      stateData: newData,
      vMem,
      display: computeSelectDisplay(),
    };
  }

  // Item navigation up/down with wrap-around (AC 39.3).
  if (eventName === 'KEY_8_UP' || eventName === 'KEY_2_DOWN') {
    const delta = eventName === 'KEY_8_UP' ? 1 : -1;
    const newData: SetupData = {
      ...data,
      currentParamIndex: wrapItemIndex(data.currentParamIndex, delta),
    };
    return {
      stateName: 'setup-parameter',
      stateData: newData,
      vMem,
      display: computeParameterDisplay(newData, nvMem),
    };
  }

  // Choice cycling left/right with wrap-around (AC 39.4).
  if (eventName === 'KEY_6_RIGHT' || eventName === 'KEY_4_LEFT') {
    const param = getParameterAt(data.currentParamIndex);
    // Resolve the active choice set: parameters with conditional choices (dP,
    // US-040) cycle the angular DMS formats on an angular axis instead of the
    // linear micron values.
    const ctx = readContextFor(data, nvMem);
    const choices = resolveChoices(param, ctx);
    // Terminal items (End) have no choices to cycle -- ignore.
    if (choices.length === 0) return null;

    const delta = eventName === 'KEY_6_RIGHT' ? 1 : -1;
    const idx = choiceIndexOf(param, currentValue(param, data, nvMem), ctx);
    const nextChoice = choices[wrapChoiceIndex(param, idx, delta, ctx)];
    if (nextChoice === undefined) return null;
    const key = draftKey(param, data.selectedAxis);
    const newData: SetupData = {
      ...data,
      draftValues: { ...data.draftValues, [key]: nextChoice.value },
    };
    // Commit-on-change parameters (e.g. Direction, US-002) persist immediately
    // to nvMem; we then read the fresh nvMem so the label still reflects the new
    // choice. Parameters without `commit` keep draft-only (discard-on-exit)
    // semantics -- nvMem is untouched here.
    let displayNvMem = nvMem;
    if (param.commit !== undefined) {
      param.commit(readContextFor(data, nvMem), nextChoice.value);
      displayNvMem = useSettingsStore.getState().nvMem;
    }
    return {
      stateName: 'setup-parameter',
      stateData: newData,
      vMem,
      display: computeParameterDisplay(newData, displayNvMem),
    };
  }

  if (eventName === 'KEY_ENTER') {
    const param = getParameterAt(data.currentParamIndex);
    // End + ent exits to the normal screen, discarding the draft (AC 39.7 / 39.8).
    if (param.id === SETUP_END_ID) return exitToIdle(vMem, context);
    // SAU CHG + ent commits the buffered draft to nvMem (AC27.2 / 27.3) and shows
    // the confirmation message (AC27.4). The draft map is left intact so a
    // re-commit is idempotent; exiting later still discards anything unsaved.
    if (param.id === SAVE_CHANGES_ID) {
      commitDrafts(data.draftValues);
      return {
        stateName: 'setup-saved',
        stateData: data,
        vMem,
        display: createDisplay(SETUP_SAVED_TEXT, '', ''),
      };
    }
    return null;
  }

  // KEY_CLEAR also exits to idle (discard draft).
  if (eventName === 'KEY_CLEAR') {
    return exitToIdle(vMem, context);
  }

  return null;
}

/**
 * Handle the SAU CHG confirmation screen (US-027). Any event — the auto-dismiss
 * timeout or an impatient key press — returns to the setup menu with SAV CHG
 * still highlighted, so the operator can continue (typically scroll to End to
 * exit). The draft is carried through unchanged; the save already happened on
 * ENT, so nothing here touches nvMem.
 */
function reduceSaved(
  data: SetupData,
  vMem: VolatileMemoryState,
  nvMem: NonVolatileMemory
): DROStatePayload {
  return {
    stateName: 'setup-parameter',
    stateData: data,
    vMem,
    display: computeParameterDisplay(data, nvMem),
  };
}

export const setupReducer: FeatureReducer = (statePayload, eventPayload, context) => {
  const { stateName: state, stateData: data, vMem } = statePayload;
  const { eventName } = eventPayload;
  // Entry from idle: the wrench/setup key opens the SELECT prompt (AC 39.1).
  if (state === 'idle') {
    if (eventName !== 'BTN_SETUP') return null;
    return {
      stateName: 'setup-select',
      stateData: INITIAL_SETUP_DATA,
      vMem,
      display: computeSelectDisplay(),
    };
  }

  if (!isSetupActive(state)) return null;

  const setupData = data.stateDataType === 'setup' ? data : INITIAL_SETUP_DATA;

  if (state === 'setup-select') {
    return reduceSelect(eventName, setupData, vMem, context.nvMem, context);
  }

  if (state === 'setup-saved') {
    return reduceSaved(setupData, vMem, context.nvMem);
  }

  return reduceParameter(eventName, setupData, vMem, context.nvMem, context);
};

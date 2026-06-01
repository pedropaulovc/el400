/**
 * OEM Mode — custom default baseline (US-044, manual §6.2 `oEm mod`)
 *
 * OEM Mode lets a machine setup technician / shop owner capture the *current*
 * configuration as a custom default baseline, so Restore Defaults (US-028,
 * `rSt oEm`) returns the DRO to THAT baseline instead of the as-shipped factory
 * state. Entry is password protected (AC 44.2 / 44.7).
 *
 * This module owns:
 *   - the password gate constant + the `oEm mod` setup-menu hand-off (the
 *     registry entry's `onEnter` returns the password-prompt payload);
 *   - the dedicated reducer for the three OEM states (`oem-password`,
 *     `oem-mode`, `oem-rejected`);
 *   - `captureOemDefaults`, which snapshots the live persistable config into
 *     `nvMem.oemDefaults` (everything except `oemDefaults` itself).
 *
 * The flat state names ARE the phase model (no leaked booleans crossing
 * functions, per the project rule):
 *   oem-password  → collecting digits; ENT validates.
 *   oem-mode      → correct code accepted; ENT stores the live config; the
 *                   shared `setup-saved` (StorEd) glyph confirms (US-027 seam).
 *   oem-rejected  → wrong code; flashes `Err`, then returns to the menu with
 *                   OEM NOT entered (AC 44.7).
 */

import { useEffect, type Dispatch } from 'react';
import type { DROReducerContext, DROStatePayload, FeatureReducer } from '../types';
import type {
  DROEventPayload,
  DROStateName,
  OemData,
  SetupData,
} from '../droStateMachine';
import type { VolatileMemoryState } from '../../../types/volatileMemory';
import type { OemDefaultsSnapshot } from '../../../types/nonVolatileMemory';
import {
  INITIAL_DRO_STATE_DATA,
  INITIAL_OEM_DATA,
  isOemActive,
  isFrontPanelKey,
} from '../droStateMachine';
import { computeNormalDisplay, createDisplay } from '../utils/displayComputation';
import { useSettingsStore } from '../../settingsStore';
import { KEY_TO_DIGIT } from './buffer-utils';
import { SETUP_SAVED_TEXT } from './save-changes';

/**
 * OEM Mode password (US-044 / US-028 `oEm mod`). Kept as a module-private
 * constant — never written to localStorage in cleartext, never surfaced in the
 * UI — so the wrong-password rejection (AC 44.7) is a real gate, not decoration.
 */
const OEM_PASSWORD = '35726';

/**
 * Prompt shown while collecting the OEM password (AC 44.2). The seven-segment
 * panel cannot spell "password"; `PASS` uses only renderable glyphs (P, A, S, S)
 * and reads as "enter the pass(word)". The typed digits are never echoed.
 */
export const OEM_PASSWORD_PROMPT = 'PASS';

/**
 * Entered-OEM-Mode screen label (AC 44.3). Mirrors the `oEm mod` setup item;
 * `oEm` uniquely marks "you are in OEM Mode, ENT stores the baseline".
 */
export const OEM_MODE_TEXT = 'oEm';

/**
 * Wrong-password rejection flash (AC 44.7). `Err` uses only renderable glyphs
 * (E, r, r) and reads as "error" — OEM Mode is NOT entered.
 */
export const OEM_REJECTED_TEXT = 'Err';

/** How long the wrong-password `Err` flash stays before returning to the menu. */
export const OEM_REJECTED_DURATION_MS = 1000;

/** The `oEm mod` setup-menu row label (AC 44.1). Exported for the registry. */
export const OEM_MODE_SETUP_LABEL = 'oEm mod';

/** Whether a typed code matches the OEM password (AC 44.2 / 44.7). */
export function isOemPasswordCorrect(code: string): boolean {
  return code === OEM_PASSWORD;
}

/**
 * Auto-dismiss the wrong-password `Err` flash: after `OEM_REJECTED_DURATION_MS`
 * in `oem-rejected`, dispatch `OEM_REJECTED_TIMEOUT` to return to the setup menu
 * (with `oEm mod` re-highlighted). Mirrors `useSetupSavedConfirmation`. The
 * reducer also accepts any key as an early dismissal, so this is a convenience.
 */
export function useOemRejectedDismiss(
  dispatch: Dispatch<DROEventPayload>,
  droState: DROStateName
) {
  useEffect(() => {
    if (droState === 'oem-rejected') {
      const timer = setTimeout(() => {
        dispatch({ eventName: 'OEM_REJECTED_TIMEOUT' });
      }, OEM_REJECTED_DURATION_MS);
      return () => { clearTimeout(timer); };
    }
    return undefined;
  }, [droState, dispatch]);
}

/**
 * Snapshot the live persistable config into `nvMem.oemDefaults` (AC 44.3 /
 * 44.5). The snapshot is every persisted setting EXCEPT `oemDefaults` itself —
 * a baseline never stores a baseline-of-a-baseline. Reads the LIVE nvMem so it
 * captures whatever the operator just configured (e.g. `EnF on`, AC 44.5), then
 * writes it back through the real settings store so it persists to localStorage
 * and survives a power cycle (AC 44.6).
 */
export function captureOemDefaults(): void {
  const live = useSettingsStore.getState().nvMem;
  // Omit oemDefaults from the snapshot (the rest of the config IS the baseline).
  const { oemDefaults: _ignored, ...rest } = live;
  const snapshot: OemDefaultsSnapshot = rest;
  useSettingsStore.getState().updateNvMem({ oemDefaults: snapshot });
}

/**
 * Build the password-prompt payload for the `oEm mod` setup row (AC 44.1/44.2).
 * The setup reducer calls this on ENT over the OEM row, passing the row index so
 * the menu re-highlights `oEm mod` when the flow returns.
 */
export function enterOemPassword(
  vMem: VolatileMemoryState,
  returnParamIndex: number
): DROStatePayload {
  const data: OemData = { ...INITIAL_OEM_DATA, passwordBuffer: '', returnParamIndex };
  return {
    stateName: 'oem-password',
    stateData: data,
    vMem,
    display: createDisplay(OEM_PASSWORD_PROMPT, '', ''),
  };
}

/** Setup data that re-highlights the `oEm mod` row on return from OEM Mode. */
function setupReturnData(returnParamIndex: number): SetupData {
  return {
    stateDataType: 'setup',
    selectedAxis: 'X',
    currentParamIndex: returnParamIndex,
    draftValues: {},
  };
}

/** Leave OEM Mode back to idle with the normal position display. */
function exitToIdle(
  vMem: VolatileMemoryState,
  context: DROReducerContext
): DROStatePayload {
  return {
    stateName: 'idle',
    stateData: INITIAL_DRO_STATE_DATA,
    vMem,
    display: computeNormalDisplay(vMem, context),
  };
}

/** Handle digit/clear/enter while collecting the OEM password. */
function reducePassword(
  eventName: DROEventPayload['eventName'],
  data: OemData,
  vMem: VolatileMemoryState,
  context: DROReducerContext
): DROStatePayload | null {
  // Real digit keys append to the password buffer (AC 44.2). The nav-key aliases
  // (KEY_2_DOWN etc.) carry their digit value here, exactly as a panel keypress.
  const digit = KEY_TO_DIGIT[eventName];
  if (digit !== undefined) {
    const newData: OemData = { ...data, passwordBuffer: data.passwordBuffer + digit };
    return {
      stateName: 'oem-password',
      stateData: newData,
      vMem,
      // Echo the prompt while typing; the code itself is never shown (kept secret).
      display: createDisplay(OEM_PASSWORD_PROMPT, '', ''),
    };
  }

  // ENT validates the typed code.
  if (eventName === 'KEY_ENTER') {
    if (isOemPasswordCorrect(data.passwordBuffer)) {
      // Correct (AC 44.2): enter OEM Mode; ENT there stores the live config.
      return {
        stateName: 'oem-mode',
        stateData: { ...data, passwordBuffer: '' },
        vMem,
        display: createDisplay(OEM_MODE_TEXT, '', ''),
      };
    }
    // Wrong (AC 44.7): flash Err; OEM Mode NOT entered.
    return {
      stateName: 'oem-rejected',
      stateData: { ...data, passwordBuffer: '' },
      vMem,
      display: createDisplay(OEM_REJECTED_TEXT, '', ''),
    };
  }

  // CLEAR abandons the password entry and leaves OEM (back to idle).
  if (eventName === 'KEY_CLEAR') {
    return exitToIdle(vMem, context);
  }

  return null;
}

/** Handle events on the entered OEM-Mode screen (ENT stores the baseline). */
function reduceMode(
  eventName: DROEventPayload['eventName'],
  data: OemData,
  vMem: VolatileMemoryState,
  context: DROReducerContext
): DROStatePayload | null {
  // ENT stores the live config as the OEM baseline (AC 44.3) and shows the
  // shared StorEd confirmation (US-027 seam). Persistence happens synchronously
  // here, so the baseline is durable even if the confirmation is never seen.
  if (eventName === 'KEY_ENTER') {
    captureOemDefaults();
    return {
      stateName: 'setup-saved',
      stateData: setupReturnData(data.returnParamIndex),
      vMem,
      display: createDisplay(SETUP_SAVED_TEXT, '', ''),
    };
  }

  // CLEAR leaves OEM Mode without storing (back to idle).
  if (eventName === 'KEY_CLEAR') {
    return exitToIdle(vMem, context);
  }

  return null;
}

export const oemModeReducer: FeatureReducer = (statePayload, eventPayload, context) => {
  const { stateName: state, stateData: data, vMem } = statePayload;
  const { eventName } = eventPayload;

  if (!isOemActive(state)) return null;

  const oemData = data.stateDataType === 'oem' ? data : INITIAL_OEM_DATA;

  if (state === 'oem-password') {
    return reducePassword(eventName, oemData, vMem, context);
  }

  if (state === 'oem-mode') {
    return reduceMode(eventName, oemData, vMem, context);
  }

  // oem-rejected: a front-panel key (or the auto-dismiss OEM_REJECTED_TIMEOUT)
  // returns to the setup menu with the `oEm mod` row re-highlighted; OEM Mode was
  // never entered (AC 44.7). A MILL_STATE_CHANGED encoder tick must NOT dismiss
  // the `Err` screen — under a connected encoder those arrive every ~100ms and
  // would wipe it before the operator sees the rejection. Such events no-op.
  const isDismissal = eventName === 'OEM_REJECTED_TIMEOUT' || isFrontPanelKey(eventName);
  if (!isDismissal) return null;
  return {
    stateName: 'setup-parameter',
    stateData: setupReturnData(oemData.returnParamIndex),
    vMem,
    display: createDisplay(OEM_MODE_SETUP_LABEL, '', ''),
  };
};

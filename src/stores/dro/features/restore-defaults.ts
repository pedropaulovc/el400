/**
 * Restore Defaults — `rSt oEm` (US-028, manual §6.2 `r5t oEñ`)
 *
 * The setup menu's reset half. Restore returns the DRO to a known baseline and
 * wipes user data, recovering from an unknown/corrupted configuration:
 *
 *   - When an OEM baseline has been captured (US-044 `oEm mod`), restore to THAT
 *     snapshot — this is the consuming side of US-044 AC44.4.
 *   - Otherwise restore to the as-shipped factory defaults.
 *
 * This module owns:
 *   - the registry row metadata (`RESTORE_DEFAULTS_ID` / `RESTORE_DEFAULTS_LABEL`);
 *   - `restoreDefaults`, the durable reset action (writes nvMem through the real
 *     settings store, returns a cleaned vMem);
 *   - the `restore-in-progress` (`IN ProG`) dwell + its completion hook/reducer.
 *
 * Manual reconciliation (el400-operation-manual §6.2 is the tie-breaker): the
 * manual lists `r5t oEñ` ("Restore default settings", *6) and `oEñ ñod`
 * ("Password protected OEM mode") as TWO SEPARATE adjacent rows. So `rSt oEm` is
 * its OWN terminal-action setup row (like SAV CHG / OEM), NOT routed through the
 * OEM password gate. The story ACs 28.4-28.8 (password / 3 AXIS / MILL / OPT OFF
 * confirm chain on restore) conflate the adjacent password-protected OEM-mode row;
 * the privileged op the password guards is *defining* the baseline (US-044), not
 * restoring to it. See the story's "Notes — Manual reconciliation" block.
 *
 * The restore is durable the moment ENT is pressed (nvMem + vMem are written
 * synchronously), so it survives a power cut mid-dwell — `IN ProG` is only the
 * on-screen "working" indication, not the commit point (same discipline as the
 * SAV CHG confirmation, US-027).
 */

import { useEffect, type Dispatch } from 'react';
import type { DROStatePayload, FeatureReducer } from '../types';
import type { DROEventPayload, DROStateName } from '../droStateMachine';
import type { VolatileMemoryState } from '../../../types/volatileMemory';
import { INITIAL_VOLATILE_MEMORY_STATE } from '../../../types/volatileMemory';
import { INITIAL_DRO_STATE_DATA } from '../droStateMachine';
import { computeNormalDisplay } from '../utils/displayComputation';
import { useSettingsStore } from '../../settingsStore';
import { DEFAULT_NON_VOLATILE_MEMORY } from '../../../types/nonVolatileMemory';

/** The `rSt oEm` (Restore Defaults) parameter id (US-028) — its registry key. */
export const RESTORE_DEFAULTS_ID = 'restore-defaults';

/**
 * The `rSt oEm` setup-menu row label (AC28.3). Manual §6.2 prints `r5t oEñ`
 * ("Restore default settings"); the seven-segment panel renders r, S, t, o, E, m,
 * so the faithful label is `rSt oEm`. Terminal-entry item: no choices; ENT runs
 * the restore (handled in `setup.ts`).
 */
export const RESTORE_DEFAULTS_LABEL = 'rSt oEm';

/**
 * In-progress message shown while the restore runs (AC28.8). Manual: "IN PROG".
 * The seven-segment font has no uppercase 'N' glyph (only lowercase 'n'), so the
 * renderable literal is `In ProG` — it still reads as "in progress".
 */
export const RESTORE_IN_PROGRESS_TEXT = 'In ProG';

/**
 * How long the `IN ProG` indication stays on screen before the restore "finishes"
 * and the display returns to normal (AC28.9). The manual quotes a ~2-minute wait
 * on real hardware; the simulator uses a brief, observable dwell instead — the
 * data work is already done synchronously on ENT, so this is purely the working
 * indication. Kept short so the e2e (real timers) is fast.
 */
export const RESTORE_DURATION_MS = 1500;

/**
 * The restore target: the captured OEM baseline if one exists, else the
 * as-shipped factory defaults. Reads the LIVE nvMem so a baseline defined this
 * session is honored (AC44.4). The returned config always carries the existing
 * `oemDefaults` snapshot through unchanged, so a restore never discards the
 * baseline — a second restore still works.
 */
function restoreTargetNvMem() {
  const live = useSettingsStore.getState().nvMem;
  if (live.oemDefaults !== null) {
    // Restore the captured OEM baseline (AC44.4), preserving the baseline itself.
    return { ...live.oemDefaults, oemDefaults: live.oemDefaults };
  }
  // No baseline: as-shipped factory defaults, with no baseline (factory has none).
  return { ...DEFAULT_NON_VOLATILE_MEMORY, oemDefaults: null };
}

/**
 * Perform the restore (US-028). Writes the restore target to nvMem through the
 * real settings store (so it persists to localStorage and survives a power
 * cycle), and returns a cleaned volatile memory with all user data wiped — SDM
 * points and tool/work offsets reset (the "verify data cleared" scenario). The
 * passed `vMem` is not mutated; a fresh cleaned copy is returned for the reducer
 * to apply.
 */
export function restoreDefaults(vMem: VolatileMemoryState): VolatileMemoryState {
  // nvMem: settings back to the baseline (OEM snapshot or factory). Durable now.
  useSettingsStore.getState().updateNvMem(restoreTargetNvMem());

  // vMem: clear user data (SDMs, tool/work offsets) but keep transient UI state
  // (mode, display power) so the operator lands on a clean, normal screen.
  return {
    ...vMem,
    sdmPoints: {},
    workOffsets: INITIAL_VOLATILE_MEMORY_STATE.workOffsets,
    incrementalValues: INITIAL_VOLATILE_MEMORY_STATE.incrementalValues,
    manualAbsoluteValues: INITIAL_VOLATILE_MEMORY_STATE.manualAbsoluteValues,
    inputBuffer: '',
  };
}

/**
 * Build the `IN ProG` payload entered when ENT is pressed on the `rSt oEm` row.
 * Runs `restoreDefaults` synchronously (durable on ENT, AC28.7/28.10) and shows
 * the in-progress indication; the dwell hook returns to idle (AC28.9). The setup
 * reducer calls this on ENT over the restore row.
 */
export function enterRestoreInProgress(
  vMem: VolatileMemoryState
): DROStatePayload {
  const cleanedVMem = restoreDefaults(vMem);
  return {
    stateName: 'restore-in-progress',
    stateData: INITIAL_DRO_STATE_DATA,
    vMem: cleanedVMem,
    // X shows IN ProG; Y/Z blank. Computed against the cleaned vMem (axes zeroed).
    display: { X: RESTORE_IN_PROGRESS_TEXT, Y: '', Z: '' },
  };
}

/**
 * Auto-complete the restore: after `RESTORE_DURATION_MS` in `restore-in-progress`,
 * dispatch `RESTORE_COMPLETE` to return to the normal screen (AC28.9). Mirrors
 * `useSetupSavedConfirmation` / `useOemRejectedDismiss`. The restore data work has
 * already happened on ENT, so this timeout is purely the on-screen dwell.
 */
export function useRestoreProgress(
  dispatch: Dispatch<DROEventPayload>,
  droState: DROStateName
) {
  useEffect(() => {
    if (droState === 'restore-in-progress') {
      const timer = setTimeout(() => {
        dispatch({ eventName: 'RESTORE_COMPLETE' });
      }, RESTORE_DURATION_MS);
      return () => { clearTimeout(timer); };
    }
    return undefined;
  }, [droState, dispatch]);
}

/**
 * Reducer for the `restore-in-progress` dwell. On RESTORE_COMPLETE (the dwell
 * timeout) it returns to idle with the normal position display. Returns null for
 * everything else — the in-progress screen ignores key presses while "working".
 */
export const restoreDefaultsReducer: FeatureReducer = (statePayload, eventPayload, context) => {
  const { stateName, vMem } = statePayload;
  if (stateName !== 'restore-in-progress') return null;
  if (eventPayload.eventName !== 'RESTORE_COMPLETE') return null;
  return {
    stateName: 'idle',
    stateData: INITIAL_DRO_STATE_DATA,
    vMem,
    display: computeNormalDisplay(vMem, context),
  };
};

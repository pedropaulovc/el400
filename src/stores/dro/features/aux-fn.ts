/**
 * AUX Fn — `AUH Fn` hardware-absent dwell (manual §6.2 "Auxiliary function")
 *
 * The §6.2 setup table lists `AUH Fn` ("AUX Fn") as a terminal-entry row whose
 * setting column reads "Press for Auxiliary Function Menu" (Section 10). On the
 * simulated device that menu has no hardware behind it: the video manual §1.11
 * notes `AUH Fn` "works in conjunction with an optional DB15 connector on the
 * back of the display (not present on current displays)", and the auxiliary
 * feature set proper (six-output / serial, US-033) is unimplemented.
 *
 * So pressing ENT on the row flashes a brief `no Conn` ("no connector") dwell and
 * returns to the row, rather than entering a sub-menu. This module owns the
 * user-facing dwell, mirroring the SAV CHG confirmation (`save-changes.ts`):
 *
 *   - `AUX_FN_NO_CONN_TEXT`: the seven-segment message.
 *   - `enterAuxFnNoConn`: build the `setup-aux-fn` payload (called from `setup.ts`
 *     on ENT over the `AUH Fn` row), carrying the SetupData through so the row
 *     stays highlighted on return.
 *   - `useAuxFnNoConn`: a timeout hook that auto-dismisses the dwell.
 *
 * The dismissal reducer lives in `setup.ts` (`reduceAuxFn`), alongside the sibling
 * `reduceSaved`, since the dwell returns into the shared setup navigation.
 */

import { useEffect, type Dispatch } from 'react';
import type { DROStatePayload } from '../types';
import type { DROEventPayload, DROStateName, SetupData } from '../droStateMachine';
import type { VolatileMemoryState } from '../../../types/volatileMemory';
import { createDisplay } from '../utils/displayComputation';

/**
 * Message shown when ENT is pressed on the `AUH Fn` row. The optional DB15
 * auxiliary connector is absent, so the device has nothing to enter. `no Conn`
 * uses only renderable seven-segment glyphs (n, o, C) and reads as "no
 * connector / no connection".
 */
export const AUX_FN_NO_CONN_TEXT = 'no Conn';

/** How long the `no Conn` dwell stays on screen before returning to the menu. */
export const AUX_FN_DURATION_MS = 1500;

/**
 * Build the `no Conn` payload entered when ENT is pressed on the `AUH Fn` row.
 * Carries the current `SetupData` through unchanged so the dwell returns to the
 * menu with `AUH Fn` still highlighted (mirrors the SAV CHG confirmation). The
 * draft is untouched — this row stores nothing.
 */
export function enterAuxFnNoConn(
  data: SetupData,
  vMem: VolatileMemoryState
): DROStatePayload {
  return {
    stateName: 'setup-aux-fn',
    stateData: data,
    vMem,
    display: createDisplay(AUX_FN_NO_CONN_TEXT, '', ''),
  };
}

/**
 * Auto-dismiss the `no Conn` dwell: after `AUX_FN_DURATION_MS` in the
 * `setup-aux-fn` state, dispatch `AUX_FN_TIMEOUT` to return to the setup menu
 * (with `AUH Fn` still highlighted). Mirrors `useSetupSavedConfirmation`. The
 * reducer also accepts any front-panel key as an early dismissal, so this hook is
 * a convenience, not a correctness requirement.
 */
export function useAuxFnNoConn(
  dispatch: Dispatch<DROEventPayload>,
  droState: DROStateName
) {
  useEffect(() => {
    if (droState === 'setup-aux-fn') {
      const timer = setTimeout(() => {
        dispatch({ eventName: 'AUX_FN_TIMEOUT' });
      }, AUX_FN_DURATION_MS);
      return () => { clearTimeout(timer); };
    }
    return undefined;
  }, [droState, dispatch]);
}

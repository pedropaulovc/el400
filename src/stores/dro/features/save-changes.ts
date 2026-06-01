/**
 * SAV CHG — Save Changes confirmation (US-027)
 *
 * The setup menu's commit half. The navigation + commit logic lives in the setup
 * reducer (`setup.ts`); this module owns just the user-facing confirmation:
 *
 *   - `SETUP_SAVED_TEXT`: the seven-segment message shown after a successful save.
 *   - `useSetupSavedConfirmation`: a timeout hook (mirrors `useBoltHoleIntro`) that
 *     auto-dismisses the confirmation back into the setup menu.
 *
 * Persistence itself happens synchronously when ENT is pressed on the SAV CHG
 * item (see `setup.ts` / `setup-parameters.ts` `persist`), NOT on this timeout —
 * the timeout only clears the on-screen message, so a save is durable even if the
 * confirmation is never seen (e.g. an immediate power cut).
 */

import { useEffect, type Dispatch } from 'react';
import type { DROEventPayload, DROStateName } from '../droStateMachine';

/**
 * Confirmation message shown after SAV CHG persists the draft (AC27.4). The
 * manual (section 6.2) names the item `SAu ChG` / "Store setting" but defines no
 * distinct post-save glyph; `StorEd` uses only renderable seven-segment glyphs
 * (S, t, o, r, E, d) and reads as the device storing the settings.
 */
export const SETUP_SAVED_TEXT = 'StorEd';

/** How long the SAV CHG confirmation message stays on screen before returning. */
export const SETUP_SAVED_DURATION_MS = 1000;

/**
 * Auto-dismiss the SAV CHG confirmation: after `SETUP_SAVED_DURATION_MS` in the
 * `setup-saved` state, dispatch `SETUP_SAVED_TIMEOUT` to return to the setup menu
 * (with SAV CHG still highlighted). Mirrors the intro-timeout hooks
 * (`useBoltHoleIntro` et al.). The reducer also accepts any key as an early
 * dismissal, so this hook is a convenience, not a correctness requirement.
 */
export function useSetupSavedConfirmation(
  dispatch: Dispatch<DROEventPayload>,
  droState: DROStateName
) {
  useEffect(() => {
    if (droState === 'setup-saved') {
      const timer = setTimeout(() => {
        dispatch({ eventName: 'SETUP_SAVED_TIMEOUT' });
      }, SETUP_SAVED_DURATION_MS);
      return () => { clearTimeout(timer); };
    }
    return undefined;
  }, [droState, dispatch]);
}

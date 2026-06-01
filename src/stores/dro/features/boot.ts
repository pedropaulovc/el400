/**
 * Boot Feature Reducer
 *
 * Handles boot sequence states: 'boot' and 'boot-show-message'.
 */

import { useEffect, type Dispatch } from 'react';
import type { FeatureReducer } from '../types';
import type { DROStateName, DROEventPayload } from '../droStateMachine';
import { INITIAL_DRO_STATE_DATA, BOOT_DISPLAY, MODEL_NUMBER, SOFTWARE_VERSION } from '../droStateMachine';
import type { NonVolatileMemory } from '../../../types/nonVolatileMemory';
import { computeNormalDisplay } from '../utils/displayComputation';

/**
 * Duration in milliseconds for the boot message to be displayed before auto-dismissing.
 */
export const BOOT_MESSAGE_DURATION_MS = 1000;

// Re-export for backwards compatibility
export { MODEL_NUMBER, SOFTWARE_VERSION };

export const bootReducer: FeatureReducer = (statePayload, eventPayload, context) => {
  const { stateName: state, vMem } = statePayload;
  const { eventName } = eventPayload;

  switch (state) {
    case 'boot':
      if (eventName === 'BOOT_STARTED') {
        const goToIdle = eventPayload.skipBootMessage;
        return {
          stateName: goToIdle ? 'idle' : 'boot-show-message',
          stateData: INITIAL_DRO_STATE_DATA,
          vMem,
          display: goToIdle ? computeNormalDisplay(vMem, context) : BOOT_DISPLAY,
        };
      }
      return statePayload;

    case 'boot-show-message':
      if (eventName === 'BOOT_MESSAGE_TIMEOUT' || eventName === 'KEY_CLEAR') {
        return {
          stateName: 'idle',
          stateData: INITIAL_DRO_STATE_DATA,
          vMem,
          display: computeNormalDisplay(vMem, context),
        };
      }
      // ▲ (8) during the boot message enters Self-Diagnostics Mode (US-046);
      // defer to the diagnostics reducer by not handling it here.
      if (eventName === 'KEY_8_UP') {
        return null;
      }
      return statePayload;

    default:
      return null;
  }
};

/**
 * Hook to manage boot sequence logic.
 *
 * @param dispatch - DRO state machine dispatch function
 * @param droState - Current DRO state
 * @param nvMem - Non-volatile memory containing boot preferences
 */
export function useBootSequence(
  dispatch: Dispatch<DROEventPayload>,
  droState: DROStateName,
  nvMem: NonVolatileMemory
) {
  // Boot sequence: Dispatch BOOT_STARTED on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlBootMode = urlParams.get('bootMessageMode');
    const shouldSkipBootMessage = nvMem.bootMessageMode === 'skip' || urlBootMode === 'skip';
    dispatch({ eventName: 'BOOT_STARTED', skipBootMessage: shouldSkipBootMessage });
  }, [dispatch, nvMem.bootMessageMode]);

  // Boot message timeout: Auto-dismiss after duration
  useEffect(() => {
    if (droState === 'boot-show-message') {
      const timer = setTimeout(() => {
        dispatch({ eventName: 'BOOT_MESSAGE_TIMEOUT' });
      }, BOOT_MESSAGE_DURATION_MS);
      return () => { clearTimeout(timer); };
    }
    return undefined;
  }, [droState, dispatch]);
}

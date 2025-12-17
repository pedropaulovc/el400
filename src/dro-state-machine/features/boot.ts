/**
 * Boot Feature Reducer
 *
 * Handles boot sequence and idle state.
 */

import { useEffect } from 'react';
import type { FeatureReducer } from '../types';
import type { DRODispatch, DROStateName } from '../droStateMachine';
import { INITIAL_DRO_STATE_DATA } from '../droStateMachine';
import type { NonVolatileMemory } from '../../types/nonVolatileMemory';

/**
 * Duration in milliseconds for the boot message to be displayed before auto-dismissing.
 */
export const BOOT_MESSAGE_DURATION_MS = 1000;

/**
 * Model number displayed during boot sequence.
 */
export const MODEL_NUMBER = 'EL400';

/**
 * Software version displayed during boot sequence.
 */
export const SOFTWARE_VERSION = 'vEr 1.0.0';

export const bootReducer: FeatureReducer = (statePayload, eventPayload) => {
  const { stateName: state, stateData: data } = statePayload;
  const { eventName } = eventPayload;

  switch (state) {
    case 'boot':
      if (eventName === 'BOOT_STARTED') {
        return {
          stateName: eventPayload.skipBootMessage ? 'idle' : 'showMessage',
          stateData: INITIAL_DRO_STATE_DATA,
        };
      }
      return statePayload;

    case 'showMessage':
      if (eventName === 'BOOT_MESSAGE_TIMEOUT' || eventName === 'KEY_CLEAR') {
        return { stateName: 'idle', stateData: INITIAL_DRO_STATE_DATA };
      }
      return statePayload;

    case 'idle':
      switch (eventName) {
        case 'BTN_ABS_INC':
          return { stateName: 'abs-inc-mode', stateData: data };
        case 'BTN_INCH_MM':
          return { stateName: 'inch-mm-mode', stateData: data };
        case 'BTN_FUNCTION':
          return { stateName: 'function-menu-center', stateData: INITIAL_DRO_STATE_DATA };
        default:
          return statePayload;
      }

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
  dispatch: DRODispatch,
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
    if (droState === 'showMessage') {
      const timer = setTimeout(() => {
        dispatch({ eventName: 'BOOT_MESSAGE_TIMEOUT' });
      }, BOOT_MESSAGE_DURATION_MS);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [droState, dispatch]);
}

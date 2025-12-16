/**
 * Boot Feature Reducer
 *
 * Handles boot sequence and idle state.
 */

import type { FeatureReducer } from '../types';
import { INITIAL_DRO_STATE_DATA } from '../droStateMachine';

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

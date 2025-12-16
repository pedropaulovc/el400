/**
 * Boot Feature Reducer
 *
 * Handles boot sequence and idle state.
 */

import type { FeatureReducer } from '../types';
import { INITIAL_DRO_CONTEXT } from '../droStateMachine';

export const bootReducer: FeatureReducer = (current, event) => {
  const { state, data } = current;

  switch (state) {
    case 'boot':
      if (event.type === 'BOOT_COMPLETE') {
        return {
          state: event.skipMessage ? 'idle' : 'showMessage',
          data: INITIAL_DRO_CONTEXT,
        };
      }
      return current;

    case 'showMessage':
      if (event.type === 'BOOT_MESSAGE_TIMEOUT' || event.type === 'KEY_CLEAR') {
        return { state: 'idle', data: INITIAL_DRO_CONTEXT };
      }
      return current;

    case 'idle':
      switch (event.type) {
        case 'BTN_ABS_INC':
          return { state: 'abs-inc-mode', data };
        case 'BTN_INCH_MM':
          return { state: 'inch-mm-mode', data };
        case 'BTN_FUNCTION':
          return { state: 'function-menu-center', data: INITIAL_DRO_CONTEXT };
        default:
          return current;
      }

    default:
      return null;
  }
};

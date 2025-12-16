/**
 * Boot Feature Reducer
 *
 * Handles boot sequence, idle state, and transitional mode toggle states.
 */

import type { DROShape, FeatureReducer } from '../types';
import type { DROState } from '../../types/droStateMachine';
import { INITIAL_DRO_CONTEXT } from '../../types/droStateMachine';

const BOOT_STATES: DROState[] = [
  'boot',
  'showMessage',
  'idle',
  'abs-inc-mode',
  'inch-mm-mode',
];

function isBootState(state: DROState): boolean {
  return BOOT_STATES.includes(state);
}

export const bootReducer: FeatureReducer = (current, event) => {
  const { state, data } = current;

  if (!isBootState(state)) return null;

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

    case 'abs-inc-mode':
    case 'inch-mm-mode':
      if (event.type === 'MODE_TOGGLE_COMPLETE') {
        return { state: 'idle', data: INITIAL_DRO_CONTEXT };
      }
      return current;

    default:
      return null;
  }
};

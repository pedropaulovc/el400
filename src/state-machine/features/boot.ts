/**
 * Boot Feature Reducer
 *
 * Handles boot sequence, idle state, and transitional mode toggle states.
 */

import type { OperationStateShape, FeatureReducer } from '../types';
import type { OperationState } from '../../types/operationState';
import { INITIAL_OPERATION_CONTEXT } from '../../types/operationState';

const BOOT_STATES: OperationState[] = [
  'boot',
  'showMessage',
  'idle',
  'abs-inc-mode',
  'inch-mm-mode',
];

function isBootState(state: OperationState): boolean {
  return BOOT_STATES.includes(state);
}

export const bootReducer: FeatureReducer = (current, event) => {
  const { state, context } = current;

  if (!isBootState(state)) return null;

  switch (state) {
    case 'boot':
      if (event.type === 'BOOT_COMPLETE') {
        return {
          state: event.skipMessage ? 'idle' : 'showMessage',
          context: INITIAL_OPERATION_CONTEXT,
        };
      }
      return current;

    case 'showMessage':
      if (event.type === 'BOOT_MESSAGE_TIMEOUT' || event.type === 'KEY_CLEAR') {
        return { state: 'idle', context: INITIAL_OPERATION_CONTEXT };
      }
      return current;

    case 'idle':
      switch (event.type) {
        case 'BTN_ABS_INC':
          return { state: 'abs-inc-mode', context };
        case 'BTN_INCH_MM':
          return { state: 'inch-mm-mode', context };
        case 'BTN_FUNCTION':
          return { state: 'function-menu-center', context: INITIAL_OPERATION_CONTEXT };
        default:
          return current;
      }

    case 'abs-inc-mode':
    case 'inch-mm-mode':
      if (event.type === 'MODE_TOGGLE_COMPLETE') {
        return { state: 'idle', context: INITIAL_OPERATION_CONTEXT };
      }
      return current;

    default:
      return null;
  }
};

/**
 * Idle State Feature Reducer
 *
 * Handles the idle state, which is the default operating state of the DRO.
 * From idle, users can access mode toggles and the function menu.
 */

import type { FeatureReducer } from '../types';
import { INITIAL_DRO_STATE_DATA } from '../droStateMachine';

export const idleReducer: FeatureReducer = (statePayload, eventPayload) => {
  const { stateName: state, stateData: data } = statePayload;
  const { eventName } = eventPayload;

  if (state !== 'idle') return null;

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
};

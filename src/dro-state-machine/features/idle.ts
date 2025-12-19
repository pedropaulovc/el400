/**
 * Idle State Feature Reducer
 *
 * Handles the idle state, which is the default operating state of the DRO.
 * From idle, users can access mode toggles and the function menu.
 */

import type { FeatureReducer } from '../types';
import { INITIAL_DRO_STATE_DATA } from '../droStateMachine';

export const idleReducer: FeatureReducer = (statePayload, eventPayload, _context) => {
  const { stateName: state, stateData: data, vMem } = statePayload;
  const { eventName } = eventPayload;

  if (state !== 'idle') return null;

  switch (eventName) {
    // BTN_ABS_INC is handled by modeToggleReducer which also toggles vMem.mode
    case 'BTN_INCH_MM':
      return { stateName: 'inch-mm-mode', stateData: data, vMem };
    case 'BTN_FUNCTION':
      return { stateName: 'function-menu-center', stateData: INITIAL_DRO_STATE_DATA, vMem };
    default:
      // Return current state for unhandled events (catch-all for idle state)
      return statePayload;
  }
};

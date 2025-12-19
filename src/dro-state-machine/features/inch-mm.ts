/**
 * Inch/MM Mode Feature Reducer
 *
 * Handles the inch-mm-mode transitional state.
 */

import type { FeatureReducer } from '../types';
import { INITIAL_DRO_STATE_DATA } from '../droStateMachine';

export const inchMmReducer: FeatureReducer = (current, event, _context) => {
  if (current.stateName !== 'inch-mm-mode') return null;

  if (event.eventName === 'MODE_TOGGLE_COMPLETE') {
    return { stateName: 'idle', stateData: INITIAL_DRO_STATE_DATA, vMem: current.vMem };
  }
  return current;
};

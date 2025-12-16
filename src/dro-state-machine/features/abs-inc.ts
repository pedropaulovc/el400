/**
 * ABS/INC Mode Feature Reducer
 *
 * Handles the abs-inc-mode transitional state.
 */

import type { FeatureReducer } from '../types';
import { INITIAL_DRO_STATE_DATA } from '../droStateMachine';

export const absIncReducer: FeatureReducer = (current, event) => {
  if (current.stateName !== 'abs-inc-mode') return null;

  if (event.eventName === 'MODE_TOGGLE_COMPLETE') {
    return { stateName: 'idle', stateData: INITIAL_DRO_STATE_DATA };
  }
  return current;
};

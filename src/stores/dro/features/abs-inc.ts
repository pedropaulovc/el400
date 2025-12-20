/**
 * ABS/INC Mode Feature Reducer
 *
 * Handles the abs-inc-mode transitional state.
 */

import type { FeatureReducer } from '../types';
import { INITIAL_DRO_STATE_DATA } from '../droStateMachine';
import { computeNormalDisplay } from '../utils/displayComputation';

export const absIncReducer: FeatureReducer = (current, event, context) => {
  if (current.stateName !== 'abs-inc-mode') return null;

  if (event.eventName === 'MODE_TOGGLE_COMPLETE') {
    return {
      stateName: 'idle',
      stateData: INITIAL_DRO_STATE_DATA,
      vMem: current.vMem,
      display: computeNormalDisplay(current.vMem, context),
    };
  }
  return current;
};

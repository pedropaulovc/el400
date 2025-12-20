/**
 * Inch/MM Mode Feature Reducer
 *
 * Handles the inch-mm-mode transitional state.
 */

import type { FeatureReducer } from '../types';
import { INITIAL_DRO_STATE_DATA } from '../droStateMachine';
import { computeNormalDisplay } from '../utils/displayComputation';

export const inchMmReducer: FeatureReducer = (current, event, context) => {
  if (current.stateName !== 'inch-mm-mode') return null;

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

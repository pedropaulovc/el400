/**
 * ABS/INC Mode Feature Reducer
 *
 * Handles the abs-inc-mode transitional state.
 */

import type { FeatureReducer } from '../types';
import { INITIAL_DRO_CONTEXT } from '../droStateMachine';

export const absIncReducer: FeatureReducer = (current, event) => {
  if (current.state !== 'abs-inc-mode') return null;

  if (event.type === 'MODE_TOGGLE_COMPLETE') {
    return { state: 'idle', data: INITIAL_DRO_CONTEXT };
  }
  return current;
};

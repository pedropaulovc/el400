/**
 * Inch/MM Mode Feature Reducer
 *
 * Handles the inch-mm-mode transitional state.
 */

import type { FeatureReducer } from '../types';
import { INITIAL_DRO_CONTEXT } from '../droStateMachine';

export const inchMmReducer: FeatureReducer = (current, event) => {
  if (current.state !== 'inch-mm-mode') return null;

  if (event.type === 'MODE_TOGGLE_COMPLETE') {
    return { state: 'idle', data: INITIAL_DRO_CONTEXT };
  }
  return current;
};

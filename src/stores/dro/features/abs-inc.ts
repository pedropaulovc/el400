/**
 * ABS/INC Mode Feature Reducer
 *
 * Handles ABS/INC mode toggling from idle state and the abs-inc-mode transitional state.
 * Updates vMem.mode between 'abs' and 'inc'.
 */

import type { FeatureReducer } from '../types';
import { INITIAL_DRO_STATE_DATA } from '../droStateMachine';
import { computeNormalDisplay } from '../utils/displayComputation';

export const absIncReducer: FeatureReducer = (state, event, context) => {
  const { stateName, vMem } = state;
  const { eventName } = event;

  // Handle BTN_ABS_INC in idle state - toggle mode and stay in idle
  if (stateName === 'idle' && eventName === 'BTN_ABS_INC') {
    const newMode = vMem.mode === 'abs' ? 'inc' as const : 'abs' as const;
    const newVMem = {
      ...vMem,
      mode: newMode,
      inputBuffer: '',
      // activeAxis is preserved for continued operations
    };
    return {
      stateName: 'idle',
      stateData: INITIAL_DRO_STATE_DATA,
      vMem: newVMem,
      display: computeNormalDisplay(newVMem, context),
    };
  }

  // Handle BTN_ABS_INC in abs-inc-mode state (if already in transitional state)
  if (stateName === 'abs-inc-mode' && eventName === 'BTN_ABS_INC') {
    const newMode = vMem.mode === 'abs' ? 'inc' as const : 'abs' as const;
    const newVMem = {
      ...vMem,
      mode: newMode,
      inputBuffer: '',
    };
    return {
      stateName: 'idle',
      stateData: INITIAL_DRO_STATE_DATA,
      vMem: newVMem,
      display: computeNormalDisplay(newVMem, context),
    };
  }

  // Handle ABS_INC_TOGGLE_COMPLETE - transition back to idle
  if (stateName === 'abs-inc-mode' && eventName === 'ABS_INC_TOGGLE_COMPLETE') {
    return {
      stateName: 'idle',
      stateData: INITIAL_DRO_STATE_DATA,
      vMem,
      display: computeNormalDisplay(vMem, context),
    };
  }

  return null;
};

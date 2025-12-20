/**
 * Mode Toggle Feature Reducer
 *
 * Handles ABS/INC mode toggling.
 * Updates vMem.mode and optionally triggers transitional states for UI animation.
 */

import type { FeatureReducer, DROStatePayload } from '../types';
import type { DROEventPayload } from '../droStateMachine';
import { INITIAL_DRO_STATE_DATA } from '../droStateMachine';
import { computeNormalDisplay } from '../utils/displayComputation';

/**
 * Mode toggle reducer - handles ABS/INC mode toggling.
 *
 * The mode toggle:
 * - Toggles vMem.mode between 'abs' and 'inc'
 * - Stays in idle state (no transitional state blocking other operations)
 * - Clears input buffer and active axis
 */
export const modeToggleReducer: FeatureReducer = (
  state: DROStatePayload,
  event: DROEventPayload,
  context
): DROStatePayload | null => {
  const { stateName, vMem } = state;

  // Handle BTN_ABS_INC in idle state - toggle mode and stay in idle
  // Preserve activeAxis but clear inputBuffer (user may want to continue with same axis)
  if (stateName === 'idle' && event.eventName === 'BTN_ABS_INC') {
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
  if (stateName === 'abs-inc-mode' && event.eventName === 'BTN_ABS_INC') {
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

  // Handle completion of mode toggle - transition back to idle
  if (stateName === 'abs-inc-mode' && event.eventName === 'MODE_TOGGLE_COMPLETE') {
    return {
      stateName: 'idle',
      stateData: INITIAL_DRO_STATE_DATA,
      vMem,
      display: computeNormalDisplay(vMem, context),
    };
  }

  return null;
};

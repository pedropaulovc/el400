/**
 * Idle State Feature Reducer
 *
 * Handles the idle state, which is the default operating state of the DRO.
 * From idle, users can access mode toggles and the function menu.
 * Also handles MILL_STATE_CHANGED to update display when position changes.
 */

import type { FeatureReducer } from '../types';
import { INITIAL_DRO_STATE_DATA } from '../droStateMachine';
import { computeNormalDisplay, createDisplay } from '../utils/displayComputation';

/** Menu text for function-menu-center */
const MENU_CENTER_TEXT = 'CEntrE';

export const idleReducer: FeatureReducer = (statePayload, eventPayload, context) => {
  const { stateName: state, stateData: data, vMem } = statePayload;
  const { eventName } = eventPayload;

  if (state !== 'idle') return null;

  switch (eventName) {
    // Handle position updates - update display when mill position changes
    case 'MILL_STATE_CHANGED':
      return {
        ...statePayload,
        display: computeNormalDisplay(vMem, context),
      };
    // BTN_ABS_INC is handled by modeToggleReducer which also toggles vMem.mode
    case 'BTN_INCH_MM':
      return {
        stateName: 'inch-mm-mode',
        stateData: data,
        vMem,
        display: computeNormalDisplay(vMem, context),
      };
    case 'BTN_FUNCTION':
      return {
        stateName: 'function-menu-center',
        stateData: INITIAL_DRO_STATE_DATA,
        vMem,
        display: createDisplay(MENU_CENTER_TEXT, '', ''),
      };
    default:
      return null;
  }
};

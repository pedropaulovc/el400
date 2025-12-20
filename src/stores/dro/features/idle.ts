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
import { MENU_TEXT_MAP } from './menu';

export const idleReducer: FeatureReducer = (statePayload, eventPayload, context) => {
  const { stateName: state, vMem } = statePayload;
  const { eventName } = eventPayload;

  if (state !== 'idle') return null;

  switch (eventName) {
    // Handle position updates - update display when mill position changes
    case 'MILL_STATE_CHANGED':
      return {
        ...statePayload,
        display: computeNormalDisplay(vMem, context),
      };
    // BTN_ABS_INC is handled by absIncReducer which toggles vMem.mode
    // BTN_INCH_MM triggers display recomputation when unit setting changes
    case 'BTN_INCH_MM':
      return {
        ...statePayload,
        display: computeNormalDisplay(vMem, context),
      };
    case 'BTN_FUNCTION':
      return {
        stateName: 'function-menu-center',
        stateData: INITIAL_DRO_STATE_DATA,
        vMem,
        display: createDisplay(MENU_TEXT_MAP['function-menu-center'] ?? '', '', ''),
      };
    default:
      return null;
  }
};

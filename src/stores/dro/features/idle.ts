/**
 * Idle State Feature Reducer
 *
 * Handles the idle state, which is the default operating state of the DRO.
 * From idle, users can access mode toggles and the function menu.
 * Also handles MILL_STATE_CHANGED to update display when position changes.
 */

import type { FeatureReducer } from '../types';
import { INITIAL_DRO_STATE_DATA, INITIAL_BOLT_HOLE_DATA, INITIAL_ANGLE_HOLE_DATA, INITIAL_GRID_DATA, INITIAL_SDM_DATA } from '../droStateMachine';
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
    // BTN_INCH_MM is handled by inchMmReducer which toggles nvMem.defaultUnit
    case 'BTN_FUNCTION':
      return {
        stateName: 'function-menu-center',
        stateData: INITIAL_DRO_STATE_DATA,
        vMem,
        display: createDisplay(MENU_TEXT_MAP['function-menu-center'] ?? '', '', ''),
      };
    case 'BTN_BOLT_HOLE':
      // Must be in ABS mode to run bolt hole macro
      if (vMem.mode !== 'abs') {
        return null;
      }
      return {
        stateName: 'bolt-hole-intro',
        stateData: INITIAL_BOLT_HOLE_DATA,
        vMem,
        display: createDisplay('b hoLE', 0, ''),
      };
    case 'BTN_ANGLE_HOLE':
      // Must be in ABS mode to run angle hole macro
      if (vMem.mode !== 'abs') {
        return null;
      }
      return {
        stateName: 'angle-hole-intro',
        stateData: INITIAL_ANGLE_HOLE_DATA,
        vMem,
        display: createDisplay('AnGhoLE', 0, ''),
      };
    case 'BTN_GRID':
      // Must be in ABS mode to run grid macro
      if (vMem.mode !== 'abs') {
        return null;
      }
      return {
        stateName: 'grid-intro',
        stateData: INITIAL_GRID_DATA,
        vMem,
        display: createDisplay('Grid', 0, ''),
      };
    case 'BTN_SDM':
      return {
        stateName: 'sdm-intro',
        stateData: INITIAL_SDM_DATA,
        vMem,
        display: createDisplay('Sdm', '', ''),
      };
    default:
      return null;
  }
};

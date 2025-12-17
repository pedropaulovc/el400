/**
 * Menu Feature Reducer
 *
 * Handles function menu navigation (center, circle, line, linear, polar).
 */

import type { DROStatePayload, FeatureReducer } from '../types';
import type { DROStateName } from '../droStateMachine';
import {
  INITIAL_DRO_STATE_DATA,
  INITIAL_CENTER_FINDING_DATA,
  isFunctionMenuSelectionState,
} from '../droStateMachine';

/**
 * Menu navigation ring - bidirectional, wraps around.
 */
const MENU_RING: DROStateName[] = [
  'function-menu-center',
  'function-menu-circle',
  'function-menu-line',
  'function-menu-linear',
  'function-menu-polar',
];

function getNextMenuState(current: DROStateName): DROStateName {
  const idx = MENU_RING.indexOf(current);
  if (idx === -1) return current;
  const nextIdx = (idx + 1) % MENU_RING.length;
  const nextState = MENU_RING[nextIdx];
  return nextState ?? current;
}

function getPrevMenuState(current: DROStateName): DROStateName {
  const idx = MENU_RING.indexOf(current);
  if (idx === -1) return current;
  const prevIdx = (idx - 1 + MENU_RING.length) % MENU_RING.length;
  const prevState = MENU_RING[prevIdx];
  return prevState ?? current;
}

function handleMenuEnter(menuState: DROStateName): DROStatePayload {
  switch (menuState) {
    case 'function-menu-center':
    case 'function-menu-line':
      // Center and Line both go to line center finding (2 points)
      return {
        stateName: 'function-menu-center-line-point-1',
        stateData: INITIAL_CENTER_FINDING_DATA,
      };
    case 'function-menu-circle':
      return {
        stateName: 'function-menu-center-circle-point-1',
        stateData: INITIAL_CENTER_FINDING_DATA,
      };
    case 'function-menu-linear':
    case 'function-menu-polar':
      // TODO: implement linear and polar
      return { stateName: 'idle', stateData: INITIAL_DRO_STATE_DATA };
    default:
      return { stateName: 'idle', stateData: INITIAL_DRO_STATE_DATA };
  }
}

export const menuReducer: FeatureReducer = (current, event) => {
  const { stateName: state, stateData: data } = current;

  if (!isFunctionMenuSelectionState(state)) return null;

  switch (event.eventName) {
    case 'KEY_CLEAR':
      return { stateName: 'idle', stateData: INITIAL_DRO_STATE_DATA };
    case 'KEY_6_RIGHT':
      return { stateName: getNextMenuState(state), stateData: data };
    case 'KEY_4_LEFT':
      return { stateName: getPrevMenuState(state), stateData: data };
    case 'KEY_ENTER':
      return handleMenuEnter(state);
    default:
      return current;
  }
};

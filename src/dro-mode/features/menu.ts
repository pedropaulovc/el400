/**
 * Menu Feature Reducer
 *
 * Handles function menu navigation (center, circle, line, linear, polar).
 */

import type { DROModeShape, FeatureReducer } from '../types';
import type { DROModeState } from '../../types/droMode';
import {
  INITIAL_DRO_MODE_DATA,
  INITIAL_CENTER_FINDING_DATA,
  isFunctionMenuSelectionState,
} from '../../types/droMode';

/**
 * Menu navigation ring - bidirectional, wraps around.
 */
const MENU_RING: DROModeState[] = [
  'function-menu-center',
  'function-menu-circle',
  'function-menu-line',
  'function-menu-linear',
  'function-menu-polar',
];

function getNextMenuState(current: DROModeState): DROModeState {
  const idx = MENU_RING.indexOf(current);
  if (idx === -1) return current;
  return MENU_RING[(idx + 1) % MENU_RING.length];
}

function getPrevMenuState(current: DROModeState): DROModeState {
  const idx = MENU_RING.indexOf(current);
  if (idx === -1) return current;
  return MENU_RING[(idx - 1 + MENU_RING.length) % MENU_RING.length];
}

function handleMenuEnter(menuState: DROModeState): DROModeShape {
  switch (menuState) {
    case 'function-menu-center':
    case 'function-menu-line':
      // Center and Line both go to line center finding (2 points)
      return {
        state: 'function-menu-center-line-point-1',
        data: INITIAL_CENTER_FINDING_DATA,
      };
    case 'function-menu-circle':
      return {
        state: 'function-menu-center-circle-point-1',
        data: INITIAL_CENTER_FINDING_DATA,
      };
    case 'function-menu-linear':
    case 'function-menu-polar':
      // TODO: implement linear and polar
      return { state: 'idle', data: INITIAL_DRO_MODE_DATA };
    default:
      return { state: 'idle', data: INITIAL_DRO_MODE_DATA };
  }
}

export const menuReducer: FeatureReducer = (current, event) => {
  const { state, data } = current;

  if (!isFunctionMenuSelectionState(state)) return null;

  switch (event.type) {
    case 'KEY_CLEAR':
      return { state: 'idle', data: INITIAL_DRO_MODE_DATA };
    case 'KEY_6_RIGHT':
      return { state: getNextMenuState(state), data };
    case 'KEY_4_LEFT':
      return { state: getPrevMenuState(state), data };
    case 'KEY_ENTER':
      return handleMenuEnter(state);
    default:
      return current;
  }
};

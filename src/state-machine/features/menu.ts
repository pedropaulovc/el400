/**
 * Menu Feature Reducer
 *
 * Handles function menu navigation (center, circle, line, linear, polar).
 */

import type { OperationStateShape, FeatureReducer } from '../types';
import type { OperationState } from '../../types/operationState';
import {
  INITIAL_OPERATION_CONTEXT,
  INITIAL_CENTER_FINDING_CONTEXT,
  isFunctionMenuSelectionState,
} from '../../types/operationState';

/**
 * Menu navigation ring - bidirectional, wraps around.
 */
const MENU_RING: OperationState[] = [
  'function-menu-center',
  'function-menu-circle',
  'function-menu-line',
  'function-menu-linear',
  'function-menu-polar',
];

function getNextMenuState(current: OperationState): OperationState {
  const idx = MENU_RING.indexOf(current);
  if (idx === -1) return current;
  return MENU_RING[(idx + 1) % MENU_RING.length];
}

function getPrevMenuState(current: OperationState): OperationState {
  const idx = MENU_RING.indexOf(current);
  if (idx === -1) return current;
  return MENU_RING[(idx - 1 + MENU_RING.length) % MENU_RING.length];
}

function handleMenuEnter(menuState: OperationState): OperationStateShape {
  switch (menuState) {
    case 'function-menu-center':
    case 'function-menu-line':
      // Center and Line both go to line center finding (2 points)
      return {
        state: 'function-menu-center-line-point-1',
        context: INITIAL_CENTER_FINDING_CONTEXT,
      };
    case 'function-menu-circle':
      return {
        state: 'function-menu-center-circle-point-1',
        context: INITIAL_CENTER_FINDING_CONTEXT,
      };
    case 'function-menu-linear':
    case 'function-menu-polar':
      // TODO: implement linear and polar
      return { state: 'idle', context: INITIAL_OPERATION_CONTEXT };
    default:
      return { state: 'idle', context: INITIAL_OPERATION_CONTEXT };
  }
}

export const menuReducer: FeatureReducer = (current, event) => {
  const { state, context } = current;

  if (!isFunctionMenuSelectionState(state)) return null;

  switch (event.type) {
    case 'KEY_CLEAR':
      return { state: 'idle', context: INITIAL_OPERATION_CONTEXT };
    case 'KEY_6':
      return { state: getNextMenuState(state), context };
    case 'KEY_4':
      return { state: getPrevMenuState(state), context };
    case 'KEY_ENTER':
      return handleMenuEnter(state);
    default:
      return current;
  }
};

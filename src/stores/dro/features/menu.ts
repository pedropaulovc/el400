/**
 * Menu Feature Reducer
 *
 * Handles function menu navigation (center, circle, line, linear, polar).
 */

import type { DROStatePayload, FeatureReducer, DROReducerContext } from '../types';
import type { DROStateName } from '../droStateMachine';
import {
  INITIAL_DRO_STATE_DATA,
  INITIAL_CENTER_FINDING_DATA,
  INITIAL_LINEAR_BOLT_HOLE_DATA,
  isFunctionMenuSelectionState,
} from '../droStateMachine';
import { createDisplay, computeNormalDisplay } from '../utils/displayComputation';
import { computeLinearAxisSelectDisplay } from './linear-bolt-hole';

/** Menu text displayed for each function menu state */
export const MENU_TEXT_MAP: Record<string, string> = {
  'function-menu-center': 'CEntrE',
  'function-menu-circle': 'CirCLE',
  'function-menu-line': 'LinE',
  'function-menu-linear': 'LinEAr',
  'function-menu-polar': 'PoLAr',
};

/** Compute menu display: X shows menu text, Y and Z are blank */
function computeMenuDisplay(stateName: DROStateName): ReturnType<typeof createDisplay> {
  return createDisplay(MENU_TEXT_MAP[stateName] ?? '', '', '');
}

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

function handleMenuEnter(
  menuState: DROStateName,
  vMem: DROStatePayload['vMem'],
  context: DROReducerContext
): DROStatePayload {
  switch (menuState) {
    case 'function-menu-center':
    case 'function-menu-line':
      // Center and Line both go to line center finding (2 points)
      // Point collection shows normal position display
      return {
        stateName: 'function-menu-center-line-point-1',
        stateData: INITIAL_CENTER_FINDING_DATA,
        vMem,
        display: computeNormalDisplay(vMem, context),
      };
    case 'function-menu-circle':
      return {
        stateName: 'function-menu-center-circle-point-1',
        stateData: INITIAL_CENTER_FINDING_DATA,
        vMem,
        display: computeNormalDisplay(vMem, context),
      };
    case 'function-menu-linear':
      // Enter linear bolt hole: first select the axis for the pattern (US-029)
      return {
        stateName: 'linear-bolt-hole-axis',
        stateData: INITIAL_LINEAR_BOLT_HOLE_DATA,
        vMem,
        display: computeLinearAxisSelectDisplay(),
      };
    case 'function-menu-polar':
      // TODO: implement polar
      return {
        stateName: 'idle',
        stateData: INITIAL_DRO_STATE_DATA,
        vMem,
        display: computeNormalDisplay(vMem, context),
      };
    default:
      return {
        stateName: 'idle',
        stateData: INITIAL_DRO_STATE_DATA,
        vMem,
        display: computeNormalDisplay(vMem, context),
      };
  }
}

export const menuReducer: FeatureReducer = (current, event, context) => {
  const { stateName: state, stateData: data, vMem } = current;

  if (!isFunctionMenuSelectionState(state)) return null;

  switch (event.eventName) {
    case 'KEY_CLEAR':
      return {
        stateName: 'idle',
        stateData: INITIAL_DRO_STATE_DATA,
        vMem,
        display: computeNormalDisplay(vMem, context),
      };
    case 'KEY_6_RIGHT': {
      const nextState = getNextMenuState(state);
      return {
        stateName: nextState,
        stateData: data,
        vMem,
        display: computeMenuDisplay(nextState),
      };
    }
    case 'KEY_4_LEFT': {
      const prevState = getPrevMenuState(state);
      return {
        stateName: prevState,
        stateData: data,
        vMem,
        display: computeMenuDisplay(prevState),
      };
    }
    case 'KEY_ENTER':
      return handleMenuEnter(state, vMem, context);
    default:
      return current;
  }
};

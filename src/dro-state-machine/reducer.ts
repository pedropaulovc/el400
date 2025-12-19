/**
 * Root Reducer
 *
 * Composes all feature reducers into a single reducer.
 * Each feature reducer handles its own subset of states.
 */

import type { DROStatePayload, FeatureReducer, DROReducerContext } from './types';
import type { DROEventPayload } from './droStateMachine';
import { bootReducer } from './features/boot';
import { idleReducer } from './features/idle';
import { absIncReducer } from './features/abs-inc';
import { inchMmReducer } from './features/inch-mm';
import { menuReducer } from './features/menu';
import { centerFindingReducer } from './features/center-finding';
import { calculatorReducer } from './features/calculator';
import { keypadReducer } from './features/keypad';
import { axisOperationsReducer } from './features/axis-operations';
import { halfReducer } from './features/half';
import { modeToggleReducer } from './features/mode-toggle';

/**
 * All feature reducers in priority order.
 * First reducer that returns non-null wins.
 */
const featureReducers: FeatureReducer[] = [
  bootReducer,
  calculatorReducer,
  // New vMem reducers for idle state operations
  modeToggleReducer, // Handles BTN_ABS_INC with vMem.mode toggle
  keypadReducer, // Handles digit input to vMem.inputBuffer
  axisOperationsReducer, // Handles axis selection, zero, and value entry
  halfReducer, // Handles half function
  // State transition reducers
  idleReducer,
  absIncReducer,
  inchMmReducer,
  menuReducer,
  centerFindingReducer,
  // Future features:
  // boltHoleReducer,
  // linearReducer,
  // polarReducer,
];

/**
 * Root reducer that delegates to feature reducers.
 * Receives context for access to external state (millState, nvMem).
 */
export function droReducer(
  current: DROStatePayload,
  event: DROEventPayload,
  context: DROReducerContext
): DROStatePayload {
  for (const reducer of featureReducers) {
    const result = reducer(current, event, context);
    if (result !== null) {
      return result;
    }
  }
  // No reducer handled the event, return current state unchanged
  return current;
}

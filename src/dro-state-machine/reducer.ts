/**
 * Root Reducer
 *
 * Composes all feature reducers into a single reducer.
 * Each feature reducer handles its own subset of states.
 */

import type { DROStatePayload, FeatureReducer, DROReducerContext } from './types';
import type { DROEventPayload } from './droStateMachine';
import { bootReducer } from './features/boot';
import { millStateChangedReducer } from './features/millStateChanged';
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
  millStateChangedReducer, // Handles MILL_STATE_CHANGED from connection
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
 *
 * Iterates through all reducers to detect conflicts where multiple
 * reducers handle the same event (which indicates a design issue).
 */
export function droReducer(
  current: DROStatePayload,
  event: DROEventPayload,
  context: DROReducerContext
): DROStatePayload {
  let firstResult: DROStatePayload | null = null;
  const handlers: string[] = [];

  for (let i = 0; i < featureReducers.length; i++) {
    const reducer = featureReducers[i];
    if (!reducer) continue;
    const result = reducer(current, event, context);

    if (result !== null) {
      const reducerName = reducer.name || `reducer[${String(i)}]`;
      handlers.push(reducerName);

      firstResult ??= result;
    }
  }

  // Log error if multiple reducers handled the event
  if (handlers.length > 1) {
    console.error(
      'Multiple reducers handled the same event. First handler wins. This indicates a design issue.',
      {
        handlersInOrder: handlers,
        eventName: event.eventName,
        currentState: current,
      }
    );
  }

  // Return first result or current state unchanged
  return firstResult ?? current;
}

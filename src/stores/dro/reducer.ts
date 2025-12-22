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
import { boltHoleReducer } from './features/bolt-hole';
import { distanceToGoReducer } from './features/distance-to-go';
import { settingsReducer } from './features/settings';

/**
 * All feature reducers in priority order.
 * First reducer that returns non-null wins.
 *
 * Note: MILL_STATE_CHANGED is handled by individual reducers that care about
 * position updates (idle, center-finding). Calculator and menu ignore it.
 */
const featureReducers: FeatureReducer[] = [
  bootReducer,
  calculatorReducer,
  centerFindingReducer, // Handles MILL_STATE_CHANGED for point collection and result states
  boltHoleReducer, // Handles bolt hole circle pattern generation
  distanceToGoReducer, // Handles distance-to-go (US-008)
  settingsReducer, // Handles settings menu navigation and configuration
  // vMem/nvMem reducers for idle state operations
  absIncReducer, // Handles BTN_ABS_INC with vMem.mode toggle (from idle or abs-inc-mode)
  inchMmReducer, // Handles BTN_INCH_MM with nvMem.defaultUnit toggle
  keypadReducer, // Handles digit input to vMem.inputBuffer
  axisOperationsReducer, // Handles axis selection, zero, and value entry
  halfReducer, // Handles half function
  // State transition reducers
  idleReducer, // Handles MILL_STATE_CHANGED for idle state
  menuReducer,
  // Future features:
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

/**
 * Root Reducer
 *
 * Composes all feature reducers into a single reducer.
 * Each feature reducer handles its own subset of states.
 */

import type { DROStatePayload, FeatureReducer, DROReducerContext } from './types';
import type { DROEventPayload } from './droStateMachine';
import { bootReducer } from './features/boot';
import { diagnosticsReducer } from './features/diagnostics';
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
import { arcContourReducer } from './features/arc-contour';
import { angleHoleReducer } from './features/angle-hole';
import { linearBoltHoleReducer } from './features/linear-bolt-hole';
import { gridReducer } from './features/grid';
import { sdmReducer } from './features/sdm';
import { distanceToGoReducer } from './features/distance-to-go';
import { polarReducer } from './features/polar';
import { setupReducer } from './features/setup';
import { referenceReducer } from './features/reference';
import { taperReducer } from './features/taper';

/**
 * All feature reducers in priority order.
 * First reducer that returns non-null wins.
 *
 * Note: MILL_STATE_CHANGED is handled by individual reducers that care about
 * position updates (idle, center-finding). Calculator and menu ignore it.
 */
const featureReducers: FeatureReducer[] = [
  bootReducer,
  diagnosticsReducer, // Handles Self-Diagnostics Mode (US-046); owns diagnostics-* states and the ▲-at-boot entry
  calculatorReducer,
  centerFindingReducer, // Handles MILL_STATE_CHANGED for point collection and result states
  boltHoleReducer, // Handles bolt hole circle pattern generation
  arcContourReducer, // Handles arc contouring (step drilling) pattern generation
  angleHoleReducer, // Handles angle hole (linear hole pattern) generation
  linearBoltHoleReducer, // Handles linear bolt hole pattern generation (US-029)
  gridReducer, // Handles grid drilling pattern generation (US-020)
  sdmReducer, // Handles Sub Datum Memory learn/program/run (US-009/010/011)
  distanceToGoReducer, // Handles distance-to-go (US-008)
  setupReducer, // Handles setup menu navigation (US-039) - before keypad/axis so it owns input in setup
  referenceReducer, // Handles Reference / datum recall (US-012) - before idle so it owns BTN_REFERENCE
  taperReducer, // Handles taper calculation live derivation (US-045)
  // vMem/nvMem reducers for idle state operations
  absIncReducer, // Handles BTN_ABS_INC with vMem.mode toggle (from idle or abs-inc-mode)
  inchMmReducer, // Handles BTN_INCH_MM with nvMem.defaultUnit toggle
  keypadReducer, // Handles digit input to vMem.inputBuffer
  axisOperationsReducer, // Handles axis selection, zero, and value entry
  halfReducer, // Handles half function
  // State transition reducers
  polarReducer, // Handles polar coordinate display mode (US-030)
  idleReducer, // Handles MILL_STATE_CHANGED for idle state
  menuReducer,
  // Future features:
  // linearReducer,
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

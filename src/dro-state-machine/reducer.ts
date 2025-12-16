/**
 * Root Reducer
 *
 * Composes all feature reducers into a single reducer.
 * Each feature reducer handles its own subset of states.
 */

import type { DROShape, FeatureReducer } from './types';
import type { DROEvent } from './droStateMachine';
import { bootReducer } from './features/boot';
import { absIncReducer } from './features/abs-inc';
import { inchMmReducer } from './features/inch-mm';
import { menuReducer } from './features/menu';
import { centerFindingReducer } from './features/center-finding';

/**
 * All feature reducers in priority order.
 * First reducer that returns non-null wins.
 */
const featureReducers: FeatureReducer[] = [
  bootReducer,
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
 */
export function droReducer(
  current: DROShape,
  event: DROEvent
): DROShape {
  for (const reducer of featureReducers) {
    const result = reducer(current, event);
    if (result !== null) {
      return result;
    }
  }
  // No reducer handled the event, return current state unchanged
  return current;
}

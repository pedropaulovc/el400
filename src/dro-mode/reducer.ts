/**
 * Root Reducer
 *
 * Composes all feature reducers into a single reducer.
 * Each feature reducer handles its own subset of states.
 */

import type { DROModeShape, FeatureReducer } from './types';
import type { DROModeEvent } from '../types/droMode';
import { bootReducer } from './features/boot';
import { menuReducer } from './features/menu';
import { centerFindingReducer } from './features/center-finding';

/**
 * All feature reducers in priority order.
 * First reducer that returns non-null wins.
 */
const featureReducers: FeatureReducer[] = [
  bootReducer,
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
export function droModeReducer(
  current: DROModeShape,
  event: DROModeEvent
): DROModeShape {
  for (const reducer of featureReducers) {
    const result = reducer(current, event);
    if (result !== null) {
      return result;
    }
  }
  // No reducer handled the event, return current state unchanged
  return current;
}

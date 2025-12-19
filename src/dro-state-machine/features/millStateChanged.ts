/**
 * Mill State Changed Feature Reducer
 *
 * Handles MILL_STATE_CHANGED events from the MillConnection.
 * Currently a no-op that prevents the event from bubbling to other reducers.
 * Future enhancements could update display values or trigger other state changes
 * based on significant mill state transitions (e.g., connection status changes).
 */

import type { FeatureReducer } from '../types';

export const millStateChangedReducer: FeatureReducer = (statePayload, eventPayload, _context) => {
  const { eventName } = eventPayload;

  if (eventName !== 'MILL_STATE_CHANGED') return null;

  // Mill state changed - acknowledge the event but don't change DRO state
  // The mill state is available via context and components can use it for display updates
  return statePayload;
};

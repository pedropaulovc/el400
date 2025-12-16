/**
 * DRO State Machine Types
 *
 * Shared types for the DRO state machine.
 */

import type {
  DROStateName,
  DROStateData,
  DROEventPayload,
} from './droStateMachine';

/**
 * The shape of the state machine state.
 */
export interface DROStatePayload {
  stateName: DROStateName;
  stateData: DROStateData;
}

/**
 * A feature reducer handles a subset of states.
 * Returns the new state if it handled the event, or null if not.
 */
export type FeatureReducer = (
  statePayload: DROStatePayload,
  eventPayload: DROEventPayload
) => DROStatePayload | null;

/**
 * DRO State Machine Types
 *
 * Shared types for the DRO state machine.
 */

import type {
  DROState,
  DROContext,
  DROEvent,
} from './droStateMachine';

/**
 * The shape of the state machine state.
 */
export interface DROShape {
  state: DROState;
  data: DROContext;
}

/**
 * A feature reducer handles a subset of states.
 * Returns the new state if it handled the event, or null if not.
 */
export type FeatureReducer = (
  current: DROShape,
  event: DROEvent
) => DROShape | null;

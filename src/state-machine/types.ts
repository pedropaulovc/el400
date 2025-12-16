/**
 * State Machine Types
 *
 * Shared types for the operation state machine.
 */

import type {
  OperationState,
  OperationContext,
  OperationEvent,
} from '../types/operationState';

/**
 * The shape of the state machine state.
 */
export interface OperationStateShape {
  state: OperationState;
  context: OperationContext;
}

/**
 * A feature reducer handles a subset of states.
 * Returns the new state if it handled the event, or null if not.
 */
export type FeatureReducer = (
  current: OperationStateShape,
  event: OperationEvent
) => OperationStateShape | null;

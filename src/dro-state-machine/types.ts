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
import type { VolatileMemoryState } from '../types/volatileMemory';
import type { MillState } from '../types/millState';
import type { NonVolatileMemory } from '../types/nonVolatileMemory';

/**
 * The shape of the state machine state.
 * Includes volatile memory as part of the unified state.
 */
export interface DROStatePayload {
  stateName: DROStateName;
  stateData: DROStateData;
  vMem: VolatileMemoryState;
}

/**
 * Context passed to reducers for read-only access to external state.
 * This allows reducers to make decisions based on mill position and settings
 * without owning that state.
 */
export interface DROReducerContext {
  millState: MillState;
  nvMem: NonVolatileMemory;
}

/**
 * A feature reducer handles a subset of states.
 * Returns the new state if it handled the event, or null if not.
 * Receives context for access to external state (millState, nvMem).
 */
export type FeatureReducer = (
  statePayload: DROStatePayload,
  eventPayload: DROEventPayload,
  context: DROReducerContext
) => DROStatePayload | null;

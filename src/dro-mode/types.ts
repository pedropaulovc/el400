/**
 * DRO Mode State Machine Types
 *
 * Shared types for the DRO mode state machine.
 */

import type {
  DROModeState,
  DROModeData,
  DROModeEvent,
} from '../types/droMode';

/**
 * The shape of the state machine state.
 */
export interface DROModeShape {
  state: DROModeState;
  data: DROModeData;
}

/**
 * A feature reducer handles a subset of states.
 * Returns the new state if it handled the event, or null if not.
 */
export type FeatureReducer = (
  current: DROModeShape,
  event: DROModeEvent
) => DROModeShape | null;

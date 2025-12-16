/**
 * DRO State Machine Module
 *
 * Re-exports all public API for the DRO state machine.
 */

// Context and hooks
export {
  DROProvider,
  useDROState,
  useDROContext,
  useDRODispatch,
  useCenterResult,
  useStoredPointsCount,
  type DROProviderProps,
} from './context';

// Types
export type { DROStatePayload as DROShape, FeatureReducer } from './types';

// Re-export type guards and types from droStateMachine
export {
  isFunctionMenuSelectionState,
  isCollectingPoints,
  isCenterLineState,
  isCenterCircleState,
  isResultState,
  isFunctionActive,
  INITIAL_DRO_STATE_DATA as INITIAL_DRO_CONTEXT,
  type DROStateName as DROState,
  type DROStateData as DROContext,
  type DROEventPayload as DROEvent,
  type StoredPoint,
} from './droStateMachine';

/**
 * State Machine Module
 *
 * Re-exports all public API for the operation state machine.
 */

// Context and hooks
export {
  OperationStateProvider,
  useOperationState,
  useOperationContext,
  useOperationDispatch,
  useCenterResult,
  useStoredPointsCount,
  type OperationStateProviderProps,
} from './context';

// Types
export type { OperationStateShape, FeatureReducer } from './types';

// Re-export type guards and types from operationState
export {
  isFunctionMenuSelectionState,
  isCollectingPoints,
  isCenterLineState,
  isCenterCircleState,
  isResultState,
  isFunctionActive,
  INITIAL_OPERATION_CONTEXT,
  type OperationState,
  type OperationContext,
  type OperationEvent,
  type StoredPoint,
} from '../types/operationState';

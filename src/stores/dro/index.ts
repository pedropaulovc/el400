/**
 * DRO State Machine Module
 *
 * Re-exports all public API for the DRO state machine.
 * Hooks now use Zustand stores instead of React Context.
 */

// Hooks from Zustand stores
export {
  useStateName as useDROState,
  useStateData as useDROContext,
  useDROVMem,
  useDRODispatch,
} from '../droStore';

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
  isCalculatorActive,
  INITIAL_DRO_STATE_DATA as INITIAL_DRO_CONTEXT,
  INITIAL_DRO_STATE_PAYLOAD,
  type DROStateName as DROState,
  type DROStateData as DROContext,
  type DROEventPayload as DROEvent,
  type StoredPoint,
  type CalculatorData,
} from './droStateMachine';

// Re-export boot feature
export {
  useBootSequence,
  MODEL_NUMBER,
  SOFTWARE_VERSION,
  BOOT_MESSAGE_DURATION_MS,
} from './features/boot';

// Re-export buffer utilities
export { getBufferValue } from './features/buffer-utils';

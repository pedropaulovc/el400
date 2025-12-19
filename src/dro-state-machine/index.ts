/**
 * DRO State Machine Module
 *
 * Re-exports all public API for the DRO state machine.
 */

// Context and hooks
export {
  DROStateMachineProvider as DROProvider,
  useDROStateName as useDROState,
  useDROStateData as useDROContext,
  useDROVolatileMemory as useDROVMem,
  useDROEventDispatch as useDRODispatch,
  type DROStateMachineProviderProps as DROProviderProps,
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
  isCalculatorActive,
  isBoltCircleActive,
  INITIAL_DRO_STATE_DATA as INITIAL_DRO_CONTEXT,
  INITIAL_DRO_STATE_PAYLOAD,
  INITIAL_CENTER_FINDING_DATA,
  INITIAL_CALCULATOR_DATA,
  INITIAL_BOLT_CIRCLE_DATA,
  type DROStateName as DROState,
  type DROStateData as DROContext,
  type DROEventPayload as DROEvent,
  type StoredPoint,
  type CenterFindingData,
  type CalculatorData,
  type BoltCircleData,
} from './droStateMachine';

// Re-export boot feature
export {
  useBootSequence,
  MODEL_NUMBER,
  SOFTWARE_VERSION,
  BOOT_MESSAGE_DURATION_MS,
} from './features/boot';

// Re-export keypad utilities
export { getBufferValue } from './features/keypad';

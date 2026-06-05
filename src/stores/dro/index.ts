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
  useMode,
  useActiveAxis,
  useDispatch,
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

// Re-export bolt hole feature
export {
  useBoltHoleIntro,
  BOLT_HOLE_INTRO_DURATION_MS,
} from './features/bolt-hole';

// Re-export arc contouring feature
export {
  useArcContourIntro,
  ARC_CONTOUR_INTRO_DURATION_MS,
} from './features/arc-contour';

// Re-export angle hole feature
export {
  useAngleHoleIntro,
  ANGLE_HOLE_INTRO_DURATION_MS,
} from './features/angle-hole';

// Re-export grid drilling feature (US-020)
export {
  useGridIntro,
  GRID_INTRO_DURATION_MS,
} from './features/grid';

// Re-export Sub Datum Memory feature (US-009)
export {
  useSdmIntro,
  SDM_INTRO_DURATION_MS,
} from './features/sdm';

// Re-export SAV CHG save-confirmation feature (US-027)
export {
  useSetupSavedConfirmation,
  SETUP_SAVED_TEXT,
  SETUP_SAVED_DURATION_MS,
} from './features/save-changes';

// Re-export AUX Fn hardware-absent dwell (`AUH Fn`, manual §6.2)
export {
  useAuxFnNoConn,
  AUX_FN_NO_CONN_TEXT,
  AUX_FN_DURATION_MS,
} from './features/aux-fn';

// Re-export OEM Mode feature (US-044): password gate + custom-default capture
export {
  useOemRejectedDismiss,
  captureOemDefaults,
  isOemPasswordCorrect,
  OEM_PASSWORD_PROMPT,
  OEM_MODE_TEXT,
  OEM_REJECTED_TEXT,
  OEM_MODE_SETUP_LABEL,
} from './features/oem-mode';
export { isOemActive } from './droStateMachine';

// Re-export Restore Defaults feature (US-028): `rSt oEm` reset + `IN ProG` dwell
export {
  useRestoreProgress,
  restoreDefaults,
  RESTORE_DEFAULTS_ID,
  RESTORE_DEFAULTS_LABEL,
  RESTORE_IN_PROGRESS_TEXT,
  RESTORE_DURATION_MS,
} from './features/restore-defaults';

// Re-export reference / datum recall feature (US-012)
export {
  useReferenceMarkTestHook,
  REFERENCE_MARK_HOOK,
  MACHINE_REFERENCE_VALUES_MM,
} from './features/reference';

// Re-export bolt hole / arc / angle hole / grid / SDM types and guards
export { isBoltHoleActive, isArcContourActive, isAngleHoleActive, isGridActive, isFnLedActive, isSdmActive } from './droStateMachine';

// Re-export self-diagnostics guard (US-046)
export { isDiagnosticsActive } from './droStateMachine';

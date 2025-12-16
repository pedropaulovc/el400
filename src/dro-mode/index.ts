/**
 * DRO Mode Module
 *
 * Re-exports all public API for the DRO mode state machine.
 */

// Context and hooks
export {
  DROModeProvider,
  useDROModeState,
  useDROModeData,
  useDROModeDispatch,
  useCenterResult,
  useStoredPointsCount,
  type DROModeProviderProps,
} from './context';

// Types
export type { DROModeShape, FeatureReducer } from './types';

// Re-export type guards and types from droMode
export {
  isFunctionMenuSelectionState,
  isCollectingPoints,
  isCenterLineState,
  isCenterCircleState,
  isResultState,
  isFunctionActive,
  INITIAL_DRO_MODE_DATA,
  type DROModeState,
  type DROModeData,
  type DROModeEvent,
  type StoredPoint,
} from '../types/droMode';

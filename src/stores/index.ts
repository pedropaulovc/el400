/**
 * Zustand Stores - Central exports and initialization
 *
 * This module exports all stores and their selectors, plus
 * initialization functions for setting up the application state.
 */

// ─────────────────────────────────────────────────────────────────
// STORE EXPORTS
// ─────────────────────────────────────────────────────────────────

// Settings Store
export {
  useSettingsStore,
  useNvMem,
  useDefaultUnit,
  usePrecision,
  useBeepEnabled,
  useBootMessageMode,
  useUpdateNvMem,
  useResetMemory,
} from './settingsStore';

// Mill Store
export {
  useMillStore,
  useMillState,
  useMillPosition,
  useMillConnected,
  useMillProbe,
  useConnection,
  useIsConnecting,
  useConnectionError,
  useSetConnection,
  initializeMillStore,
} from './millStore';

// DRO Store
export {
  useDROStore,
  useStateName,
  useStateData,
  useVMem,
  useMode,
  useActiveAxis,
  useInputBuffer,
  useWorkOffsets,
  useIncrementalValues,
  useManualAbsoluteValues,
  useDispatch,
  // Aliases used by useVolatileMemory hook
  useDROVMem,
  useDRODispatch,
  initializeDROMillConnection,
} from './droStore';

// ─────────────────────────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────────────────────────

// Initialize the DRO-Mill connection when this module is imported.
// This is done explicitly here rather than at module-level in droStore.ts
// to make the initialization order clear and avoid hidden side effects.
import { initializeDROMillConnection as _initDROMillConnection } from './droStore';
_initDROMillConnection();

// ─────────────────────────────────────────────────────────────────
// RE-EXPORT TYPES
// ─────────────────────────────────────────────────────────────────

export type { NonVolatileMemory } from '../types/nonVolatileMemory';
export type { MillState } from '../types/millState';
export type { MillAdapter } from '../adapters/MillAdapter';
export type { VolatileMemoryState, DatumMode, Axis, AxisValues } from '../types/volatileMemory';
export type { DROStateName, DROStateData, DROEventPayload } from './dro/droStateMachine';

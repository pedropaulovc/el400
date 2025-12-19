/**
 * DRO Store - DRO state machine management
 *
 * Manages the DRO state machine state (stateName, stateData, vMem).
 * Uses the existing droReducer for state transitions.
 * Reads from millStore and settingsStore for reducer context.
 */

import { create } from 'zustand';
import type { DROStatePayload, DROReducerContext } from '../dro-state-machine/types';
import type {
  DROStateName,
  DROStateData,
  DROEventPayload,
} from '../dro-state-machine/droStateMachine';
import { INITIAL_DRO_STATE_PAYLOAD } from '../dro-state-machine/droStateMachine';
import { droReducer } from '../dro-state-machine/reducer';
import type { VolatileMemoryState } from '../types/volatileMemory';
import { useMillStore, setDRODispatch } from './millStore';
import { useSettingsStore } from './settingsStore';

// ─────────────────────────────────────────────────────────────────
// STORE INTERFACE
// ─────────────────────────────────────────────────────────────────

interface DROStore {
  // State
  stateName: DROStateName;
  stateData: DROStateData;
  vMem: VolatileMemoryState;

  // Actions
  dispatch: (event: DROEventPayload) => void;

  // For testing - allows setting initial state
  _setState: (payload: DROStatePayload) => void;
}

// ─────────────────────────────────────────────────────────────────
// STORE IMPLEMENTATION
// ─────────────────────────────────────────────────────────────────

export const useDROStore = create<DROStore>()((set, get) => ({
  // Initial state from DRO state machine
  stateName: INITIAL_DRO_STATE_PAYLOAD.stateName,
  stateData: INITIAL_DRO_STATE_PAYLOAD.stateData,
  vMem: INITIAL_DRO_STATE_PAYLOAD.vMem,

  // Dispatch action - calls reducer with cross-store context
  dispatch: (event) => {
    const current = get();
    const currentPayload: DROStatePayload = {
      stateName: current.stateName,
      stateData: current.stateData,
      vMem: current.vMem,
    };

    // Get context from other stores
    const millState = useMillStore.getState().millState;
    const nvMem = useSettingsStore.getState().nvMem;
    const context: DROReducerContext = { millState, nvMem };

    // Run through reducer
    const newState = droReducer(currentPayload, event, context);

    // Update store with new state
    set({
      stateName: newState.stateName,
      stateData: newState.stateData,
      vMem: newState.vMem,
    });
  },

  // For testing - set state directly
  _setState: (payload) => {
    set({
      stateName: payload.stateName,
      stateData: payload.stateData,
      vMem: payload.vMem,
    });
  },
}));

// ─────────────────────────────────────────────────────────────────
// CONNECT MILL STORE TO DRO DISPATCH
// ─────────────────────────────────────────────────────────────────

/**
 * Initialize the connection between mill store and DRO dispatch.
 * This should be called after both stores are created (e.g., in stores/index.ts).
 * Extracted to an explicit function to avoid side effects at module import time.
 */
export function initializeDROMillConnection(): void {
  setDRODispatch((event) => {
    useDROStore.getState().dispatch(event as DROEventPayload);
  });
}

// ─────────────────────────────────────────────────────────────────
// SELECTORS - Granular subscriptions for performance
// ─────────────────────────────────────────────────────────────────

/** Get DRO state name */
export const useStateName = () => useDROStore((s) => s.stateName);

/** Get DRO state data (calculator, center-finding, etc.) */
export const useStateData = () => useDROStore((s) => s.stateData);

/** Get full volatile memory state */
export const useVMem = () => useDROStore((s) => s.vMem);

/** Get current display mode (abs/inc) */
export const useMode = () => useDROStore((s) => s.vMem.mode);

/** Get currently active axis */
export const useActiveAxis = () => useDROStore((s) => s.vMem.activeAxis);

/** Get input buffer */
export const useInputBuffer = () => useDROStore((s) => s.vMem.inputBuffer);

/** Get work offsets */
export const useWorkOffsets = () => useDROStore((s) => s.vMem.workOffsets);

/** Get incremental values */
export const useIncrementalValues = () => useDROStore((s) => s.vMem.incrementalValues);

/** Get manual absolute values */
export const useManualAbsoluteValues = () => useDROStore((s) => s.vMem.manualAbsoluteValues);

/** Get dispatch function - stable reference, never changes */
export const useDispatch = () => useDROStore((s) => s.dispatch);

// ─────────────────────────────────────────────────────────────────
// ALIASES for backwards compatibility during migration
// ─────────────────────────────────────────────────────────────────

/** @deprecated Use useStateName instead */
export const useDROStateName = useStateName;

/** @deprecated Use useStateData instead */
export const useDROStateData = useStateData;

/** @deprecated Use useVMem instead */
export const useDROVolatileMemory = useVMem;

/** @deprecated Use useDispatch instead */
export const useDROEventDispatch = useDispatch;

/** Alias for vMem - used by useVolatileMemory hook */
export const useDROVMem = useVMem;

/** Alias for dispatch - used by useVolatileMemory hook */
export const useDRODispatch = useDispatch;

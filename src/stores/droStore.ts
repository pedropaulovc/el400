/**
 * DRO Store - DRO state machine management
 *
 * Manages the DRO state machine state (stateName, stateData, vMem).
 * Uses the existing droReducer for state transitions.
 * Reads from millStore and settingsStore for reducer context.
 */

import { create } from 'zustand';
import type { DROStatePayload, DROReducerContext } from './dro/types';
import type {
  DROStateName,
  DROStateData,
  DROEventPayload,
} from './dro/droStateMachine';
import { INITIAL_DRO_STATE_PAYLOAD } from './dro/droStateMachine';
import { droReducer } from './dro/reducer';
import type { VolatileMemoryState } from '../types/volatileMemory';
import type { DisplayState } from './dro/utils/displayComputation';
import {
  computeZeroApproach,
  ZERO_APPROACH_OFF,
  ALL_ARMED,
  type ZeroApproachByAxis,
  type ZeroApproachArmed,
} from './dro/utils/zeroApproach';
import { useMillStore, setDRODispatch } from './millStore';
import { useSettingsStore } from './settingsStore';

/**
 * Which axes are armed for the Near-Zero Warning (US-024). In distance-to-go /
 * Preset only axes with a SET target show distance-to-target — the others show
 * raw position and must not warn merely for reading 0. Every other near-zero
 * context (SDM, milling functions) treats the whole readout as distance-to-go,
 * so all axes are armed.
 */
function armedAxesFor(stateData: DROStateData): ZeroApproachArmed {
  if (stateData.stateDataType !== 'preset') return ALL_ARMED;
  const { presetTargets } = stateData;
  return {
    X: presetTargets.X !== null,
    Y: presetTargets.Y !== null,
    Z: presetTargets.Z !== null,
  };
}

// ─────────────────────────────────────────────────────────────────
// STORE INTERFACE
// ─────────────────────────────────────────────────────────────────

interface DROStore {
  // State
  stateName: DROStateName;
  stateData: DROStateData;
  vMem: VolatileMemoryState;
  display: DisplayState;
  /**
   * Per-axis Near-Zero Warning state (US-024). Derived after every dispatch from
   * the live readout and committed settings (with hysteresis carried forward),
   * so it tracks real machine motion toward the target via MILL_STATE_CHANGED.
   */
  zeroApproach: ZeroApproachByAxis;

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
  display: INITIAL_DRO_STATE_PAYLOAD.display,
  zeroApproach: ZERO_APPROACH_OFF,

  // Dispatch action - calls reducer with cross-store context
  dispatch: (event) => {
    const current = get();
    const currentPayload: DROStatePayload = {
      stateName: current.stateName,
      stateData: current.stateData,
      vMem: current.vMem,
      display: current.display,
    };

    // Get context from other stores
    const millState = useMillStore.getState().millState;
    const nvMem = useSettingsStore.getState().nvMem;
    const context: DROReducerContext = { millState, nvMem };

    // Run through reducer
    const newState = droReducer(currentPayload, event, context);

    // Recompute the Near-Zero Warning from the fresh readout (US-024). Carrying
    // the previous per-axis state forward gives the BP TOLR departure hysteresis.
    const zeroApproach = computeZeroApproach(
      newState.display,
      nvMem,
      current.zeroApproach,
      newState.stateName,
      armedAxesFor(newState.stateData)
    );

    // Update store with new state
    set({
      stateName: newState.stateName,
      stateData: newState.stateData,
      vMem: newState.vMem,
      display: newState.display,
      zeroApproach,
    });
  },

  // For testing - set state directly
  _setState: (payload) => {
    set({
      stateName: payload.stateName,
      stateData: payload.stateData,
      vMem: payload.vMem,
      display: payload.display,
      zeroApproach: computeZeroApproach(
        payload.display,
        useSettingsStore.getState().nvMem,
        ZERO_APPROACH_OFF,
        payload.stateName,
        armedAxesFor(payload.stateData)
      ),
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

/**
 * Reference waiting blink (manual §7.7.1): returns the axis whose zero should
 * blink while waiting for the encoder reference mark, or null when not waiting.
 */
export const useReferenceWaitingAxis = (): 'X' | 'Y' | 'Z' | null =>
  useDROStore((s) => {
    if (s.stateName !== 'reference-home-waiting' && s.stateName !== 'reference-machine-waiting') {
      return null;
    }
    return s.stateData.stateDataType === 'reference' ? s.stateData.selectedAxis : null;
  });

/**
 * Touch-probe trigger indication (US-032, AC 32.8): true on the tick a probe
 * contact is captured, driving the visual/audible "probe triggered" cue. Read
 * from the active probe-function state data; false outside a probe trigger.
 */
export const useProbeTriggered = (): boolean =>
  useDROStore((s) =>
    s.stateData.stateDataType === 'probe' ? s.stateData.probeTriggered : false
  );

/** Get full volatile memory state */
export const useVMem = () => useDROStore((s) => s.vMem);

/** Get current display mode (abs/inc) */
export const useMode = () => useDROStore((s) => s.vMem.mode);

/** Get currently active axis */
export const useActiveAxis = () => useDROStore((s) => s.vMem.activeAxis);

/**
 * Display power state (US-026 sleep timer): 'awake' or 'asleep'. Drives the dim
 * overlay on the readout panel and the flashing wrench LED.
 */
export const useDisplayPower = () => useDROStore((s) => s.vMem.displayPower);

/** True when the display is asleep (US-026). */
export const useIsAsleep = () => useDROStore((s) => s.vMem.displayPower === 'asleep');

/** Get input buffer */
export const useInputBuffer = () => useDROStore((s) => s.vMem.inputBuffer);

/** Get work offsets */
export const useWorkOffsets = () => useDROStore((s) => s.vMem.workOffsets);

/** Get incremental values */
export const useIncrementalValues = () => useDROStore((s) => s.vMem.incrementalValues);

/** Get manual absolute values */
export const useManualAbsoluteValues = () => useDROStore((s) => s.vMem.manualAbsoluteValues);

// ─────────────────────────────────────────────────────────────────
// PER-AXIS SELECTORS - Truly granular, only re-render when specific axis changes
// ─────────────────────────────────────────────────────────────────

/** Get work offset for X axis only */
export const useWorkOffsetX = () => useDROStore((s) => s.vMem.workOffsets.X);
/** Get work offset for Y axis only */
export const useWorkOffsetY = () => useDROStore((s) => s.vMem.workOffsets.Y);
/** Get work offset for Z axis only */
export const useWorkOffsetZ = () => useDROStore((s) => s.vMem.workOffsets.Z);

/** Get incremental value for X axis only */
export const useIncrementalX = () => useDROStore((s) => s.vMem.incrementalValues.X);
/** Get incremental value for Y axis only */
export const useIncrementalY = () => useDROStore((s) => s.vMem.incrementalValues.Y);
/** Get incremental value for Z axis only */
export const useIncrementalZ = () => useDROStore((s) => s.vMem.incrementalValues.Z);

/** Get manual absolute value for X axis only */
export const useManualAbsoluteX = () => useDROStore((s) => s.vMem.manualAbsoluteValues.X);
/** Get manual absolute value for Y axis only */
export const useManualAbsoluteY = () => useDROStore((s) => s.vMem.manualAbsoluteValues.Y);
/** Get manual absolute value for Z axis only */
export const useManualAbsoluteZ = () => useDROStore((s) => s.vMem.manualAbsoluteValues.Z);

// ─────────────────────────────────────────────────────────────────
// DISPLAY SELECTORS - Granular, only re-render when specific axis changes
// ─────────────────────────────────────────────────────────────────

/** Get display value for X axis only - primitive, minimal re-renders */
export const useDisplayX = () => useDROStore((s) => s.display.X);
/** Get display value for Y axis only - primitive, minimal re-renders */
export const useDisplayY = () => useDROStore((s) => s.display.Y);
/** Get display value for Z axis only - primitive, minimal re-renders */
export const useDisplayZ = () => useDROStore((s) => s.display.Z);

/** Get dispatch function - stable reference, never changes */
export const useDispatch = () => useDROStore((s) => s.dispatch);

// ─────────────────────────────────────────────────────────────────
// ZERO-APPROACH WARNING SELECTORS (US-024)
// ─────────────────────────────────────────────────────────────────

/** Near-Zero Warning active on a specific axis (drives its display flash). */
export const useZeroApproachX = () => useDROStore((s) => s.zeroApproach.X);
export const useZeroApproachY = () => useDROStore((s) => s.zeroApproach.Y);
export const useZeroApproachZ = () => useDROStore((s) => s.zeroApproach.Z);

/**
 * Near-Zero Warning active on ANY axis (drives the audio beep + audio indicator).
 */
export const useZeroApproachActive = () =>
  useDROStore((s) => s.zeroApproach.X || s.zeroApproach.Y || s.zeroApproach.Z);

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

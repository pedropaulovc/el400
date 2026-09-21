/**
 * DRO Store - DRO state machine management
 *
 * Manages the DRO state machine state (stateName, stateData, vMem).
 * Uses the existing droReducer for state transitions.
 * Reads from millStore and settingsStore for reducer context.
 */

import { create } from 'zustand';
import { persist, createJSONStorage, type PersistStorage } from 'zustand/middleware';
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

const XY_ARMED: ZeroApproachArmed = { X: true, Y: true, Z: false };
const SINGLE_AXIS_ARMED: Record<'X' | 'Y' | 'Z', ZeroApproachArmed> = {
  X: { X: true, Y: false, Z: false },
  Y: { X: false, Y: true, Z: false },
  Z: { X: false, Y: false, Z: true },
};

/** Prompt numbers and unused axes are not distances to a machining target. */
function armedAxesFor({ stateName, stateData }: DROStatePayload): ZeroApproachArmed {
  if (stateName === 'idle') return ALL_ARMED;
  if (stateName === 'distance-to-go' && stateData.stateDataType === 'preset') {
    return {
      X: stateData.presetTargets.X !== null,
      Y: stateData.presetTargets.Y !== null,
      Z: stateData.presetTargets.Z !== null,
    };
  }
  if (stateName === 'sdm-run-active' && stateData.stateDataType === 'sdm') {
    return stateData.navigationPhase === 'browse' && stateData.points[stateData.currentStep]
      ? ALL_ARMED : ZERO_APPROACH_OFF;
  }
  if (stateName === 'linear-bolt-hole-navigate' && stateData.stateDataType === 'linear-bolt-hole') {
    return stateData.axis ? SINGLE_AXIS_ARMED[stateData.axis] : ZERO_APPROACH_OFF;
  }
  if (stateName === 'function-menu-center-line-result' || stateName === 'function-menu-center-circle-result') {
    return XY_ARMED;
  }
  if (stateName.endsWith('-navigate') && 'navigationPhase' in stateData
    && stateData.navigationPhase === 'distance-to-go') return XY_ARMED;
  return ZERO_APPROACH_OFF;
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
  /** Genuine front-panel or physical-motion activity, not controller polling. */
  activityVersion: number;

  // Actions
  dispatch: (event: DROEventPayload) => void;

  // For testing - allows setting initial state
  _setState: (payload: DROStatePayload) => void;
}

// ─────────────────────────────────────────────────────────────────
// STORE IMPLEMENTATION
// ─────────────────────────────────────────────────────────────────

let lastActivityPosition = useMillStore.getState().millState.position;

interface PersistedUserData {
  vMem: Pick<VolatileMemoryState,
    'workOffsets' | 'manualAbsoluteValues' | 'sdmPoints' |
    'machineReferenceOffsets' | 'outputProgram' | 'outputCount'>;
}
const jsonUserDataStorage = createJSONStorage<PersistedUserData>(() => localStorage);
let lastSavedUserData: PersistedUserData['vMem'] | null = null;
const userDataStorage: PersistStorage<PersistedUserData> = {
  getItem: (name) => {
    const stored = jsonUserDataStorage?.getItem(name) ?? null;
    if (stored === null) lastSavedUserData = null;
    return stored;
  },
  setItem: (name, value) => {
    const next = value.state.vMem;
    const previous = lastSavedUserData;
    // Encoder polling must not serialize all 1000 SDMs at 10 Hz.
    if (previous !== null &&
      previous.workOffsets === next.workOffsets &&
      previous.manualAbsoluteValues === next.manualAbsoluteValues &&
      previous.sdmPoints === next.sdmPoints &&
      previous.machineReferenceOffsets === next.machineReferenceOffsets &&
      previous.outputProgram === next.outputProgram &&
      previous.outputCount === next.outputCount) return;
    const result = jsonUserDataStorage?.setItem(name, value);
    lastSavedUserData = next;
    return result;
  },
  removeItem: (name) => {
    lastSavedUserData = null;
    return jsonUserDataStorage?.removeItem(name);
  },
};

export const useDROStore = create<DROStore>()(persist((set, get) => ({
  // Initial state from DRO state machine
  stateName: INITIAL_DRO_STATE_PAYLOAD.stateName,
  stateData: INITIAL_DRO_STATE_PAYLOAD.stateData,
  vMem: INITIAL_DRO_STATE_PAYLOAD.vMem,
  display: INITIAL_DRO_STATE_PAYLOAD.display,
  zeroApproach: ZERO_APPROACH_OFF,
  activityVersion: 0,

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
    const position = millState.position;
    const moved = position.x !== lastActivityPosition.x ||
      position.y !== lastActivityPosition.y || position.z !== lastActivityPosition.z;
    const activity = event.eventName.startsWith('KEY_') ||
      event.eventName.startsWith('BTN_') || moved;
    lastActivityPosition = position;
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
      armedAxesFor(newState)
    );

    // Update store with new state
    set({
      stateName: newState.stateName,
      stateData: newState.stateData,
      vMem: newState.vMem,
      display: newState.display,
      zeroApproach,
      activityVersion: current.activityVersion + (activity ? 1 : 0),
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
        armedAxesFor(payload)
      ),
    });
  },
}), {
  name: 'el400-dro-user-data',
  storage: userDataStorage,
  partialize: (state) => ({
    vMem: {
      workOffsets: state.vMem.workOffsets,
      manualAbsoluteValues: state.vMem.manualAbsoluteValues,
      sdmPoints: state.vMem.sdmPoints,
      machineReferenceOffsets: state.vMem.machineReferenceOffsets,
      outputProgram: state.vMem.outputProgram,
      outputCount: state.vMem.outputCount,
    },
  }),
  // Restore operator data without resurrecting an in-progress function or a
  // referenced-encoder latch from a previous power session.
  merge: (persisted, current) => {
    if (persisted === undefined) return current;
    const saved = persisted as { vMem?: Partial<VolatileMemoryState> };
    return { ...current, vMem: { ...current.vMem, ...saved.vMem } };
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
 * Display row waiting for an encoder reference mark. Calibration uses the
 * upper row even when measuring Y/Z; normal reference recovery uses its axis.
 */
export const useReferenceWaitingAxis = (): 'X' | 'Y' | 'Z' | null =>
  useDROStore((s) => {
    if (s.stateName === 'setup-parameter' && s.stateData.stateDataType === 'setup'
      && s.stateData.calibrationEditor?.phase === 'slec-reference') {
      const axis = s.stateData.selectedAxis;
      return axis && s.vMem.referenceMarks[axis] === undefined ? 'X' : null;
    }
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

/**
 * Reference / Datum Recall Feature Reducer (US-012, manual §7.7)
 *
 * Implements the Reference key flows:
 * - §7.7.1 Reference Point ("honE" / Home): the datum is set AT the encoder
 *   reference mark. After crossing the mark the selected axis reads 0.
 * - §7.7.2.2 Recall Machine Reference ("nC rEF"): the datum is at a fixed
 *   distance from the mark. After crossing the mark the selected axis reads the
 *   stored machine-reference value.
 *
 * Per §7.7 this function works only in ABS mode; if entered while in INC the
 * DRO is forced back to ABS before the function runs.
 *
 * Flow (states added in droStateMachine.ts):
 *   idle --BTN_REFERENCE--> reference-menu-home
 *   reference-menu-home <--4/6--> reference-menu-machine   (cycle the two modes)
 *   reference-menu-home    --ENT--> reference-home-select
 *   reference-menu-machine --ENT--> reference-machine-select
 *   reference-*-select --BTN_SELECT_axis--> reference-*-waiting (blinking 0)
 *   reference-*-waiting --ENCODER_REF_MARK_CROSSED--> idle (datum set)
 *
 * Reference-mark crossing is modeled by the ENCODER_REF_MARK_CROSSED event: the
 * current machine position is treated as the mark location, and the axis work
 * offset is set so the displayed ABS value becomes the desired reference value.
 */

import type { FeatureReducer, DROReducerContext } from '../types';
import type { DROStatePayload } from '../types';
import type { Axis, VolatileMemoryState } from '../../../types/volatileMemory';
import type { ReferenceData } from '../droStateMachine';
import {
  INITIAL_DRO_STATE_DATA,
  INITIAL_REFERENCE_DATA,
  isReferenceActive,
} from '../droStateMachine';
import {
  computeNormalDisplay,
  createDisplay,
  type DisplayState,
} from '../utils/displayComputation';

/** Display text shown on the X axis for each reference UI step. */
export const REFERENCE_TEXT = {
  home: 'honE',
  machine: 'nC rEF',
  select: 'SELECt',
} as const;

/**
 * Stored machine-reference values per axis, in mm (§7.7.2).
 *
 * PLACEHOLDER: in a real DRO this fixed distance from the encoder reference
 * mark is set once during commissioning via Set Machine Reference (§7.7.2.1)
 * and recalled afterwards. That set-flow is OUT OF SCOPE for US-012 (tracked as
 * a follow-up story), so the simulator hard-codes a per-axis constant. As a
 * result every recall currently restores 25.4mm on the selected axis. When
 * §7.7.2.1 lands, this constant should be replaced by the persisted set value.
 */
export const MACHINE_REFERENCE_VALUES_MM: Record<Axis, number> = {
  X: 25.4,
  Y: 25.4,
  Z: 25.4,
};

/** Read the machine position for an axis from context. */
function machinePosition(axis: Axis, context: DROReducerContext): number {
  const { position } = context.millState;
  if (axis === 'X') return position.x;
  if (axis === 'Y') return position.y;
  return position.z;
}

/**
 * Compute the display for a waiting state: a blinking zero (modeled as 0) next
 * to the selected axis, blank on the others.
 */
function computeWaitingDisplay(selectedAxis: Axis | null): DisplayState {
  return createDisplay(
    selectedAxis === 'X' ? 0 : '',
    selectedAxis === 'Y' ? 0 : '',
    selectedAxis === 'Z' ? 0 : ''
  );
}

/** Coerce arbitrary state data to ReferenceData, falling back to initial. */
function asReferenceData(data: DROStatePayload['stateData']): ReferenceData {
  return data.stateDataType === 'reference' ? data : INITIAL_REFERENCE_DATA;
}

/** Build the idle exit payload showing normal position display. */
function exitToIdle(
  vMem: VolatileMemoryState,
  context: DROReducerContext
): DROStatePayload {
  return {
    stateName: 'idle',
    stateData: INITIAL_DRO_STATE_DATA,
    vMem,
    display: computeNormalDisplay(vMem, context),
  };
}

/**
 * Set the datum for the selected axis so the displayed ABS value becomes
 * `referenceValue` at the current (mark) machine position, then return to idle.
 *
 * Both representations are updated so the datum is reflected regardless of
 * connection state (mirrors axis-operations setAxisValueMm):
 * - connected: ABS display = machinePos - workOffset, so set the work offset.
 * - disconnected (NoOp/manual, the default source): ABS display reads
 *   manualAbsoluteValues, so set that to the reference value directly.
 */
function applyDatum(
  axis: Axis,
  referenceValue: number,
  vMem: VolatileMemoryState,
  context: DROReducerContext
): DROStatePayload {
  const offset = machinePosition(axis, context) - referenceValue;
  const newVMem: VolatileMemoryState = {
    ...vMem,
    workOffsets: { ...vMem.workOffsets, [axis]: offset },
    manualAbsoluteValues: { ...vMem.manualAbsoluteValues, [axis]: referenceValue },
    activeAxis: null,
    inputBuffer: '',
  };
  return exitToIdle(newVMem, context);
}

/** Map an axis-select event to the axis it selects (or null). */
function selectedAxisFromEvent(eventName: string): Axis | null {
  if (eventName === 'BTN_SELECT_X') return 'X';
  if (eventName === 'BTN_SELECT_Y') return 'Y';
  if (eventName === 'BTN_SELECT_Z') return 'Z';
  return null;
}

export const referenceReducer: FeatureReducer = (current, event, context) => {
  const { stateName: state, stateData: data, vMem } = current;
  const { eventName } = event;

  // Entry from idle: pressing Reference. §7.7 forces ABS mode.
  if (eventName === 'BTN_REFERENCE') {
    if (state !== 'idle') return null;
    const absVMem: VolatileMemoryState = { ...vMem, mode: 'abs', inputBuffer: '' };
    return {
      stateName: 'reference-menu-home',
      stateData: INITIAL_REFERENCE_DATA,
      vMem: absVMem,
      display: createDisplay(REFERENCE_TEXT.home, '', ''),
    };
  }

  if (!isReferenceActive(state)) return null;

  const refData = asReferenceData(data);

  // Cancel at any point returns to idle without changing the datum.
  if (eventName === 'KEY_CLEAR') {
    return exitToIdle(vMem, context);
  }

  // ── Menu: cycle between honE and nC rEF ────────────────────────────
  if (state === 'reference-menu-home' || state === 'reference-menu-machine') {
    if (eventName === 'KEY_6_RIGHT' || eventName === 'KEY_4_LEFT') {
      const toMachine = state === 'reference-menu-home';
      const nextState = toMachine ? 'reference-menu-machine' : 'reference-menu-home';
      const nextMode = toMachine ? 'MACHINE_RECALL' : 'HOME';
      return {
        stateName: nextState,
        stateData: { ...refData, referenceMode: nextMode },
        vMem,
        display: createDisplay(
          toMachine ? REFERENCE_TEXT.machine : REFERENCE_TEXT.home,
          '',
          ''
        ),
      };
    }
    if (eventName === 'KEY_ENTER') {
      const toHome = state === 'reference-menu-home';
      return {
        stateName: toHome ? 'reference-home-select' : 'reference-machine-select',
        stateData: { ...refData, referenceMode: toHome ? 'HOME' : 'MACHINE_RECALL' },
        vMem,
        display: createDisplay(REFERENCE_TEXT.select, '', ''),
      };
    }
    return current;
  }

  // ── Axis selection: choose which axis to reference ─────────────────
  if (state === 'reference-home-select' || state === 'reference-machine-select') {
    const axis = selectedAxisFromEvent(eventName);
    if (axis === null) return current;
    const waitingState =
      state === 'reference-home-select'
        ? 'reference-home-waiting'
        : 'reference-machine-waiting';
    return {
      stateName: waitingState,
      stateData: { ...refData, selectedAxis: axis },
      vMem,
      display: computeWaitingDisplay(axis),
    };
  }

  // ── Waiting for the encoder reference mark ─────────────────────────
  if (state === 'reference-home-waiting' || state === 'reference-machine-waiting') {
    // Position updates while waiting must not move us out of the waiting state.
    if (eventName === 'MILL_STATE_CHANGED') {
      return {
        ...current,
        display: computeWaitingDisplay(refData.selectedAxis),
      };
    }
    if (eventName === 'ENCODER_REF_MARK_CROSSED') {
      // Only the selected axis triggers datum capture.
      if (refData.selectedAxis === null || event.axis !== refData.selectedAxis) {
        return current;
      }
      const referenceValue =
        state === 'reference-machine-waiting'
          ? MACHINE_REFERENCE_VALUES_MM[refData.selectedAxis]
          : 0;
      return applyDatum(refData.selectedAxis, referenceValue, vMem, context);
    }
    return current;
  }

  return current;
};

// ─────────────────────────────────────────────────────────────────
// E2E TEST HOOK
// ─────────────────────────────────────────────────────────────────

import { useEffect, type Dispatch } from 'react';
import type { DROEventPayload } from '../droStateMachine';

/**
 * Window key under which the reference-mark crossing test hook is exposed.
 *
 * The encoder reference mark is hardware that has no analog in the simulator's
 * mock data source, so E2E tests trigger "crossing the mark" by calling this
 * hook after positioning the mock encoder. It mirrors how the real DRO would
 * latch the reference mark while jogging.
 */
export const REFERENCE_MARK_HOOK = '__el400CrossReferenceMark';

declare global {
  interface Window {
    /** E2E-only hook to latch the encoder reference mark; see useReferenceMarkTestHook. */
    __el400CrossReferenceMark?: (axis: 'X' | 'Y' | 'Z') => void;
  }
}

/**
 * Expose a window-level hook so E2E tests can simulate crossing the encoder
 * reference mark for an axis. Cleans up on unmount.
 */
export function useReferenceMarkTestHook(dispatch: Dispatch<DROEventPayload>): void {
  useEffect(() => {
    window.__el400CrossReferenceMark = (axis) => {
      dispatch({ eventName: 'ENCODER_REF_MARK_CROSSED', axis });
    };
    return () => {
      delete window.__el400CrossReferenceMark;
    };
  }, [dispatch]);
}

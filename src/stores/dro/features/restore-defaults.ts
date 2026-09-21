/** EL400 §6.2 Reset*6: restore defaults for the selected axis, not operator jobs. */
import { useEffect, type Dispatch } from 'react';
import type { DROReducerContext, DROStatePayload, FeatureReducer } from '../types';
import type { DROEventPayload, DROStateName } from '../droStateMachine';
import type { VolatileMemoryState } from '../../../types/volatileMemory';
import { INITIAL_DRO_STATE_DATA } from '../droStateMachine';
import { computeNormalDisplay } from '../utils/displayComputation';
import { useSettingsStore } from '../../settingsStore';
import { DEFAULT_NON_VOLATILE_MEMORY } from '../../../types/nonVolatileMemory';

export const RESTORE_DEFAULTS_ID = 'restore-defaults';
export const RESTORE_DEFAULTS_LABEL = 'rSt oEm';
export const RESTORE_IN_PROGRESS_TEXT = 'In ProG';
/** Simulator dwell only: the settings are already durable when ENT is pressed. */
export const RESTORE_DURATION_MS = 1500;

/** Restore saved OEM axis settings, or factory axis settings if no OEM exists. */
export function restoreDefaults(
  vMem: VolatileMemoryState, axis: 'X' | 'Y' | 'Z', context: DROReducerContext,
): VolatileMemoryState {
  const store = useSettingsStore.getState();
  const live = store.nvMem;
  const target = live.oemDefaults ?? DEFAULT_NON_VOLATILE_MEMORY;
  store.updateNvMem({
    scaleResolution: { ...live.scaleResolution, [axis]: target.scaleResolution[axis] },
    displayResolution: { ...live.displayResolution, [axis]: target.displayResolution[axis] },
    angularResolution: { ...live.angularResolution, [axis]: target.angularResolution[axis] },
    axisDirection: { ...live.axisDirection, [axis]: target.axisDirection[axis] },
    countingMode: { ...live.countingMode, [axis]: target.countingMode[axis] },
    measurementMode: { ...live.measurementMode, [axis]: target.measurementMode[axis] },
    calibration: { ...live.calibration, [axis]: target.calibration[axis] },
    zeroApproachEnabled: { ...live.zeroApproachEnabled, [axis]: target.zeroApproachEnabled[axis] },
    zeroApproachDistance: { ...live.zeroApproachDistance, [axis]: target.zeroApproachDistance[axis] },
    zeroApproachTolerance: { ...live.zeroApproachTolerance, [axis]: target.zeroApproachTolerance[axis] },
  });
  const scaleChanged = live.scaleResolution[axis] !== target.scaleResolution[axis]
    && context.millState.encoderResolutionMicrons?.[axis] !== undefined;
  const calibrationChanged = JSON.stringify(live.calibration[axis]) !== JSON.stringify(target.calibration[axis]);
  if (!scaleChanged && !calibrationChanged) return vMem;
  const { [axis]: _mark, ...referenceMarks } = vMem.referenceMarks;
  const offset = vMem.machineReferenceOffsets[axis];
  const ratio = Number(target.scaleResolution[axis]) / Number(live.scaleResolution[axis]);
  return { ...vMem, referenceMarks,
    machineReferenceOffsets: scaleChanged && offset !== undefined
      ? { ...vMem.machineReferenceOffsets, [axis]: offset * ratio } : vMem.machineReferenceOffsets };
}

/** Reset is synchronous and durable; the progress screen does not perform writes. */
export function enterRestoreInProgress(
  vMem: VolatileMemoryState, axis: 'X' | 'Y' | 'Z', context: DROReducerContext,
): DROStatePayload {
  return {
    stateName: 'restore-in-progress',
    stateData: INITIAL_DRO_STATE_DATA,
    vMem: restoreDefaults(vMem, axis, context),
    display: { X: RESTORE_IN_PROGRESS_TEXT, Y: '', Z: '' },
  };
}

export function useRestoreProgress(dispatch: Dispatch<DROEventPayload>, droState: DROStateName) {
  useEffect(() => {
    if (droState !== 'restore-in-progress') return undefined;
    const timer = setTimeout(() => { dispatch({ eventName: 'RESTORE_COMPLETE' }); }, RESTORE_DURATION_MS);
    return () => { clearTimeout(timer); };
  }, [droState, dispatch]);
}

export const restoreDefaultsReducer: FeatureReducer = (statePayload, eventPayload, context) => {
  if (statePayload.stateName !== 'restore-in-progress' || eventPayload.eventName !== 'RESTORE_COMPLETE') return null;
  return { stateName: 'idle', stateData: INITIAL_DRO_STATE_DATA, vMem: statePayload.vMem,
    display: computeNormalDisplay(statePayload.vMem, context) };
};

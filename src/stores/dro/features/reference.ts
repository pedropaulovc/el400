import type { FeatureReducer, DROReducerContext, DROStatePayload } from '../types';
import type { Axis, VolatileMemoryState } from '../../../types/volatileMemory';
import type { DROEventPayload, DROStateName } from '../droStateMachine';
import { INITIAL_DRO_STATE_DATA, INITIAL_REFERENCE_DATA, isReferenceActive } from '../droStateMachine';
import { computeNormalDisplay, computeUncompensatedMachinePositionMm, computeMachinePositionMm, createDisplay } from '../utils/displayComputation';
import { applyAxisCalibration } from '../utils/calibration';

export const REFERENCE_TEXT = { home: 'honE', machine: 'nC rEF', setMachine: 'SEt nC', select: 'SELECt' } as const;
const MENUS = ['reference-menu-home', 'reference-menu-set-machine', 'reference-menu-machine'] as const;
const LABELS = [REFERENCE_TEXT.home, REFERENCE_TEXT.setMachine, REFERENCE_TEXT.machine] as const;

/** Capture genuine adapter index pulses globally, including outside reference UI. */
export function recordReferenceMark(current: DROStatePayload, event: DROEventPayload, context: DROReducerContext): DROStatePayload {
  if (event.eventName !== 'ENCODER_REF_MARK_CROSSED') return current;
  const installed = context.millState.encoderResolutionMicrons?.[event.axis];
  const mark = installed === undefined ? event.markPositionMm
    : event.markPositionMm * Number(context.nvMem.scaleResolution[event.axis]) / installed;
  return { ...current, vMem: { ...current.vMem, referenceMarks: { ...current.vMem.referenceMarks, [event.axis]: mark } } };
}

function exit(vMem: VolatileMemoryState, context: DROReducerContext): DROStatePayload {
  return { stateName: 'idle', stateData: INITIAL_DRO_STATE_DATA, vMem, display: computeNormalDisplay(vMem, context) };
}

/** Manual §7.7: Home, then Set MC at the desired datum, then recall by index pulse. */
export const referenceReducer: FeatureReducer = (current, event, context) => {
  const { stateName, vMem } = current;
  if (stateName === 'idle' && event.eventName === 'BTN_REFERENCE') {
    return { stateName: 'reference-menu-home', stateData: INITIAL_REFERENCE_DATA,
      vMem: { ...vMem, mode: 'abs', inputBuffer: '', activeAxis: null }, display: createDisplay(REFERENCE_TEXT.home, '', '') };
  }
  if (!isReferenceActive(stateName)) return null;
  const data = current.stateData.stateDataType === 'reference' ? current.stateData : INITIAL_REFERENCE_DATA;
  if (event.eventName === 'KEY_CLEAR') return exit(vMem, context);
  const menu = MENUS.findIndex(s => s === stateName);
  if (menu >= 0) {
    if (event.eventName === 'KEY_6_RIGHT' || event.eventName === 'KEY_4_LEFT') {
      const next = ((menu + (event.eventName === 'KEY_6_RIGHT' ? 1 : 2)) % 3) as 0 | 1 | 2;
      return { ...current, stateName: MENUS[next], display: createDisplay(LABELS[next], '', '') };
    }
    if (event.eventName === 'KEY_ENTER') {
      const state: DROStateName = menu === 0 ? 'reference-home-select' : menu === 1 ? 'reference-set-machine-select' : 'reference-machine-select';
      return { ...current, stateName: state, stateData: { ...data, referenceMode: menu === 0 ? 'HOME' : menu === 1 ? 'MACHINE_SET' : 'MACHINE_RECALL' }, display: createDisplay(REFERENCE_TEXT.select, '', '') };
    }
    return current;
  }
  const axis: Axis | null = event.eventName === 'BTN_SELECT_X' ? 'X' : event.eventName === 'BTN_SELECT_Y' ? 'Y' : event.eventName === 'BTN_SELECT_Z' ? 'Z' : null;
  if (axis !== null && (stateName === 'reference-home-select' || stateName === 'reference-machine-select' || stateName === 'reference-set-machine-select')) {
    if (stateName === 'reference-set-machine-select') {
      const mark = vMem.referenceMarks[axis];
      if (mark === undefined) return { ...current, display: createDisplay('no rEF', '', '') };
      const displacement = computeUncompensatedMachinePositionMm(axis, context) - mark;
      return exit({ ...vMem,
        machineReferenceOffsets: { ...vMem.machineReferenceOffsets, [axis]: displacement },
        workOffsets: { ...vMem.workOffsets, [axis]: computeMachinePositionMm(axis, vMem, context) },
        manualAbsoluteValues: { ...vMem.manualAbsoluteValues, [axis]: 0 },
      }, context);
    }
    if (stateName === 'reference-machine-select' && vMem.machineReferenceOffsets[axis] === undefined) {
      return { ...current, display: createDisplay('no dAtA', '', '') };
    }
    return { ...current,
      stateName: stateName === 'reference-home-select' ? 'reference-home-waiting' : 'reference-machine-waiting',
      stateData: { ...data, selectedAxis: axis },
      display: createDisplay(axis === 'X' ? 0 : '', axis === 'Y' ? 0 : '', axis === 'Z' ? 0 : ''),
    };
  }
  if (event.eventName === 'ENCODER_REF_MARK_CROSSED' && event.axis === data.selectedAxis &&
    (stateName === 'reference-home-waiting' || stateName === 'reference-machine-waiting')) {
    // Root reducer records the raw mark before dispatching this feature.
    const mark = vMem.referenceMarks[event.axis];
    if (mark === undefined) return current;
    const displacement = stateName === 'reference-home-waiting' ? 0 : vMem.machineReferenceOffsets[event.axis];
    if (displacement === undefined) return current;
    const datum = applyAxisCalibration(event.axis, mark + displacement, vMem, context.nvMem);
    return exit({ ...vMem, workOffsets: { ...vMem.workOffsets, [event.axis]: datum }, inputBuffer: '', activeAxis: null }, context);
  }
  return current;
};

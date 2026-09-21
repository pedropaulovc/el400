import type { FeatureReducer, DROStatePayload, DROReducerContext } from '../types';
import type { DROStateName, SdmData, StoredPoint } from '../droStateMachine';
import { INITIAL_DRO_STATE_DATA, INITIAL_SDM_DATA, MAX_SDM_STEPS, isSdmActive } from '../droStateMachine';
import type { Axis, VolatileMemoryState } from '../../../types/volatileMemory';
import { getBufferValue, appendDigit, appendDecimal, toggleSign, removeLastChar, KEY_TO_DIGIT } from './buffer-utils';
import { computeMachinePositionMm, computeNormalDisplay, createDisplay, directionSign, measurementScale, type DisplayState } from '../utils/displayComputation';
import { fromMmToAnyUnit, fromAnyUnitToMm } from '../../../utils/unitConversion';

const MENU = ['sdm-menu-program', 'sdm-menu-run', 'sdm-menu-learn'] as const;
const LABELS = ['ProGrAn', 'rUn', 'LEArn'] as const;
const MODES = ['PROGRAM', 'RUN', 'LEARN'] as const;
const AXES = ['X', 'Y', 'Z'] as const;
const INPUT: Partial<Record<DROStateName, Axis>> = {
  'sdm-program-input-x': 'X', 'sdm-program-input-y': 'Y', 'sdm-program-input-z': 'Z',
};
const INPUT_STATE: Record<Axis, DROStateName> = {
  X: 'sdm-program-input-x', Y: 'sdm-program-input-y', Z: 'sdm-program-input-z',
};

/** SDM coordinates use the operator's ABS datum and counting direction, in mm. */
function absolutePosition(axis: Axis, vm: VolatileMemoryState, ctx: DROReducerContext): number {
  const raw = ctx.millState.connected
    ? computeMachinePositionMm(axis, vm, ctx) - vm.workOffsets[axis]
    : vm.manualAbsoluteValues[axis];
  return raw * directionSign(axis, ctx.nvMem) * measurementScale(axis, ctx.nvMem);
}
function capture(vm: VolatileMemoryState, ctx: DROReducerContext): StoredPoint {
  return { X: absolutePosition('X', vm, ctx), Y: absolutePosition('Y', vm, ctx), Z: absolutePosition('Z', vm, ctx) };
}
function stepDisplay(data: SdmData, vm: VolatileMemoryState): DisplayState {
  return createDisplay('StEPno', vm.inputBuffer || String(data.currentStep), '');
}
function displayFor(state: DROStateName, data: SdmData, vm: VolatileMemoryState, ctx: DROReducerContext): DisplayState {
  if (state === 'sdm-learn-position') {
    const normal = computeNormalDisplay(vm, ctx);
    return data.learnPhase === 'step-shown' ? { ...normal, Y: String(data.currentStep) } : normal;
  }
  const axis = INPUT[state];
  if (axis !== undefined || state === 'sdm-run-active') {
    const stored = data.points[data.currentStep];
    if (state === 'sdm-run-active' && stored === undefined) return createDisplay('no dAtA', String(data.currentStep), '');
    const value = (a: Axis) => {
      if (a === axis && vm.inputBuffer !== '') return getBufferValue(vm.inputBuffer) ?? 0;
      const mm = (stored?.[a] ?? 0) - (state === 'sdm-run-active' ? absolutePosition(a, vm, ctx) : 0);
      return fromMmToAnyUnit(mm, ctx.nvMem.defaultUnit);
    };
    return createDisplay(value('X'), value('Y'), value('Z'));
  }
  return stepDisplay(data, vm);
}
function exit(vm: VolatileMemoryState, data: SdmData, ctx: DROReducerContext): DROStatePayload {
  const restored = { ...vm, mode: data.returnMode, inputBuffer: '', activeAxis: null };
  return { stateName: 'idle', stateData: INITIAL_DRO_STATE_DATA, vMem: restored, display: computeNormalDisplay(restored, ctx) };
}

/** Manual §8.2: Program → Run → Learn; all writes share the persisted point map. */
export const sdmReducer: FeatureReducer = (current, event, ctx) => {
  const state = current.stateName;
  if (!isSdmActive(state)) return null;
  const data = current.stateData.stateDataType === 'sdm' ? current.stateData : INITIAL_SDM_DATA;
  const vm = current.vMem;
  const key = event.eventName;
  const menuIndex = MENU.findIndex(s => s === state);
  if (menuIndex >= 0) {
    if (key === 'KEY_CLEAR') return exit(vm, data, ctx);
    if (key === 'KEY_6_RIGHT' || key === 'KEY_4_LEFT') {
      const i = ((menuIndex + (key === 'KEY_6_RIGHT' ? 1 : 2)) % 3) as 0 | 1 | 2;
      return { ...current, stateName: MENU[i], stateData: { ...data, sdmMode: MODES[i] }, display: createDisplay(LABELS[i], '', '') };
    }
    if (key === 'KEY_ENTER') {
      const next = data.sdmMode === 'PROGRAM' ? 'sdm-program-step' : data.sdmMode === 'RUN' ? 'sdm-run-step' : 'sdm-learn-step';
      const nd: SdmData = { ...data, currentStep: 1, navigationPhase: 'browse' };
      const nv = { ...vm, inputBuffer: '' };
      return { stateName: next, stateData: nd, vMem: nv, display: stepDisplay(nd, nv) };
    }
    return current;
  }
  const refresh = (stateName: DROStateName, stateData = data, vMem = vm): DROStatePayload => ({
    stateName, stateData, vMem, display: displayFor(stateName, stateData, vMem, ctx),
  });
  if (key === 'MILL_STATE_CHANGED' || key === 'ENCODER_REF_MARK_CROSSED') return refresh(state);
  if (key === 'KEY_CLEAR') {
    if (vm.inputBuffer !== '') return refresh(state, data, { ...vm, inputBuffer: removeLastChar(vm.inputBuffer) });
    return exit(vm, data, ctx);
  }
  if (state === 'sdm-learn-position') {
    if (key !== 'BTN_SELECT_X') return current;
    if (data.learnPhase === 'awaiting-first-press') return refresh(state, { ...data, learnPhase: 'step-shown' });
    const points = { ...data.points, [data.currentStep]: capture(vm, ctx) };
    return refresh(state, { ...data, points, currentStep: Math.min(MAX_SDM_STEPS, data.currentStep + 1), learnPhase: 'awaiting-first-press' }, { ...vm, sdmPoints: points });
  }
  if (state === 'sdm-run-active') {
    if (key === 'BTN_SELECT_Y') return refresh('sdm-run-step', { ...data, navigationPhase: 'jump' }, { ...vm, inputBuffer: '' });
    if (key === 'KEY_6_RIGHT' || key === 'KEY_4_LEFT') {
      const step = Math.max(1, Math.min(MAX_SDM_STEPS, data.currentStep + (key === 'KEY_6_RIGHT' ? 1 : -1)));
      return refresh(state, { ...data, currentStep: step });
    }
    return current;
  }
  const inputAxis = INPUT[state];
  if (inputAxis !== undefined) {
    const selected = key === 'BTN_SELECT_X' ? 'X' : key === 'BTN_SELECT_Y' ? 'Y' : key === 'BTN_SELECT_Z' ? 'Z' : null;
    if (selected !== null) return refresh(INPUT_STATE[selected], data, { ...vm, inputBuffer: '' });
    if (key === 'KEY_ENTER') {
      const entered = getBufferValue(vm.inputBuffer);
      const existing = data.points[data.currentStep] ?? { X: 0, Y: 0, Z: 0 };
      const value = entered === null ? existing[inputAxis] : fromAnyUnitToMm(entered, ctx.nvMem.defaultUnit);
      const points = { ...data.points, [data.currentStep]: { ...existing, [inputAxis]: value } };
      const nextAxis = AXES[AXES.indexOf(inputAxis) + 1];
      return refresh(nextAxis === undefined ? 'sdm-program-step' : INPUT_STATE[nextAxis], { ...data, points, navigationPhase: 'browse' }, { ...vm, inputBuffer: '', sdmPoints: points });
    }
    const digit = KEY_TO_DIGIT[key];
    const buffer = digit !== undefined ? appendDigit(vm.inputBuffer, digit)
      : key === 'KEY_DECIMAL' ? appendDecimal(vm.inputBuffer)
        : key === 'KEY_SIGN' ? toggleSign(vm.inputBuffer) : null;
    return buffer === null ? current : refresh(state, data, { ...vm, inputBuffer: buffer });
  }
  // Step browsing and explicit jump entry are separate phases: arrows never
  // turn into accidental 4/6 digits except while entering a requested step.
  if (key === 'BTN_SELECT_Y') {
    return refresh(state === 'sdm-program-step' ? 'sdm-program-jump' : state, { ...data, navigationPhase: 'jump' }, { ...vm, inputBuffer: '' });
  }
  if (data.navigationPhase === 'browse' && (key === 'KEY_6_RIGHT' || key === 'KEY_4_LEFT')) {
    return refresh(state, { ...data, currentStep: Math.max(1, Math.min(MAX_SDM_STEPS, data.currentStep + (key === 'KEY_6_RIGHT' ? 1 : -1))) });
  }
  if (key === 'KEY_ENTER') {
    const step = getBufferValue(vm.inputBuffer) ?? data.currentStep;
    if (!Number.isInteger(step) || step < 1 || step > MAX_SDM_STEPS) return current;
    const nd: SdmData = { ...data, currentStep: step, navigationPhase: 'browse', learnPhase: 'awaiting-first-press' };
    const nv = { ...vm, inputBuffer: '' };
    if (state === 'sdm-program-jump' || (state === 'sdm-run-step' && data.navigationPhase === 'jump')) {
      return refresh(state === 'sdm-program-jump' ? 'sdm-program-step' : state, nd, nv);
    }
    const next = state === 'sdm-learn-step' ? 'sdm-learn-position' : state === 'sdm-run-step' ? 'sdm-run-active' : 'sdm-program-input-x';
    return refresh(next, nd, next === 'sdm-run-active' ? { ...nv, mode: 'inc' } : nv);
  }
  const digit = KEY_TO_DIGIT[key];
  if (digit !== undefined && (data.navigationPhase === 'jump' || state === 'sdm-learn-step')) {
    return refresh(state, { ...data, navigationPhase: 'jump' }, { ...vm, inputBuffer: appendDigit(vm.inputBuffer, digit) });
  }
  return current;
};

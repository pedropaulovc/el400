import type { DROReducerContext, DROStatePayload, FeatureReducer } from '../types';
import type { DROEventPayload, SetupData } from '../droStateMachine';
import type { VolatileMemoryState } from '../../../types/volatileMemory';
import type { NonVolatileMemory } from '../../../types/nonVolatileMemory';
import { INITIAL_DRO_STATE_DATA, INITIAL_SETUP_DATA, isSetupActive, isFrontPanelKey } from '../droStateMachine';
import { computeNormalDisplay, createDisplay, formatDisplayNumber, type DisplayState } from '../utils/displayComputation';
import {
  getParameterAt, wrapItemIndex, choiceIndexOf, wrapChoiceIndex, labelForValue,
  commitDrafts, applySetupDrafts, resolveChoices, SETUP_END_ID, SAVE_CHANGES_ID,
  OEM_MODE_ID, RESTORE_DEFAULTS_ID, AUX_FN_ID, CALIBRATION_ID, ZERO_APPROACH_ID,
  type SetupParameter,
} from './setup-parameters';
import { SETUP_SAVED_TEXT } from './save-changes';
import { enterAuxiliaryMenu } from './aux-fn';
import { enterOemPassword } from './oem-mode';
import { enterRestoreInProgress } from './restore-defaults';
import { startCalibration, calibrationDisplay, reduceCalibration } from './calibration';
import { KEY_TO_DIGIT, appendDecimal } from './buffer-utils';
import { fromAnyUnitToMm, fromMmToAnyUnit } from '../../../utils/unitConversion';

export const SETUP_SELECT_TEXT = 'SELECt';

function draftKey(param: SetupParameter, axis: SetupData['selectedAxis']): string {
  return `${param.scope === 'per-axis' ? (axis ?? 'X') : 'GLOBAL'}:${param.id}`;
}

function computeParameterDisplay(data: SetupData, nvMem: NonVolatileMemory): DisplayState {
  const param = getParameterAt(data.currentParamIndex);
  const context = { nvMem: applySetupDrafts(nvMem, data.draftValues), axis: data.selectedAxis };
  const value = param.readValue(context);
  if (data.editor) {
    if (param.id === ZERO_APPROACH_ID) return createDisplay(resolveChoices(param, context).find(choice => choice.value === value)?.label ?? param.label, '', '');
    if (data.editor.phase === 'input') return createDisplay(data.editor.buffer || '0', '', '');
    const spec = param.numeric;
    if (spec === undefined) throw new Error('Numeric setup view requires numeric metadata');
    const displayed = spec.storageUnit === 'inch' && nvMem.defaultUnit === 'mm'
      ? fromAnyUnitToMm(Number(value), 'inch')
      : Number(value);
    return createDisplay(formatDisplayNumber(displayed, spec.precision).padStart(spec.integerWidth ?? 0, '0'), '', '');
  }
  return createDisplay(labelForValue(param, value, context), '', '');
}

function exitToIdle(vMem: VolatileMemoryState, context: DROReducerContext): DROStatePayload {
  return { stateName: 'idle', stateData: INITIAL_DRO_STATE_DATA, vMem, display: computeNormalDisplay(vMem, context) };
}

function reduceNumeric(
  eventName: DROEventPayload['eventName'], data: SetupData, nvMem: NonVolatileMemory, vMem: VolatileMemoryState,
): DROStatePayload {
  const param = getParameterAt(data.currentParamIndex);
  const editor = data.editor;
  const spec = param.numeric;
  if (editor === undefined || spec === undefined) throw new Error('Numeric setup requires an active numeric editor');
  let next = data;
  let invalid = false;
  if (eventName === 'KEY_CLEAR') {
    const { editor: _editor, ...rest } = data;
    next = rest;
  } else if (editor.phase === 'view') {
    if (eventName === 'KEY_ENTER') next = { ...data, editor: { phase: 'input', buffer: '' } };
  } else {
    const digit = KEY_TO_DIGIT[eventName];
    if (digit !== undefined && editor.buffer.replace('.', '').length < 7) {
      const fractional = editor.buffer.split('.')[1];
      if (fractional === undefined || fractional.length < spec.precision) next = { ...data, editor: { ...editor, buffer: editor.buffer + digit } };
    } else if (eventName === 'KEY_DECIMAL' && spec.precision > 0) next = { ...data, editor: { ...editor, buffer: appendDecimal(editor.buffer) } };
    else if (eventName === 'KEY_ENTER') {
      const value = Number(editor.buffer);
      if (editor.buffer === '' || !Number.isFinite(value) || value < spec.min || value > spec.max || (spec.precision === 0 && !Number.isInteger(value))) invalid = true;
      else {
        const { editor: _editor, ...rest } = data;
        const stored = spec.storageUnit === 'inch' && nvMem.defaultUnit === 'mm'
          ? fromMmToAnyUnit(value, 'inch') : value;
        next = { ...rest, draftValues: { ...data.draftValues, [draftKey(param, data.selectedAxis)]: String(stored) }, currentParamIndex: wrapItemIndex(data.currentParamIndex, 1) };
      }
    }
  }
  return { stateName: 'setup-parameter', stateData: next, vMem, display: invalid ? createDisplay('Error', '', '') : computeParameterDisplay(next, nvMem) };
}

export const setupReducer: FeatureReducer = (statePayload, eventPayload, context) => {
  const { stateName, stateData, vMem } = statePayload;
  const { eventName } = eventPayload;
  if (stateName === 'idle') {
    if (eventName !== 'BTN_SETUP') return null;
    return { stateName: 'setup-select', stateData: INITIAL_SETUP_DATA, vMem, display: createDisplay(SETUP_SELECT_TEXT, '', '') };
  }
  if (!isSetupActive(stateName)) return null;
  const data = stateData.stateDataType === 'setup' ? stateData : INITIAL_SETUP_DATA;
  if (stateName === 'setup-saved') {
    if (eventName !== 'SETUP_SAVED_TIMEOUT' && !isFrontPanelKey(eventName)) return null;
    return { stateName: 'setup-parameter', stateData: data, vMem, display: computeParameterDisplay(data, context.nvMem) };
  }
  if (eventName === 'BTN_SETUP') {
    return { stateName: 'setup-select', stateData: { ...INITIAL_SETUP_DATA, draftValues: data.draftValues }, vMem, display: createDisplay(SETUP_SELECT_TEXT, '', '') };
  }
  if (stateName === 'setup-select') {
    const axis = eventName === 'BTN_SELECT_X' ? 'X' : eventName === 'BTN_SELECT_Y' ? 'Y' : eventName === 'BTN_SELECT_Z' ? 'Z' : null;
    if (axis !== null) {
      const next: SetupData = { ...data, selectedAxis: axis, currentParamIndex: 0 };
      return { stateName: 'setup-parameter', stateData: next, vMem, display: computeParameterDisplay(next, context.nvMem) };
    }
    return eventName === 'KEY_CLEAR' ? exitToIdle(vMem, context) : null;
  }
  if (!isFrontPanelKey(eventName)) {
    const phase = data.calibrationEditor?.phase;
    if (phase !== 'measure' && phase !== 'slec-reference' && phase !== 'slec-measure') return null;
  }
  const preview = applySetupDrafts(context.nvMem, data.draftValues);
  if (data.calibrationEditor) {
    const axis = data.selectedAxis ?? 'X';
    const referenceScaleRatio = context.millState.encoderResolutionMicrons?.[axis] === undefined
      ? 1 : Number(preview.scaleResolution[axis]) / Number(context.nvMem.scaleResolution[axis]);
    return reduceCalibration(data, eventPayload, vMem, { ...context, nvMem: preview }, referenceScaleRatio);
  }
  const param = getParameterAt(data.currentParamIndex);
  if (data.editor && param.numeric) return reduceNumeric(eventName, data, context.nvMem, vMem);
  if (eventName === 'KEY_CLEAR') {
    if (data.editor) {
      const { editor: _editor, ...rest } = data;
      return { stateName: 'setup-parameter', stateData: rest, vMem, display: computeParameterDisplay(rest, context.nvMem) };
    }
    return exitToIdle(vMem, context);
  }
  if (eventName === 'KEY_8_UP' || eventName === 'KEY_2_DOWN') {
    const { editor: _editor, ...rest } = data;
    const next = { ...rest, currentParamIndex: wrapItemIndex(data.currentParamIndex, eventName === 'KEY_2_DOWN' ? 1 : -1) };
    return { stateName: 'setup-parameter', stateData: next, vMem, display: computeParameterDisplay(next, context.nvMem) };
  }
  if (eventName === 'KEY_6_RIGHT' || eventName === 'KEY_4_LEFT') {
    if (param.id === ZERO_APPROACH_ID && !data.editor) return null;
    const ctx = { nvMem: preview, axis: data.selectedAxis };
    const choices = resolveChoices(param, ctx);
    if (choices.length === 0) return null;
    const index = choiceIndexOf(param, param.readValue(ctx), ctx);
    const choice = choices[wrapChoiceIndex(param, index, eventName === 'KEY_6_RIGHT' ? 1 : -1, ctx)];
    if (choice === undefined) throw new Error('Setup choice index is out of range');
    const next = { ...data, draftValues: { ...data.draftValues, [draftKey(param, data.selectedAxis)]: choice.value } };
    return { stateName: 'setup-parameter', stateData: next, vMem, display: computeParameterDisplay(next, context.nvMem) };
  }
  if (eventName !== 'KEY_ENTER') return null;
  if (param.numeric || param.id === ZERO_APPROACH_ID) {
    const next: SetupData = { ...data, editor: { phase: 'view', buffer: '' } };
    return { stateName: 'setup-parameter', stateData: next, vMem, display: computeParameterDisplay(next, context.nvMem) };
  }
  if (param.id === SETUP_END_ID) return exitToIdle(vMem, context);
  if (param.id === SAVE_CHANGES_ID) {
    let savedVMem = vMem;
    for (const axis of ['X', 'Y', 'Z'] as const) {
      if (preview.scaleResolution[axis] === context.nvMem.scaleResolution[axis]
        || context.millState.encoderResolutionMicrons?.[axis] === undefined) continue;
      const { [axis]: _mark, ...referenceMarks } = savedVMem.referenceMarks;
      const ratio = Number(preview.scaleResolution[axis]) / Number(context.nvMem.scaleResolution[axis]);
      const offset = savedVMem.machineReferenceOffsets[axis];
      savedVMem = { ...savedVMem, referenceMarks,
        machineReferenceOffsets: offset === undefined ? savedVMem.machineReferenceOffsets
          : { ...savedVMem.machineReferenceOffsets, [axis]: offset * ratio } };
    }
    commitDrafts(data.draftValues);
    return { stateName: 'setup-saved', stateData: { ...data, draftValues: {} }, vMem: savedVMem, display: createDisplay(SETUP_SAVED_TEXT, '', '') };
  }
  if (param.id === OEM_MODE_ID) return enterOemPassword(vMem, data);
  if (param.id === RESTORE_DEFAULTS_ID) return enterRestoreInProgress(vMem, data.selectedAxis ?? 'X', context);
  if (param.id === AUX_FN_ID) return enterAuxiliaryMenu(data, vMem);
  if (param.id === CALIBRATION_ID) {
    const next = startCalibration(data, { ...context, nvMem: preview });
    return { stateName: 'setup-parameter', stateData: next, vMem, display: calibrationDisplay(next, vMem, context) };
  }
  return null;
};

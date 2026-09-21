import type { CalibrationEditor, AxisCalibration } from '../../../types/calibration';
import type { SetupData, DROEventPayload } from '../droStateMachine';
import type { DROStatePayload, DROReducerContext } from '../types';
import type { VolatileMemoryState } from '../../../types/volatileMemory';
import { createDisplay, computeUncompensatedMachinePositionMm } from '../utils/displayComputation';
import { validCalibrationPoints } from '../utils/calibration';
import { KEY_TO_DIGIT, appendDecimal, toggleSign } from './buffer-utils';
import { CALIBRATION_ID, SAVE_CHANGES_ID, SETUP_PARAMETERS, getParameterAt } from './setup-parameters';

export function startCalibration(data: SetupData, context: DROReducerContext): SetupData {
  const axis = data.selectedAxis ?? 'X';
  const stored = data.draftValues[`${axis}:${CALIBRATION_ID}`];
  const calibration = stored === undefined ? context.nvMem.calibration[axis] : JSON.parse(stored) as AxisCalibration;
  return { ...data, calibrationEditor: {
    phase: context.nvMem.countingMode[axis] === 'angular' ? 'lec-menu' : 'method',
    method: context.nvMem.countingMode[axis] === 'angular' ? 'angular' : 'lec',
    menuIndex: 0, datumMm: 0, measuredMm: 0, buffer: '',
    originMm: calibration.kind === 'slec' ? calibration.originMm : 0,
    points: calibration.kind === 'slec' ? calibration.points : [],
    segmentIndex: 0, editField: 'referenceMm',
  } };
}

/** Only numeric capture phases interpret the arrow keys as digits. */
export function calibrationDisplay(data: SetupData, vMem: VolatileMemoryState, context: DROReducerContext) {
  const editor = data.calibrationEditor;
  if (editor === undefined) throw new Error('Calibration display requires an active editor');
  const raw = computeUncompensatedMachinePositionMm(data.selectedAxis ?? 'X', context);
  switch (editor.phase) {
    case 'method': return createDisplay(editor.method === 'slec' ? 'SLEC' : 'LEC', '', '');
    case 'lec-menu': return createDisplay(['diSPuAL', 'CAL FAC', 'P.P.r.'][editor.menuIndex] ?? 'diSPuAL', '', '');
    case 'measure': return createDisplay(raw - editor.datumMm, '', 'diSPuAL');
    case 'reference': return createDisplay(editor.buffer || '0', '', editor.method === 'angular' ? 'SEC' : 'rEF');
    case 'factor': return createDisplay(Number(editor.buffer || '1'), '', 'CAL FAC');
    case 'ppr': return createDisplay(editor.buffer || '0', '', 'P.P.r.');
    case 'slec-menu': return createDisplay(editor.menuIndex === 0 ? 'Auto' : 'Edit', '', 'SLEC');
    case 'slec-reference': return createDisplay(raw, '', vMem.referenceMarks[data.selectedAxis ?? 'X'] === undefined ? 'rEF' : 'SEt rC');
    case 'slec-measure': return createDisplay(raw - editor.datumMm, '', `S no ${String(editor.points.length + 1).padStart(2, '0')}`);
    case 'slec-value': return createDisplay(editor.buffer || '0', editor.measuredMm, `S no ${String(editor.points.length + 1).padStart(2, '0')}`);
    case 'slec-edit': {
      const point = editor.points[editor.segmentIndex];
      return createDisplay(point?.measuredMm ?? 0, point?.referenceMm ?? 0, `S no ${String(editor.segmentIndex + 1).padStart(2, '0')}`);
    }
    case 'slec-edit-value': return createDisplay(editor.buffer || '0', '', editor.editField === 'measuredMm' ? 'diSPuAL' : 'rEF');
  }
}

export function reduceCalibration(
  data: SetupData, event: DROEventPayload, vMem: VolatileMemoryState, context: DROReducerContext,
  referenceScaleRatio = 1,
): DROStatePayload {
  const editor = data.calibrationEditor;
  if (editor === undefined) throw new Error('Calibration input requires an active editor');
  const axis = data.selectedAxis ?? 'X';
  const key = `${axis}:${CALIBRATION_ID}`;
  const raw = computeUncompensatedMachinePositionMm(axis, context);
  let next = data;
  let error = false;
  const update = (changes: Partial<CalibrationEditor>) => {
    const active = next.calibrationEditor;
    if (active === undefined) throw new Error('Cannot update a closed calibration editor');
    next = { ...next, calibrationEditor: { ...active, ...changes } };
  };
  const draft = (calibration: AxisCalibration) => { next = { ...next, draftValues: { ...next.draftValues, [key]: JSON.stringify(calibration) } }; };
  const leave = () => {
    const { calibrationEditor: _editor, ...rest } = next;
    next = { ...rest, currentParamIndex: SETUP_PARAMETERS.findIndex(row => row.id === SAVE_CHANGES_ID) };
  };
  const name = event.eventName;
  const numeric = editor.phase === 'reference' || editor.phase === 'ppr' || editor.phase === 'slec-value' || editor.phase === 'slec-edit-value';
  if (name === 'KEY_CLEAR') {
    // Cancel the current capture without committing a partial measurement.
    if (numeric) update({ phase: editor.phase === 'slec-edit-value' ? 'slec-edit' : editor.phase === 'slec-value' ? 'slec-measure' : 'lec-menu', buffer: '' });
    else {
      const { calibrationEditor: _editor, ...rest } = next;
      next = rest;
    }
  } else if (numeric) {
    const digit = KEY_TO_DIGIT[name];
    if (digit !== undefined && editor.buffer.replace(/[-.]/g, '').length < 8) update({ buffer: editor.buffer + digit });
    else if (name === 'KEY_DECIMAL' && editor.phase !== 'ppr') update({ buffer: appendDecimal(editor.buffer) });
    else if (name === 'KEY_SIGN' && editor.phase !== 'ppr') update({ buffer: toggleSign(editor.buffer) });
    else if (name === 'KEY_ENTER') {
      const value = Number(editor.buffer);
      if (editor.buffer === '' || !Number.isFinite(value)) error = true;
      else if (editor.phase === 'ppr') {
        if (value <= 0 || !Number.isInteger(value)) error = true;
        else { draft({ kind: 'ppr', pulsesPerRevolution: value }); leave(); }
      } else if (editor.phase === 'reference') {
        const reference = editor.method === 'angular' ? value / 3600 : value;
        const factor = reference / editor.measuredMm;
        if (!Number.isFinite(factor) || factor <= 0) error = true;
        else { draft({ kind: editor.method === 'angular' ? 'angular' : 'lec', factor }); update({ phase: 'lec-menu', menuIndex: 1, buffer: String(factor) }); }
      } else if (editor.phase === 'slec-value') {
        const points = [...editor.points, { measuredMm: editor.measuredMm, referenceMm: value }];
        if (!validCalibrationPoints(points)) error = true;
        else {
          draft({ kind: 'slec', originMm: editor.originMm, points });
          update({ phase: 'slec-measure', points, buffer: '' });
          if (points.length === 99) leave();
        }
      } else {
        const points = editor.points.map((point, index) => index === editor.segmentIndex ? { ...point, [editor.editField]: value } : point);
        if (!validCalibrationPoints(points)) error = true;
        else { draft({ kind: 'slec', originMm: editor.originMm, points }); update({ phase: 'slec-edit', points, buffer: '' }); }
      }
    }
  } else if (name === 'KEY_2_DOWN' && editor.phase !== 'method' && editor.phase !== 'slec-reference') {
    leave();
  } else if (editor.phase === 'method') {
    if (name === 'KEY_6_RIGHT' || name === 'KEY_4_LEFT') {
      update({ method: editor.method === 'lec' ? 'slec' : 'lec' });
    } else if (name === 'KEY_ENTER') {
      update({ phase: editor.method === 'slec' ? 'slec-menu' : 'lec-menu', menuIndex: 0 });
    }
  } else if (editor.phase === 'lec-menu') {
    const count = editor.method === 'angular' ? 3 : 2;
    if (name === 'KEY_6_RIGHT' || name === 'KEY_4_LEFT') update({ menuIndex: (editor.menuIndex + (name === 'KEY_6_RIGHT' ? 1 : count - 1)) % count });
    else if (name === 'KEY_ENTER') {
      if (editor.menuIndex === 0) update({ phase: 'measure', datumMm: raw });
      else if (editor.menuIndex === 2) update({ phase: 'ppr', buffer: '' });
      else {
        const saved = next.draftValues[key];
        const calibration = saved === undefined ? context.nvMem.calibration[axis] : JSON.parse(saved) as AxisCalibration;
        update({ phase: 'factor', buffer: String(calibration.kind === 'lec' || calibration.kind === 'angular' ? calibration.factor : 1) });
      }
    }
  } else if (editor.phase === 'measure') {
    if (name === `BTN_SELECT_${axis}` || name === `BTN_ZERO_${axis}`) update({ datumMm: raw });
    else if (name === 'KEY_ENTER') {
      if (raw === editor.datumMm) error = true;
      else update({ phase: 'reference', measuredMm: raw - editor.datumMm, buffer: '' });
    }
  } else if (editor.phase === 'factor') {
    if (name === 'KEY_ENTER') leave();
  } else if (editor.phase === 'slec-menu') {
    if (name === 'KEY_6_RIGHT' || name === 'KEY_4_LEFT') update({ menuIndex: 1 - editor.menuIndex });
    else if (name === 'KEY_ENTER') {
      if (editor.menuIndex === 1 && editor.points.length === 0) error = true;
      else update({ phase: editor.menuIndex === 0 ? 'slec-reference' : 'slec-edit', segmentIndex: 0 });
    }
  } else if (editor.phase === 'slec-reference') {
    if (name === 'KEY_ENTER') {
      const mark = vMem.referenceMarks[axis];
      if (mark === undefined) error = true;
      else update({ phase: 'slec-measure', datumMm: raw, originMm: raw - mark * referenceScaleRatio, points: [] });
    }
  } else if (editor.phase === 'slec-measure') {
    if (name === 'KEY_ENTER' || name === 'KEY_6_RIGHT') update({ phase: 'slec-value', measuredMm: raw - editor.datumMm, buffer: '' });
  } else if (editor.phase === 'slec-edit') {
    if (name === 'KEY_6_RIGHT' || name === 'KEY_4_LEFT') update({ segmentIndex: (editor.segmentIndex + (name === 'KEY_6_RIGHT' ? 1 : editor.points.length - 1)) % editor.points.length });
    else if (name === 'BTN_SELECT_X' || name === 'BTN_SELECT_Y') update({ phase: 'slec-edit-value', editField: name === 'BTN_SELECT_X' ? 'measuredMm' : 'referenceMm', buffer: '' });
  }
  return { stateName: 'setup-parameter', stateData: next, vMem,
    display: error ? createDisplay('Error', '', '') : next.calibrationEditor ? calibrationDisplay(next, vMem, context) : createDisplay(getParameterAt(next.currentParamIndex).label, '', '') };
}

/** Touch probe contact capture and operator workflows, EL400 §10.1. */
import type { FeatureReducer, DROReducerContext, DROStatePayload } from '../types';
import type { ProbeData, ProbeFunction } from '../droStateMachine';
import { INITIAL_DRO_STATE_DATA, INITIAL_PROBE_DATA, isProbeActive } from '../droStateMachine';
import type { Axis, VolatileMemoryState } from '../../../types/volatileMemory';
import { axisUnitsToDisplayUnits, computeNormalDisplay, computeMachinePositionMm, computeAxisPositionMm, directionSign, displayUnitsToAxisUnits, measurementScale, createDisplay, type DisplayState } from '../utils/displayComputation';
import { fromMmToAnyUnit } from '../../../utils/unitConversion';
import { appendDigit, appendDecimal, getBufferValue, KEY_TO_DIGIT } from './buffer-utils';
import { useSettingsStore } from '../../settingsStore';

const PROBE_LABEL: Record<ProbeFunction, string> = { edge: 'Prob Ed', midpoint: 'Prob nd', inside: 'inS dE', outside: 'oUtS dE', config: 'ConFiG' };
const PROBE_NEIGHBORS: Record<ProbeFunction, readonly [ProbeFunction, ProbeFunction]> = {
  edge: ['config', 'midpoint'],
  midpoint: ['edge', 'inside'],
  inside: ['midpoint', 'outside'],
  outside: ['inside', 'config'],
  config: ['outside', 'edge'],
};
/** Visual flash only; the EL400 does not specify its duration. */
export const PROBE_MESSAGE_MS = 1000;

function exitToIdle(vMem: VolatileMemoryState, context: DROReducerContext): DROStatePayload {
  const next = { ...vMem, inputBuffer: '', activeAxis: null };
  return { stateName: 'idle', stateData: INITIAL_DRO_STATE_DATA, vMem: next, display: computeNormalDisplay(next, context) };
}

function measurementDisplay(data: ProbeData, context: DROReducerContext): DisplayState {
  const axis = data.probeAxis ?? 'X';
  const value = data.resultView === 'width' ? data.resultMm : data.centerMm;
  const labelAxis = axis === 'Z' ? 'X' : 'Z';
  const displayed = value === null ? 'Error' : data.resultView === 'width'
    ? fromMmToAnyUnit(value, context.nvMem.defaultUnit)
    : axisUnitsToDisplayUnits(axis, value, context.nvMem);
  return { ...createDisplay('', '', ''), [axis]: displayed, [labelAxis]: data.resultView === 'width' ? 'LEnGth' : 'CEntrE' };
}

/** Datum point is a captured machine coordinate, not the possibly moved live probe. */
function setDatum(vMem: VolatileMemoryState, axis: Axis, pointAxisUnits: number, coordinateDisplayUnits: number, context: DROReducerContext): VolatileMemoryState {
  const coordinateAxisUnits = displayUnitsToAxisUnits(axis, coordinateDisplayUnits, context.nvMem);
  const rawTarget = coordinateAxisUnits / (directionSign(axis, context.nvMem) * measurementScale(axis, context.nvMem));
  if (context.millState.connected) {
    const key = vMem.mode === 'abs' ? 'workOffsets' : 'incrementalOffsets';
    return { ...vMem, [key]: { ...vMem[key], [axis]: pointAxisUnits - rawTarget } };
  }
  const key = vMem.mode === 'abs' ? 'manualAbsoluteValues' : 'incrementalValues';
  return { ...vMem, [key]: { ...vMem[key], [axis]: vMem[key][axis] - pointAxisUnits + rawTarget } };
}

function armProbe(data: ProbeData, state: DROStatePayload, context: DROReducerContext): DROStatePayload {
  return {
    ...state, stateName: 'probe-waiting',
    stateData: { ...data, captures: [], resultMm: null, centerMm: null, probeTriggered: false, lastProbeTriggered: context.millState.probe.triggered },
    vMem: { ...state.vMem, activeAxis: null, inputBuffer: '' }, display: computeNormalDisplay(state.vMem, context),
  };
}

export const probeReducer: FeatureReducer = (state, event, context) => {
  const { stateName, vMem } = state;
  const data = state.stateData.stateDataType === 'probe' ? state.stateData : INITIAL_PROBE_DATA;
  const now = event.eventName === 'AUXILIARY_TICK' ? event.nowMs : Date.now();
  const triggered = context.millState.probe.triggered;
  const released = { ...data, lastProbeTriggered: triggered, probeTriggered: false };

  if (stateName === 'idle') {
    if (event.eventName !== 'MILL_STATE_CHANGED' && event.eventName !== 'AUXILIARY_TICK') return null;
    const normal = computeNormalDisplay(vMem, context);
    const fresh = triggered && !data.lastProbeTriggered && now - data.contactTimeMs >= context.nvMem.probeDelaySeconds * 1000;
    if (context.nvMem.probeDroType === 'freeze') {
      if (!triggered) return { ...state, stateData: released, display: normal };
      if (fresh) return { ...state, stateData: { ...released, contactTimeMs: now, probeTriggered: true }, display: normal };
      // Only an accepted contact freezes; rejected bounce never arms a new freeze.
      return { ...state, stateData: { ...released, probeTriggered: data.probeTriggered }, display: data.probeTriggered ? state.display : normal };
    }
    const next = fresh ? { ...released, contactTimeMs: now, probeTriggered: true } : { ...released, probeTriggered: now - data.contactTimeMs < PROBE_MESSAGE_MS };
    const flash = next.probeTriggered && Math.floor((now - next.contactTimeMs) / 250) % 2 === 0;
    return { ...state, stateData: next, display: flash ? { ...normal, X: 'ProbE' } : normal };
  }
  if (!isProbeActive(stateName)) return null;
  if (event.eventName === 'KEY_CLEAR') return exitToIdle(vMem, context);

  if (stateName === 'probe-menu-function') {
    if (event.eventName === 'KEY_6_RIGHT' || event.eventName === 'KEY_4_LEFT') {
      const probeFunction = PROBE_NEIGHBORS[data.probeFunction][event.eventName === 'KEY_6_RIGHT' ? 1 : 0];
      return { ...state, stateData: { ...data, probeFunction }, display: createDisplay(PROBE_LABEL[probeFunction], '', '') };
    }
    if (event.eventName === 'KEY_ENTER') {
      const next = { ...data, probeDiameterMm: context.nvMem.probeDiameterMm, probeLengthMm: context.nvMem.probeLengthMm };
      if (data.probeFunction === 'config') return { ...state, stateName: 'probe-diameter', stateData: next, vMem: { ...vMem, activeAxis: 'Y', inputBuffer: '' }, display: createDisplay('Prb diA', fromMmToAnyUnit(next.probeDiameterMm, context.nvMem.defaultUnit), '') };
      return { ...state, stateName: 'probe-axis-select', stateData: next, display: createDisplay('SELECt', PROBE_LABEL[data.probeFunction], '') };
    }
    return state;
  }

  if (stateName === 'probe-diameter' || stateName === 'probe-length' || stateName === 'probe-coordinate') {
    const digit = KEY_TO_DIGIT[event.eventName];
    if (digit !== undefined || event.eventName === 'KEY_DECIMAL' || event.eventName === 'KEY_SIGN') {
      const inputBuffer = digit !== undefined ? appendDigit(vMem.inputBuffer, digit) : event.eventName === 'KEY_DECIMAL' ? appendDecimal(vMem.inputBuffer) : vMem.inputBuffer.startsWith('-') ? vMem.inputBuffer.slice(1) : `-${vMem.inputBuffer}`;
      return { ...state, vMem: { ...vMem, inputBuffer }, display: { ...state.display, [stateName === 'probe-coordinate' ? data.probeAxis ?? 'X' : 'Y']: inputBuffer || '0' } };
    }
    if (event.eventName !== 'KEY_ENTER') return state;
    const entered = getBufferValue(vMem.inputBuffer);
    if (entered === null && vMem.inputBuffer !== '') return state;
    const previous = stateName === 'probe-diameter' ? data.probeDiameterMm : stateName === 'probe-length' ? data.probeLengthMm : 0;
    const value = entered === null ? previous : stateName === 'probe-coordinate' || context.nvMem.defaultUnit === 'mm' ? entered : entered * 25.4;
    if (!Number.isFinite(value) || (stateName !== 'probe-coordinate' && value < 0)) return state;
    if (stateName === 'probe-diameter') return { ...state, stateName: 'probe-length', stateData: { ...data, probeDiameterMm: value }, vMem: { ...vMem, activeAxis: 'Y', inputBuffer: '' }, display: createDisplay('Prb LEn', fromMmToAnyUnit(data.probeLengthMm, context.nvMem.defaultUnit), '') };
    if (stateName === 'probe-length') {
      // Probe configuration is its own Fn transaction, committed together here.
      useSettingsStore.getState().updateNvMem({ probeDiameterMm: data.probeDiameterMm, probeLengthMm: value });
      return { ...state, stateName: 'probe-menu-function', stateData: { ...data, probeLengthMm: value }, vMem: { ...vMem, activeAxis: null, inputBuffer: '' }, display: createDisplay('ConFiG', '', '') };
    }
    if (data.probeAxis === null || data.centerMm === null) return state;
    const nextVMem = { ...setDatum(vMem, data.probeAxis, data.centerMm, value, context), activeAxis: null, inputBuffer: '' };
    return { ...state, stateName: 'probe-result', vMem: nextVMem, display: computeNormalDisplay(nextVMem, context) };
  }

  if (stateName === 'probe-axis-select') {
    const axis = event.eventName === 'BTN_SELECT_X' ? 'X' : event.eventName === 'BTN_SELECT_Y' ? 'Y' : event.eventName === 'BTN_SELECT_Z' ? 'Z' : null;
    if (axis === null) return state;
    const next: ProbeData = { ...data, probeAxis: axis };
    if (data.probeFunction === 'edge') return { ...state, stateName: 'probe-edge-select', stateData: next, display: createDisplay('EdGE 1', 'Prob Ed', '') };
    return armProbe(next, state, context);
  }
  if (stateName === 'probe-edge-select') {
    if (event.eventName === 'KEY_6_RIGHT' || event.eventName === 'KEY_4_LEFT') {
      const edge = data.edge === 'positive' ? 'negative' : 'positive';
      return { ...state, stateData: { ...data, edge }, display: createDisplay(edge === 'positive' ? 'EdGE 1' : 'EdGE 2', 'Prob Ed', '') };
    }
    return event.eventName === 'KEY_ENTER' ? armProbe(data, state, context) : state;
  }
  if (stateName === 'probe-waiting') {
    if (event.eventName !== 'MILL_STATE_CHANGED') return state;
    const axis = data.probeAxis;
    if (axis === null || !triggered || data.lastProbeTriggered || now - data.contactTimeMs < context.nvMem.probeDelaySeconds * 1000) return { ...state, stateData: released, display: computeNormalDisplay(vMem, context) };
    const position = context.millState.connected ? computeMachinePositionMm(axis, vMem, context) : computeAxisPositionMm(axis, vMem, context);
    const captures = [...data.captures, position];
    const next = { ...data, captures, contactTimeMs: now, lastProbeTriggered: true, probeTriggered: true };
    if (data.probeFunction !== 'edge' && captures.length < 2) return { ...state, stateData: next, display: computeNormalDisplay(vMem, context) };
    const first = captures[0];
    if (first === undefined) throw new Error('A completed probe capture must contain a contact.');
    const last = position;
    const midpoint = (first + last) / 2;
    if (data.probeFunction === 'edge' || data.probeFunction === 'midpoint') {
      // Edge 1 approaches in +, edge 2 in -. Z uses probe length, XY tip radius.
      const compensation = axis === 'Z' ? data.probeLengthMm : data.probeDiameterMm / 2;
      const point = data.probeFunction === 'edge' ? first + (data.edge === 'positive' ? compensation : -compensation) : midpoint;
      return { ...state, stateName: 'probe-coordinate', stateData: { ...next, centerMm: point }, vMem: { ...vMem, activeAxis: axis, inputBuffer: '' }, display: { ...createDisplay('', '', ''), [axis]: 0 } };
    }
    const width = Math.abs(last - first) + (data.probeFunction === 'inside' ? data.probeDiameterMm : -data.probeDiameterMm);
    const datumOffset = context.millState.connected ? (vMem.mode === 'abs' ? vMem.workOffsets[axis] : vMem.incrementalOffsets[axis]) : 0;
    const result = { ...next, resultMm: width < 0 ? null : width, centerMm: (midpoint - datumOffset) * directionSign(axis, context.nvMem) * measurementScale(axis, context.nvMem), resultView: 'width' as const };
    return { ...state, stateName: 'probe-result', stateData: result, display: measurementDisplay(result, context) };
  }
  if (stateName === 'probe-result') {
    if (data.probeFunction === 'inside' || data.probeFunction === 'outside') {
      if (event.eventName === 'KEY_6_RIGHT' || event.eventName === 'KEY_4_LEFT') {
        const next = { ...data, resultView: data.resultView === 'width' ? 'center' as const : 'width' as const };
        return { ...state, stateData: next, display: measurementDisplay(next, context) };
      }
      if (event.eventName === 'MILL_STATE_CHANGED' && !triggered && data.probeTriggered) return { ...state, stateData: released };
    } else if (event.eventName === 'MILL_STATE_CHANGED') return { ...state, stateData: released, display: computeNormalDisplay(vMem, context) };
    return state;
  }
  return state;
};

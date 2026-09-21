import { useEffect, useRef } from 'react';
import type { Axis, AxisValues, VolatileMemoryState } from '../../../types/volatileMemory';
import type { NonVolatileMemory } from '../../../types/nonVolatileMemory';
import type { AuxiliaryData, SetupData, SixOutputData } from '../droStateMachine';
import type { DROStatePayload, FeatureReducer } from '../types';
import { computeAxisPositionMm, directionSign, measurementScale, computeNormalDisplay, createDisplay, type DisplayState } from '../utils/displayComputation';
import { appendDecimal, appendDigit, getBufferValue, KEY_TO_DIGIT } from './buffer-utils';
import { useDROStore } from '../../droStore';
import { transmitSerial } from '../../auxiliaryTransport';
import { fromMmToAnyUnit } from '../../../utils/unitConversion';
import { applySetupDrafts, PROBE_DRO_TYPE_ID, SETUP_PARAMETERS } from './setup-parameters';

// Simulator visualization/sample timings, not programmable EL400 hardware parameters.
export const OUTPUT_PULSE_VISUALIZATION_MS = 1000;
export const SERIAL_SAMPLE_INTERVAL_MS = 250;
const AXES: readonly Axis[] = ['X', 'Y', 'Z'];
const AUX_LABELS = { probe: 'ProbE', outputs: '6oP', serial: 'SErIAL' } as const;
const AUX_NEIGHBORS: Record<AuxiliaryData['selection'], readonly [AuxiliaryData['selection'], AuxiliaryData['selection']]> = {
  probe: ['serial', 'outputs'],
  outputs: ['probe', 'serial'],
  serial: ['outputs', 'probe'],
};
const slotLabel = (slot: number) => `oP-${String(slot + 1).padStart(2, '0')}`;

export function enterAuxiliaryMenu(setup: SetupData, vMem: VolatileMemoryState): DROStatePayload {
  return { stateName: 'auxiliary-menu', stateData: { stateDataType: 'auxiliary', selection: 'probe', setup }, vMem, display: createDisplay('ProbE', '', '') };
}

export function enterSixOutput(vMem: VolatileMemoryState): DROStatePayload {
  return {
    stateName: 'six-output-menu', vMem: { ...vMem, inputBuffer: '', activeAxis: null },
    stateData: { stateDataType: 'six-output', mode: 'run', phase: 'select', slot: 0, axis: 'X', previous: null, highUntil: [0, 0, 0, 0, 0, 0], outputs: ['low', 'low', 'low', 'low', 'low', 'low'] },
    display: createDisplay('rUn', '', ''),
  };
}

/** Equality is low in comparator mode; reaching a threshold counts once, departing it does not. */
export function crossedOutput(previous: number, current: number, target: number): boolean {
  return (previous < target && current >= target) || (previous > target && current <= target);
}

export function evaluateOutputs(
  data: SixOutputData, vMem: VolatileMemoryState, current: AxisValues,
  mode: NonVolatileMemory['outputMode'], nowMs: number,
): Pick<SixOutputData, 'previous' | 'outputs' | 'highUntil'> {
  const highUntil = data.highUntil.slice();
  const outputs = vMem.outputProgram.map((entry, index): 'low' | 'high' => {
    if (index >= vMem.outputCount) return 'low';
    const position = current[entry.axis];
    if (!Number.isFinite(position)) return 'low';
    if (mode === 'continuous') return position > entry.positionMm ? 'high' : 'low';
    if (data.previous && crossedOutput(data.previous[entry.axis], position, entry.positionMm)) highUntil[index] = nowMs + OUTPUT_PULSE_VISUALIZATION_MS;
    return nowMs < (highUntil[index] ?? 0) ? 'high' : 'low';
  });
  return { previous: current, outputs, highUntil };
}

/** Manual §10.3: four integer digits, three fractions, then A/I R/D M/N axis. */
export function formatSerialPayload(display: DisplayState, mode: VolatileMemoryState['mode'], nvMem: NonVolatileMemory): string {
  return AXES.map((axis) => {
    const value = display[axis];
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Cannot transmit non-numeric ${axis} reading.`);
    const rounded = Math.round(Math.abs(value) * 1000) / 1000;
    if (rounded > 9999.999) throw new Error(`Serial ${axis} reading is out of range.`);
    const magnitude = rounded.toFixed(3).padStart(8, '0');
    const sign = value < 0 && rounded !== 0 ? '-' : '';
    return `${sign}${magnitude} ${mode === 'abs' ? 'A' : 'I'}${nvMem.measurementMode[axis] === 'radius' ? 'R' : 'D'}${nvMem.defaultUnit === 'mm' ? 'M' : 'N'}${axis}`;
  }).join(' ');
}

function programDisplay(data: SixOutputData, vMem: VolatileMemoryState, nvMem: NonVolatileMemory): DisplayState {
  if (data.phase === 'count') return createDisplay(slotLabel(vMem.outputCount - 1), '', '');
  const entry = vMem.outputProgram[data.slot];
  return createDisplay(slotLabel(data.slot), entry ? fromMmToAnyUnit(entry.positionMm, nvMem.defaultUnit) : 0, entry?.axis ?? 'X');
}

export const auxiliaryReducer: FeatureReducer = (state, event, context) => {
  const { stateName, stateData: data, vMem } = state;
  const { eventName } = event;
  if (data.stateDataType === 'auxiliary' && stateName === 'auxiliary-menu') {
    if (eventName === 'KEY_CLEAR') return { ...state, stateName: 'setup-parameter', stateData: data.setup, display: createDisplay('AUX Fn', '', '') };
    if (eventName === 'KEY_4_LEFT' || eventName === 'KEY_6_RIGHT') {
      const selection = AUX_NEIGHBORS[data.selection][eventName === 'KEY_6_RIGHT' ? 1 : 0];
      return { ...state, stateData: { ...data, selection }, display: createDisplay(AUX_LABELS[selection], '', '') };
    }
    if (eventName === 'KEY_ENTER') {
      if (data.selection === 'outputs') return enterSixOutput(vMem);
      if (data.selection === 'probe') {
        const settings = applySetupDrafts(context.nvMem, data.setup.draftValues);
        const axis = data.setup.selectedAxis ?? 'X';
        return { ...state, stateName: 'setup-parameter', stateData: { ...data.setup, currentParamIndex: SETUP_PARAMETERS.findIndex(param => param.id === PROBE_DRO_TYPE_ID) }, display: { ...createDisplay('', '', ''), [axis]: settings.probeDroType === 'freeze' ? 'dro F' : 'dro t' } };
      }
      return { ...state, stateName: 'serial-active', stateData: { stateDataType: 'serial', sequence: 0, payload: '' }, display: computeNormalDisplay(vMem, context) };
    }
    return state;
  }
  if (data.stateDataType === 'serial' && (stateName === 'serial-active' || stateName === 'serial-failed')) {
    if (eventName === 'KEY_CLEAR') return { ...state, stateName: 'idle', stateData: { stateDataType: 'none' }, display: computeNormalDisplay(vMem, context) };
    if (eventName === 'SERIAL_FAILURE') return { ...state, stateName: 'serial-failed', display: createDisplay('Pc fail', '', '') };
    if (stateName === 'serial-failed') return state;
    const display = computeNormalDisplay(vMem, context);
    if (eventName === 'KEY_ENTER' || (eventName === 'AUXILIARY_TICK' && context.nvMem.serialMode === 'continuous')) {
      try {
        return { ...state, display, stateData: { ...data, sequence: data.sequence + 1, payload: formatSerialPayload(display, vMem.mode, context.nvMem) } };
      } catch {
        return { ...state, stateName: 'serial-failed', display: createDisplay('Pc fail', '', '') };
      }
    }
    return eventName === 'MILL_STATE_CHANGED' ? { ...state, display } : state;
  }
  if (data.stateDataType !== 'six-output') return null;
  if (eventName === 'KEY_CLEAR') return { ...state, stateName: 'idle', stateData: { stateDataType: 'none' }, vMem: { ...vMem, inputBuffer: '', activeAxis: null }, display: computeNormalDisplay(vMem, context) };
  if (stateName === 'six-output-menu') {
    if (eventName === 'KEY_4_LEFT' || eventName === 'KEY_6_RIGHT') {
      const mode = data.mode === 'program' ? 'run' : 'program';
      return { ...state, stateData: { ...data, mode }, display: createDisplay(mode === 'program' ? 'ProGrAn' : 'rUn', '', '') };
    }
    if (eventName === 'KEY_ENTER') {
      if (data.mode === 'run') {
        const current = {
          X: computeAxisPositionMm('X', vMem, context) * directionSign('X', context.nvMem) * measurementScale('X', context.nvMem),
          Y: computeAxisPositionMm('Y', vMem, context) * directionSign('Y', context.nvMem) * measurementScale('Y', context.nvMem),
          Z: computeAxisPositionMm('Z', vMem, context) * directionSign('Z', context.nvMem) * measurementScale('Z', context.nvMem),
        };
        return { ...state, stateName: 'six-output-run', stateData: { ...data, ...evaluateOutputs(data, vMem, current, context.nvMem.outputMode, Date.now()) }, display: computeNormalDisplay(vMem, context) };
      }
      return { ...state, stateName: 'six-output-program', stateData: { ...data, phase: 'count' }, display: createDisplay(slotLabel(vMem.outputCount - 1), '', '') };
    }
    return state;
  }
  if (stateName === 'six-output-run') {
    if (eventName !== 'MILL_STATE_CHANGED' && eventName !== 'AUXILIARY_TICK') return state;
    const current = {
      X: computeAxisPositionMm('X', vMem, context) * directionSign('X', context.nvMem) * measurementScale('X', context.nvMem),
      Y: computeAxisPositionMm('Y', vMem, context) * directionSign('Y', context.nvMem) * measurementScale('Y', context.nvMem),
      Z: computeAxisPositionMm('Z', vMem, context) * directionSign('Z', context.nvMem) * measurementScale('Z', context.nvMem),
    };
    return { ...state, stateData: { ...data, ...evaluateOutputs(data, vMem, current, context.nvMem.outputMode, eventName === 'AUXILIARY_TICK' ? event.nowMs : Date.now()) }, display: computeNormalDisplay(vMem, context) };
  }
  if (stateName !== 'six-output-program') return state;
  if (data.phase === 'count') {
    if (eventName === 'KEY_4_LEFT' || eventName === 'KEY_6_RIGHT') {
      const outputCount = ((vMem.outputCount - 1 + (eventName === 'KEY_6_RIGHT' ? 1 : 5)) % 6) + 1;
      return { ...state, vMem: { ...vMem, outputCount }, display: createDisplay(slotLabel(outputCount - 1), '', '') };
    }
    if (eventName === 'KEY_ENTER') {
      const next = { ...data, phase: 'select' as const };
      return { ...state, stateData: next, display: programDisplay(next, vMem, context.nvMem) };
    }
    return state;
  }
  const axis = eventName === 'BTN_SELECT_X' ? 'X' : eventName === 'BTN_SELECT_Y' ? 'Y' : eventName === 'BTN_SELECT_Z' ? 'Z' : null;
  if (axis) return { ...state, stateData: { ...data, phase: 'entry', axis }, vMem: { ...vMem, activeAxis: axis, inputBuffer: '' }, display: { ...createDisplay('', '', ''), [axis]: fromMmToAnyUnit(vMem.outputProgram[data.slot]?.positionMm ?? 0, context.nvMem.defaultUnit) } };
  if (data.phase === 'select' && (eventName === 'KEY_4_LEFT' || eventName === 'KEY_6_RIGHT')) {
    const next = { ...data, slot: (data.slot + (eventName === 'KEY_6_RIGHT' ? 1 : vMem.outputCount - 1)) % vMem.outputCount };
    return { ...state, stateData: next, display: programDisplay(next, vMem, context.nvMem) };
  }
  if (data.phase !== 'entry') return state;
  const digit = KEY_TO_DIGIT[eventName];
  if (digit !== undefined || eventName === 'KEY_DECIMAL' || eventName === 'KEY_SIGN') {
    const inputBuffer = digit !== undefined ? appendDigit(vMem.inputBuffer, digit) : eventName === 'KEY_DECIMAL' ? appendDecimal(vMem.inputBuffer) : vMem.inputBuffer.startsWith('-') ? vMem.inputBuffer.slice(1) : `-${vMem.inputBuffer}`;
    return { ...state, vMem: { ...vMem, inputBuffer }, display: { ...state.display, [data.axis]: inputBuffer || '0' } };
  }
  if (eventName === 'KEY_ENTER') {
    const value = getBufferValue(vMem.inputBuffer);
    if (value === null || !Number.isFinite(value)) return state;
    const outputProgram = vMem.outputProgram.slice();
    outputProgram[data.slot] = { axis: data.axis, positionMm: context.nvMem.defaultUnit === 'mm' ? value : value * 25.4 };
    const nextVMem = { ...vMem, outputProgram, activeAxis: null, inputBuffer: '' };
    const next = { ...data, phase: 'select' as const };
    return { ...state, vMem: nextVMem, stateData: next, display: programDisplay(next, nextVMem, context.nvMem) };
  }
  return state;
};

/** Mount once with the main display, including on non-debug/physical serial pages. */
export function useAuxiliaryRuntime(): void {
  const stateName = useDROStore((state) => state.stateName);
  const data = useDROStore((state) => state.stateData);
  const dispatch = useDROStore((state) => state.dispatch);
  const serialSession = useRef(0);
  useEffect(() => {
    serialSession.current++;
  }, [stateName]);
  const sequence = data.stateDataType === 'serial' ? data.sequence : 0;
  const payload = data.stateDataType === 'serial' ? data.payload : '';
  const probeMessageActive = stateName === 'idle' && data.stateDataType === 'probe' && data.probeTriggered;
  useEffect(() => {
    if (stateName !== 'six-output-run' && stateName !== 'serial-active' && !probeMessageActive) return;
    const timer = setInterval(() => { dispatch({ eventName: 'AUXILIARY_TICK', nowMs: Date.now() }); }, SERIAL_SAMPLE_INTERVAL_MS);
    return () => { clearInterval(timer); };
  }, [stateName, probeMessageActive, dispatch]);
  useEffect(() => {
    if (stateName !== 'serial-active' || sequence === 0) return;
    const session = serialSession.current;
    void transmitSerial(payload).catch(() => {
      if (serialSession.current === session) dispatch({ eventName: 'SERIAL_FAILURE' });
    });
  }, [stateName, sequence, payload, dispatch]);
}

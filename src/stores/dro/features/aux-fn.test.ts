import { describe, expect, it } from 'vitest';
import { auxiliaryReducer, crossedOutput, enterSixOutput, evaluateOutputs, formatSerialPayload } from './aux-fn';
import { INITIAL_VOLATILE_MEMORY_STATE } from '../../../types/volatileMemory';
import { DEFAULT_NON_VOLATILE_MEMORY } from '../../../types/nonVolatileMemory';
import { createTestState, DEFAULT_TEST_CONTEXT } from '../test-utils';
import type { SixOutputData } from '../droStateMachine';

const memory = { ...INITIAL_VOLATILE_MEMORY_STATE, outputCount: 2, outputProgram: [{ axis: 'X' as const, positionMm: 10 }, { axis: 'Y' as const, positionMm: -2 }, ...INITIAL_VOLATILE_MEMORY_STATE.outputProgram.slice(2)] };
const initial = enterSixOutput(memory).stateData as SixOutputData;
const settings = { ...DEFAULT_NON_VOLATILE_MEMORY, defaultUnit: 'mm' as const };

describe('six-output threshold semantics', () => {
  it('continuous is a comparator, not a latch; equality is low and axis mappings are independent', () => {
    const first = evaluateOutputs(initial, memory, { X: 11, Y: -3, Z: 200 }, 'continuous', 0);
    expect(first.outputs).toEqual(['high', 'low', 'low', 'low', 'low', 'low']);
    const second = evaluateOutputs({ ...initial, ...first }, memory, { X: 9, Y: -1, Z: 200 }, 'continuous', 10);
    expect(second.outputs.slice(0, 2)).toEqual(['low', 'high']);
    expect(evaluateOutputs(initial, memory, { X: 10, Y: -2, Z: 200 }, 'continuous', 20).outputs.slice(0, 2)).toEqual(['low', 'low']);
  });

  it('pulses for skipped and exact crossings in both directions, but not initial position, held equality or departure', () => {
    expect(crossedOutput(9, 11, 10)).toBe(true);
    expect(crossedOutput(11, 9, 10)).toBe(true);
    expect(crossedOutput(9, 10, 10)).toBe(true);
    expect(crossedOutput(11, 10, 10)).toBe(true);
    expect(crossedOutput(10, 10, 10)).toBe(false);
    expect(crossedOutput(10, 11, 10)).toBe(false);
    const first = evaluateOutputs(initial, memory, { X: 11, Y: 0, Z: 0 }, 'pulse', 0);
    expect(first.outputs[0]).toBe('low');
    const crossing = evaluateOutputs({ ...initial, ...first }, memory, { X: 9, Y: 0, Z: 0 }, 'pulse', 100);
    expect(crossing.outputs[0]).toBe('high');
    const held = { ...initial, ...crossing };
    expect(evaluateOutputs(held, memory, { X: 9, Y: 0, Z: 0 }, 'pulse', 1099).outputs[0]).toBe('high');
    expect(evaluateOutputs(held, memory, { X: 9, Y: 0, Z: 0 }, 'pulse', 1100).outputs[0]).toBe('low');
    expect(evaluateOutputs(held, memory, { X: 11, Y: 0, Z: 0 }, 'pulse', 1200).outputs[0]).toBe('high');
  });

  it('stops all outputs on C while preserving the operator program', () => {
    const state = { ...enterSixOutput(memory), stateName: 'six-output-run' as const, stateData: { ...initial, outputs: ['high' as const, 'low' as const] } };
    const stopped = auxiliaryReducer(state, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT)!;
    expect(stopped.stateName).toBe('idle');
    expect(stopped.vMem.outputProgram).toEqual(memory.outputProgram);
  });

  it('programs and compares angular thresholds in degrees under inch and diameter settings', () => {
    const context = {
      ...DEFAULT_TEST_CONTEXT,
      nvMem: {
        ...DEFAULT_TEST_CONTEXT.nvMem,
        defaultUnit: 'inch' as const,
        countingMode: { ...DEFAULT_TEST_CONTEXT.nvMem.countingMode, X: 'angular' as const },
        measurementMode: { ...DEFAULT_TEST_CONTEXT.nvMem.measurementMode, X: 'diameter' as const },
        outputMode: 'pulse' as const,
      },
    };
    let state = enterSixOutput({ ...INITIAL_VOLATILE_MEMORY_STATE, outputCount: 1 });
    for (const eventName of ['KEY_6_RIGHT', 'KEY_ENTER', 'KEY_ENTER', 'BTN_SELECT_X', 'KEY_9', 'KEY_0', 'KEY_ENTER'] as const) {
      state = auxiliaryReducer(state, { eventName }, context)!;
    }
    expect(state.display.Y).toBe(90);

    state = enterSixOutput(state.vMem);
    state = auxiliaryReducer(state, { eventName: 'KEY_ENTER' }, context)!;
    state = {
      ...state,
      vMem: {
        ...state.vMem,
        manualAbsoluteValues: { ...state.vMem.manualAbsoluteValues, X: 45 },
      },
    };
    state = auxiliaryReducer(state, { eventName: 'MILL_STATE_CHANGED' }, context)!;
    expect((state.stateData as SixOutputData).outputs[0]).toBe('low');

    state = {
      ...state,
      vMem: {
        ...state.vMem,
        manualAbsoluteValues: { ...state.vMem.manualAbsoluteValues, X: 90 },
      },
    };
    state = auxiliaryReducer(state, { eventName: 'MILL_STATE_CHANGED' }, context)!;
    expect((state.stateData as SixOutputData).outputs[0]).toBe('high');
  });
});

describe('EL400 serial record', () => {
  it('matches the literal manual sample', () => {
    expect(formatSerialPayload({ X: 10.005, Y: 86.98, Z: 0 }, 'abs', settings)).toBe('0010.005 ARMX 0086.980 ARMY 0000.000 ARMZ');
  });

  it('preserves signs and each status letter without negative zero', () => {
    const config = { ...settings, defaultUnit: 'inch' as const, measurementMode: { X: 'diameter' as const, Y: 'radius' as const, Z: 'diameter' as const } };
    expect(formatSerialPayload({ X: -1.25, Y: -0.0001, Z: 1.9996 }, 'inc', config)).toBe('-0001.250 IDNX 0000.000 IRNY 0002.000 IDNZ');
  });

  it('rejects non-numeric warnings and overflow instead of sending plausible data', () => {
    expect(() => formatSerialPayload({ X: 'no SIG', Y: 0, Z: 0 }, 'abs', settings)).toThrow();
    expect(() => formatSerialPayload({ X: Infinity, Y: 0, Z: 0 }, 'abs', settings)).toThrow();
    expect(() => formatSerialPayload({ X: 9999.9996, Y: 0, Z: 0 }, 'abs', settings)).toThrow();
    expect(formatSerialPayload({ X: 9999.9994, Y: 0, Z: 0 }, 'abs', settings)).toContain('9999.999 ARMX');
  });

  it('fails explicitly without emitting a packet for an angular readout', () => {
    const vMem = {
      ...INITIAL_VOLATILE_MEMORY_STATE,
      manualAbsoluteValues: { X: 90, Y: 0, Z: 0 },
    };
    const context = {
      ...DEFAULT_TEST_CONTEXT,
      nvMem: {
        ...DEFAULT_TEST_CONTEXT.nvMem,
        defaultUnit: 'inch' as const,
        countingMode: { ...DEFAULT_TEST_CONTEXT.nvMem.countingMode, X: 'angular' as const },
        angularResolution: { ...DEFAULT_TEST_CONTEXT.nvMem.angularResolution, X: 'dd-dec' as const },
        measurementMode: { ...DEFAULT_TEST_CONTEXT.nvMem.measurementMode, X: 'diameter' as const },
      },
    };
    const serial = {
      ...createTestState('serial-active', { stateDataType: 'serial', sequence: 0, payload: '' }),
      vMem,
    };
    const serialReading = auxiliaryReducer(serial, { eventName: 'MILL_STATE_CHANGED' }, context)!;
    expect(serialReading.display.X).toBe('90.000');
    const failed = auxiliaryReducer(serialReading, { eventName: 'KEY_ENTER' }, context)!;
    expect(failed.stateName).toBe('serial-failed');
    expect(failed.display.X).toBe('Pc fail');
    expect(failed.stateData).toMatchObject({ sequence: 0, payload: '' });
  });
});

import { describe, it, expect } from 'vitest';
import { halfReducer } from './half';
import { createTestState, DEFAULT_TEST_CONTEXT } from '../test-utils';
import { computeNormalDisplay } from '../utils/displayComputation';

const context = { ...DEFAULT_TEST_CONTEXT, nvMem: { ...DEFAULT_TEST_CONTEXT.nvMem, defaultUnit: 'mm' as const } };

describe('HALF manual selection', () => {
  it('waits for the next axis key, ignoring a previously selected axis', () => {
    const initial = createTestState('idle');
    initial.vMem = { ...initial.vMem, activeAxis: 'X', manualAbsoluteValues: { X: 40, Y: -25, Z: 8 } };
    const selecting = halfReducer(initial, { eventName: 'BTN_HALF' }, context)!;
    expect(selecting.display.X).toBe('SELECt');
    expect(selecting.vMem.manualAbsoluteValues).toEqual({ X: 40, Y: -25, Z: 8 });
    const result = halfReducer(selecting, { eventName: 'BTN_SELECT_Y' }, context)!;
    expect(result.display).toEqual({ X: 40, Y: -12.5, Z: 8 });
  });

  it('cancels without changing either datum', () => {
    const initial = createTestState('idle');
    initial.vMem = { ...initial.vMem, manualAbsoluteValues: { X: 12, Y: 4, Z: 6 } };
    const selecting = halfReducer(initial, { eventName: 'BTN_HALF' }, context)!;
    const result = halfReducer(selecting, { eventName: 'KEY_CLEAR' }, context)!;
    expect(result.display).toEqual({ X: 12, Y: 4, Z: 6 });
  });

  it('halves a reversed live INC coordinate and keeps tracking movement without altering ABS', () => {
    const initial = createTestState('idle');
    initial.vMem = { ...initial.vMem, mode: 'inc', workOffsets: { X: 7, Y: 0, Z: 0 }, incrementalOffsets: { X: 10, Y: 0, Z: 0 } };
    const live = { ...context, millState: { ...context.millState, connected: true, position: { x: 30, y: 0, z: 0 } }, nvMem: { ...context.nvMem, axisDirection: { ...context.nvMem.axisDirection, X: 'reversed' as const } } };
    const selecting = halfReducer(initial, { eventName: 'BTN_HALF' }, live)!;
    const result = halfReducer(selecting, { eventName: 'BTN_SELECT_X' }, live)!;
    expect(result.display.X).toBe(-10);
    const moved = { ...live, millState: { ...live.millState, position: { x: 32, y: 0, z: 0 } } };
    expect(computeNormalDisplay(result.vMem, moved).X).toBe(-12);
    expect(computeNormalDisplay({ ...result.vMem, mode: 'abs' }, moved).X).toBe(-25);
  });
});

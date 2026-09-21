import { describe, it, expect } from 'vitest';
import { referenceReducer, recordReferenceMark } from './reference';
import { createTestState, DEFAULT_TEST_CONTEXT } from '../test-utils';
import { INITIAL_REFERENCE_DATA, type DROEventPayload } from '../droStateMachine';
import type { DROReducerContext, DROStatePayload } from '../types';
import { computeDisplayPosition } from '../utils/displayComputation';

const context = { ...DEFAULT_TEST_CONTEXT, nvMem: { ...DEFAULT_TEST_CONTEXT.nvMem, defaultUnit: 'mm' as const }, millState: { ...DEFAULT_TEST_CONTEXT.millState, connected: true, position: { x: 13, y: 0, z: 0 } } };

function pprContext(x: number, installedEncoder = true): DROReducerContext {
  const millState = {
    ...context.millState,
    controllerType: installedEncoder ? 'debug' as const : 'cncjs' as const,
    position: { x, y: 0, z: 0 },
  };
  return {
    millState: installedEncoder
      ? { ...millState, encoderResolutionMicrons: { X: 5, Y: 5, Z: 5 } }
      : millState,
    nvMem: {
      ...context.nvMem,
      scaleResolution: { ...context.nvMem.scaleResolution, X: '5' },
      countingMode: { ...context.nvMem.countingMode, X: 'angular' },
      angularResolution: { ...context.nvMem.angularResolution, X: 'dd-dec' },
      calibration: {
        ...context.nvMem.calibration,
        X: { kind: 'ppr', pulsesPerRevolution: 3600 },
      },
    },
  };
}

describe('reference datum', () => {
  it('records the index rather than the overshooting endpoint, even outside reference UI', () => {
    const event: DROEventPayload = { eventName: 'ENCODER_REF_MARK_CROSSED', axis: 'X', markPositionMm: 10 };
    const state = recordReferenceMark(createTestState('idle'), event, context);
    expect(state.vMem.referenceMarks.X).toBe(10);
    expect(state.vMem.workOffsets.X).toBe(0);
    const waiting = { ...state, stateName: 'reference-home-waiting' as const, stateData: { ...INITIAL_REFERENCE_DATA, selectedAxis: 'X' as const } };
    expect(referenceReducer(waiting, event, context)?.display.X).toBe(3);
  });

  it('sets and recalls an arbitrary machine datum without a placeholder reference value', () => {
    let state: DROStatePayload = createTestState('reference-set-machine-select', INITIAL_REFERENCE_DATA);
    state.vMem = { ...state.vMem, referenceMarks: { X: 10 } };
    const atDatum = { ...context, millState: { ...context.millState, position: { x: 37.25, y: 0, z: 0 } } };
    state = referenceReducer(state, { eventName: 'BTN_SELECT_X' }, atDatum)!;
    expect(state.display.X).toBe(0);
    state = { ...state, stateName: 'reference-machine-waiting', stateData: { ...INITIAL_REFERENCE_DATA, referenceMode: 'MACHINE_RECALL', selectedAxis: 'X' } };
    const mark: DROEventPayload = { eventName: 'ENCODER_REF_MARK_CROSSED', axis: 'X', markPositionMm: 10 };
    state = referenceReducer(recordReferenceMark(state, mark, context), mark, context)!;
    expect(state.display.X).toBe(-24.25);
    expect(state.vMem.workOffsets.X).toBe(37.25);
  });

  it('decodes PPR reference marks for Home and machine recall while retaining raw linear data', () => {
    const mark: DROEventPayload = {
      eventName: 'ENCODER_REF_MARK_CROSSED',
      axis: 'X',
      markPositionMm: 10,
    };

    let home = createTestState(
      'reference-home-waiting',
      { ...INITIAL_REFERENCE_DATA, selectedAxis: 'X' }
    );
    const atHomeMark = pprContext(10);
    home = recordReferenceMark(home, mark, atHomeMark);
    home = referenceReducer(home, mark, atHomeMark)!;
    expect(computeDisplayPosition('X', home.vMem, pprContext(11))).toBe('20.000');
    expect(home.vMem.referenceMarks.X).toBe(10);

    let setMachine = createTestState('reference-set-machine-select', INITIAL_REFERENCE_DATA);
    setMachine = {
      ...setMachine,
      vMem: {
        ...setMachine.vMem,
        referenceMarks: { ...setMachine.vMem.referenceMarks, X: 10 },
      },
    };
    setMachine = referenceReducer(
      setMachine,
      { eventName: 'BTN_SELECT_X' },
      pprContext(12)
    )!;
    expect(computeDisplayPosition('X', setMachine.vMem, pprContext(12))).toBe('0.000');
    expect(setMachine.vMem.referenceMarks.X).toBe(10);
    expect(setMachine.vMem.machineReferenceOffsets.X).toBe(2);

    const waiting: DROStatePayload = {
      ...setMachine,
      stateName: 'reference-machine-waiting',
      stateData: {
        ...INITIAL_REFERENCE_DATA,
        referenceMode: 'MACHINE_RECALL',
        selectedAxis: 'X',
      },
    };
    const atRecallMark = pprContext(10);
    const recalled = referenceReducer(
      recordReferenceMark(waiting, mark, atRecallMark),
      mark,
      atRecallMark
    )!;
    expect(computeDisplayPosition('X', recalled.vMem, pprContext(12))).toBe('0.000');
    expect(computeDisplayPosition('X', recalled.vMem, pprContext(5))).toBe('220.000');
    expect(recalled.vMem.referenceMarks.X).toBe(10);
    expect(recalled.vMem.machineReferenceOffsets.X).toBe(2);
  });

  it('bypasses PPR decoding for controller engineering coordinates during Home', () => {
    const mark: DROEventPayload = {
      eventName: 'ENCODER_REF_MARK_CROSSED',
      axis: 'X',
      markPositionMm: 10,
    };
    const engineeringContext = pprContext(13, false);
    let state = createTestState(
      'reference-home-waiting',
      { ...INITIAL_REFERENCE_DATA, selectedAxis: 'X' }
    );
    state = recordReferenceMark(state, mark, engineeringContext);
    state = referenceReducer(state, mark, engineeringContext)!;

    expect(state.display.X).toBe('3.000');
    expect(state.vMem.referenceMarks.X).toBe(10);
  });

  it('requires Home before setting and stored data before recalling', () => {
    const setting = createTestState('reference-set-machine-select', INITIAL_REFERENCE_DATA);
    expect(referenceReducer(setting, { eventName: 'BTN_SELECT_X' }, context)?.display.X).toBe('no rEF');
    const recall = createTestState('reference-machine-select', INITIAL_REFERENCE_DATA);
    expect(referenceReducer(recall, { eventName: 'BTN_SELECT_X' }, context)?.display.X).toBe('no dAtA');
  });

  it('ignores a different-axis pulse and cancels without changing the datum', () => {
    const waiting = createTestState('reference-home-waiting', { ...INITIAL_REFERENCE_DATA, selectedAxis: 'X' });
    const unchanged = referenceReducer(waiting, { eventName: 'ENCODER_REF_MARK_CROSSED', axis: 'Y', markPositionMm: 10 }, context)!;
    expect(unchanged.stateName).toBe('reference-home-waiting');
    const cancelled = referenceReducer(unchanged, { eventName: 'KEY_CLEAR' }, context)!;
    expect(cancelled.display.X).toBe(13);
  });
});

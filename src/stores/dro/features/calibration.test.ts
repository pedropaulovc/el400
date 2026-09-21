import { beforeEach, describe, expect, it } from 'vitest';
import { setupReducer } from './setup';
import { createTestState, DEFAULT_TEST_CONTEXT } from '../test-utils';
import { INITIAL_SETUP_DATA, type DROEventPayload } from '../droStateMachine';
import { SETUP_PARAMETERS, CALIBRATION_ID } from './setup-parameters';
import { useSettingsStore } from '../../settingsStore';
import { DEFAULT_NON_VOLATILE_MEMORY } from '../../../types/nonVolatileMemory';
import { applyAxisCalibration } from '../utils/calibration';
import { KEY_TO_DIGIT } from './buffer-utils';

beforeEach(() => useSettingsStore.setState({ nvMem: DEFAULT_NON_VOLATILE_MEMORY }));

function operator() {
  let context = { ...DEFAULT_TEST_CONTEXT, nvMem: useSettingsStore.getState().nvMem };
  let state = { ...createTestState('setup-parameter'), stateData: { ...INITIAL_SETUP_DATA, selectedAxis: 'X' as const, currentParamIndex: SETUP_PARAMETERS.findIndex(row => row.id === CALIBRATION_ID) } };
  return {
    press(eventName: DROEventPayload['eventName']) {
      context = { ...context, nvMem: useSettingsStore.getState().nvMem };
      state = (setupReducer(state, { eventName } as DROEventPayload, context) ?? state) as typeof state;
      return state;
    },
    type(text: string) {
      for (const char of text) this.press(char === '.' ? 'KEY_DECIMAL' : char === '-' ? 'KEY_SIGN' : Object.entries(KEY_TO_DIGIT).find(([, digit]) => digit === char)![0] as DROEventPayload['eventName']);
    },
    move(x: number) {
      context = { ...context, millState: { ...context.millState, position: { ...context.millState.position, x } } };
      this.press('MILL_STATE_CHANGED');
    },
    reference(position: number) { state = { ...state, vMem: { ...state.vMem, referenceMarks: { X: position } } }; },
    state: () => state,
  };
}

describe('CALib workflow', () => {
  it('rejects zero-length LEC and persists measured/reference compensation only at SAU CHG', () => {
    const op = operator();
    op.press('KEY_ENTER'); op.press('KEY_ENTER'); op.press('KEY_ENTER');
    expect(op.press('KEY_ENTER').display.X).toBe('Error');
    op.move(100.125);
    op.press('KEY_ENTER'); op.type('100'); op.press('KEY_ENTER');
    expect(useSettingsStore.getState().nvMem.calibration.X.kind).toBe('none');
    op.press('KEY_ENTER');
    op.press('KEY_ENTER');
    expect(op.state().display.X).toBe('SAU ChG');
    op.press('KEY_ENTER');
    expect(applyAxisCalibration('X', 200.25, op.state().vMem, useSettingsStore.getState().nvMem)).toBeCloseTo(200, 10);
  });

  it('requires a real reference for SLEC and accepts exactly 99 cumulative segments', () => {
    const op = operator();
    op.press('KEY_ENTER'); op.press('KEY_6_RIGHT'); op.press('KEY_ENTER'); op.press('KEY_ENTER');
    expect(op.press('KEY_ENTER').display.X).toBe('Error');
    op.reference(10); op.move(10); op.press('KEY_ENTER');
    for (let segment = 1; segment <= 99; segment++) {
      op.move(10 + segment * 10);
      op.press('KEY_6_RIGHT'); op.type((segment * 10.01).toFixed(2)); op.press('KEY_ENTER');
    }
    expect(op.state().display.X).toBe('SAU ChG');
    expect(useSettingsStore.getState().nvMem.calibration.X.kind).toBe('none');
    op.press('KEY_ENTER');
    const calibration = useSettingsStore.getState().nvMem.calibration.X;
    expect(calibration.kind).toBe('slec');
    if (calibration.kind !== 'slec') throw new Error('expected saved SLEC');
    expect(calibration.points).toHaveLength(99);
    expect(applyAxisCalibration('X', 15, op.state().vMem, useSettingsStore.getState().nvMem)).toBeCloseTo(15.005, 10);
  });

  it('converts 1296000 arcseconds to a full revolution rather than treating it as degrees', () => {
    useSettingsStore.getState().updateNvMem({ countingMode: { X: 'angular', Y: 'linear', Z: 'linear' } });
    const op = operator();
    op.press('KEY_ENTER'); op.press('KEY_ENTER');
    op.move(359.5); op.press('KEY_ENTER'); op.type('1296000'); op.press('KEY_ENTER');
    op.press('KEY_ENTER'); op.press('KEY_ENTER'); op.press('KEY_ENTER');
    expect(applyAxisCalibration('X', 179.75, op.state().vMem, useSettingsStore.getState().nvMem)).toBeCloseTo(180, 10);
  });

  it('rejects zero PPR and stages a valid PPR without touching saved calibration', () => {
    useSettingsStore.getState().updateNvMem({ countingMode: { X: 'angular', Y: 'linear', Z: 'linear' } });
    const op = operator();
    for (const event of ['KEY_ENTER', 'KEY_6_RIGHT', 'KEY_6_RIGHT', 'KEY_ENTER'] as const) op.press(event);
    op.type('0'); expect(op.press('KEY_ENTER').display.X).toBe('Error');
    op.press('KEY_CLEAR');
    // C returns to the same PPR menu row; ENT starts a fresh entry.
    op.press('KEY_ENTER'); op.type('72000'); op.press('KEY_ENTER');
    expect(useSettingsStore.getState().nvMem.calibration.X.kind).toBe('none');
    op.press('KEY_ENTER');
    expect(useSettingsStore.getState().nvMem.calibration.X).toEqual({ kind: 'ppr', pulsesPerRevolution: 72000 });
  });
});

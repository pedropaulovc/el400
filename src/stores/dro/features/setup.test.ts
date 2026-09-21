/**
 * Unit tests for the setup menu feature reducer (US-039).
 *
 * Covers the navigation shell: enter, axis select, item up/down with wrap,
 * choice left/right with wrap, per-axis vs global scoping, re-enter via setup
 * key, and End/Clear exit with draft discard.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { setupReducer, SETUP_SELECT_TEXT } from './setup';
import { createTestState, DEFAULT_TEST_CONTEXT } from '../test-utils';
import { INITIAL_SETUP_DATA, type SetupData } from '../droStateMachine';
import type { DROStatePayload } from '../types';
import {
  SETUP_PARAMETERS,
  SETUP_PARAMETER_COUNT,
  SETUP_END_ID,
  DIRECTION_ID,
  SLEEP_TIMEOUT_ID,
  ZERO_APPROACH_DIST_ID,
  ZERO_APPROACH_TOLR_ID,
  SAVE_CHANGES_ID,
} from './setup-parameters';
import { useSettingsStore } from '../../settingsStore';
import { DEFAULT_NON_VOLATILE_MEMORY } from '../../../types/nonVolatileMemory';

const ctx = DEFAULT_TEST_CONTEXT;

beforeEach(() => {
  useSettingsStore.setState({ nvMem: DEFAULT_NON_VOLATILE_MEMORY });
});

/** Build a setup-parameter state with the given setup data. */
function paramState(data: Partial<SetupData>): DROStatePayload {
  const merged: SetupData = { ...INITIAL_SETUP_DATA, selectedAxis: 'X', ...data };
  return {
    ...createTestState('setup-parameter'),
    stateData: merged,
  };
}

/** Convenience: read X display as text. */
function xText(payload: DROStatePayload | null): string {
  if (payload === null) throw new Error('reducer returned null');
  return String(payload.display.X);
}

describe('setupReducer - entry (AC 39.1)', () => {
  it('enters setup from idle on BTN_SETUP and shows SELECT', () => {
    const result = setupReducer(createTestState('idle'), { eventName: 'BTN_SETUP' }, ctx);
    expect(result?.stateName).toBe('setup-select');
    expect(xText(result)).toBe(SETUP_SELECT_TEXT);
  });

  it('does not handle other events from idle', () => {
    const result = setupReducer(createTestState('idle'), { eventName: 'KEY_5' }, ctx);
    expect(result).toBeNull();
  });

  it('returns null for unrelated states', () => {
    const result = setupReducer(createTestState('calculator-idle'), { eventName: 'BTN_SETUP' }, ctx);
    expect(result).toBeNull();
  });
});

describe('setupReducer - axis selection (AC 39.2)', () => {
  it('selecting X shows the first parameter (LinEAr)', () => {
    const select = createTestState('setup-select');
    select.stateData = INITIAL_SETUP_DATA;
    const result = setupReducer(select, { eventName: 'BTN_SELECT_X' }, ctx);
    expect(result?.stateName).toBe('setup-parameter');
    const data = result?.stateData as SetupData;
    expect(data.selectedAxis).toBe('X');
    expect(data.currentParamIndex).toBe(0);
    expect(xText(result)).toBe('LinEAr');
  });

  it('selecting Y and Z also works', () => {
    const select = { ...createTestState('setup-select'), stateData: INITIAL_SETUP_DATA };
    expect((setupReducer(select, { eventName: 'BTN_SELECT_Y' }, ctx)?.stateData as SetupData).selectedAxis).toBe('Y');
    expect((setupReducer(select, { eventName: 'BTN_SELECT_Z' }, ctx)?.stateData as SetupData).selectedAxis).toBe('Z');
  });
});

describe('setupReducer - item navigation up/down with wrap (AC 39.3)', () => {
  // The setup menu is a vertical list: LinEAr at the top, End at the bottom
  // (manual section 6.2 / video walkthrough). Pressing DOWN (KEY_2_DOWN) moves
  // toward End -- the video uses it to scroll "down past SLEEP to SAU CHG" and
  // "down twice to End". Pressing UP (KEY_8_UP) moves back toward LinEAr.
  it('KEY_2_DOWN advances to the next item (toward End)', () => {
    const result = setupReducer(paramState({ currentParamIndex: 0 }), { eventName: 'KEY_2_DOWN' }, ctx);
    expect((result?.stateData as SetupData).currentParamIndex).toBe(1);
    expect(xText(result)).toBe(SETUP_PARAMETERS[1]!.label);
  });

  it('KEY_8_UP goes to the previous item (toward LinEAr)', () => {
    const result = setupReducer(paramState({ currentParamIndex: 1 }), { eventName: 'KEY_8_UP' }, ctx);
    expect((result?.stateData as SetupData).currentParamIndex).toBe(0);
  });

  it('scrolling down past the last item wraps to the first', () => {
    const last = SETUP_PARAMETER_COUNT - 1;
    const result = setupReducer(paramState({ currentParamIndex: last }), { eventName: 'KEY_2_DOWN' }, ctx);
    expect((result?.stateData as SetupData).currentParamIndex).toBe(0);
  });

  it('scrolling up before the first item wraps to the last', () => {
    const result = setupReducer(paramState({ currentParamIndex: 0 }), { eventName: 'KEY_8_UP' }, ctx);
    expect((result?.stateData as SetupData).currentParamIndex).toBe(SETUP_PARAMETER_COUNT - 1);
  });
});

describe('setupReducer - choice cycling left/right with wrap (AC 39.4)', () => {
  it('KEY_6_RIGHT cycles to the next choice (LinEAr -> AnGULAr)', () => {
    const result = setupReducer(paramState({ currentParamIndex: 0 }), { eventName: 'KEY_6_RIGHT' }, ctx);
    expect(xText(result)).toBe('AnGULAr');
  });

  it('KEY_4_LEFT cycles back (AnGULAr -> LinEAr)', () => {
    // First cycle right, then left.
    const right = setupReducer(paramState({ currentParamIndex: 0 }), { eventName: 'KEY_6_RIGHT' }, ctx)!;
    const left = setupReducer(right, { eventName: 'KEY_4_LEFT' }, ctx);
    expect(xText(left)).toBe('LinEAr');
  });

  it('cycling right past the last choice wraps to the first', () => {
    // counting-mode has 2 choices; right twice returns to first.
    const once = setupReducer(paramState({ currentParamIndex: 0 }), { eventName: 'KEY_6_RIGHT' }, ctx)!;
    const twice = setupReducer(once, { eventName: 'KEY_6_RIGHT' }, ctx);
    expect(xText(twice)).toBe('LinEAr');
  });

  it('cycling left from the first choice wraps to the last', () => {
    const result = setupReducer(paramState({ currentParamIndex: 0 }), { eventName: 'KEY_4_LEFT' }, ctx);
    expect(xText(result)).toBe('AnGULAr');
  });

  it('terminal item (End) ignores choice cycling', () => {
    const endIdx = SETUP_PARAMETERS.findIndex((p) => p.id === SETUP_END_ID);
    const result = setupReducer(paramState({ currentParamIndex: endIdx }), { eventName: 'KEY_6_RIGHT' }, ctx);
    expect(result).toBeNull();
  });
});

describe('setupReducer - scope: per-axis vs global (AC 39.5)', () => {
  it('per-axis change for X does not affect Y', () => {
    // Change counting-mode on X to angular.
    const xChanged = setupReducer(paramState({ selectedAxis: 'X', currentParamIndex: 0 }), { eventName: 'KEY_6_RIGHT' }, ctx)!;
    const draft = (xChanged.stateData as SetupData).draftValues;
    // Now view Y with the same draft map: Y's value is unseeded -> LinEAr.
    const yView = paramState({ selectedAxis: 'Y', currentParamIndex: 0, draftValues: draft });
    // Re-render Y display by issuing a no-op navigation that recomputes (up then down).
    const yShown = setupReducer(setupReducer(yView, { eventName: 'KEY_8_UP' }, ctx)!, { eventName: 'KEY_2_DOWN' }, ctx);
    expect(xText(yShown)).toBe('LinEAr');
    // And X retains its angular draft key.
    expect(draft['X:counting-mode']).toBe('angular');
    expect(draft['Y:counting-mode']).toBeUndefined();
  });

  it('global parameter uses a single GLOBAL key regardless of axis', () => {
    const enfIdx = SETUP_PARAMETERS.findIndex((p) => p.scope === 'global' && p.choices.length > 0);
    const changed = setupReducer(paramState({ selectedAxis: 'X', currentParamIndex: enfIdx }), { eventName: 'KEY_6_RIGHT' }, ctx)!;
    const draft = (changed.stateData as SetupData).draftValues;
    const globalKey = Object.keys(draft).find((k) => k.startsWith('GLOBAL:'));
    expect(globalKey).toBeDefined();
  });

  it('global parameter seeds from nvMem.encoderFailWarning (US-042)', () => {
    const enfIdx = SETUP_PARAMETERS.findIndex((p) => p.id === 'enf');
    // encoderFailWarning false (default) -> "EnF oFF"
    const baseState = paramState({ selectedAxis: 'X', currentParamIndex: enfIdx });
    const offShown = setupReducer(setupReducer(baseState, { eventName: 'KEY_8_UP' }, ctx)!, { eventName: 'KEY_2_DOWN' }, ctx);
    expect(xText(offShown)).toBe('EnF oFF');

    // encoderFailWarning true -> "EnF on"
    const onCtx = { ...ctx, nvMem: { ...ctx.nvMem, encoderFailWarning: true } };
    const onShown = setupReducer(setupReducer(baseState, { eventName: 'KEY_8_UP' }, onCtx)!, { eventName: 'KEY_2_DOWN' }, onCtx);
    expect(xText(onShown)).toBe('EnF on');
  });
});

describe('setupReducer - re-enter via setup key (AC 39.6)', () => {
  it('BTN_SETUP from a parameter returns to SELECT prompt', () => {
    const result = setupReducer(paramState({ selectedAxis: 'X', currentParamIndex: 1 }), { eventName: 'BTN_SETUP' }, ctx);
    expect(result?.stateName).toBe('setup-select');
    expect((result?.stateData as SetupData).selectedAxis).toBeNull();
    expect(xText(result)).toBe(SETUP_SELECT_TEXT);
  });
});

describe('setupReducer - exit (AC 39.7, AC 39.8)', () => {
  it('End + ent exits to idle', () => {
    const endIdx = SETUP_PARAMETERS.findIndex((p) => p.id === SETUP_END_ID);
    const result = setupReducer(paramState({ currentParamIndex: endIdx }), { eventName: 'KEY_ENTER' }, ctx);
    expect(result?.stateName).toBe('idle');
  });

  it('ent on a non-End parameter does not exit', () => {
    const result = setupReducer(paramState({ currentParamIndex: 0 }), { eventName: 'KEY_ENTER' }, ctx);
    expect(result).toBeNull();
  });

  it('KEY_CLEAR exits to idle from a parameter', () => {
    const result = setupReducer(paramState({ currentParamIndex: 0 }), { eventName: 'KEY_CLEAR' }, ctx);
    expect(result?.stateName).toBe('idle');
  });

  it('KEY_CLEAR exits to idle from the SELECT prompt', () => {
    const select = { ...createTestState('setup-select'), stateData: INITIAL_SETUP_DATA };
    const result = setupReducer(select, { eventName: 'KEY_CLEAR' }, ctx);
    expect(result?.stateName).toBe('idle');
  });

  it('exiting via End discards uncommitted draft changes', () => {
    // Change counting-mode to angular, then navigate to End and exit.
    const changed = setupReducer(paramState({ currentParamIndex: 0 }), { eventName: 'KEY_6_RIGHT' }, ctx)!;
    expect((changed.stateData as SetupData).draftValues['X:counting-mode']).toBe('angular');
    const endIdx = SETUP_PARAMETERS.findIndex((p) => p.id === SETUP_END_ID);
    const atEnd = { ...changed, stateData: { ...(changed.stateData as SetupData), currentParamIndex: endIdx } };
    const exited = setupReducer(atEnd, { eventName: 'KEY_ENTER' }, ctx);
    // Idle state carries no setup draft (discarded).
    expect(exited?.stateName).toBe('idle');
    expect(exited?.stateData).toEqual({ stateDataType: 'none' });
  });
});

describe('setupReducer draft transaction and numeric entry', () => {
  const directionIdx = SETUP_PARAMETERS.findIndex(p => p.id === DIRECTION_ID);
  const saveIdx = SETUP_PARAMETERS.findIndex(p => p.id === SAVE_CHANGES_ID);

  it('discards direction edits on C and End; only SAU CHG changes the saved baseline', () => {
    for (const exit of ['clear', 'end', 'save'] as const) {
      useSettingsStore.setState({ nvMem: DEFAULT_NON_VOLATILE_MEMORY });
      const changed = setupReducer(paramState({ currentParamIndex: directionIdx }), { eventName: 'KEY_6_RIGHT' }, ctx)!;
      expect(useSettingsStore.getState().nvMem.axisDirection.X).toBe('normal');
      expect(changed.display.X).toBe('riGht');
      const target = exit === 'save' ? saveIdx : SETUP_PARAMETER_COUNT - 1;
      const atExit = { ...changed, stateData: { ...(changed.stateData as SetupData), currentParamIndex: target } };
      setupReducer(atExit, { eventName: exit === 'clear' ? 'KEY_CLEAR' : 'KEY_ENTER' }, ctx);
      expect(useSettingsStore.getState().nvMem.axisDirection.X).toBe(exit === 'save' ? 'reversed' : 'normal');
    }
  });

  it('uses draft angular mode for dP without committing either row early', () => {
    let state = setupReducer(paramState({ currentParamIndex: 0 }), { eventName: 'KEY_6_RIGHT' }, ctx)!;
    state = setupReducer(state, { eventName: 'KEY_2_DOWN' }, ctx)!;
    state = setupReducer(state, { eventName: 'KEY_2_DOWN' }, ctx)!;
    expect(state.display.X).toBe('dd.mn');
    state = setupReducer(state, { eventName: 'KEY_6_RIGHT' }, ctx)!;
    expect(state.display.X).toBe('dd.mn.SS');
    expect(useSettingsStore.getState().nvMem.countingMode.X).toBe('linear');
    const save = { ...state, stateData: { ...(state.stateData as SetupData), currentParamIndex: saveIdx } };
    setupReducer(save, { eventName: 'KEY_ENTER' }, ctx);
    expect(useSettingsStore.getState().nvMem.angularResolution.X).toBe('dd-mn-ss');
  });

  it('accepts arbitrary sleep minutes through ENT/ENT and rejects 121 without losing the draft', () => {
    let state = paramState({ currentParamIndex: SETUP_PARAMETERS.findIndex(p => p.id === SLEEP_TIMEOUT_ID) });
    state = setupReducer(state, { eventName: 'KEY_ENTER' }, ctx)!;
    expect(state.display.X).toBe('000');
    state = setupReducer(state, { eventName: 'KEY_ENTER' }, ctx)!;
    expect(state.display.X).toBe('0');
    for (const eventName of ['KEY_1', 'KEY_2_DOWN', 'KEY_1', 'KEY_ENTER'] as const) state = setupReducer(state, { eventName }, ctx)!;
    expect(state.display.X).toBe('Error');
    expect(useSettingsStore.getState().nvMem.sleepTimeout).toBe(0);
    state = setupReducer(state, { eventName: 'KEY_CLEAR' }, ctx)!;
    for (const eventName of ['KEY_ENTER', 'KEY_ENTER', 'KEY_3', 'KEY_7', 'KEY_ENTER'] as const) state = setupReducer(state, { eventName }, ctx)!;
    expect(state.display.X).toBe('SAU ChG');
    setupReducer(state, { eventName: 'KEY_ENTER' }, ctx);
    expect(useSettingsStore.getState().nvMem.sleepTimeout).toBe(37);
    const stored = setupReducer(paramState({ currentParamIndex: SETUP_PARAMETERS.findIndex(p => p.id === SLEEP_TIMEOUT_ID) }),
      { eventName: 'KEY_ENTER' }, { ...ctx, nvMem: useSettingsStore.getState().nvMem })!;
    expect(stored.display.X).toBe('037');
  });

  it('numeric BP edits are axis-scoped and C discards a partial entry', () => {
    let state = paramState({ selectedAxis: 'Y', currentParamIndex: SETUP_PARAMETERS.findIndex(p => p.id === ZERO_APPROACH_DIST_ID) });
    for (const eventName of ['KEY_ENTER', 'KEY_ENTER', 'KEY_DECIMAL', 'KEY_0', 'KEY_0', 'KEY_3', 'KEY_7', 'KEY_ENTER'] as const) state = setupReducer(state, { eventName }, ctx)!;
    expect(useSettingsStore.getState().nvMem.zeroApproachDistance.Y).toBe('0.002');
    const save = { ...state, stateData: { ...(state.stateData as SetupData), currentParamIndex: saveIdx } };
    setupReducer(save, { eventName: 'KEY_ENTER' }, ctx);
    expect(useSettingsStore.getState().nvMem.zeroApproachDistance).toEqual({ X: '0.002', Y: '0.0037', Z: '0.002' });
    state = paramState({ selectedAxis: 'Y', currentParamIndex: SETUP_PARAMETERS.findIndex(p => p.id === ZERO_APPROACH_DIST_ID) });
    for (const eventName of ['KEY_ENTER', 'KEY_ENTER', 'KEY_5', 'KEY_CLEAR', 'KEY_CLEAR'] as const) {
      state = setupReducer(state, { eventName }, { ...ctx, nvMem: useSettingsStore.getState().nvMem })!;
    }
    expect(useSettingsStore.getState().nvMem.zeroApproachDistance.Y).toBe('0.0037');
  });

  it('edits BP distance and tolerance in mm while preserving canonical inch storage across unit changes', () => {
    const mmContext = { ...ctx, nvMem: { ...ctx.nvMem, defaultUnit: 'mm' as const } };
    useSettingsStore.setState({ nvMem: mmContext.nvMem });
    let state = paramState({ selectedAxis: 'Y', currentParamIndex: SETUP_PARAMETERS.findIndex(p => p.id === ZERO_APPROACH_DIST_ID) });
    state = setupReducer(state, { eventName: 'KEY_ENTER' }, mmContext)!;
    expect(state.display.X).toBe('0.0508');
    for (const eventName of ['KEY_ENTER', 'KEY_DECIMAL', 'KEY_2_DOWN', 'KEY_5', 'KEY_4_LEFT', 'KEY_ENTER',
      'KEY_ENTER', 'KEY_ENTER', 'KEY_DECIMAL', 'KEY_0', 'KEY_5', 'KEY_0', 'KEY_8_UP', 'KEY_ENTER'] as const) {
      state = setupReducer(state, { eventName }, mmContext)!;
    }
    expect(useSettingsStore.getState().nvMem.zeroApproachDistance.Y).toBe('0.002');
    const save = { ...state, stateData: { ...(state.stateData as SetupData), currentParamIndex: saveIdx } };
    setupReducer(save, { eventName: 'KEY_ENTER' }, mmContext);
    const saved = useSettingsStore.getState().nvMem;
    expect(saved.zeroApproachDistance).toEqual({ X: '0.002', Y: '0.01', Z: '0.002' });
    expect(saved.zeroApproachTolerance).toEqual({ X: '0', Y: '0.002', Z: '0' });
    const distance = paramState({ selectedAxis: 'Y', currentParamIndex: SETUP_PARAMETERS.findIndex(p => p.id === ZERO_APPROACH_DIST_ID) });
    const tolerance = paramState({ selectedAxis: 'Y', currentParamIndex: SETUP_PARAMETERS.findIndex(p => p.id === ZERO_APPROACH_TOLR_ID) });
    expect(setupReducer(distance, { eventName: 'KEY_ENTER' }, { ...ctx, nvMem: saved })!.display.X).toBe('0.2540');
    expect(setupReducer(tolerance, { eventName: 'KEY_ENTER' }, { ...ctx, nvMem: saved })!.display.X).toBe('0.0508');
    const inchContext = { ...ctx, nvMem: { ...saved, defaultUnit: 'inch' as const } };
    expect(setupReducer(distance, { eventName: 'KEY_ENTER' }, inchContext)!.display.X).toBe('0.0100');
    expect(setupReducer(tolerance, { eventName: 'KEY_ENTER' }, inchContext)!.display.X).toBe('0.0020');
  });

  it('invalidates scale-dependent marks and preserves physical saved-reference displacement only for installed encoders', () => {
    const base = paramState({ currentParamIndex: saveIdx, draftValues: { 'X:scale-resolution': '10' } });
    const state = { ...base, vMem: { ...base.vMem, referenceMarks: { X: 10, Y: 10 }, machineReferenceOffsets: { X: 3, Y: 4 } } };
    const installed = { ...ctx, millState: { ...ctx.millState, encoderResolutionMicrons: { X: 5, Y: 5, Z: 5 } } };
    const scaled = setupReducer(state, { eventName: 'KEY_ENTER' }, installed)!;
    expect(scaled.vMem.referenceMarks).toEqual({ Y: 10 });
    expect(scaled.vMem.machineReferenceOffsets).toEqual({ X: 6, Y: 4 });
    const decoded = setupReducer(state, { eventName: 'KEY_ENTER' }, ctx)!;
    expect(decoded.vMem.referenceMarks).toEqual({ X: 10, Y: 10 });
    expect(decoded.vMem.machineReferenceOffsets).toEqual({ X: 3, Y: 4 });
  });
});

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
import type { DROReducerContext, DROStatePayload } from '../types';
import {
  SETUP_PARAMETERS,
  SETUP_PARAMETER_COUNT,
  SETUP_END_ID,
  DIRECTION_ID,
  Z_DEPTH_ID,
} from './setup-parameters';
import { useSettingsStore } from '../../settingsStore';
import { DEFAULT_NON_VOLATILE_MEMORY } from '../../../types/nonVolatileMemory';

const ctx = DEFAULT_TEST_CONTEXT;

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
  it('KEY_8_UP advances to the next item', () => {
    const result = setupReducer(paramState({ currentParamIndex: 0 }), { eventName: 'KEY_8_UP' }, ctx);
    expect((result?.stateData as SetupData).currentParamIndex).toBe(1);
    expect(xText(result)).toBe(SETUP_PARAMETERS[1]!.label);
  });

  it('KEY_2_DOWN goes to the previous item', () => {
    const result = setupReducer(paramState({ currentParamIndex: 1 }), { eventName: 'KEY_2_DOWN' }, ctx);
    expect((result?.stateData as SetupData).currentParamIndex).toBe(0);
  });

  it('scrolling up past the last item wraps to the first', () => {
    const last = SETUP_PARAMETER_COUNT - 1;
    const result = setupReducer(paramState({ currentParamIndex: last }), { eventName: 'KEY_8_UP' }, ctx);
    expect((result?.stateData as SetupData).currentParamIndex).toBe(0);
  });

  it('scrolling down before the first item wraps to the last', () => {
    const result = setupReducer(paramState({ currentParamIndex: 0 }), { eventName: 'KEY_2_DOWN' }, ctx);
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

  it('global parameter seeds from nvMem (beepEnabled stand-in)', () => {
    const enfIdx = SETUP_PARAMETERS.findIndex((p) => p.id === 'enf');
    // beepEnabled true -> "EnF on"
    const onState = paramState({ selectedAxis: 'X', currentParamIndex: enfIdx });
    const shown = setupReducer(setupReducer(onState, { eventName: 'KEY_8_UP' }, ctx)!, { eventName: 'KEY_2_DOWN' }, ctx);
    expect(xText(shown)).toBe('EnF on');

    // beepEnabled false -> "EnF oFF"
    const offCtx = { ...ctx, nvMem: { ...ctx.nvMem, beepEnabled: false } };
    const offShown = setupReducer(setupReducer(onState, { eventName: 'KEY_8_UP' }, offCtx)!, { eventName: 'KEY_2_DOWN' }, offCtx);
    expect(xText(offShown)).toBe('EnF oFF');
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

describe('setupReducer - commit-on-change parameters (US-002)', () => {
  // Commit parameters persist to the live settings store, so reset it per test.
  beforeEach(() => {
    useSettingsStore.setState({ nvMem: DEFAULT_NON_VOLATILE_MEMORY });
  });

  /** Context whose nvMem mirrors the live settings store. */
  function liveCtx(): DROReducerContext {
    return { ...DEFAULT_TEST_CONTEXT, nvMem: useSettingsStore.getState().nvMem };
  }

  const directionIdx = SETUP_PARAMETERS.findIndex((p) => p.id === DIRECTION_ID);
  const zDepthIdx = SETUP_PARAMETERS.findIndex((p) => p.id === Z_DEPTH_ID);

  it('cycling the direction param commits to nvMem for the selected axis', () => {
    const state = paramState({ selectedAxis: 'X', currentParamIndex: directionIdx });
    const result = setupReducer(state, { eventName: 'KEY_6_RIGHT' }, liveCtx());
    expect(useSettingsStore.getState().nvMem.axisDirection.X).toBe('reversed');
    // Label updates to the reversed choice using the freshly committed nvMem.
    expect(xText(result)).toBe('riGht');
  });

  it('cycling direction on Y does not change X (per-axis commit)', () => {
    const state = paramState({ selectedAxis: 'Y', currentParamIndex: directionIdx });
    setupReducer(state, { eventName: 'KEY_6_RIGHT' }, liveCtx());
    const dir = useSettingsStore.getState().nvMem.axisDirection;
    expect(dir).toEqual({ X: 'normal', Y: 'reversed', Z: 'normal' });
  });

  it('cycling left from normal commits reversed (wrap-around)', () => {
    const state = paramState({ selectedAxis: 'X', currentParamIndex: directionIdx });
    const result = setupReducer(state, { eventName: 'KEY_4_LEFT' }, liveCtx());
    expect(useSettingsStore.getState().nvMem.axisDirection.X).toBe('reversed');
    expect(xText(result)).toBe('riGht');
  });

  it('cycling the z-depth param commits the global zDepthSense', () => {
    const state = paramState({ selectedAxis: 'X', currentParamIndex: zDepthIdx });
    const result = setupReducer(state, { eventName: 'KEY_6_RIGHT' }, liveCtx());
    expect(useSettingsStore.getState().nvMem.zDepthSense).toBe('depth-positive');
    expect(xText(result)).toBe('dEP PoS');
  });

  it('cycling a non-commit param (counting-mode) does NOT touch nvMem', () => {
    const before = useSettingsStore.getState().nvMem;
    setupReducer(paramState({ selectedAxis: 'X', currentParamIndex: 0 }), { eventName: 'KEY_6_RIGHT' }, liveCtx());
    expect(useSettingsStore.getState().nvMem).toEqual(before);
  });

  it('a committed direction change survives End exit (not discarded)', () => {
    // Cycle direction (commits to nvMem), then navigate to End and exit.
    const changed = setupReducer(
      paramState({ selectedAxis: 'X', currentParamIndex: directionIdx }),
      { eventName: 'KEY_6_RIGHT' },
      liveCtx()
    )!;
    expect(useSettingsStore.getState().nvMem.axisDirection.X).toBe('reversed');

    const endIdx = SETUP_PARAMETERS.findIndex((p) => p.id === SETUP_END_ID);
    const atEnd = { ...changed, stateData: { ...(changed.stateData as SetupData), currentParamIndex: endIdx } };
    const exited = setupReducer(atEnd, { eventName: 'KEY_ENTER' }, liveCtx());

    expect(exited?.stateName).toBe('idle');
    // Unlike draft params, the committed direction persists past exit.
    expect(useSettingsStore.getState().nvMem.axisDirection.X).toBe('reversed');
  });
});

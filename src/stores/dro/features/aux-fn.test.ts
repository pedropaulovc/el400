/**
 * Unit tests for the AUX Fn (`AUH Fn`) hardware-absent dwell.
 *
 * ENT on the `AUH Fn` setup row flashes `no Conn` (the optional DB15 auxiliary
 * connector is absent) and then returns to the row. The dwell must survive the
 * ~100ms MILL_STATE_CHANGED encoder tick a connected DRO emits — the known
 * dwell-screen footgun — and dismiss only on its timeout or a front-panel key.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { setupReducer } from './setup';
import { enterAuxFnNoConn, AUX_FN_NO_CONN_TEXT } from './aux-fn';
import { SETUP_PARAMETERS, AUX_FN_ID } from './setup-parameters';
import { createTestState, DEFAULT_TEST_CONTEXT } from '../test-utils';
import { INITIAL_SETUP_DATA, type SetupData } from '../droStateMachine';
import type { DROStatePayload } from '../types';
import { useSettingsStore } from '../../settingsStore';
import { DEFAULT_NON_VOLATILE_MEMORY } from '../../../types/nonVolatileMemory';

const ctx = DEFAULT_TEST_CONTEXT;
const AUX_FN_IDX = SETUP_PARAMETERS.findIndex((p) => p.id === AUX_FN_ID);

beforeEach(() => {
  useSettingsStore.setState({ nvMem: DEFAULT_NON_VOLATILE_MEMORY });
});

/** Build a setup-parameter state highlighting the given param index. */
function paramState(currentParamIndex: number): DROStatePayload {
  const merged: SetupData = { ...INITIAL_SETUP_DATA, selectedAxis: 'X', currentParamIndex };
  return { ...createTestState('setup-parameter'), stateData: merged };
}

/** Build the `setup-aux-fn` dwell state highlighting the AUH Fn row. */
function dwellState(): DROStatePayload {
  const data: SetupData = { ...INITIAL_SETUP_DATA, selectedAxis: 'X', currentParamIndex: AUX_FN_IDX };
  return enterAuxFnNoConn(data, createTestState('setup-parameter').vMem);
}

describe('AUX Fn dwell - entry', () => {
  it('ENT on the AUH Fn row enters setup-aux-fn showing no Conn', () => {
    const result = setupReducer(paramState(AUX_FN_IDX), { eventName: 'KEY_ENTER' }, ctx);
    expect(result?.stateName).toBe('setup-aux-fn');
    expect(result?.display.X).toBe(AUX_FN_NO_CONN_TEXT);
    expect(result?.display.Y).toBe('');
    expect(result?.display.Z).toBe('');
    // The row index is carried through so it stays highlighted on return.
    expect((result?.stateData as SetupData).currentParamIndex).toBe(AUX_FN_IDX);
  });

  it('left/right do nothing on the choiceless AUH Fn row', () => {
    expect(setupReducer(paramState(AUX_FN_IDX), { eventName: 'KEY_6_RIGHT' }, ctx)).toBeNull();
    expect(setupReducer(paramState(AUX_FN_IDX), { eventName: 'KEY_4_LEFT' }, ctx)).toBeNull();
  });
});

describe('AUX Fn dwell - dismissal', () => {
  it('AUX_FN_TIMEOUT returns to the menu with AUH Fn highlighted', () => {
    const result = setupReducer(dwellState(), { eventName: 'AUX_FN_TIMEOUT' }, ctx);
    expect(result?.stateName).toBe('setup-parameter');
    expect((result?.stateData as SetupData).currentParamIndex).toBe(AUX_FN_IDX);
    expect(result?.display.X).toBe('AUX Fn');
  });

  it('a front-panel key (KEY_CLEAR) dismisses the dwell early', () => {
    const result = setupReducer(dwellState(), { eventName: 'KEY_CLEAR' }, ctx);
    expect(result?.stateName).toBe('setup-parameter');
    expect(result?.display.X).toBe('AUX Fn');
  });

  it('MILL_STATE_CHANGED encoder tick does NOT wipe the dwell', () => {
    const result = setupReducer(dwellState(), { eventName: 'MILL_STATE_CHANGED' }, ctx);
    // null = not handled; the screen holds on `no Conn` until a real dismissal.
    expect(result).toBeNull();
  });
});

/**
 * Unit tests for the SAV CHG (Save Changes) setup parameter (US-027).
 *
 * SAV CHG is the commit half of the setup menu's draft/commit split. Draft-only
 * parameters (those WITHOUT a commit-on-change hook, e.g. SC scale-resolution and
 * ENF) buffer their edits in `SetupData.draftValues`; pressing ENT on SAV CHG
 * persists those drafts to nvMem (localStorage). Exiting WITHOUT SAV CHG discards
 * the draft (covered by the setup-reducer suite). These tests drive the reducer
 * directly with real KEY_ / BTN_ events and assert the live settings store.
 *
 * @see project/user-stories/06-configuration/US-027-save-changes.md
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { setupReducer } from './setup';
import { SETUP_SAVED_TEXT } from './save-changes';
import { createTestState, DEFAULT_TEST_CONTEXT } from '../test-utils';
import { INITIAL_SETUP_DATA, type SetupData } from '../droStateMachine';
import type { DROReducerContext, DROStatePayload } from '../types';
import {
  SETUP_PARAMETERS,
  SETUP_END_ID,
  SAVE_CHANGES_ID,
  SCALE_RESOLUTION_ID,
} from './setup-parameters';
import { useSettingsStore } from '../../settingsStore';
import { DEFAULT_NON_VOLATILE_MEMORY } from '../../../types/nonVolatileMemory';

beforeEach(() => {
  useSettingsStore.setState({ nvMem: DEFAULT_NON_VOLATILE_MEMORY });
});

/** Context whose nvMem mirrors the live settings store. */
function liveCtx(): DROReducerContext {
  return { ...DEFAULT_TEST_CONTEXT, nvMem: useSettingsStore.getState().nvMem };
}

/** Build a setup-parameter state with the given setup data (X selected). */
function paramState(data: Partial<SetupData>): DROStatePayload {
  const merged: SetupData = { ...INITIAL_SETUP_DATA, selectedAxis: 'X', ...data };
  return { ...createTestState('setup-parameter'), stateData: merged };
}

const saveIdx = SETUP_PARAMETERS.findIndex((p) => p.id === SAVE_CHANGES_ID);
const scIdx = SETUP_PARAMETERS.findIndex((p) => p.id === SCALE_RESOLUTION_ID);

describe('SAV CHG registry entry (AC27.1)', () => {
  it('exists in the registry as a terminal (choice-less) global item', () => {
    const param = SETUP_PARAMETERS[saveIdx];
    expect(param).toBeDefined();
    expect(param?.id).toBe(SAVE_CHANGES_ID);
    expect(param?.scope).toBe('global');
    expect(param?.choices).toHaveLength(0);
  });

  it('the End sentinel remains the LAST entry (after SAV CHG)', () => {
    const lastIdx = SETUP_PARAMETERS.length - 1;
    expect(SETUP_PARAMETERS[lastIdx]?.id).toBe(SETUP_END_ID);
    expect(saveIdx).toBeLessThan(lastIdx);
  });

  it('its highlighted label renders with manual-renderable glyphs (SAU ChG)', () => {
    const state = paramState({ currentParamIndex: scIdx });
    // Scroll to the SAV CHG item and read its label.
    let cur: DROStatePayload | null = state;
    let guard = 0;
    while (cur && String(cur.display.X) !== 'SAU ChG' && guard < 30) {
      cur = setupReducer(cur, { eventName: 'KEY_8_UP' }, liveCtx());
      guard += 1;
    }
    expect(cur && String(cur.display.X)).toBe('SAU ChG');
  });
});

describe('SAV CHG commit on ENT (AC27.2, AC27.3)', () => {
  it('persists a draft-only SC change to nvMem and shows the confirmation', () => {
    // Change SC on X to 1 micron (draft only — not committed yet).
    const atSC = paramState({ selectedAxis: 'X', currentParamIndex: scIdx });
    // Default SC is 5.0; left twice => 2.0 -> 1.0.
    const c1 = setupReducer(atSC, { eventName: 'KEY_4_LEFT' }, liveCtx())!;
    const c2 = setupReducer(c1, { eventName: 'KEY_4_LEFT' }, liveCtx())!;
    expect((c2.stateData as SetupData).draftValues['X:scale-resolution']).toBe('1');
    // The draft has NOT yet hit nvMem.
    expect(useSettingsStore.getState().nvMem.scaleResolution.X).toBe('5');

    // Navigate to SAV CHG carrying the draft, press ENT.
    const atSave: DROStatePayload = {
      ...c2,
      stateData: { ...(c2.stateData as SetupData), currentParamIndex: saveIdx },
    };
    const saved = setupReducer(atSave, { eventName: 'KEY_ENTER' }, liveCtx());

    // nvMem now holds the committed SC value (AC27.3).
    expect(useSettingsStore.getState().nvMem.scaleResolution.X).toBe('1');
    // Confirmation state + message (AC27.4).
    expect(saved?.stateName).toBe('setup-saved');
    expect(String(saved?.display.X)).toBe(SETUP_SAVED_TEXT);
  });

  it('persists multiple draft params at once (per-axis SC + global ENF)', () => {
    const enfIdx = SETUP_PARAMETERS.findIndex((p) => p.id === 'enf');
    // Draft: SC X -> 1, ENF -> off (beepEnabled false stand-in).
    let s = paramState({ selectedAxis: 'X', currentParamIndex: scIdx });
    s = setupReducer(s, { eventName: 'KEY_4_LEFT' }, liveCtx())!; // 2.0
    s = setupReducer(s, { eventName: 'KEY_4_LEFT' }, liveCtx())!; // 1.0
    s = { ...s, stateData: { ...(s.stateData as SetupData), currentParamIndex: enfIdx } };
    s = setupReducer(s, { eventName: 'KEY_6_RIGHT' }, liveCtx())!; // EnF on -> EnF oFF

    s = { ...s, stateData: { ...(s.stateData as SetupData), currentParamIndex: saveIdx } };
    setupReducer(s, { eventName: 'KEY_ENTER' }, liveCtx());

    const nv = useSettingsStore.getState().nvMem;
    expect(nv.scaleResolution.X).toBe('1');
    expect(nv.beepEnabled).toBe(false);
  });

  it('per-axis SC drafts commit only to the edited axis', () => {
    // Edit SC on Y only.
    let s = paramState({ selectedAxis: 'Y', currentParamIndex: scIdx });
    s = setupReducer(s, { eventName: 'KEY_4_LEFT' }, liveCtx())!; // Y SC 2.0
    s = { ...s, stateData: { ...(s.stateData as SetupData), currentParamIndex: saveIdx } };
    setupReducer(s, { eventName: 'KEY_ENTER' }, liveCtx());

    const sc = useSettingsStore.getState().nvMem.scaleResolution;
    expect(sc).toEqual({ X: '5', Y: '2', Z: '5' });
  });

  it('SAV CHG with no draft changes is a no-op commit but still confirms', () => {
    const before = useSettingsStore.getState().nvMem;
    const s = paramState({ currentParamIndex: saveIdx, draftValues: {} });
    const saved = setupReducer(s, { eventName: 'KEY_ENTER' }, liveCtx());
    expect(useSettingsStore.getState().nvMem).toEqual(before);
    expect(saved?.stateName).toBe('setup-saved');
  });
});

describe('SAV CHG confirmation dismissal (AC27.4)', () => {
  it('SETUP_SAVED_TIMEOUT returns to the SAV CHG parameter view', () => {
    const saved = createTestState('setup-saved');
    saved.stateData = { ...INITIAL_SETUP_DATA, selectedAxis: 'X', currentParamIndex: saveIdx };
    const back = setupReducer(saved, { eventName: 'SETUP_SAVED_TIMEOUT' }, liveCtx());
    expect(back?.stateName).toBe('setup-parameter');
    expect((back?.stateData as SetupData).currentParamIndex).toBe(saveIdx);
    expect(String(back?.display.X)).toBe('SAU ChG');
  });

  it('the committed value is NOT re-discarded while the confirmation is shown', () => {
    // Commit an SC change, land in setup-saved, then time out.
    let s = paramState({ selectedAxis: 'X', currentParamIndex: scIdx });
    s = setupReducer(s, { eventName: 'KEY_4_LEFT' }, liveCtx())!; // 2.0
    s = { ...s, stateData: { ...(s.stateData as SetupData), currentParamIndex: saveIdx } };
    const saved = setupReducer(s, { eventName: 'KEY_ENTER' }, liveCtx())!;
    setupReducer(saved, { eventName: 'SETUP_SAVED_TIMEOUT' }, liveCtx());
    expect(useSettingsStore.getState().nvMem.scaleResolution.X).toBe('2');
  });
});

describe('exit WITHOUT SAV CHG discards draft (AC27.6)', () => {
  it('End + ent after an SC draft leaves nvMem untouched', () => {
    let s = paramState({ selectedAxis: 'X', currentParamIndex: scIdx });
    s = setupReducer(s, { eventName: 'KEY_4_LEFT' }, liveCtx())!; // draft SC 2.0
    expect((s.stateData as SetupData).draftValues['X:scale-resolution']).toBe('2');

    const endIdx = SETUP_PARAMETERS.findIndex((p) => p.id === SETUP_END_ID);
    s = { ...s, stateData: { ...(s.stateData as SetupData), currentParamIndex: endIdx } };
    const exited = setupReducer(s, { eventName: 'KEY_ENTER' }, liveCtx());

    expect(exited?.stateName).toBe('idle');
    // SC was a draft only — never persisted (AC27.6).
    expect(useSettingsStore.getState().nvMem.scaleResolution.X).toBe('5');
  });

  it('KEY_CLEAR after an ENF draft leaves nvMem untouched', () => {
    const enfIdx = SETUP_PARAMETERS.findIndex((p) => p.id === 'enf');
    let s = paramState({ selectedAxis: 'X', currentParamIndex: enfIdx });
    s = setupReducer(s, { eventName: 'KEY_6_RIGHT' }, liveCtx())!; // draft EnF oFF
    const exited = setupReducer(s, { eventName: 'KEY_CLEAR' }, liveCtx());
    expect(exited?.stateName).toBe('idle');
    expect(useSettingsStore.getState().nvMem.beepEnabled).toBe(true);
  });
});

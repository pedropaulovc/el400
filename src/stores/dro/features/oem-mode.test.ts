/**
 * Unit tests: US-044 OEM Mode reducer + baseline capture.
 *
 * These exercise the OEM reducer in isolation with real DROEventPayload events
 * (the same digit/ENT/CLEAR keys the panel emits) and the live settingsStore for
 * the capture/persist path. No state is forced; every transition is driven by an
 * event, and the password gate is validated by typing real digits.
 *
 * @see project/user-stories/06-configuration/US-044-oem-mode.md
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { oemModeReducer } from './oem-mode';
import {
  OEM_PASSWORD_PROMPT,
  OEM_MODE_TEXT,
  OEM_REJECTED_TEXT,
  OEM_MODE_SETUP_LABEL,
  isOemPasswordCorrect,
  captureOemDefaults,
} from './oem-mode';
import { setupReducer } from './setup';
import {
  INITIAL_OEM_DATA,
  type DROEventPayload,
  type OemData,
} from '../droStateMachine';
import { createTestState, DEFAULT_TEST_CONTEXT } from '../test-utils';
import { useSettingsStore } from '../../settingsStore';
import { DEFAULT_NON_VOLATILE_MEMORY } from '../../../types/nonVolatileMemory';

/** The 5-digit OEM password as individual digit-key events (real keypresses). */
const PASSWORD_KEYS: DROEventPayload[] = [
  { eventName: 'KEY_3' },
  { eventName: 'KEY_5' },
  { eventName: 'KEY_7' },
  { eventName: 'KEY_2_DOWN' }, // the '2' key (doubles as nav-down outside OEM)
  { eventName: 'KEY_6_RIGHT' }, // the '6' key (doubles as nav-right outside OEM)
];

function oemState(data: Partial<OemData> = {}, stateName: 'oem-password' | 'oem-mode' | 'oem-rejected' = 'oem-password') {
  return createTestState(stateName, { ...INITIAL_OEM_DATA, ...data });
}

function dispatch(state: ReturnType<typeof oemState>, event: DROEventPayload) {
  const result = oemModeReducer(state, event, DEFAULT_TEST_CONTEXT);
  if (result === null) throw new Error(`oemModeReducer did not handle ${event.eventName}`);
  return result;
}

describe('US-044 OEM Mode — password gate (AC 44.2 / 44.7)', () => {
  beforeEach(() => {
    useSettingsStore.setState({ nvMem: { ...DEFAULT_NON_VOLATILE_MEMORY } });
  });

  it('isOemPasswordCorrect matches only the exact code', () => {
    expect(isOemPasswordCorrect('35726')).toBe(true);
    expect(isOemPasswordCorrect('0000')).toBe(false);
    expect(isOemPasswordCorrect('')).toBe(false);
    expect(isOemPasswordCorrect('357260')).toBe(false);
  });

  it('correct password enters OEM Mode (AC 44.2)', () => {
    let state = oemState();
    for (const key of PASSWORD_KEYS) {
      state = dispatch(state, key);
      expect(state.stateName).toBe('oem-password');
      // The code is never echoed — the prompt stays on screen.
      expect(state.display.X).toBe(OEM_PASSWORD_PROMPT);
    }
    // ENT validates.
    state = dispatch(state, { eventName: 'KEY_ENTER' });
    expect(state.stateName).toBe('oem-mode');
    expect(state.display.X).toBe(OEM_MODE_TEXT);
  });

  it('wrong password is rejected and does NOT enter OEM Mode (AC 44.7)', () => {
    let state = oemState();
    // Type a wrong code: 0 0 0 0.
    for (let i = 0; i < 4; i++) state = dispatch(state, { eventName: 'KEY_0' });
    state = dispatch(state, { eventName: 'KEY_ENTER' });

    expect(state.stateName).toBe('oem-rejected');
    expect(state.stateName).not.toBe('oem-mode');
    expect(state.display.X).toBe(OEM_REJECTED_TEXT);

    // Dismissing the rejection returns to the setup menu (OEM row), not OEM Mode.
    const dismissed = dispatch(
      oemState({ returnParamIndex: 3 }, 'oem-rejected'),
      { eventName: 'OEM_REJECTED_TIMEOUT' }
    );
    expect(dismissed.stateName).toBe('setup-parameter');
    expect(dismissed.display.X).toBe(OEM_MODE_SETUP_LABEL);
  });

  it('an empty ENT (no digits) is treated as a wrong password (AC 44.7)', () => {
    const state = dispatch(oemState(), { eventName: 'KEY_ENTER' });
    expect(state.stateName).toBe('oem-rejected');
  });

  it('CLEAR abandons the password prompt back to idle', () => {
    const state = dispatch(oemState(), { eventName: 'KEY_CLEAR' });
    expect(state.stateName).toBe('idle');
  });
});

describe('US-044 OEM Mode — baseline capture (AC 44.3 / 44.5)', () => {
  beforeEach(() => {
    useSettingsStore.setState({ nvMem: { ...DEFAULT_NON_VOLATILE_MEMORY } });
  });

  it('ENT in OEM Mode snapshots the live config to nvMem.oemDefaults (AC 44.3)', () => {
    // Configure something away from default first.
    useSettingsStore.getState().updateNvMem({ encoderFailWarning: true, keypadLock: 'on' });

    const state = dispatch(oemState({}, 'oem-mode'), { eventName: 'KEY_ENTER' });
    // Shows the shared StorEd confirmation and the baseline is captured.
    expect(state.stateName).toBe('setup-saved');

    const snapshot = useSettingsStore.getState().nvMem.oemDefaults;
    expect(snapshot).not.toBeNull();
    expect(snapshot!.encoderFailWarning).toBe(true);
    expect(snapshot!.keypadLock).toBe('on');
  });

  it('the worked example: EnF on becomes part of the OEM baseline (AC 44.5)', () => {
    useSettingsStore.getState().updateNvMem({ encoderFailWarning: true });
    captureOemDefaults();
    expect(useSettingsStore.getState().nvMem.oemDefaults?.encoderFailWarning).toBe(true);
  });

  it('the snapshot never nests a baseline-of-a-baseline', () => {
    captureOemDefaults();
    const snapshot = useSettingsStore.getState().nvMem.oemDefaults;
    expect(snapshot).not.toBeNull();
    expect('oemDefaults' in (snapshot as object)).toBe(false);
  });

  it('CLEAR in OEM Mode leaves WITHOUT storing a baseline', () => {
    const state = dispatch(oemState({}, 'oem-mode'), { eventName: 'KEY_CLEAR' });
    expect(state.stateName).toBe('idle');
    expect(useSettingsStore.getState().nvMem.oemDefaults).toBeNull();
  });
});

describe('US-044 OEM Mode — setup hand-off (AC 44.1)', () => {
  beforeEach(() => {
    useSettingsStore.setState({ nvMem: { ...DEFAULT_NON_VOLATILE_MEMORY } });
  });

  it('ENT on the oEm mod setup row opens the password prompt', () => {
    // Build a setup-parameter state highlighting the OEM row by scrolling there.
    let state = createTestState('setup-select', {
      stateDataType: 'setup',
      selectedAxis: null,
      currentParamIndex: 0,
      draftValues: {},
    });
    // Pick X to enter the parameter list.
    state = setupReducer(state, { eventName: 'BTN_SELECT_X' }, DEFAULT_TEST_CONTEXT)!;
    // Scroll down until the OEM row is highlighted.
    let guard = 0;
    while (state.display.X !== OEM_MODE_SETUP_LABEL) {
      state = setupReducer(state, { eventName: 'KEY_2_DOWN' }, DEFAULT_TEST_CONTEXT)!;
      guard += 1;
      if (guard > 40) throw new Error('oEm mod row not reachable');
    }
    // ENT opens the password gate.
    const entered = setupReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT)!;
    expect(entered.stateName).toBe('oem-password');
    expect(entered.display.X).toBe(OEM_PASSWORD_PROMPT);
  });
});

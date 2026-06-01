/**
 * Unit tests: US-028 Restore Defaults (`rSt oEm`).
 *
 * Restore returns the DRO to a known baseline:
 *   - When an OEM baseline has been captured (US-044 `oEm mod`), restore to THAT
 *     snapshot (this is the proof of US-044 AC44.4).
 *   - Otherwise restore to the as-shipped factory defaults.
 * In both cases user data (SDMs, tool/work offsets) is cleared.
 *
 * Design note (manual reconciliation): the el400-operation-manual §6.2 (tie-breaker)
 * lists `rSt oEñ` ("Restore default settings", *6) and `oEñ ñod` ("Password
 * protected OEM mode") as TWO SEPARATE adjacent rows. `rSt oEm` is therefore its
 * own terminal-action setup row (like SAV CHG), NOT routed through the OEM
 * password gate. The story ACs 28.4-28.8 (password / 3 AXIS / MILL / OPT OFF
 * confirm chain on restore) are OCR-era conflation of the adjacent OEM-mode row;
 * see the "Notes — Manual reconciliation" block in the story file.
 *
 * @see project/user-stories/06-configuration/US-028-restore-defaults.md
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  restoreDefaults,
  RESTORE_DEFAULTS_ID,
  RESTORE_DEFAULTS_LABEL,
  RESTORE_IN_PROGRESS_TEXT,
  restoreDefaultsReducer,
} from './restore-defaults';
import { useSettingsStore } from '../../settingsStore';
import { DEFAULT_NON_VOLATILE_MEMORY } from '../../../types/nonVolatileMemory';
import {
  INITIAL_VOLATILE_MEMORY_STATE,
  type VolatileMemoryState,
} from '../../../types/volatileMemory';
import { createTestState, DEFAULT_TEST_CONTEXT } from '../test-utils';

/** A vMem holding user data (SDMs + tool/work offsets) that restore must clear. */
function vMemWithUserData(): VolatileMemoryState {
  return {
    ...INITIAL_VOLATILE_MEMORY_STATE,
    sdmPoints: { 1: { X: 10, Y: 20, Z: 30 }, 2: { X: -5, Y: 0, Z: 1 } },
    workOffsets: { X: 12.5, Y: -3, Z: 8 },
  };
}

describe('restoreDefaults()', () => {
  beforeEach(() => {
    localStorage.clear();
    useSettingsStore.getState().resetMemory();
  });

  it('restores nvMem to the factory defaults when no OEM baseline exists', () => {
    // Operator has changed several settings away from factory.
    useSettingsStore.getState().updateNvMem({
      beepEnabled: false,
      encoderFailWarning: true,
      sleepTimeout: 30,
      keypadLock: 'on',
    });
    expect(useSettingsStore.getState().nvMem.oemDefaults).toBeNull();

    restoreDefaults(INITIAL_VOLATILE_MEMORY_STATE);

    const nv = useSettingsStore.getState().nvMem;
    expect(nv.beepEnabled).toBe(DEFAULT_NON_VOLATILE_MEMORY.beepEnabled);
    expect(nv.encoderFailWarning).toBe(DEFAULT_NON_VOLATILE_MEMORY.encoderFailWarning);
    expect(nv.sleepTimeout).toBe(DEFAULT_NON_VOLATILE_MEMORY.sleepTimeout);
    expect(nv.keypadLock).toBe(DEFAULT_NON_VOLATILE_MEMORY.keypadLock);
  });

  it('AC44.4: restores nvMem to the OEM baseline when one exists', () => {
    // Capture an OEM baseline with EnF ON (the US-044 worked example).
    useSettingsStore.getState().updateNvMem({ encoderFailWarning: true });
    const live = useSettingsStore.getState().nvMem;
    const { oemDefaults: _drop, ...snapshot } = live;
    useSettingsStore
      .getState()
      .updateNvMem({ oemDefaults: snapshot });

    // Operator then changes EnF OFF.
    useSettingsStore.getState().updateNvMem({ encoderFailWarning: false });
    expect(useSettingsStore.getState().nvMem.encoderFailWarning).toBe(false);

    // Restore returns to the OEM baseline (EnF back ON), NOT the factory off.
    restoreDefaults(INITIAL_VOLATILE_MEMORY_STATE);

    expect(useSettingsStore.getState().nvMem.encoderFailWarning).toBe(true);
  });

  it('preserves the OEM baseline across a restore (oemDefaults survives)', () => {
    useSettingsStore.getState().updateNvMem({ sleepTimeout: 45 });
    const live = useSettingsStore.getState().nvMem;
    const { oemDefaults: _drop, ...snapshot } = live;
    useSettingsStore
      .getState()
      .updateNvMem({ oemDefaults: snapshot });

    restoreDefaults(INITIAL_VOLATILE_MEMORY_STATE);

    // The captured baseline is still present (so a second restore still works).
    expect(useSettingsStore.getState().nvMem.oemDefaults).not.toBeNull();
    expect(useSettingsStore.getState().nvMem.oemDefaults?.sleepTimeout).toBe(45);
  });

  it('clears user data (SDMs and tool/work offsets) in the returned vMem', () => {
    const cleaned = restoreDefaults(vMemWithUserData());
    expect(cleaned.sdmPoints).toEqual({});
    expect(cleaned.workOffsets).toEqual(INITIAL_VOLATILE_MEMORY_STATE.workOffsets);
  });

  it('does not mutate the vMem it is passed', () => {
    const input = vMemWithUserData();
    restoreDefaults(input);
    // Input is untouched; restore returns a fresh cleaned copy.
    expect(input.sdmPoints).toEqual({ 1: { X: 10, Y: 20, Z: 30 }, 2: { X: -5, Y: 0, Z: 1 } });
  });
});

describe('restoreDefaultsReducer', () => {
  it('returns to idle on RESTORE_COMPLETE from the in-progress screen', () => {
    const state = createTestState('restore-in-progress');
    const result = restoreDefaultsReducer(
      state,
      { eventName: 'RESTORE_COMPLETE' },
      DEFAULT_TEST_CONTEXT
    );
    expect(result).not.toBeNull();
    expect(result?.stateName).toBe('idle');
  });

  it('ignores RESTORE_COMPLETE outside the in-progress screen', () => {
    const state = createTestState('idle');
    const result = restoreDefaultsReducer(
      state,
      { eventName: 'RESTORE_COMPLETE' },
      DEFAULT_TEST_CONTEXT
    );
    expect(result).toBeNull();
  });
});

describe('restore-defaults registry metadata', () => {
  it('exposes the manual-faithful label and a stable id', () => {
    expect(RESTORE_DEFAULTS_ID).toBe('restore-defaults');
    // el400 manual §6.2 `r5t oEñ`; the panel renders r,S,t,o,E,m -> `rSt oEm`.
    expect(RESTORE_DEFAULTS_LABEL).toBe('rSt oEm');
  });

  it('shows In ProG while the restore runs (AC28.8)', () => {
    // Manual: "IN PROG". The panel has no uppercase 'N' glyph, so the renderable
    // literal lowercases it: `In ProG`.
    expect(RESTORE_IN_PROGRESS_TEXT).toBe('In ProG');
  });
});

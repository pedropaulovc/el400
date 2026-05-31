/**
 * Unit tests for the Reference / Datum recall feature reducer (US-012).
 *
 * Covers manual §7.7:
 * - §7.7.1 Reference Point ("honE" / Home): datum set AT the encoder mark.
 * - §7.7.2.2 Recall Machine Reference ("nC rEF"): datum at a fixed distance
 *   from the mark.
 *
 * The reference mark crossing is modeled by the ENCODER_REF_MARK_CROSSED event:
 * the current machine position is taken as the mark location and the work
 * offset is set so the displayed ABS value matches the desired reference value.
 */
import { describe, it, expect } from 'vitest';
import { referenceReducer } from './reference';
import {
  MACHINE_REFERENCE_VALUES_MM,
  REFERENCE_TEXT,
} from './reference';
import { createTestState, DEFAULT_TEST_CONTEXT } from '../test-utils';
import type { DROReducerContext } from '../types';
import type { ReferenceData } from '../droStateMachine';
import { INITIAL_REFERENCE_DATA } from '../droStateMachine';
import { INITIAL_VOLATILE_MEMORY_STATE } from '../../../types/volatileMemory';
import { createDefaultMillState } from '../../../types/millState';

/** Build a context with a connected mill at the given machine position. */
function connectedContext(x = 0, y = 0, z = 0): DROReducerContext {
  return {
    ...DEFAULT_TEST_CONTEXT,
    millState: {
      ...createDefaultMillState('mock'),
      connected: true,
      position: { x, y, z },
    },
    nvMem: { ...DEFAULT_TEST_CONTEXT.nvMem, defaultUnit: 'mm' },
  };
}

const refData = (over: Partial<ReferenceData> = {}): ReferenceData => ({
  ...INITIAL_REFERENCE_DATA,
  ...over,
});

describe('referenceReducer', () => {
  describe('returns null for unrelated states/events', () => {
    it('returns null when not in a reference state and event is not BTN_REFERENCE', () => {
      const state = createTestState('idle');
      expect(referenceReducer(state, { eventName: 'KEY_5' }, DEFAULT_TEST_CONTEXT)).toBeNull();
    });
  });

  describe('AC 12.1 / AC 12.5: entering reference mode from idle', () => {
    it('enters reference-menu-home showing "honE" when BTN_REFERENCE pressed in ABS', () => {
      const state = createTestState('idle');
      const result = referenceReducer(state, { eventName: 'BTN_REFERENCE' }, DEFAULT_TEST_CONTEXT);
      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('reference-menu-home');
      expect(result?.display.X).toBe(REFERENCE_TEXT.home);
    });

    it('forces ABS mode when BTN_REFERENCE pressed in INC (§7.7)', () => {
      const state = createTestState('idle');
      state.vMem = { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'inc' };
      const result = referenceReducer(state, { eventName: 'BTN_REFERENCE' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('reference-menu-home');
      expect(result?.vMem.mode).toBe('abs');
    });
  });

  describe('menu navigation between honE and nC rEF', () => {
    it('right arrow moves from honE to nC rEF', () => {
      const state = createTestState('reference-menu-home', refData());
      const result = referenceReducer(state, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('reference-menu-machine');
      expect(result?.display.X).toBe(REFERENCE_TEXT.machine);
    });

    it('left arrow moves from nC rEF back to honE', () => {
      const state = createTestState('reference-menu-machine', refData());
      const result = referenceReducer(state, { eventName: 'KEY_4_LEFT' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('reference-menu-home');
      expect(result?.display.X).toBe(REFERENCE_TEXT.home);
    });

    it('right arrow wraps from nC rEF back to honE', () => {
      const state = createTestState('reference-menu-machine', refData());
      const result = referenceReducer(state, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('reference-menu-home');
    });
  });

  describe('AC 12.5: confirming honE shows SELECT', () => {
    it('ENT from honE menu goes to home-select showing SELECt', () => {
      const state = createTestState('reference-menu-home', refData());
      const result = referenceReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('reference-home-select');
      expect(result?.display.X).toBe(REFERENCE_TEXT.select);
    });

    it('ENT from nC rEF menu goes to machine-select showing SELECt', () => {
      const state = createTestState('reference-menu-machine', refData({ referenceMode: 'MACHINE_RECALL' }));
      const result = referenceReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('reference-machine-select');
      expect(result?.display.X).toBe(REFERENCE_TEXT.select);
    });
  });

  describe('AC 12.2 / AC 12.6: selecting axis shows blinking zero / waiting', () => {
    it('selecting X in home-select transitions to home-waiting with selectedAxis X', () => {
      const state = createTestState('reference-home-select', refData({ referenceMode: 'HOME' }));
      const result = referenceReducer(state, { eventName: 'BTN_SELECT_X' }, connectedContext());
      expect(result?.stateName).toBe('reference-home-waiting');
      const data = result?.stateData;
      expect(data?.stateDataType).toBe('reference');
      if (data?.stateDataType === 'reference') {
        expect(data.selectedAxis).toBe('X');
      }
      // Blinking zero shown next to selected axis
      expect(result?.display.X).toBe(0);
    });

    it('selecting Y in machine-select transitions to machine-waiting with selectedAxis Y', () => {
      const state = createTestState('reference-machine-select', refData({ referenceMode: 'MACHINE_RECALL' }));
      const result = referenceReducer(state, { eventName: 'BTN_SELECT_Y' }, connectedContext());
      expect(result?.stateName).toBe('reference-machine-waiting');
      const data = result?.stateData;
      if (data?.stateDataType === 'reference') {
        expect(data.selectedAxis).toBe('Y');
      }
    });
  });

  describe('AC 12.3 / AC 12.4: crossing the reference mark', () => {
    it('HOME: crossing mark sets datum AT the mark (display reads 0)', () => {
      const state = createTestState('reference-home-waiting', refData({ referenceMode: 'HOME', selectedAxis: 'X' }));
      // Machine is at x=37.5mm when the mark is crossed.
      const ctx = connectedContext(37.5, 0, 0);
      const result = referenceReducer(state, { eventName: 'ENCODER_REF_MARK_CROSSED', axis: 'X' }, ctx);
      expect(result?.stateName).toBe('idle');
      // workOffset for X must equal machine pos so display = machinePos - offset = 0
      expect(result?.vMem.workOffsets.X).toBeCloseTo(37.5, 4);
      expect(result?.display.X).toBeCloseTo(0, 4);
    });

    it('MACHINE_RECALL: crossing mark sets datum at fixed distance from mark', () => {
      const state = createTestState('reference-machine-waiting', refData({ referenceMode: 'MACHINE_RECALL', selectedAxis: 'X' }));
      const ctx = connectedContext(37.5, 0, 0);
      const result = referenceReducer(state, { eventName: 'ENCODER_REF_MARK_CROSSED', axis: 'X' }, ctx);
      expect(result?.stateName).toBe('idle');
      // Display should read the stored machine-reference value at the mark.
      const expectedVal = MACHINE_REFERENCE_VALUES_MM.X;
      // offset = machinePos - storedRef ; display = machinePos - offset = storedRef
      expect(result?.vMem.workOffsets.X).toBeCloseTo(37.5 - expectedVal, 4);
      expect(result?.display.X).toBeCloseTo(expectedVal, 4);
    });

    it('ignores ref mark crossing on an axis other than the selected one', () => {
      const state = createTestState('reference-home-waiting', refData({ referenceMode: 'HOME', selectedAxis: 'X' }));
      const ctx = connectedContext(37.5, 12, 0);
      const result = referenceReducer(state, { eventName: 'ENCODER_REF_MARK_CROSSED', axis: 'Y' }, ctx);
      // Still waiting; offset unchanged
      expect(result?.stateName).toBe('reference-home-waiting');
      expect(result?.vMem.workOffsets.X).toBe(0);
    });
  });

  describe('disconnected (NoOp/manual) mode — the default source', () => {
    // Regression for the silent no-op: when no mill is connected the ABS display
    // reads manualAbsoluteValues, not machinePos - workOffset. applyDatum must
    // update that representation too or crossing the mark does nothing on screen.
    // Disconnected context (NoOp default) showing values in mm so the display
    // equals the stored mm value without unit conversion.
    const disconnectedMmContext: DROReducerContext = {
      ...DEFAULT_TEST_CONTEXT,
      nvMem: { ...DEFAULT_TEST_CONTEXT.nvMem, defaultUnit: 'mm' },
    };

    it('HOME: crossing mark updates the manual display value to 0 when disconnected', () => {
      const state = createTestState('reference-home-waiting', refData({ referenceMode: 'HOME', selectedAxis: 'X' }));
      // The default test mill is disconnected (connected: false).
      expect(disconnectedMmContext.millState.connected).toBe(false);
      const result = referenceReducer(state, { eventName: 'ENCODER_REF_MARK_CROSSED', axis: 'X' }, disconnectedMmContext);
      expect(result?.stateName).toBe('idle');
      // Manual absolute value (what the disconnected ABS display reads) must be 0.
      expect(result?.vMem.manualAbsoluteValues.X).toBeCloseTo(0, 4);
      expect(result?.display.X).toBeCloseTo(0, 4);
    });

    it('MACHINE_RECALL: crossing mark updates the manual display value to the stored ref when disconnected', () => {
      const state = createTestState('reference-machine-waiting', refData({ referenceMode: 'MACHINE_RECALL', selectedAxis: 'X' }));
      const result = referenceReducer(state, { eventName: 'ENCODER_REF_MARK_CROSSED', axis: 'X' }, disconnectedMmContext);
      expect(result?.stateName).toBe('idle');
      // Stored as mm internally; display is mm here, so both equal the stored ref.
      expect(result?.vMem.manualAbsoluteValues.X).toBeCloseTo(MACHINE_REFERENCE_VALUES_MM.X, 4);
      expect(result?.display.X).toBeCloseTo(MACHINE_REFERENCE_VALUES_MM.X, 4);
    });
  });

  describe('cancel with KEY_CLEAR', () => {
    it('cancels from menu back to idle', () => {
      const state = createTestState('reference-menu-home', refData());
      const result = referenceReducer(state, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('idle');
    });

    it('cancels from waiting back to idle without changing datum', () => {
      const state = createTestState('reference-home-waiting', refData({ referenceMode: 'HOME', selectedAxis: 'X' }));
      const result = referenceReducer(state, { eventName: 'KEY_CLEAR' }, connectedContext(50));
      expect(result?.stateName).toBe('idle');
      expect(result?.vMem.workOffsets.X).toBe(0);
    });
  });

  describe('MILL_STATE_CHANGED keeps reference states stable', () => {
    it('does not leave waiting state on position update (no implicit crossing)', () => {
      const state = createTestState('reference-home-waiting', refData({ referenceMode: 'HOME', selectedAxis: 'X' }));
      const result = referenceReducer(state, { eventName: 'MILL_STATE_CHANGED' }, connectedContext(5));
      expect(result?.stateName).toBe('reference-home-waiting');
    });
  });
});

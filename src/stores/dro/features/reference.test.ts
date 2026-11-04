/**
 * Unit tests for the Reference / Datum recall feature reducer (US-012).
 *
 * Covers manual §7.7:
 * - §7.7.1 Reference Point ("honE" / Home): datum set AT the encoder mark.
 * - §7.7.2.2 Recall Machine Reference ("nC rEF"): datum at a fixed distance
 *   from the mark.
 *
 * Reference mark crossing happens two ways, both covered here:
 * - Real-user path: jogging the selected axis across REFERENCE_MARK_POSITION_MM
 *   emits MILL_STATE_CHANGED; the reducer latches when the segment spans the mark.
 * - Explicit latch (debug control / E2E hook): ENCODER_REF_MARK_CROSSED treats
 *   the current machine position as the mark.
 */
import { describe, it, expect, vi } from 'vitest';
import { referenceReducer } from './reference';
import {
  MACHINE_REFERENCE_VALUES_MM,
  REFERENCE_MARK_POSITION_MM,
  REFERENCE_TEXT,
} from './reference';
import { createTestState, DEFAULT_TEST_CONTEXT } from '../test-utils';
import type { DROReducerContext } from '../types';
import type { ReferenceData } from '../droStateMachine';
import { INITIAL_REFERENCE_DATA } from '../droStateMachine';
import { INITIAL_VOLATILE_MEMORY_STATE } from '../../../types/volatileMemory';
import { createDefaultMillState } from '../../../types/millState';
import { useMillStore } from '../../millStore';

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

  describe('AC 12.3 (real-user path): jogging across the mark via MILL_STATE_CHANGED', () => {
    const MARK = REFERENCE_MARK_POSITION_MM.X; // 10mm

    it('HOME: jog segment spanning the mark latches datum to 0 at the mark', () => {
      // Armed just below the mark (e.g. jogged out to 9mm).
      const state = createTestState(
        'reference-home-waiting',
        refData({ referenceMode: 'HOME', selectedAxis: 'X', markArmedFromPos: 9 })
      );
      // Next tick: machine reaches the mark (10mm).
      const result = referenceReducer(state, { eventName: 'MILL_STATE_CHANGED' }, connectedContext(MARK, 0, 0));
      expect(result?.stateName).toBe('idle');
      // Datum referenced to the mark: offset = mark - 0 = 10; display at mark = 0.
      expect(result?.vMem.workOffsets.X).toBeCloseTo(MARK, 4);
    });

    it('MACHINE_RECALL: jog across the mark restores the stored value at the mark', () => {
      const state = createTestState(
        'reference-machine-waiting',
        refData({ referenceMode: 'MACHINE_RECALL', selectedAxis: 'X', markArmedFromPos: 8 })
      );
      const result = referenceReducer(state, { eventName: 'MILL_STATE_CHANGED' }, connectedContext(12, 0, 0));
      expect(result?.stateName).toBe('idle');
      // offset = mark - storedRef so display reads storedRef when axis is at the mark.
      expect(result?.vMem.workOffsets.X).toBeCloseTo(MARK - MACHINE_REFERENCE_VALUES_MM.X, 4);
    });

    it.each([
      ['HOME', 'reference-home-waiting', 0],
      ['MACHINE_RECALL', 'reference-machine-waiting', MACHINE_REFERENCE_VALUES_MM.X],
    ] as const)('requests the native ABS %s datum at the current position after crossing the mark', (referenceMode, stateName, referenceValue) => {
      const request = vi.spyOn(useMillStore.getState(), 'requestWorkPosition').mockResolvedValue();
      try {
        const state = createTestState(stateName, refData({ referenceMode, selectedAxis: 'X', markArmedFromPos: 8 }));
        state.vMem = {
          ...state.vMem,
          mode: 'abs',
          workOffsets: { X: 4, Y: 5, Z: 6 },
          incrementalOffsets: { X: 7, Y: 8, Z: 9 },
          manualAbsoluteValues: { X: 11, Y: 12, Z: 13 },
        };
        const ctx: DROReducerContext = {
          ...connectedContext(12),
          millState: {
            ...connectedContext(12).millState,
            connected: true,
            controllerType: 'cncjs',
            workPosition: { x: 41, y: 0, z: 0 },
            workPositionControl: { availability: 'ready', pending: null, error: null },
          },
        };
        const result = referenceReducer(state, { eventName: 'MILL_STATE_CHANGED' }, ctx)!;
        expect(result.stateName).toBe(stateName);
        expect(request).toHaveBeenCalledOnce();
        expect(request).toHaveBeenCalledWith({ x: 12 - MARK + referenceValue });
        expect(result.vMem.workOffsets).toEqual(state.vMem.workOffsets);
        expect(result.vMem.incrementalOffsets).toEqual(state.vMem.incrementalOffsets);
        expect(result.vMem.manualAbsoluteValues).toEqual(state.vMem.manualAbsoluteValues);
        const target = 12 - MARK + referenceValue;
        const pending = referenceReducer(result, { eventName: 'MILL_STATE_CHANGED' }, {
          ...ctx, millState: { ...ctx.millState, workPositionControl: { availability: 'busy', pending: { x: target }, error: null } },
        })!;
        expect(pending.stateName).toBe(stateName);
        const confirmed = referenceReducer(pending, { eventName: 'MILL_STATE_CHANGED' }, {
          ...ctx, millState: { ...ctx.millState, workPosition: { x: target, y: 0, z: 0 } },
        })!;
        expect(confirmed.stateName).toBe('idle');
        expect(confirmed.display.X).toBe(target);
        expect(request).toHaveBeenCalledOnce();
      } finally {
        request.mockRestore();
      }
    });

    it('retains a physical mark crossed while native ABS is busy until the datum is confirmed', () => {
      const request = vi.spyOn(useMillStore.getState(), 'requestWorkPosition').mockResolvedValue();
      try {
        const state = createTestState('reference-home-waiting', refData({
          referenceMode: 'HOME', selectedAxis: 'X', markArmedFromPos: 8,
        }));
        const nativeAt = (x: number, workX: number, availability: 'ready' | 'busy', pending: { x: number } | null): DROReducerContext => ({
          ...connectedContext(x),
          millState: {
            ...connectedContext(x).millState,
            controllerType: 'cncjs',
            workPosition: { x: workX, y: 0, z: 0 },
            workPositionControl: { availability, pending, error: null },
          },
        });
        const crossed = referenceReducer(state, { eventName: 'MILL_STATE_CHANGED' }, nativeAt(12, 41, 'busy', { x: 99 }))!;
        expect(crossed.stateName).toBe('reference-home-waiting');
        expect(crossed.display.X).toBe(0);
        expect(crossed.vMem.workOffsets).toEqual(state.vMem.workOffsets);
        expect(request).not.toHaveBeenCalled();

        // The axis has moved further; the retained mark, not the latest sample,
        // determines the requested WPos at the time the controller becomes ready.
        const requested = referenceReducer(crossed, { eventName: 'MILL_STATE_CHANGED' }, nativeAt(15, 44, 'ready', null))!;
        expect(request).toHaveBeenCalledOnce();
        expect(request).toHaveBeenCalledWith({ x: 5 });
        expect(requested.stateName).toBe('reference-home-waiting');
        const pending = referenceReducer(requested, { eventName: 'MILL_STATE_CHANGED' }, nativeAt(15, 44, 'busy', { x: 5 }))!;
        expect(pending.stateName).toBe('reference-home-waiting');
        const confirmed = referenceReducer(pending, { eventName: 'MILL_STATE_CHANGED' }, nativeAt(15, 5, 'ready', null))!;
        expect(confirmed.stateName).toBe('idle');
        expect(confirmed.display.X).toBe(5);
        expect(confirmed.vMem.workOffsets).toEqual(state.vMem.workOffsets);
        expect(request).toHaveBeenCalledOnce();
      } finally {
        request.mockRestore();
      }
    });

    it('keeps a failed native request waiting without retrying until the user cancels', () => {
      const request = vi.spyOn(useMillStore.getState(), 'requestWorkPosition').mockResolvedValue();
      try {
        const state = createTestState('reference-machine-waiting', refData({
          referenceMode: 'MACHINE_RECALL', selectedAxis: 'X', markArmedFromPos: 8,
        }));
        const nativeAt = (control: NonNullable<DROReducerContext['millState']['workPositionControl']>): DROReducerContext => ({
          ...connectedContext(12),
          millState: {
            ...connectedContext(12).millState,
            controllerType: 'cncjs',
            workPosition: { x: 41, y: 0, z: 0 },
            workPositionControl: control,
          },
        });
        const ready = nativeAt({ availability: 'ready', pending: null, error: null });
        const requested = referenceReducer(state, { eventName: 'MILL_STATE_CHANGED' }, ready)!;
        expect(request).toHaveBeenCalledOnce();
        const pending = referenceReducer(requested, { eventName: 'MILL_STATE_CHANGED' }, nativeAt({
          availability: 'busy', pending: { x: 2 + MACHINE_REFERENCE_VALUES_MM.X }, error: null,
        }))!;
        const failed = referenceReducer(pending, { eventName: 'MILL_STATE_CHANGED' }, nativeAt({
          availability: 'ready', pending: null, error: 'Controller rejected datum',
        }))!;
        expect(failed.stateName).toBe('reference-machine-waiting');
        expect(failed.vMem.workOffsets).toEqual(state.vMem.workOffsets);
        const stillWaiting = referenceReducer(failed, { eventName: 'MILL_STATE_CHANGED' }, ready)!;
        expect(stillWaiting.stateName).toBe('reference-machine-waiting');
        expect(request).toHaveBeenCalledOnce();
        const cancelled = referenceReducer(stillWaiting, { eventName: 'KEY_CLEAR' }, ready)!;
        expect(cancelled.stateName).toBe('idle');
        expect(cancelled.vMem.workOffsets).toEqual(state.vMem.workOffsets);
      } finally {
        request.mockRestore();
      }
    });

    it.each(['offline', 'busy-then-disconnected'] as const)('does not replay a native reference datum after reconnecting from %s', (scenario) => {
      const request = vi.spyOn(useMillStore.getState(), 'requestWorkPosition').mockResolvedValue();
      try {
        const state = createTestState('reference-home-waiting', refData({
          referenceMode: 'HOME', selectedAxis: 'X', markArmedFromPos: 8,
        }));
        const offline: DROReducerContext = {
          ...connectedContext(12),
          millState: {
            ...connectedContext(12).millState,
            connected: false,
            controllerType: 'cncjs',
            workPosition: { x: 41, y: 0, z: 0 },
            workPositionControl: { availability: 'unavailable', pending: null, error: null },
          },
        };
        const captureContext: DROReducerContext = scenario === 'offline' ? offline : {
          ...offline,
          millState: {
            ...offline.millState, connected: true,
            workPositionControl: { availability: 'busy', pending: { y: 99 }, error: null },
          },
        };
        const captured = referenceReducer(state, { eventName: 'ENCODER_REF_MARK_CROSSED', axis: 'X' }, captureContext)!;
        const waiting = referenceReducer(captured, { eventName: 'MILL_STATE_CHANGED' }, offline)!;
        expect(waiting.stateName).toBe('reference-home-waiting');
        expect(waiting.vMem).toEqual(state.vMem);
        expect(waiting.stateData).toEqual(expect.objectContaining({
          capturedMarkMachinePos: 12, datumRequestPhase: 'failed',
        }));
        expect(request).not.toHaveBeenCalled();

        const online: DROReducerContext = {
          ...offline,
          millState: {
            ...offline.millState,
            connected: true,
            position: { x: 15, y: 0, z: 0 },
            workPositionControl: { availability: 'ready', pending: null, error: null },
          },
        };
        const reconnected = referenceReducer(waiting, { eventName: 'MILL_STATE_CHANGED' }, online)!;
        const stillWaiting = referenceReducer(reconnected, { eventName: 'MILL_STATE_CHANGED' }, online)!;
        expect(stillWaiting.stateName).toBe('reference-home-waiting');
        expect(stillWaiting.vMem).toEqual(state.vMem);
        expect(stillWaiting.stateData).toEqual(expect.objectContaining({ datumRequestPhase: 'failed' }));
        expect(request).not.toHaveBeenCalled();
        const cancelled = referenceReducer(stillWaiting, { eventName: 'KEY_CLEAR' }, online)!;
        expect(cancelled.stateName).toBe('idle');
        expect(cancelled.vMem.workOffsets).toEqual(state.vMem.workOffsets);
      } finally {
        request.mockRestore();
      }
    });

    it('stays waiting and advances the sampled position when the jog has not reached the mark', () => {
      const state = createTestState(
        'reference-home-waiting',
        refData({ referenceMode: 'HOME', selectedAxis: 'X', markArmedFromPos: 0 })
      );
      const result = referenceReducer(state, { eventName: 'MILL_STATE_CHANGED' }, connectedContext(5, 0, 0));
      expect(result?.stateName).toBe('reference-home-waiting');
      // Sampled position advanced so a later tick can detect the crossing.
      const d = result?.stateData;
      expect(d?.stateDataType).toBe('reference');
      if (d?.stateDataType === 'reference') {
        expect(d.markArmedFromPos).toBe(5);
      }
    });

    it('does not latch when a non-selected axis jogs across its mark', () => {
      const state = createTestState(
        'reference-home-waiting',
        refData({ referenceMode: 'HOME', selectedAxis: 'X', markArmedFromPos: 0 })
      );
      // X stays at 0 (below mark); only Y moves past 10.
      const result = referenceReducer(state, { eventName: 'MILL_STATE_CHANGED' }, connectedContext(0, 12, 0));
      expect(result?.stateName).toBe('reference-home-waiting');
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

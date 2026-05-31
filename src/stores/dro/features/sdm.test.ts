/**
 * Sub Datum Memory (SDM) Feature Reducer — Unit Tests (US-009 Learn Mode)
 *
 * Authoritative behaviour per manual §8.2 + §8.2.2 (Learn Mode).
 *
 * Manual flow:
 *  - Press SDM -> intro "SdM" -> menu (Program / Learn / Run), navigate with
 *    left/right arrows, press Enter to confirm.
 *  - In Learn: enter the step number on the Y display, press Enter to confirm.
 *  - Move the machine; press X once to show the current step number, press X
 *    again to store the live position as that step's sub-datum and advance to
 *    the next step.
 *  - Press C (clear) to exit.
 *
 * NOTE — spec discrepancy: the story file (AC 9.4) says press `6►` to store the
 * position. The manual §8.2.2 says press `X`. Per the implementer brief, the
 * manual wins, so storing is bound to BTN_SELECT_X.
 */

import { describe, it, expect } from 'vitest';
import { sdmReducer } from './sdm';
import { createTestState, DEFAULT_TEST_CONTEXT } from '../test-utils';
import {
  INITIAL_SDM_DATA,
  MAX_SDM_STEPS,
  type SdmData,
} from '../droStateMachine';
import type { DROReducerContext, DROStatePayload } from '../types';
import { createDefaultMillState } from '../../../types/millState';

/** Apply the reducer and assert it handled the event (non-null result). */
function apply(
  state: DROStatePayload,
  event: Parameters<typeof sdmReducer>[1],
  context: DROReducerContext
): DROStatePayload {
  const result = sdmReducer(state, event, context);
  if (result === null) throw new Error(`sdmReducer returned null for ${event.eventName}`);
  return result;
}

/** Build a connected mill context at a given absolute position (mm). */
function contextAt(x: number, y: number, z: number): DROReducerContext {
  return {
    ...DEFAULT_TEST_CONTEXT,
    millState: {
      ...createDefaultMillState('mock'),
      connected: true,
      position: { x, y, z },
    },
  };
}

/** Convenience: a payload already in a learn-position state with given data. */
function learnPositionState(data: Partial<SdmData> = {}) {
  const sdmData: SdmData = { ...INITIAL_SDM_DATA, ...data };
  return createTestState('sdm-learn-position', sdmData);
}

describe('sdmReducer', () => {
  describe('non-SDM states', () => {
    it('returns null for unrelated states', () => {
      const state = createTestState('idle');
      expect(sdmReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT)).toBeNull();
    });
  });

  // ───────────────────────────── intro ─────────────────────────────
  describe('intro (AC 9.1)', () => {
    it('advances from intro to the Learn menu on timeout', () => {
      const state = createTestState('sdm-intro', INITIAL_SDM_DATA);
      const result = sdmReducer(state, { eventName: 'SDM_INTRO_TIMEOUT' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('sdm-menu-learn');
    });

    it('ignores other events while in intro', () => {
      const state = createTestState('sdm-intro', INITIAL_SDM_DATA);
      const result = sdmReducer(state, { eventName: 'KEY_5' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('sdm-intro');
    });
  });

  // ───────────────────────────── menu ──────────────────────────────
  describe('menu navigation (AC 9.1)', () => {
    it('navigates right through the menu ring: learn -> run -> program', () => {
      let state = createTestState('sdm-menu-learn', INITIAL_SDM_DATA);
      state = apply(state, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);
      expect(state.stateName).toBe('sdm-menu-run');

      state = apply(state, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);
      expect(state.stateName).toBe('sdm-menu-program');

      state = apply(state, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);
      expect(state.stateName).toBe('sdm-menu-learn');
    });

    it('navigates left through the menu ring (wraps)', () => {
      const state = createTestState('sdm-menu-program', INITIAL_SDM_DATA);
      const result = sdmReducer(state, { eventName: 'KEY_4_LEFT' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('sdm-menu-run');
    });

    it('keeps sdmMode in sync with the highlighted menu item', () => {
      const state = createTestState('sdm-menu-learn', INITIAL_SDM_DATA);
      const result = sdmReducer(state, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);
      expect((result?.stateData as SdmData).sdmMode).toBe('RUN');
    });

    it('confirming Learn enters step-entry with step 1 and a cleared buffer', () => {
      const state = createTestState('sdm-menu-learn', INITIAL_SDM_DATA);
      const result = sdmReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('sdm-learn-step');
      expect((result?.stateData as SdmData).currentStep).toBe(1);
      expect(result?.vMem.inputBuffer).toBe('');
    });

    it('confirming Program exits to idle (US-010 not implemented yet)', () => {
      const state = createTestState('sdm-menu-program', { ...INITIAL_SDM_DATA, sdmMode: 'PROGRAM' });
      const result = sdmReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('idle');
    });

    it('confirming Run exits to idle (US-011 not implemented yet)', () => {
      const state = createTestState('sdm-menu-run', { ...INITIAL_SDM_DATA, sdmMode: 'RUN' });
      const result = sdmReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('idle');
    });

    it('exits to idle on clear', () => {
      const state = createTestState('sdm-menu-learn', INITIAL_SDM_DATA);
      const result = sdmReducer(state, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('idle');
    });
  });

  // ───────────────────────── learn step entry ──────────────────────
  describe('step number entry (AC 9.2)', () => {
    it('accepts digit input into the buffer', () => {
      const state = createTestState('sdm-learn-step', INITIAL_SDM_DATA);
      const result = sdmReducer(state, { eventName: 'KEY_5' }, DEFAULT_TEST_CONTEXT);
      expect(result?.vMem.inputBuffer).toBe('5');
    });

    it('shows the entered step number on the Y display', () => {
      let state = createTestState('sdm-learn-step', INITIAL_SDM_DATA);
      state = apply(state, { eventName: 'KEY_3' }, DEFAULT_TEST_CONTEXT);
      expect(state.display.Y).toBe(3);
    });

    it('confirms a typed step number and moves to the position state', () => {
      let state = createTestState('sdm-learn-step', INITIAL_SDM_DATA);
      state = apply(state, { eventName: 'KEY_5' }, DEFAULT_TEST_CONTEXT);
      const result = sdmReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('sdm-learn-position');
      expect((result?.stateData as SdmData).currentStep).toBe(5);
      expect((result?.stateData as SdmData).learnPhase).toBe('awaiting-first-press');
    });

    it('confirms the default step (1) when the buffer is empty', () => {
      const state = createTestState('sdm-learn-step', INITIAL_SDM_DATA);
      const result = sdmReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('sdm-learn-position');
      expect((result?.stateData as SdmData).currentStep).toBe(1);
    });

    it('rejects step 0 (below range)', () => {
      let state = createTestState('sdm-learn-step', INITIAL_SDM_DATA);
      state = apply(state, { eventName: 'KEY_0' }, DEFAULT_TEST_CONTEXT);
      const result = sdmReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('sdm-learn-step');
    });

    it('rejects a step number above MAX_SDM_STEPS (AC 9.5)', () => {
      let state = createTestState('sdm-learn-step', INITIAL_SDM_DATA);
      for (const ch of String(MAX_SDM_STEPS + 1)) {
        state = apply(state, { eventName: `KEY_${ch}` as 'KEY_1' }, DEFAULT_TEST_CONTEXT);
      }
      const result = sdmReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('sdm-learn-step');
    });

    it('accepts the maximum step number (AC 9.5)', () => {
      let state = createTestState('sdm-learn-step', INITIAL_SDM_DATA);
      for (const ch of String(MAX_SDM_STEPS)) {
        state = apply(state, { eventName: `KEY_${ch}` as 'KEY_1' }, DEFAULT_TEST_CONTEXT);
      }
      const result = sdmReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('sdm-learn-position');
      expect((result?.stateData as SdmData).currentStep).toBe(MAX_SDM_STEPS);
    });

    it('backspaces with clear when the buffer has content', () => {
      let state = createTestState('sdm-learn-step', INITIAL_SDM_DATA);
      state = apply(state, { eventName: 'KEY_1' }, DEFAULT_TEST_CONTEXT);
      state = apply(state, { eventName: 'KEY_2_DOWN' }, DEFAULT_TEST_CONTEXT);
      const result = sdmReducer(state, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('sdm-learn-step');
      expect(result?.vMem.inputBuffer).toBe('1');
    });

    it('exits to idle on clear when the buffer is empty', () => {
      const state = createTestState('sdm-learn-step', INITIAL_SDM_DATA);
      const result = sdmReducer(state, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('idle');
    });
  });

  // ──────────────────── learn capture (two X presses) ──────────────
  describe('position capture (AC 9.3, AC 9.4)', () => {
    it('first X press shows the current step number without storing', () => {
      const state = learnPositionState({ currentStep: 1, learnPhase: 'awaiting-first-press' });
      const result = sdmReducer(state, { eventName: 'BTN_SELECT_X' }, contextAt(10, 0, 0));
      expect(result?.stateName).toBe('sdm-learn-position');
      expect((result?.stateData as SdmData).learnPhase).toBe('step-shown');
      // nothing stored yet
      expect((result?.stateData as SdmData).points[1]).toBeUndefined();
      // display shows the step number
      expect(result?.display.Y).toBe(1);
    });

    it('second X press stores the live position (mm) and advances the step', () => {
      let state = learnPositionState({ currentStep: 1, learnPhase: 'awaiting-first-press' });
      const ctx = contextAt(10, 5, 2);
      state = apply(state, { eventName: 'BTN_SELECT_X' }, ctx); // first press
      const result = sdmReducer(state, { eventName: 'BTN_SELECT_X' }, ctx); // second press

      const data = result?.stateData as SdmData;
      expect(result?.stateName).toBe('sdm-learn-position');
      expect(data.points[1]).toEqual({ X: 10, Y: 5, Z: 2 });
      // advanced to step 2, ready for a fresh first press
      expect(data.currentStep).toBe(2);
      expect(data.learnPhase).toBe('awaiting-first-press');
    });

    it('stores positions for several consecutive steps', () => {
      let state = learnPositionState({ currentStep: 1, learnPhase: 'awaiting-first-press' });

      // Step 1 at X=10
      let ctx = contextAt(10, 0, 0);
      state = apply(state, { eventName: 'BTN_SELECT_X' }, ctx);
      state = apply(state, { eventName: 'BTN_SELECT_X' }, ctx);

      // Step 2 at X=20
      ctx = contextAt(20, 0, 0);
      state = apply(state, { eventName: 'BTN_SELECT_X' }, ctx);
      state = apply(state, { eventName: 'BTN_SELECT_X' }, ctx);

      const data = state.stateData as SdmData;
      expect(data.points[1]).toEqual({ X: 10, Y: 0, Z: 0 });
      expect(data.points[2]).toEqual({ X: 20, Y: 0, Z: 0 });
      expect(data.currentStep).toBe(3);
    });

    it('does not advance past MAX_SDM_STEPS (AC 9.5)', () => {
      let state = learnPositionState({ currentStep: MAX_SDM_STEPS, learnPhase: 'awaiting-first-press' });
      const ctx = contextAt(1, 2, 3);
      state = apply(state, { eventName: 'BTN_SELECT_X' }, ctx);
      const result = sdmReducer(state, { eventName: 'BTN_SELECT_X' }, ctx);
      const data = result?.stateData as SdmData;
      // stored the last step
      expect(data.points[MAX_SDM_STEPS]).toEqual({ X: 1, Y: 2, Z: 3 });
      // clamped at the maximum (does not roll over to 1001)
      expect(data.currentStep).toBe(MAX_SDM_STEPS);
    });

    it('uses manual absolute values when the mill is disconnected', () => {
      const sdmData: SdmData = { ...INITIAL_SDM_DATA, currentStep: 1, learnPhase: 'awaiting-first-press' };
      const base = createTestState('sdm-learn-position', sdmData);
      const state = {
        ...base,
        vMem: { ...base.vMem, manualAbsoluteValues: { X: 7, Y: 8, Z: 9 } },
      };
      let cur = apply(state, { eventName: 'BTN_SELECT_X' }, DEFAULT_TEST_CONTEXT);
      cur = apply(cur, { eventName: 'BTN_SELECT_X' }, DEFAULT_TEST_CONTEXT);
      expect((cur.stateData as SdmData).points[1]).toEqual({ X: 7, Y: 8, Z: 9 });
    });

    it('exits to idle on clear', () => {
      const state = learnPositionState({ currentStep: 2, learnPhase: 'awaiting-first-press' });
      const result = sdmReducer(state, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('idle');
    });

    it('updates the live position display on MILL_STATE_CHANGED', () => {
      const state = learnPositionState({ currentStep: 1, learnPhase: 'awaiting-first-press' });
      const result = sdmReducer(state, { eventName: 'MILL_STATE_CHANGED' }, contextAt(12, 0, 0));
      // inch default unit: 12 mm -> ~0.4724 in; X should reflect a number, not the step
      expect(typeof result?.display.X).toBe('number');
    });
  });
});

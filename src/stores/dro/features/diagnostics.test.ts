/**
 * Self-Diagnostics Feature Unit Tests (US-046, manual §11.1)
 *
 * Covers the diagnostics reducer in isolation: boot entry, the four diagnostic
 * steps (memory / display / keyboard / encoder), keyboard echo, encoder movement
 * verification via MILL_STATE_CHANGED, and the single/double-C exit.
 */

import { describe, it, expect } from 'vitest';
import { diagnosticsReducer } from './diagnostics';
import {
  DIAGNOSTICS_TEXT,
  DISPLAY_TEST_PATTERN,
  INITIAL_DIAGNOSTICS_DATA,
  type DiagnosticsData,
} from '../droStateMachine';
import { createTestState, DEFAULT_TEST_CONTEXT } from '../test-utils';
import type { DROReducerContext } from '../types';
import { createDefaultMillState } from '../../../types/millState';
import { createDisplay } from '../utils/displayComputation';

/** Build a context whose connected mill sits at the given machine position. */
function contextAt(x: number, y: number, z: number): DROReducerContext {
  const millState = createDefaultMillState('mock');
  return {
    ...DEFAULT_TEST_CONTEXT,
    millState: {
      ...millState,
      connected: true,
      position: { x, y, z },
    },
  };
}

describe('diagnosticsReducer', () => {
  describe('entry from boot (AC 46.1, 46.2)', () => {
    it('enters memory diagnostics on KEY_8_UP during boot-show-message and passes', () => {
      const state = createTestState('boot-show-message');
      const next = diagnosticsReducer(
        state,
        { eventName: 'KEY_8_UP' },
        DEFAULT_TEST_CONTEXT
      );
      expect(next).not.toBeNull();
      expect(next?.stateName).toBe('diagnostics-memory');
      // AC 46.2: memory OK shows RAM pass on the X display.
      expect(next?.display.X).toBe(DIAGNOSTICS_TEXT.memoryPass);
    });

    it('does not enter diagnostics from idle on KEY_8_UP', () => {
      const state = createTestState('idle');
      const next = diagnosticsReducer(
        state,
        { eventName: 'KEY_8_UP' },
        DEFAULT_TEST_CONTEXT
      );
      expect(next).toBeNull();
    });

    it('ignores non-diagnostics states/events (returns null)', () => {
      const state = createTestState('idle');
      expect(
        diagnosticsReducer(state, { eventName: 'KEY_5' }, DEFAULT_TEST_CONTEXT)
      ).toBeNull();
    });
  });

  describe('memory -> display -> keyboard advance (AC 46.3, 46.4)', () => {
    it('advances from memory to display on any key', () => {
      const state = createTestState('diagnostics-memory', INITIAL_DIAGNOSTICS_DATA);
      const next = diagnosticsReducer(
        state,
        { eventName: 'KEY_5' },
        DEFAULT_TEST_CONTEXT
      );
      expect(next?.stateName).toBe('diagnostics-display');
      // Display/lamp test lights every segment of every cell.
      expect(next?.display.X).toBe(DISPLAY_TEST_PATTERN);
      expect(next?.display.Y).toBe(DISPLAY_TEST_PATTERN);
      expect(next?.display.Z).toBe(DISPLAY_TEST_PATTERN);
    });

    it('advances from display to keyboard on any key', () => {
      const state = createTestState('diagnostics-display', INITIAL_DIAGNOSTICS_DATA);
      const next = diagnosticsReducer(
        state,
        { eventName: 'KEY_5' },
        DEFAULT_TEST_CONTEXT
      );
      expect(next?.stateName).toBe('diagnostics-keyboard');
    });

    // A connected adapter broadcasts MILL_STATE_CHANGED continuously (every 100ms
    // in ?source=debug). These ticks are NOT key presses (§11.1 advances on a key)
    // and must not skip past the memory/segment steps the operator needs to see.
    it('does NOT advance the memory step on a MILL_STATE_CHANGED tick', () => {
      // Seed the on-screen RAmPASS the entry step shows, so the no-op is meaningful.
      const state = createTestState(
        'diagnostics-memory',
        INITIAL_DIAGNOSTICS_DATA,
        createDisplay(DIAGNOSTICS_TEXT.memoryPass, '', '')
      );
      const next = diagnosticsReducer(
        state,
        { eventName: 'MILL_STATE_CHANGED' },
        contextAt(5, 0, 0)
      );
      expect(next?.stateName).toBe('diagnostics-memory');
      expect(next?.display.X).toBe(DIAGNOSTICS_TEXT.memoryPass);
    });

    it('does NOT advance the display step on a MILL_STATE_CHANGED tick', () => {
      const state = createTestState(
        'diagnostics-display',
        INITIAL_DIAGNOSTICS_DATA,
        createDisplay(DISPLAY_TEST_PATTERN, DISPLAY_TEST_PATTERN, DISPLAY_TEST_PATTERN)
      );
      const next = diagnosticsReducer(
        state,
        { eventName: 'MILL_STATE_CHANGED' },
        contextAt(5, 0, 0)
      );
      expect(next?.stateName).toBe('diagnostics-display');
      expect(next?.display.X).toBe(DISPLAY_TEST_PATTERN);
    });
  });

  describe('keyboard echo (AC 46.4)', () => {
    it('echoes the pressed digit key without leaving the keyboard step', () => {
      const state = createTestState('diagnostics-keyboard', INITIAL_DIAGNOSTICS_DATA);
      const next = diagnosticsReducer(
        state,
        { eventName: 'KEY_5' },
        DEFAULT_TEST_CONTEXT
      );
      expect(next?.stateName).toBe('diagnostics-keyboard');
      expect(String(next?.display.X)).toContain('5');
    });

    it('echoes navigation keys by their digit label', () => {
      const state = createTestState('diagnostics-keyboard', INITIAL_DIAGNOSTICS_DATA);
      const next = diagnosticsReducer(
        state,
        { eventName: 'KEY_8_UP' },
        DEFAULT_TEST_CONTEXT
      );
      expect(next?.stateName).toBe('diagnostics-keyboard');
      expect(String(next?.display.X)).toContain('8');
    });

    it('advances from keyboard to encoder on ENTER', () => {
      const state = createTestState('diagnostics-keyboard', INITIAL_DIAGNOSTICS_DATA);
      const next = diagnosticsReducer(
        state,
        { eventName: 'KEY_ENTER' },
        DEFAULT_TEST_CONTEXT
      );
      expect(next?.stateName).toBe('diagnostics-encoder');
    });
  });

  describe('encoder diagnostics (AC 46.5)', () => {
    it('marks an axis as responding once it moves from the captured baseline', () => {
      // Enter encoder step with baseline captured at origin.
      const entry = diagnosticsReducer(
        createTestState('diagnostics-keyboard', INITIAL_DIAGNOSTICS_DATA),
        { eventName: 'KEY_ENTER' },
        contextAt(0, 0, 0)
      );
      expect(entry?.stateName).toBe('diagnostics-encoder');
      const data0 = entry?.stateData as DiagnosticsData;
      expect(data0.axesMoved).toEqual({ X: false, Y: false, Z: false });

      // Move X: a real MILL_STATE_CHANGED with X displaced from baseline.
      const afterX = diagnosticsReducer(
        entry!,
        { eventName: 'MILL_STATE_CHANGED' },
        contextAt(1.5, 0, 0)
      );
      const dataX = afterX?.stateData as DiagnosticsData;
      expect(dataX.axesMoved.X).toBe(true);
      expect(dataX.axesMoved.Y).toBe(false);
      expect(dataX.axesMoved.Z).toBe(false);
    });

    it('confirms all three axes after each has moved', () => {
      let cur = diagnosticsReducer(
        createTestState('diagnostics-keyboard', INITIAL_DIAGNOSTICS_DATA),
        { eventName: 'KEY_ENTER' },
        contextAt(0, 0, 0)
      )!;
      cur = diagnosticsReducer(cur, { eventName: 'MILL_STATE_CHANGED' }, contextAt(1, 0, 0))!;
      cur = diagnosticsReducer(cur, { eventName: 'MILL_STATE_CHANGED' }, contextAt(1, 1, 0))!;
      cur = diagnosticsReducer(cur, { eventName: 'MILL_STATE_CHANGED' }, contextAt(1, 1, 1))!;
      const data = cur.stateData as DiagnosticsData;
      expect(data.axesMoved).toEqual({ X: true, Y: true, Z: true });
    });
  });

  describe('single / double C exit (AC 46.6, 46.7)', () => {
    it('single C exits the current step back to the memory step', () => {
      const state = createTestState('diagnostics-display', INITIAL_DIAGNOSTICS_DATA);
      const next = diagnosticsReducer(
        state,
        { eventName: 'KEY_CLEAR' },
        DEFAULT_TEST_CONTEXT
      );
      expect(next?.stateName).toBe('diagnostics-memory');
    });

    it('double C exits diagnostics back to idle', () => {
      const first = diagnosticsReducer(
        createTestState('diagnostics-memory', INITIAL_DIAGNOSTICS_DATA),
        { eventName: 'KEY_CLEAR' },
        DEFAULT_TEST_CONTEXT
      );
      const second = diagnosticsReducer(
        first!,
        { eventName: 'KEY_CLEAR' },
        DEFAULT_TEST_CONTEXT
      );
      expect(second?.stateName).toBe('idle');
    });

    it('a MILL_STATE_CHANGED tick between the two C presses does NOT disarm the exit', () => {
      // First C arms the exit and drops to the memory step.
      const armed = diagnosticsReducer(
        createTestState('diagnostics-display', INITIAL_DIAGNOSTICS_DATA),
        { eventName: 'KEY_CLEAR' },
        contextAt(0, 0, 0)
      );
      expect(armed?.stateName).toBe('diagnostics-memory');
      expect((armed?.stateData as DiagnosticsData).clearPhase).toBe('armed');

      // A connected adapter ticks. This is NOT a key press, so it must not disarm
      // the gesture -- otherwise the second C never exits on real hardware (AC 46.7).
      const ticked = diagnosticsReducer(
        armed!,
        { eventName: 'MILL_STATE_CHANGED' },
        contextAt(7, 0, 0)
      );
      expect(ticked?.stateName).toBe('diagnostics-memory');
      expect((ticked?.stateData as DiagnosticsData).clearPhase).toBe('armed');

      // Second C still exits Self-Diagnostics to the normal screen.
      const exited = diagnosticsReducer(
        ticked!,
        { eventName: 'KEY_CLEAR' },
        contextAt(7, 0, 0)
      );
      expect(exited?.stateName).toBe('idle');
    });

    it('a non-C key between two C presses disarms the double-C exit', () => {
      const first = diagnosticsReducer(
        createTestState('diagnostics-memory', INITIAL_DIAGNOSTICS_DATA),
        { eventName: 'KEY_CLEAR' },
        DEFAULT_TEST_CONTEXT
      );
      // Now in memory step, armed. A non-C key advances and disarms.
      const middle = diagnosticsReducer(
        first!,
        { eventName: 'KEY_5' },
        DEFAULT_TEST_CONTEXT
      );
      expect(middle?.stateName).toBe('diagnostics-display');
      const afterC = diagnosticsReducer(
        middle!,
        { eventName: 'KEY_CLEAR' },
        DEFAULT_TEST_CONTEXT
      );
      // Single C again: back to memory, not idle.
      expect(afterC?.stateName).toBe('diagnostics-memory');
    });
  });
});

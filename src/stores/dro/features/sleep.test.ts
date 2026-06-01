/**
 * Unit tests for the display sleep-timer feature (US-026).
 *
 * Covers the `sleepReducer` transitions (sleep on SLEEP_TIMER_ELAPSED; wake on a
 * real key press or a real jog while asleep; never wake on idle ticks) and the
 * `useSleepTimer` hook idle countdown using FAKE timers (no real waits).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { sleepReducer, useSleepTimer, MINUTES_TO_MS } from './sleep';
import type { DROReducerContext, DROStatePayload } from '../types';
import { createTestState, DEFAULT_TEST_CONTEXT } from '../test-utils';
import { useDROStore } from '../../droStore';
import { INITIAL_DRO_STATE_PAYLOAD } from '../droStateMachine';
import { INITIAL_VOLATILE_MEMORY_STATE } from '../../../types/volatileMemory';
import { INITIAL_DISPLAY_STATE } from '../utils/displayComputation';
import { createDefaultMillState } from '../../../types/millState';

/** Context with the live machine at the given position. */
function contextAt(x: number, y: number, z: number): DROReducerContext {
  return {
    ...DEFAULT_TEST_CONTEXT,
    millState: { ...createDefaultMillState('noop'), position: { x, y, z } },
  };
}

/** An idle awake state. */
function awakeState(): DROStatePayload {
  return createTestState('idle');
}

/** An asleep state with the given sleep-baseline position. */
function asleepState(baseline = { X: 0, Y: 0, Z: 0 }): DROStatePayload {
  const base = createTestState('idle');
  return {
    ...base,
    vMem: { ...base.vMem, displayPower: 'asleep', sleepBaselinePosition: baseline },
  };
}

describe('sleepReducer', () => {
  it('sleeps on SLEEP_TIMER_ELAPSED from an awake display (AC26.5)', () => {
    const next = sleepReducer(awakeState(), { eventName: 'SLEEP_TIMER_ELAPSED' }, contextAt(1, 2, 3));
    expect(next).not.toBeNull();
    expect(next!.vMem.displayPower).toBe('asleep');
    // Baseline position is captured for jog detection.
    expect(next!.vMem.sleepBaselinePosition).toEqual({ X: 1, Y: 2, Z: 3 });
  });

  it('ignores SLEEP_TIMER_ELAPSED while already asleep (idempotent)', () => {
    const next = sleepReducer(asleepState(), { eventName: 'SLEEP_TIMER_ELAPSED' }, contextAt(0, 0, 0));
    expect(next).toBeNull();
  });

  it('passes through (returns null) for any event while awake', () => {
    expect(sleepReducer(awakeState(), { eventName: 'KEY_5' }, DEFAULT_TEST_CONTEXT)).toBeNull();
    expect(sleepReducer(awakeState(), { eventName: 'MILL_STATE_CHANGED' }, DEFAULT_TEST_CONTEXT)).toBeNull();
    expect(sleepReducer(awakeState(), { eventName: 'BTN_SELECT_X' }, DEFAULT_TEST_CONTEXT)).toBeNull();
  });

  it('wakes on a real key press while asleep, consuming the press (AC26.7, note *4)', () => {
    const next = sleepReducer(asleepState(), { eventName: 'KEY_5' }, contextAt(0, 0, 0));
    expect(next).not.toBeNull();
    expect(next!.vMem.displayPower).toBe('awake');
    expect(next!.vMem.sleepBaselinePosition).toBeNull();
  });

  it('wakes on an axis button while asleep (AC26.7)', () => {
    for (const eventName of ['BTN_SELECT_X', 'BTN_SELECT_Y', 'BTN_SELECT_Z'] as const) {
      const next = sleepReducer(asleepState(), { eventName }, contextAt(0, 0, 0));
      expect(next!.vMem.displayPower).toBe('awake');
    }
  });

  it('wakes on a real jog (position changed vs baseline) while asleep', () => {
    const next = sleepReducer(
      asleepState({ X: 0, Y: 0, Z: 0 }),
      { eventName: 'MILL_STATE_CHANGED' },
      contextAt(0.5, 0, 0)
    );
    expect(next!.vMem.displayPower).toBe('awake');
  });

  it('stays asleep on an identical-position MILL_STATE_CHANGED tick (no false wake)', () => {
    const next = sleepReducer(
      asleepState({ X: 0, Y: 0, Z: 0 }),
      { eventName: 'MILL_STATE_CHANGED' },
      contextAt(0, 0, 0)
    );
    expect(next).not.toBeNull();
    expect(next!.vMem.displayPower).toBe('asleep');
  });
});

describe('useSleepTimer (fake timers)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useDROStore.setState({
      stateName: 'idle',
      stateData: INITIAL_DRO_STATE_PAYLOAD.stateData,
      vMem: INITIAL_VOLATILE_MEMORY_STATE,
      display: INITIAL_DISPLAY_STATE,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('dispatches SLEEP_TIMER_ELAPSED after the configured idle minutes (AC26.5)', () => {
    const dispatch = vi.fn();
    renderHook(() => { useSleepTimer(dispatch, 'idle', 5); });

    // Not yet elapsed.
    vi.advanceTimersByTime(5 * MINUTES_TO_MS - 1);
    expect(dispatch).not.toHaveBeenCalled();

    // Elapsed.
    vi.advanceTimersByTime(1);
    expect(dispatch).toHaveBeenCalledWith({ eventName: 'SLEEP_TIMER_ELAPSED' });
  });

  it('never arms a timer when sleepTimeout is 0 (disabled, AC26.8)', () => {
    const dispatch = vi.fn();
    renderHook(() => { useSleepTimer(dispatch, 'idle', 0); });

    vi.advanceTimersByTime(120 * MINUTES_TO_MS);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('restarts the countdown on store activity (a dispatch resets the idle timer)', () => {
    const dispatch = vi.fn();
    renderHook(() => { useSleepTimer(dispatch, 'idle', 5); });

    // Almost elapsed, then a store update (user activity) resets the timer.
    vi.advanceTimersByTime(5 * MINUTES_TO_MS - 100);
    useDROStore.setState({ display: { ...INITIAL_DISPLAY_STATE, X: 1 } });

    // Original window passes: must NOT have fired because the timer restarted.
    vi.advanceTimersByTime(200);
    expect(dispatch).not.toHaveBeenCalled();

    // Full fresh window elapses from the activity: now it fires.
    vi.advanceTimersByTime(5 * MINUTES_TO_MS);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({ eventName: 'SLEEP_TIMER_ELAPSED' });
  });

  it('clears its timer on unmount', () => {
    const dispatch = vi.fn();
    const { unmount } = renderHook(() => { useSleepTimer(dispatch, 'idle', 5); });
    unmount();
    vi.advanceTimersByTime(10 * MINUTES_TO_MS);
    expect(dispatch).not.toHaveBeenCalled();
  });
});

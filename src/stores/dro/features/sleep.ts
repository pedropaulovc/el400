/**
 * Display Sleep Timer Feature (US-026)
 *
 * After the SLEEP T idle period (nvMem.sleepTimeout minutes, 0 = disabled) with
 * no key press or axis movement, the display sleeps: it blanks and the wrench LED
 * flashes (manual §6.2 `SLEEP t`, note *4 "the display is switched off for the
 * time in sleep timer, with any key operation the display gets 'ON'"). Any key
 * press or a real axis jog wakes it.
 *
 * Two cooperating pieces:
 *
 *   - `sleepReducer` (the root's global input gate): owns the `displayPower`
 *     transitions. It sleeps on the internal `SLEEP_TIMER_ELAPSED` event and,
 *     while asleep, wakes on any real key/button press or on a MILL_STATE_CHANGED
 *     whose machine position differs from the baseline captured at sleep time.
 *     The waking input is consumed (the device only wakes; it does not also act),
 *     matching the manual's "any key operation -> display ON" behaviour.
 *
 *   - `useSleepTimer` watches the store's genuine-activity counter: front-panel
 *     input or changed physical position. Unchanged adapter broadcasts do not
 *     restart the timer. With sleepTimeout = 0 the hook never arms a timer.
 *
 * Wake is therefore always driven by a REAL key event or a REAL adapter movement
 * flowing through the reducer -- never a window.* hook -- and sleep is driven by
 * the elapsed timer, not by forcing the state directly.
 */

import { useEffect, type Dispatch } from 'react';
import type { DROReducerContext, DROStatePayload, FeatureReducer } from '../types';
import type { DROEventPayload, DROStateName } from '../droStateMachine';
import type { AxisValues, VolatileMemoryState } from '../../../types/volatileMemory';
import { SLEEP_TIMEOUT_DISABLED } from '../../../types/nonVolatileMemory';
import { useDROStore } from '../../droStore';

/** Minutes -> milliseconds for the idle countdown. */
export const MINUTES_TO_MS = 60_000;

/** Snapshot the live machine position from the reducer context. */
function positionSnapshot(context: DROReducerContext): AxisValues {
  const { x, y, z } = context.millState.position;
  return { X: x, Y: y, Z: z };
}

/** True when two machine positions differ on any axis (a real jog occurred). */
function positionMoved(a: AxisValues, b: AxisValues): boolean {
  return a.X !== b.X || a.Y !== b.Y || a.Z !== b.Z;
}

/**
 * Whether an event is a real user key/button press (US-026 wake trigger). Any
 * keypad digit, navigation, axis, or function button counts; internal/system
 * events (BOOT_*, *_TIMEOUT, MILL_STATE_CHANGED, SLEEP_TIMER_ELAPSED, ...) do not.
 */
function isKeyPress(eventName: DROEventPayload['eventName']): boolean {
  return eventName.startsWith('KEY_') || eventName.startsWith('BTN_');
}

/** Put the display to sleep, capturing the position baseline for jog detection. */
function sleep(state: DROStatePayload, context: DROReducerContext): DROStatePayload {
  const vMem: VolatileMemoryState = {
    ...state.vMem,
    displayPower: 'asleep',
    sleepBaselinePosition: positionSnapshot(context),
  };
  // Keep the underlying coordinates and datum intact; the renderer blanks the
  // sleeping display without deleting its position data.
  return { ...state, vMem };
}

/** Wake the display, clearing the sleep baseline. */
function wake(state: DROStatePayload): DROStatePayload {
  const vMem: VolatileMemoryState = {
    ...state.vMem,
    displayPower: 'awake',
    sleepBaselinePosition: null,
  };
  return { ...state, vMem };
}

export const sleepReducer: FeatureReducer = (statePayload, eventPayload, context) => {
  const { eventName } = eventPayload;
  const { displayPower, sleepBaselinePosition } = statePayload.vMem;

  // Idle period elapsed: sleep if currently awake; ignore a duplicate while asleep.
  if (eventName === 'SLEEP_TIMER_ELAPSED') {
    if (displayPower === 'asleep') return statePayload;
    return sleep(statePayload, context);
  }

  // While awake, this reducer never consumes events -- let them flow normally.
  if (displayPower === 'awake') return null;

  // Asleep: any real key/button press wakes the display (AC26.7, note *4). The
  // waking press is consumed here so it only wakes (the device does not also act).
  if (isKeyPress(eventName)) {
    return wake(statePayload);
  }

  // Asleep: a real axis jog (movement vs the sleep baseline) wakes the display.
  if (eventName === 'MILL_STATE_CHANGED' && sleepBaselinePosition !== null) {
    if (positionMoved(positionSnapshot(context), sleepBaselinePosition)) {
      return wake(statePayload);
    }
  }

  // Asleep but the event is not a wake trigger (e.g. an identical position tick):
  // stay asleep and consume it so no downstream reducer reacts while sleeping.
  return statePayload;
};

/**
 * Hook that drives the display sleep idle countdown (US-026).
 *
 * Restarts only for front-panel input or actual physical movement. Unchanged
 * encoder ticks and internal confirmation timers are not operator activity.
 * A `sleepTimeout` of 0 disables the timer entirely.
 *
 * @param dispatch - DRO dispatch function
 * @param droState - Current DRO state name (unused for gating today; kept for
 *   parity with the other intro hooks and future state-scoped sleep rules)
 * @param sleepTimeoutMinutes - Idle period in minutes (0 = disabled)
 */
export function useSleepTimer(
  dispatch: Dispatch<DROEventPayload>,
  droState: DROStateName,
  sleepTimeoutMinutes: number
): void {
  // Intentionally references droState so callers can pass it uniformly; the
  // timer itself reacts to store activity rather than the state name.
  void droState;

  useEffect(() => {
    if (sleepTimeoutMinutes <= SLEEP_TIMEOUT_DISABLED) return undefined;

    const durationMs = sleepTimeoutMinutes * MINUTES_TO_MS;
    let timer: ReturnType<typeof setTimeout>;

    const arm = (): void => {
      clearTimeout(timer);
      if (useDROStore.getState().vMem.displayPower === 'asleep') return;
      timer = setTimeout(() => {
        dispatch({ eventName: 'SLEEP_TIMER_ELAPSED' });
      }, durationMs);
    };

    arm();

    const unsubscribe = useDROStore.subscribe((current, previous) => {
      if (current.activityVersion !== previous.activityVersion) arm();
    });

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [dispatch, sleepTimeoutMinutes]);
}

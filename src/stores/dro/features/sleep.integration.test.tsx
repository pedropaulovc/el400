/**
 * Integration tests for the display sleep timer (US-026).
 *
 * Drives the full simulator. The idle countdown is advanced with FAKE timers (no
 * real waits); sleep is reached via the real SLEEP_TIMER_ELAPSED path, and wake
 * is triggered by a REAL key press (clicking a keypad button) or a REAL jog
 * (a millStore position change + MILL_STATE_CHANGED, the same event a connected
 * adapter emits) -- never by forcing displayPower directly.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, act, fireEvent } from '@testing-library/react';
import { renderSimulator } from '../../../tests/helpers/integration-test-utils';
import { useSettingsStore } from '../../settingsStore';
import { useMillStore } from '../../millStore';
import { useDROStore } from '../../droStore';
import { createDefaultMillState } from '../../../types/millState';
import { MINUTES_TO_MS } from './sleep';

function panel(): HTMLElement {
  return screen.getByTestId('display-panel');
}

function isAsleep(): boolean {
  return panel().getAttribute('data-display-power') === 'asleep';
}

/** Advance fake timers inside act() so React effects flush. */
function advance(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

/** Set the SLEEP T timeout inside act() so the hook's effect re-arms. */
function setSleepTimeout(minutes: number): void {
  act(() => {
    useSettingsStore.getState().updateNvMem({ sleepTimeout: minutes });
  });
}

/** Simulate a real jog: update the mill position and dispatch MILL_STATE_CHANGED. */
function jog(deltaX: number): void {
  act(() => {
    const prev = useMillStore.getState().millState;
    useMillStore.setState({
      millState: {
        ...prev,
        connected: true,
        position: { ...prev.position, x: prev.position.x + deltaX },
      },
    });
    useDROStore.getState().dispatch({ eventName: 'MILL_STATE_CHANGED' });
  });
}

describe('US-026 Display Sleep Timer (integration)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('display sleeps after the configured idle period elapses (AC26.5, AC26.6)', async () => {
    await renderSimulator({ millSource: 'noop' });
    setSleepTimeout(5);
    useMillStore.setState({ millState: createDefaultMillState('noop') });

    expect(isAsleep()).toBe(false);

    advance(5 * MINUTES_TO_MS);

    expect(isAsleep()).toBe(true);
    // Wrench/sleep LED flashes while asleep (AC26.6).
    expect(screen.getByTestId('sleep-led').className).toMatch(/flashing/);
  });

  it('a real key press wakes the sleeping display (AC26.7)', async () => {
    await renderSimulator({ millSource: 'noop' });
    setSleepTimeout(5);

    advance(5 * MINUTES_TO_MS);
    expect(isAsleep()).toBe(true);

    // A real keypad-button click dispatches KEY_5 through the store; the sleep
    // reducer consumes it to wake (fireEvent, not userEvent, to stay compatible
    // with fake timers).
    act(() => {
      fireEvent.click(screen.getByTestId('key-5'));
    });
    expect(isAsleep()).toBe(false);
  });

  it('a real X axis button wakes the sleeping display (AC26.7)', async () => {
    await renderSimulator({ millSource: 'noop' });
    setSleepTimeout(5);

    advance(5 * MINUTES_TO_MS);
    expect(isAsleep()).toBe(true);

    act(() => {
      fireEvent.click(screen.getByTestId('axis-select-x'));
    });
    expect(isAsleep()).toBe(false);
  });

  it('a real jog wakes the sleeping display (AC26.7)', async () => {
    await renderSimulator({ millSource: 'noop' });
    setSleepTimeout(5);
    useMillStore.setState({ millState: createDefaultMillState('noop') });

    advance(5 * MINUTES_TO_MS);
    expect(isAsleep()).toBe(true);

    jog(1.0);
    expect(isAsleep()).toBe(false);
  });

  it('never sleeps when sleepTimeout is 0 (disabled, AC26.8)', async () => {
    await renderSimulator({ millSource: 'noop' });
    setSleepTimeout(0);

    advance(120 * MINUTES_TO_MS);

    expect(isAsleep()).toBe(false);
  });
});

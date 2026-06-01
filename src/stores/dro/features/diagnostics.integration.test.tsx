/**
 * Self-Diagnostics Feature Integration Tests (US-046, manual §11.1)
 *
 * Drives the full simulator: enters diagnostics by pressing the real ▲ (8) key
 * during the boot message, walks the diagnostic steps, exercises keyboard echo,
 * verifies encoder movement through a real MILL_STATE_CHANGED dispatch, and
 * exits with a double-C.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { act, screen } from '@testing-library/react';
import {
  getAxisDisplayPureTextValue,
  renderSimulator,
} from '../../../tests/helpers/integration-test-utils';
import { DIAGNOSTICS_TEXT } from '../droStateMachine';
import { useDROStore } from '../../droStore';
import { useMillStore } from '../../millStore';

/** Put the (connected) mill at a machine position and emit MILL_STATE_CHANGED. */
function jogTo(x: number, y: number, z: number): void {
  act(() => {
    useMillStore.setState((s) => ({
      millState: { ...s.millState, connected: true, position: { x, y, z } },
    }));
    useDROStore.getState().dispatch({ eventName: 'MILL_STATE_CHANGED' });
  });
}

/**
 * Enter diagnostics by pressing the real ▲ (8) key during the boot message.
 * Renders against a LIVE, ticking mill (the default) and returns its wrapped
 * `user`, so every subsequent interaction runs the diagnostics state machine
 * under a production-like MILL_STATE_CHANGED tick — the exact traffic that hid
 * the US-046 auto-skip bug.
 */
async function enterDiagnostics(): Promise<ReturnType<typeof userEvent.setup>> {
  const { user } = await renderSimulator({ bootMessageMode: 'show' });
  // The boot message must be on screen before ▲ enters diagnostics.
  expect(getAxisDisplayPureTextValue('X')).toBe('EL400');
  await user.click(screen.getByTestId('key-8'));
  expect(useDROStore.getState().stateName).toBe('diagnostics-memory');
  return user;
}

describe('Self-diagnostics integration tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('AC 46.1/46.2: ▲ during boot enters memory diagnostics showing RAM pass', async () => {
    await enterDiagnostics();
    expect(getAxisDisplayPureTextValue('X')).toBe(DIAGNOSTICS_TEXT.memoryPass);
  });

  it('AC 46.3/46.4: any key advances memory -> display -> keyboard, then echoes the key', async () => {
    const user = await enterDiagnostics();

    await user.click(screen.getByTestId('key-1')); // -> display
    expect(useDROStore.getState().stateName).toBe('diagnostics-display');

    await user.click(screen.getByTestId('key-1')); // -> keyboard
    expect(useDROStore.getState().stateName).toBe('diagnostics-keyboard');

    await user.click(screen.getByTestId('key-5')); // echoes 5
    expect(useDROStore.getState().stateName).toBe('diagnostics-keyboard');
    // The echoed key may render as a bare digit, so read the raw display text.
    expect(screen.getByTestId('axis-value-x').textContent).toContain('5');
  });

  it('AC 46.2/46.3: connected-source MILL_STATE_CHANGED ticks do NOT skip the memory step', async () => {
    const user = await enterDiagnostics();
    expect(getAxisDisplayPureTextValue('X')).toBe(DIAGNOSTICS_TEXT.memoryPass);

    // A connected adapter floods MILL_STATE_CHANGED (every 100ms in ?source=debug).
    // These are the genuine adapter path (millStore + MILL_STATE_CHANGED), not a
    // forced state latch. None of them is a key press, so the memory step (RAmPASS)
    // must stay on screen -- the operator still gets to see it.
    jogTo(1, 0, 0);
    jogTo(2, 0, 0);
    jogTo(3, 1, 0);
    expect(useDROStore.getState().stateName).toBe('diagnostics-memory');
    expect(getAxisDisplayPureTextValue('X')).toBe(DIAGNOSTICS_TEXT.memoryPass);

    // A real front-panel key still advances to the segment (display) test.
    await user.click(screen.getByTestId('key-1'));
    expect(useDROStore.getState().stateName).toBe('diagnostics-display');
  });

  it('AC 46.5: encoder step confirms an axis once it moves (real MILL_STATE_CHANGED)', async () => {
    const user = await enterDiagnostics();

    await user.click(screen.getByTestId('key-1')); // display
    await user.click(screen.getByTestId('key-1')); // keyboard
    await user.click(screen.getByTestId('key-enter')); // encoder
    expect(useDROStore.getState().stateName).toBe('diagnostics-encoder');

    // Real jog: a connected-mill position update drives the movement check.
    jogTo(2, 0, 0);
    expect(getAxisDisplayPureTextValue('X')).toContain('X');
  });

  it('AC 46.6/46.7: double C exits diagnostics back to idle', async () => {
    const user = await enterDiagnostics();

    await user.click(screen.getByTestId('key-clear')); // exit current step
    expect(useDROStore.getState().stateName).toBe('diagnostics-memory');
    await user.click(screen.getByTestId('key-clear')); // exit diagnostics
    expect(useDROStore.getState().stateName).toBe('idle');
  });
});

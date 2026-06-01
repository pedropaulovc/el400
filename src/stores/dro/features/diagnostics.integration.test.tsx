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

/** Enter diagnostics by pressing the real ▲ (8) key during the boot message. */
async function enterDiagnostics(user: ReturnType<typeof userEvent.setup>) {
  renderSimulator({ bootMessageMode: 'show' });
  // The boot message must be on screen before ▲ enters diagnostics.
  expect(getAxisDisplayPureTextValue('X')).toBe('EL400');
  await user.click(screen.getByTestId('key-8'));
  expect(useDROStore.getState().stateName).toBe('diagnostics-memory');
}

describe('Self-diagnostics integration tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('AC 46.1/46.2: ▲ during boot enters memory diagnostics showing RAM pass', async () => {
    const user = userEvent.setup();
    await enterDiagnostics(user);
    expect(getAxisDisplayPureTextValue('X')).toBe(DIAGNOSTICS_TEXT.memoryPass);
  });

  it('AC 46.3/46.4: any key advances memory -> display -> keyboard, then echoes the key', async () => {
    const user = userEvent.setup();
    await enterDiagnostics(user);

    await user.click(screen.getByTestId('key-1')); // -> display
    expect(useDROStore.getState().stateName).toBe('diagnostics-display');

    await user.click(screen.getByTestId('key-1')); // -> keyboard
    expect(useDROStore.getState().stateName).toBe('diagnostics-keyboard');

    await user.click(screen.getByTestId('key-5')); // echoes 5
    expect(useDROStore.getState().stateName).toBe('diagnostics-keyboard');
    // The echoed key may render as a bare digit, so read the raw display text.
    expect(screen.getByTestId('axis-value-x').textContent).toContain('5');
  });

  it('AC 46.5: encoder step confirms an axis once it moves (real MILL_STATE_CHANGED)', async () => {
    const user = userEvent.setup();
    await enterDiagnostics(user);

    await user.click(screen.getByTestId('key-1')); // display
    await user.click(screen.getByTestId('key-1')); // keyboard
    await user.click(screen.getByTestId('key-enter')); // encoder
    expect(useDROStore.getState().stateName).toBe('diagnostics-encoder');

    // Real jog: a connected-mill position update drives the movement check.
    jogTo(2, 0, 0);
    expect(getAxisDisplayPureTextValue('X')).toContain('X');
  });

  it('AC 46.6/46.7: double C exits diagnostics back to idle', async () => {
    const user = userEvent.setup();
    await enterDiagnostics(user);

    await user.click(screen.getByTestId('key-clear')); // exit current step
    expect(useDROStore.getState().stateName).toBe('diagnostics-memory');
    await user.click(screen.getByTestId('key-clear')); // exit diagnostics
    expect(useDROStore.getState().stateName).toBe('idle');
  });
});

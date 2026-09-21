/**
 * Taper Calculation Integration tests (US-045)
 *
 * Drives the real simulator: open the function menu, navigate to the `tAPEr`
 * entry, enter the function, then simulate moving the tool to the far end of
 * the taper by updating the mill position. Asserts the angle and radius land on
 * the displays dictated by the `tAPEr on` setup parameter.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderSimulator,
  getAxisDisplayPureTextValue,
  getAxisDisplayPureNumberValue,
} from '../../../tests/helpers/integration-test-utils';
import { useDROStore } from '../../droStore';
import { useMillStore } from '../../millStore';
import { useSettingsStore } from '../../settingsStore';
import type { TaperOnAxis } from '../../../types/nonVolatileMemory';

/** Open the function menu and step right to the taper entry, then enter it. */
async function enterTaperFromMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTestId('btn-function')); // idle -> function-menu-center
  // Top-level ring: center, linear, polar, probe, six-output, taper.
  for (let i = 0; i < 5; i++) {
    await user.click(screen.getByTestId('key-6'));
  }
  expect(useDROStore.getState().stateName).toBe('function-menu-taper');
  expect(getAxisDisplayPureTextValue('X')).toBe('tAPEr');
  await user.click(screen.getByTestId('key-enter'));
  expect(useDROStore.getState().stateName).toBe('taper-active');
}

/** Simulate the encoders reporting a new absolute position (mm) at the far end. */
async function moveToolTo(x: number, y: number, z: number) {
  await act(async () => {
    const mill = useMillStore.getState().millState;
    useMillStore.setState({
      millState: { ...mill, connected: true, position: { x, y, z } },
    });
    useDROStore.getState().dispatch({ eventName: 'MILL_STATE_CHANGED' });
  });
}

function setTaperOnAxis(axis: TaperOnAxis) {
  useSettingsStore.getState().updateNvMem({ taperOnAxis: axis });
}

describe('Taper Calculation Integration (US-045)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows DMS half-angle on X and radius on Z in mm mode', async () => {
    const { user } = await renderSimulator({ millSource: 'noop' });
    await user.click(screen.getByTestId('btn-toggle-unit'));
    setTaperOnAxis('X');
    await enterTaperFromMenu(user);

    await moveToolTo(5, 0, 50);

    expect(getAxisDisplayPureTextValue('X')).toBe('5.42.38');
    expect(getAxisDisplayPureNumberValue('Z')).toBeCloseTo(5, 3);
    expect(getAxisDisplayPureTextValue('Y')).toBe('');
  });

  it('routes the DMS angle to each real Y/Z setup choice', async () => {
    const { user } = await renderSimulator({ millSource: 'noop' });
    await user.click(screen.getByTestId('btn-toggle-unit'));

    setTaperOnAxis('Y');
    await enterTaperFromMenu(user);
    await moveToolTo(5, 0, 50);
    expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(5, 3);
    expect(getAxisDisplayPureTextValue('Y')).toBe('5.42.38');

    await user.click(screen.getByTestId('key-clear'));
    setTaperOnAxis('Z');
    await enterTaperFromMenu(user);
    await moveToolTo(10, 0, 100);
    expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(5, 3);
    expect(getAxisDisplayPureTextValue('Z')).toBe('5.42.38');
  });

  it('AC 45.5: pressing C exits taper and returns to normal display', async () => {
    const { user } = await renderSimulator({ millSource: 'noop' });
    setTaperOnAxis('X');
    await enterTaperFromMenu(user);

    await user.click(screen.getByTestId('key-clear'));
    expect(useDROStore.getState().stateName).toBe('idle');
  });
});

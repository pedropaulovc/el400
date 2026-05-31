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
  // Ring: center, circle, line, linear, polar, taper => 5 right presses.
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

  it('AC 45.2/45.3: taper on X shows angle on X and radius on Z (mm)', async () => {
    const user = userEvent.setup();
    renderSimulator();
    await user.click(screen.getByTestId('btn-toggle-unit')); // mm so values map directly
    setTaperOnAxis('X');

    // Mill starts at origin; entry captured at (0,0,0).
    await enterTaperFromMenu(user);

    // FN LED on while in taper (AC: function active)
    expect(useDROStore.getState().stateName).toBe('taper-active');

    // Move to far end: dX = 5 (radius), dZ = 50 (length).
    await moveToolTo(5, 0, 50);

    // angle = atan(5/50) = 5.7106 deg on X
    expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(5.7106, 3);
    // radius = 5 mm on Z
    expect(getAxisDisplayPureNumberValue('Z')).toBeCloseTo(5, 3);
    // Y display is blank in taper mode
    expect(getAxisDisplayPureTextValue('Y')).toBe('');
  });

  it('AC 45.3: taper on Z shows angle on Z and radius on X', async () => {
    const user = userEvent.setup();
    renderSimulator();
    await user.click(screen.getByTestId('btn-toggle-unit'));
    setTaperOnAxis('Z');

    await enterTaperFromMenu(user);
    await moveToolTo(5, 0, 50);

    // angle on Z = atan(dX/dZ) = atan(5/50)
    expect(getAxisDisplayPureNumberValue('Z')).toBeCloseTo(5.7106, 3);
    // radius on X = dX = 5 mm
    expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(5, 3);
  });

  it('AC 45.5: pressing C exits taper and returns to normal display', async () => {
    const user = userEvent.setup();
    renderSimulator();
    setTaperOnAxis('X');
    await enterTaperFromMenu(user);

    await user.click(screen.getByTestId('key-clear'));
    expect(useDROStore.getState().stateName).toBe('idle');
  });
});

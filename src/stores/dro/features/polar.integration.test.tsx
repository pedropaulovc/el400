/**
 * Polar Coordinates Integration Tests (US-030)
 *
 * Drives the real simulator from the function menu through plane selection
 * into the polar counting-mode display, then back to Cartesian.
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
import { createDefaultMillState } from '../../../types/millState';

/** Push a connected mill position (mm) and let the DRO react to it. */
function setMillPosition(x: number, y: number, z: number): void {
  act(() => {
    useMillStore.setState({
      millState: {
        ...createDefaultMillState('mock'),
        connected: true,
        position: { x, y, z },
      },
    });
    // The store wiring dispatches MILL_STATE_CHANGED on real connections; in
    // tests we dispatch it directly after updating the mill state.
    useDROStore.getState().dispatch({ eventName: 'MILL_STATE_CHANGED' });
  });
}

/** Navigate Fn -> PoLAr -> ENT to reach plane selection. */
async function openPolarPlaneSelect(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTestId('btn-function'));
  // Menu ring: center -> circle -> line -> linear -> polar (4 right presses)
  for (let i = 0; i < 4; i++) {
    await user.click(screen.getByTestId('key-6'));
  }
  expect(getAxisDisplayPureTextValue('X')).toBe('PoLAr');
  await user.click(screen.getByTestId('key-enter'));
}

describe('Polar Coordinates Integration (US-030)', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.clear();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('AC 30.1/30.2: navigates Fn -> PoLAr -> ENT into plane selection (H-Y default)', async () => {
    const user = userEvent.setup();
    renderSimulator();

    await openPolarPlaneSelect(user);

    expect(useDROStore.getState().stateName).toBe('polar-select-plane');
    expect(getAxisDisplayPureTextValue('X')).toBe('h-Y');
    // Fn LED stays on in polar mode
    expect(screen.getByTestId('led-fn').querySelector('span')?.className).toContain('text-red-400');
  });

  it('AC 30.2: cycles plane options H-Y -> H-Z -> Y-Z with the right key', async () => {
    const user = userEvent.setup();
    renderSimulator();

    await openPolarPlaneSelect(user);
    expect(getAxisDisplayPureTextValue('X')).toBe('h-Y');

    await user.click(screen.getByTestId('key-6'));
    expect(getAxisDisplayPureTextValue('X')).toBe('h-Z');

    await user.click(screen.getByTestId('key-6'));
    expect(getAxisDisplayPureTextValue('X')).toBe('Y-Z');

    await user.click(screen.getByTestId('key-6'));
    expect(getAxisDisplayPureTextValue('X')).toBe('h-Y');
  });

  it('AC 30.3/30.4/30.5: X-Y plane shows R on X and θ on Y (3,4 -> 5, 53.13°)', async () => {
    const user = userEvent.setup();
    renderSimulator();

    // Use mm so the radius reads directly.
    act(() => { useSettingsStore.getState().updateNvMem({ defaultUnit: 'mm' }); });

    await openPolarPlaneSelect(user);
    await user.click(screen.getByTestId('key-enter')); // confirm H-Y plane

    expect(useDROStore.getState().stateName).toBe('polar-coordinates');

    setMillPosition(3, 4, 0);

    expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(5, 3); // R
    expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(53.1301, 2); // θ
    expect(getAxisDisplayPureTextValue('Z')).toBe(''); // unused axis blank
  });

  it('display updates live as position changes', async () => {
    const user = userEvent.setup();
    renderSimulator();
    act(() => { useSettingsStore.getState().updateNvMem({ defaultUnit: 'mm' }); });

    await openPolarPlaneSelect(user);
    await user.click(screen.getByTestId('key-enter'));

    setMillPosition(10, 0, 0);
    expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(10, 3); // R
    expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(0, 3); // θ = 0°

    setMillPosition(0, 10, 0);
    expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(10, 3); // R
    expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(90, 3); // θ = 90°
  });

  it('AC 30.6: C exits polar mode and returns to Cartesian display', async () => {
    const user = userEvent.setup();
    renderSimulator();
    act(() => { useSettingsStore.getState().updateNvMem({ defaultUnit: 'mm' }); });

    await openPolarPlaneSelect(user);
    await user.click(screen.getByTestId('key-enter'));
    setMillPosition(3, 4, 0);
    expect(useDROStore.getState().stateName).toBe('polar-coordinates');

    await user.click(screen.getByTestId('key-clear'));

    expect(useDROStore.getState().stateName).toBe('idle');
    // Cartesian display restored: X=3, Y=4, Z=0 (mm)
    expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(3, 3);
    expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(4, 3);
    expect(getAxisDisplayPureNumberValue('Z')).toBeCloseTo(0, 3);
    // Fn LED off again
    expect(screen.getByTestId('led-fn').querySelector('span')?.className).not.toContain('text-red-400');
  });

  it('C cancels during plane selection and returns to idle', async () => {
    const user = userEvent.setup();
    renderSimulator();

    await openPolarPlaneSelect(user);
    expect(useDROStore.getState().stateName).toBe('polar-select-plane');

    await user.click(screen.getByTestId('key-clear'));
    expect(useDROStore.getState().stateName).toBe('idle');
  });
});

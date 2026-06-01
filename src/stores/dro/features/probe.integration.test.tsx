/**
 * Touch Probe Integration Tests (US-032)
 *
 * Drives the real simulator from the function menu through the probe
 * sub-functions, firing probe contacts by pushing a connected MillState whose
 * `probe` field carries the controller pin state (exactly what the
 * CncjsMillAdapter computes), then dispatching MILL_STATE_CHANGED. No internal
 * state is forced and no window hook is used.
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
import { createDefaultMillState, createProbeState } from '../../../types/millState';

/** Push a connected mill position (mm) and probe pin state, then react. */
function setMill(x: number, pinState = ''): void {
  act(() => {
    useMillStore.setState({
      millState: {
        ...createDefaultMillState('mock'),
        connected: true,
        position: { x, y: 0, z: 0 },
        probe: createProbeState(pinState),
      },
    });
    useDROStore.getState().dispatch({ eventName: 'MILL_STATE_CHANGED' });
  });
}

/** A single probe contact at position x: rising edge ('' -> 'P') then release. */
function probeContactAt(x: number): void {
  setMill(x, '');   // open, positioned
  setMill(x, 'P');  // rising edge -> capture
  setMill(x, '');   // release
}

/** Fn -> ProbE -> ENT to reach the probe sub-function menu. */
async function openProbeMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTestId('btn-function'));
  // Ring: center, circle, line, linear, polar, taper, probe => 6 right presses.
  for (let i = 0; i < 6; i++) {
    await user.click(screen.getByTestId('key-6'));
  }
  expect(getAxisDisplayPureTextValue('X')).toBe('ProbE');
  await user.click(screen.getByTestId('key-enter'));
  expect(getAxisDisplayPureTextValue('X')).toBe('Prob Ed');
}

describe('Touch Probe Integration (US-032)', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.clear();
  });

  /** Render and switch to mm so measurements read directly (resetStores -> inch). */
  async function renderMm() {
    const result = await renderSimulator({ millSource: 'noop' });
    act(() => { useSettingsStore.getState().updateNvMem({ defaultUnit: 'mm' }); });
    return result;
  }

  afterEach(() => {
    // No reducer-conflict errors should have been logged.
    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Multiple reducers handled the same event'),
      expect.anything()
    );
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('AC 32.4: Edge function sets the selected axis datum to zero at the contact', async () => {
    const { user } = await renderMm();

    await openProbeMenu(user);
    // Edge is the default sub-function; confirm and pick X.
    await user.click(screen.getByTestId('key-enter'));
    expect(useDROStore.getState().stateName).toBe('probe-axis-select');
    await user.click(screen.getByTestId('axis-select-x'));
    expect(useDROStore.getState().stateName).toBe('probe-waiting');

    // Approach and touch the edge at X=50.
    setMill(50, '');
    setMill(50, 'P');

    expect(useDROStore.getState().stateName).toBe('probe-result');
    // Datum set: with the probe at machine X=50, the readout reads 0.
    expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(0, 3);
    // Visual indication on trigger (AC 32.8).
    expect(screen.getByTestId('led-probe').querySelector('span')?.className).toContain('text-red-400');

    // C exits back to idle (AC 32.10).
    await user.click(screen.getByTestId('key-clear'));
    expect(useDROStore.getState().stateName).toBe('idle');
  });

  it('AC 32.5: Midpoint function sets the datum at the midpoint of two edges', async () => {
    const { user } = await renderMm();

    await openProbeMenu(user);
    // Cycle to Midpoint.
    await user.click(screen.getByTestId('key-6'));
    expect(getAxisDisplayPureTextValue('X')).toBe('Prob nd');
    await user.click(screen.getByTestId('key-enter'));
    await user.click(screen.getByTestId('axis-select-x'));

    probeContactAt(10);
    expect(useDROStore.getState().stateName).toBe('probe-waiting');
    probeContactAt(50);

    expect(useDROStore.getState().stateName).toBe('probe-result');
    // Datum committed at the midpoint (machine X=30). Exit to idle (AC 32.10),
    // then verify the midpoint position reads 0 in normal counting.
    await user.click(screen.getByTestId('key-clear'));
    expect(useDROStore.getState().stateName).toBe('idle');
    setMill(30, '');
    expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(0, 3);
  });

  it('AC 32.6: Inside measurement adds the probe diameter to the span', async () => {
    const { user } = await renderMm();

    await openProbeMenu(user);
    // Cycle to Inside (edge -> midpoint -> inside).
    await user.click(screen.getByTestId('key-6'));
    await user.click(screen.getByTestId('key-6'));
    expect(getAxisDisplayPureTextValue('X')).toBe('inS dE');
    await user.click(screen.getByTestId('key-enter'));

    // Enter 6 mm probe diameter.
    expect(useDROStore.getState().stateName).toBe('probe-diameter');
    await user.click(screen.getByTestId('key-6'));
    await user.click(screen.getByTestId('key-enter'));
    await user.click(screen.getByTestId('axis-select-x'));

    probeContactAt(10);
    probeContactAt(60);

    // (60 - 10) + 6 = 56 mm.
    expect(useDROStore.getState().stateName).toBe('probe-result');
    expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(56, 3);
  });

  it('AC 32.6: Outside measurement subtracts the probe diameter from the span', async () => {
    const { user } = await renderMm();

    await openProbeMenu(user);
    // Cycle to Outside (edge -> midpoint -> inside -> outside).
    for (let i = 0; i < 3; i++) await user.click(screen.getByTestId('key-6'));
    expect(getAxisDisplayPureTextValue('X')).toBe('oUtS dE');
    await user.click(screen.getByTestId('key-enter'));

    // Enter 6 mm probe diameter.
    await user.click(screen.getByTestId('key-6'));
    await user.click(screen.getByTestId('key-enter'));
    await user.click(screen.getByTestId('axis-select-x'));

    probeContactAt(0);
    probeContactAt(50);

    // (50 - 0) - 6 = 44 mm.
    expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(44, 3);
  });

  it('AC 32.3: Freeze mode halts the display on contact and resumes after release', async () => {
    await renderMm();
    act(() => { useSettingsStore.getState().updateNvMem({ probeDroType: 'freeze' }); });

    // Normal counting at X=25.
    setMill(25, '');
    expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(25, 3);

    // Probe contact freezes the display; further motion does not update it.
    setMill(25, 'P');
    setMill(30, 'P');
    expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(25, 3);

    // Probe clears: counting resumes.
    setMill(30, '');
    expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(30, 3);

    // Sanity: never left idle (no probe function entered).
    expect(useDROStore.getState().stateName).toBe('idle');
  });

  it('AC 32.2: Transmit mode keeps counting through a trigger', async () => {
    await renderMm();
    act(() => { useSettingsStore.getState().updateNvMem({ probeDroType: 'transmit' }); });

    setMill(25, '');
    expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(25, 3);
    // Trigger while moving: display keeps following the position.
    setMill(40, 'P');
    expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(40, 3);
  });
});

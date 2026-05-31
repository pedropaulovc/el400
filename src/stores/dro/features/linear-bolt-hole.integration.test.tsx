/**
 * Integration tests for the Linear Bolt Hole feature (US-029).
 *
 * Drives the full simulator from the function menu through axis selection,
 * pitch and hole-count entry, and hole navigation, asserting display output.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderSimulator,
  enterValue,
  getAxisDisplayPureTextValue,
  getAxisDisplayPureNumberValue,
} from '../../../tests/helpers/integration-test-utils';
import { useDROStore } from '../../droStore';

describe('Linear Bolt Hole Integration (US-029)', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.clear();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  /** Open the function menu and navigate to the LinEAr item. */
  async function openLinearMenu(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByTestId('btn-function'));
    expect(getAxisDisplayPureTextValue('X')).toBe('CEntrE');
    // CEntrE -> CirCLE -> LinE -> LinEAr
    await user.click(screen.getByTestId('key-6'));
    await user.click(screen.getByTestId('key-6'));
    await user.click(screen.getByTestId('key-6'));
    expect(getAxisDisplayPureTextValue('X')).toBe('LinEAr');
  }

  it('enters the linear bolt hole axis-selection prompt from the menu', async () => {
    const user = userEvent.setup({ delay: null });
    renderSimulator();

    await openLinearMenu(user);
    await user.click(screen.getByTestId('key-enter'));

    expect(useDROStore.getState().stateName).toBe('linear-bolt-hole-axis');
    expect(getAxisDisplayPureTextValue('X')).toBe('AXIS');
  });

  it('completes the full flow on the X axis (mm) and shows distance-to-go', async () => {
    const user = userEvent.setup({ delay: null });
    renderSimulator();

    // Use mm so entered values map 1:1 to displayed distances.
    await user.click(screen.getByTestId('btn-toggle-unit'));

    await openLinearMenu(user);
    await user.click(screen.getByTestId('key-enter'));
    expect(useDROStore.getState().stateName).toBe('linear-bolt-hole-axis');

    // Select X axis -> resets X and switches to INC, then prompts for pitch
    await user.click(screen.getByTestId('axis-select-x'));
    expect(useDROStore.getState().stateName).toBe('linear-bolt-hole-pitch');
    expect(useDROStore.getState().vMem.mode).toBe('inc');
    expect(getAxisDisplayPureTextValue('Y')).toBe('PitCh');
    expect(getAxisDisplayPureNumberValue('X')).toBe(0);

    // Enter pitch = 10mm
    await enterValue(user, '10');
    expect(useDROStore.getState().stateName).toBe('linear-bolt-hole-holes');
    expect(getAxisDisplayPureTextValue('Y')).toBe('hoLES');

    // Enter number of holes = 5
    await enterValue(user, '5');
    expect(useDROStore.getState().stateName).toBe('linear-bolt-hole-navigate');

    const stateData = useDROStore.getState().stateData;
    expect(stateData.stateDataType).toBe('linear-bolt-hole');
    if (stateData.stateDataType === 'linear-bolt-hole') {
      expect(stateData.axis).toBe('X');
      expect(stateData.pitch).toBeCloseTo(10, 4);
      expect(stateData.holeCount).toBe(5);
      expect(stateData.currentHole).toBe(1);
    }

    // First hole: distance-to-go on X is 0
    expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(0, 4);

    // Advance to next hole -> distance becomes the pitch (10mm)
    await user.click(screen.getByTestId('key-6'));
    expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(10, 4);

    // Advance again -> 20mm
    await user.click(screen.getByTestId('key-6'));
    expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(20, 4);

    // Go back one hole -> 10mm
    await user.click(screen.getByTestId('key-4'));
    expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(10, 4);
  });

  it('rejects a non-positive pitch and stays on the pitch step', async () => {
    const user = userEvent.setup({ delay: null });
    renderSimulator();
    await user.click(screen.getByTestId('btn-toggle-unit'));

    await openLinearMenu(user);
    await user.click(screen.getByTestId('key-enter'));
    await user.click(screen.getByTestId('axis-select-y'));
    expect(useDROStore.getState().stateName).toBe('linear-bolt-hole-pitch');

    await enterValue(user, '0');
    expect(useDROStore.getState().stateName).toBe('linear-bolt-hole-pitch');
  });

  it('rejects a hole count below 2 and stays on the holes step', async () => {
    const user = userEvent.setup({ delay: null });
    renderSimulator();
    await user.click(screen.getByTestId('btn-toggle-unit'));

    await openLinearMenu(user);
    await user.click(screen.getByTestId('key-enter'));
    await user.click(screen.getByTestId('axis-select-x'));
    await enterValue(user, '10');
    expect(useDROStore.getState().stateName).toBe('linear-bolt-hole-holes');

    await enterValue(user, '1');
    expect(useDROStore.getState().stateName).toBe('linear-bolt-hole-holes');
  });

  it('exits to idle in ABS mode with the clear key', async () => {
    const user = userEvent.setup({ delay: null });
    renderSimulator();

    await openLinearMenu(user);
    await user.click(screen.getByTestId('key-enter'));
    await user.click(screen.getByTestId('axis-select-x'));
    expect(useDROStore.getState().stateName).toBe('linear-bolt-hole-pitch');

    await user.click(screen.getByTestId('key-clear'));
    expect(useDROStore.getState().stateName).toBe('idle');
    expect(useDROStore.getState().vMem.mode).toBe('abs');
  });
});

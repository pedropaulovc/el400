/**
 * Integration coverage for the per-axis dP display-resolution parameter.
 * Setup changes remain a preview until SAU ChG commits the transaction.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import {
  renderSimulator,
  getAxisDisplayPureTextValue,
} from '../../../tests/helpers/integration-test-utils';
import { useSettingsStore } from '../../settingsStore';
import { SETUP_PARAMETERS, DISPLAY_RESOLUTION_ID } from './setup-parameters';

const DP_INDEX = SETUP_PARAMETERS.findIndex((parameter) => parameter.id === DISPLAY_RESOLUTION_ID);

async function gotoDP(user: UserEvent, axis: 'x' | 'y' | 'z') {
  await user.click(screen.getByTestId('btn-settings'));
  await user.click(screen.getByTestId(`axis-select-${axis}`));
  for (let index = 0; index < DP_INDEX; index += 1) {
    await user.click(screen.getByTestId('key-2'));
  }
}

async function scrollTo(user: UserEvent, label: string) {
  for (let guard = 0; getAxisDisplayPureTextValue('X') !== label; guard += 1) {
    if (guard >= SETUP_PARAMETERS.length) throw new Error(`${label} not reachable in setup`);
    await user.click(screen.getByTestId('key-2'));
  }
}

async function saveAndExit(user: UserEvent) {
  await scrollTo(user, 'SAU ChG');
  await user.click(screen.getByTestId('key-enter'));
  expect(getAxisDisplayPureTextValue('X')).toBe('StorEd');
  await user.click(screen.getByTestId('key-enter'));
  expect(getAxisDisplayPureTextValue('X')).toBe('SAU ChG');
  await scrollTo(user, 'End');
  await user.click(screen.getByTestId('key-enter'));
}

function axisDecimals(axis: 'X' | 'Y' | 'Z'): number {
  const text = (screen.getByTestId(`axis-value-${axis.toLowerCase()}`).textContent || '').trim();
  const decimal = text.indexOf('.');
  return decimal === -1 ? 0 : text.length - decimal - 1;
}

async function previewFiftyMicron(user: UserEvent) {
  await user.click(screen.getByTestId('key-6'));
  await user.click(screen.getByTestId('key-6'));
  await user.click(screen.getByTestId('key-6'));
  expect(getAxisDisplayPureTextValue('X')).toBe('dP 50.0');
}

describe('US-022 dP display resolution (integration)', () => {
  beforeEach(() => { localStorage.clear(); });

  it('shows the 5 micron default and a four-decimal live readout', async () => {
    const { user } = await renderSimulator();
    expect(axisDecimals('X')).toBe(4);
    await gotoDP(user, 'x');
    expect(getAxisDisplayPureTextValue('X')).toBe('dP 5.0');
  });

  it('End discards a coarser preview instead of changing the live readout', async () => {
    const { user } = await renderSimulator();
    await gotoDP(user, 'x');
    await previewFiftyMicron(user);
    expect(useSettingsStore.getState().nvMem.displayResolution.X).toBe('5');

    await scrollTo(user, 'End');
    await user.click(screen.getByTestId('key-enter'));
    expect(axisDecimals('X')).toBe(4);

    await gotoDP(user, 'x');
    expect(getAxisDisplayPureTextValue('X')).toBe('dP 5.0');
  });

  it('SAU ChG applies the selected axis resolution without changing the others', async () => {
    const { user } = await renderSimulator();
    await gotoDP(user, 'x');
    await previewFiftyMicron(user);
    await saveAndExit(user);

    expect(axisDecimals('X')).toBe(3);
    expect(axisDecimals('Y')).toBe(4);
    expect(useSettingsStore.getState().nvMem.displayResolution).toEqual({
      X: '50',
      Y: '5',
      Z: '5',
    });
  });
});

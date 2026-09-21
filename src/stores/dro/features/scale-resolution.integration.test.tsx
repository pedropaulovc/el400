/**
 * Integration coverage for the per-axis SC scale-resolution setup parameter.
 * Every edit is staged until the operator confirms SAU ChG; C and End discard
 * the current setup transaction.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import {
  renderSimulator,
  getAxisDisplayPureTextValue,
} from '../../../tests/helpers/integration-test-utils';
import { useSettingsStore } from '../../settingsStore';
import { SETUP_PARAMETERS, SCALE_RESOLUTION_ID } from './setup-parameters';

const SC_INDEX = SETUP_PARAMETERS.findIndex((parameter) => parameter.id === SCALE_RESOLUTION_ID);

async function gotoSC(
  user: UserEvent,
  axis: 'x' | 'y' | 'z' = 'x'
) {
  await user.click(screen.getByTestId('btn-settings'));
  await user.click(screen.getByTestId(`axis-select-${axis}`));
  for (let index = 0; index < SC_INDEX; index += 1) {
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

describe('US-021 SC scale resolution (integration)', () => {
  beforeEach(() => { localStorage.clear(); });

  it('shows the factory 5 micron resolution', async () => {
    const { user } = await renderSimulator();
    await gotoSC(user);
    expect(getAxisDisplayPureTextValue('X')).toBe('SC 5.0');
  });

  it('previews finer choices but C discards the whole transaction', async () => {
    const { user } = await renderSimulator();
    await gotoSC(user);

    await user.click(screen.getByTestId('key-4'));
    await user.click(screen.getByTestId('key-4'));
    expect(getAxisDisplayPureTextValue('X')).toBe('SC 1.0');
    expect(useSettingsStore.getState().nvMem.scaleResolution.X).toBe('5');

    await user.click(screen.getByTestId('key-clear'));
    await gotoSC(user);
    expect(getAxisDisplayPureTextValue('X')).toBe('SC 5.0');
  });

  it('commits only the selected axis through SAU ChG', async () => {
    const { user } = await renderSimulator();
    await gotoSC(user, 'y');

    await user.click(screen.getByTestId('key-6'));
    expect(getAxisDisplayPureTextValue('X')).toBe('SC 10.0');
    expect(useSettingsStore.getState().nvMem.scaleResolution.Y).toBe('5');

    await saveAndExit(user);
    expect(useSettingsStore.getState().nvMem.scaleResolution).toEqual({
      X: '5',
      Y: '10',
      Z: '5',
    });

    await gotoSC(user, 'y');
    expect(getAxisDisplayPureTextValue('X')).toBe('SC 10.0');
  });
});

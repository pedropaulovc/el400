/** Integration coverage for password-protected OEM baseline capture. */
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import {
  renderSimulator,
  typeValue,
  pressEnter,
  getAxisDisplayPureTextValue,
} from '../../../tests/helpers/integration-test-utils';
import { useSettingsStore } from '../../settingsStore';
import { NON_VOLATILE_MEMORY_STORAGE_KEY } from '../../../types/nonVolatileMemory';
import { SETUP_PARAMETERS } from './setup-parameters';
import {
  OEM_PASSWORD_PROMPT,
  OEM_MODE_TEXT,
  OEM_REJECTED_TEXT,
  OEM_MODE_SETUP_LABEL,
} from './oem-mode';

function rawAxisText(axis: 'X' | 'Y' | 'Z'): string {
  return (screen.getByTestId(`axis-value-${axis.toLowerCase()}`).textContent || '').trim();
}

async function scrollSetupTo(user: UserEvent, predicate: (text: string) => boolean, name: string) {
  for (let guard = 0; !predicate(rawAxisText('X')); guard += 1) {
    if (guard >= SETUP_PARAMETERS.length) throw new Error(`${name} not reachable in setup`);
    await user.click(screen.getByTestId('key-2'));
  }
}

async function openSetup(user: UserEvent, axis: 'x' | 'y' | 'z' = 'x') {
  await user.click(screen.getByTestId('btn-settings'));
  await user.click(screen.getByTestId(`axis-select-${axis}`));
}

async function saveAndExitSetup(user: UserEvent) {
  await scrollSetupTo(user, (text) => text === 'SAU ChG', 'SAU ChG');
  await pressEnter(user);
  expect(getAxisDisplayPureTextValue('X')).toBe('StorEd');
  await pressEnter(user);
  await scrollSetupTo(user, (text) => text === 'End', 'End');
  await pressEnter(user);
}

async function gotoOemRow(user: UserEvent) {
  await openSetup(user);
  await scrollSetupTo(user, (text) => text === OEM_MODE_SETUP_LABEL, OEM_MODE_SETUP_LABEL);
}

async function enterOemMode(user: UserEvent) {
  await gotoOemRow(user);
  await pressEnter(user);
  expect(getAxisDisplayPureTextValue('X')).toBe(OEM_PASSWORD_PROMPT);
  await typeValue(user, '35726');
  await pressEnter(user);
  expect(getAxisDisplayPureTextValue('X')).toBe(OEM_MODE_TEXT);
}

async function saveXDisplayResolution(user: UserEvent, target: string) {
  await openSetup(user, 'x');
  await scrollSetupTo(user, (text) => text.startsWith('dP '), 'dP');
  for (let guard = 0; rawAxisText('X') !== target; guard += 1) {
    if (guard >= 9) throw new Error(`${target} not reachable`);
    await user.click(screen.getByTestId('key-6'));
  }
  await saveAndExitSetup(user);
}

describe('US-044 OEM Mode (integration)', () => {
  beforeEach(() => { localStorage.clear(); });

  it('opens the password prompt from the oEm mod row', async () => {
    const { user } = await renderSimulator();
    await gotoOemRow(user);
    expect(getAxisDisplayPureTextValue('X')).toBe(OEM_MODE_SETUP_LABEL);
    await pressEnter(user);
    expect(getAxisDisplayPureTextValue('X')).toBe(OEM_PASSWORD_PROMPT);
  });

  it('accepts the correct password without echoing its digits', async () => {
    const { user } = await renderSimulator();
    await gotoOemRow(user);
    await pressEnter(user);
    await typeValue(user, '35726');
    expect(getAxisDisplayPureTextValue('X')).toBe(OEM_PASSWORD_PROMPT);
    await pressEnter(user);
    expect(getAxisDisplayPureTextValue('X')).toBe(OEM_MODE_TEXT);
  });

  it('captures the saved per-axis configuration and persists the baseline', async () => {
    const { user } = await renderSimulator();
    await saveXDisplayResolution(user, 'dP 50.0');
    await enterOemMode(user);
    await pressEnter(user);
    expect(getAxisDisplayPureTextValue('X')).toBe('StorEd');

    expect(useSettingsStore.getState().nvMem.oemDefaults?.displayResolution).toEqual({
      X: '50',
      Y: '5',
      Z: '5',
    });
    await waitFor(() => {
      const raw = localStorage.getItem(NON_VOLATILE_MEMORY_STORAGE_KEY);
      expect(raw).toBeTruthy();
      expect(JSON.parse(raw!).state.nvMem.oemDefaults.displayResolution.X).toBe('50');
    });
  });

  it('rejects a wrong password without capturing a baseline', async () => {
    const { user } = await renderSimulator();
    await gotoOemRow(user);
    await pressEnter(user);
    await typeValue(user, '0000');
    await pressEnter(user);

    expect(getAxisDisplayPureTextValue('X')).toBe(OEM_REJECTED_TEXT);
    expect(useSettingsStore.getState().nvMem.oemDefaults).toBeNull();
    await waitFor(
      () => { expect(getAxisDisplayPureTextValue('X')).toBe(OEM_MODE_SETUP_LABEL); },
      { timeout: 2000 }
    );
  });
});

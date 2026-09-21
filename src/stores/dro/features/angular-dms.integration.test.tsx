/** Integration coverage for angular dP choices and saved DMS rendering. */
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import {
  renderSimulator,
  emitPosition,
  getAxisDisplayPureTextValue,
} from '../../../tests/helpers/integration-test-utils';
import { SETUP_PARAMETERS } from './setup-parameters';

function rawAxisText(axis: 'X' | 'Y' | 'Z'): string {
  return (screen.getByTestId(`axis-value-${axis.toLowerCase()}`).textContent || '').trim();
}

async function scrollSetupTo(user: UserEvent, predicate: (text: string) => boolean, name: string) {
  for (let guard = 0; !predicate(rawAxisText('X')); guard += 1) {
    if (guard >= SETUP_PARAMETERS.length) throw new Error(`${name} not reachable in setup`);
    await user.click(screen.getByTestId('key-2'));
  }
}

async function openSetupForAxis(user: UserEvent, axis: 'X' | 'Y' | 'Z') {
  await user.click(screen.getByTestId('btn-settings'));
  await user.click(screen.getByTestId(`axis-select-${axis.toLowerCase()}`));
}

async function stageAngularCounting(user: UserEvent) {
  await scrollSetupTo(user, (text) => text === 'LinEAr' || text === 'AnGULAr', 'counting mode');
  if (rawAxisText('X') !== 'AnGULAr') await user.click(screen.getByTestId('key-6'));
}

async function cycleChoiceTo(user: UserEvent, target: string, choiceCount: number) {
  for (let guard = 0; rawAxisText('X') !== target; guard += 1) {
    if (guard >= choiceCount) throw new Error(`${target} not reachable`);
    await user.click(screen.getByTestId('key-6'));
  }
}

async function saveAndExitSetup(user: UserEvent) {
  await scrollSetupTo(user, (text) => text === 'SAU ChG', 'SAU ChG');
  await user.click(screen.getByTestId('key-enter'));
  expect(getAxisDisplayPureTextValue('X')).toBe('StorEd');
  await user.click(screen.getByTestId('key-enter'));
  await scrollSetupTo(user, (text) => text === 'End', 'End');
  await user.click(screen.getByTestId('key-enter'));
}

describe('Angular display-resolution DMS formats (US-040)', () => {
  beforeEach(() => { localStorage.clear(); });

  it('previews only angular formats after counting mode is staged as angular', async () => {
    const { user } = await renderSimulator();
    await openSetupForAxis(user, 'X');
    await stageAngularCounting(user);
    await scrollSetupTo(user, (text) => text.startsWith('dd.'), 'angular dP');

    expect(getAxisDisplayPureTextValue('X')).toBe('dd.mn');
    await user.click(screen.getByTestId('key-6'));
    expect(getAxisDisplayPureTextValue('X')).toBe('dd.mn.SS');
    await user.click(screen.getByTestId('key-6'));
    expect(getAxisDisplayPureTextValue('X')).toBe('dd.dEC');
    await user.click(screen.getByTestId('key-6'));
    expect(getAxisDisplayPureTextValue('X')).toBe('dd.mn');
  });

  it('keeps micron dP choices for a linear axis', async () => {
    const { user } = await renderSimulator();
    await openSetupForAxis(user, 'X');
    await scrollSetupTo(user, (text) => text.startsWith('dP '), 'linear dP');
    expect(getAxisDisplayPureTextValue('X')).toBe('dP 5.0');
    await user.click(screen.getByTestId('key-6'));
    expect(getAxisDisplayPureTextValue('X')).toBe('dP 10.0');
  });

  it('commits counting mode and DMS format together through SAU ChG', async () => {
    const { user } = await renderSimulator();
    await user.click(screen.getByTestId('btn-toggle-unit'));
    await openSetupForAxis(user, 'X');
    await stageAngularCounting(user);
    await scrollSetupTo(user, (text) => text.startsWith('dd.'), 'angular dP');
    await cycleChoiceTo(user, 'dd.mn.SS', 3);
    await saveAndExitSetup(user);

    emitPosition(12.5, 0, 0);
    await waitFor(() => { expect(rawAxisText('X')).toBe('12.30.00'); });
    emitPosition(90, 0, 0);
    await waitFor(() => { expect(rawAxisText('X')).toBe('90.00.00'); });
  });
});

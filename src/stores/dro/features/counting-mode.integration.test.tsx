/** Observable integration coverage for per-axis linear/angular counting mode. */
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import {
  renderSimulator,
  emitPosition,
  getAxisDisplayPureNumberValue,
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

async function saveAndExitSetup(user: UserEvent) {
  await scrollSetupTo(user, (text) => text === 'SAU ChG', 'SAU ChG');
  await user.click(screen.getByTestId('key-enter'));
  expect(getAxisDisplayPureTextValue('X')).toBe('StorEd');
  await user.click(screen.getByTestId('key-enter'));
  await scrollSetupTo(user, (text) => text === 'End', 'End');
  await user.click(screen.getByTestId('key-enter'));
}

async function setAxisAngular(user: UserEvent, axis: 'X' | 'Y' | 'Z') {
  await user.click(screen.getByTestId('btn-settings'));
  await user.click(screen.getByTestId(`axis-select-${axis.toLowerCase()}`));
  await scrollSetupTo(user, (text) => text === 'LinEAr' || text === 'AnGULAr', 'counting mode');
  if (rawAxisText('X') !== 'AnGULAr') await user.click(screen.getByTestId('key-6'));
  expect(getAxisDisplayPureTextValue('X')).toBe('AnGULAr');
  await saveAndExitSetup(user);
}

describe('Counting mode angular display — live readout integration (US-040)', () => {
  beforeEach(() => { localStorage.clear(); });

  it('shows wrapped degrees after X is saved as angular', async () => {
    const { user } = await renderSimulator();
    await user.click(screen.getByTestId('btn-toggle-unit'));
    emitPosition(90, 0, 0);
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(90, 4); });

    await setAxisAngular(user, 'X');
    await waitFor(() => { expect(rawAxisText('X')).toBe('90.00'); });

    emitPosition(450, 0, 0);
    await waitFor(() => { expect(rawAxisText('X')).toBe('90.00'); });
    emitPosition(370, 0, 0);
    await waitFor(() => { expect(rawAxisText('X')).toBe('10.00'); });
  });

  it('does not unit-convert an angular axis while the panel unit is inch', async () => {
    const { user } = await renderSimulator();
    await setAxisAngular(user, 'X');
    emitPosition(90, 0, 0);
    await waitFor(() => { expect(rawAxisText('X')).toBe('90.00'); });
  });

  it('changes only the selected axis', async () => {
    const { user } = await renderSimulator();
    await user.click(screen.getByTestId('btn-toggle-unit'));
    await setAxisAngular(user, 'X');

    emitPosition(400, 12, 0);
    await waitFor(() => { expect(rawAxisText('X')).toBe('40.00'); });
    expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(12, 4);
  });
});

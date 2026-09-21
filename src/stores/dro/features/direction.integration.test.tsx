/** Integration coverage for saved per-axis counting direction. */
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

async function setXDirectionRight(user: UserEvent) {
  await user.click(screen.getByTestId('btn-settings'));
  await user.click(screen.getByTestId('axis-select-x'));
  await scrollSetupTo(user, (text) => text === 'LEFt' || text === 'riGht', 'direction');
  if (rawAxisText('X') !== 'riGht') await user.click(screen.getByTestId('key-6'));
  expect(getAxisDisplayPureTextValue('X')).toBe('riGht');

  await scrollSetupTo(user, (text) => text === 'SAU ChG', 'SAU ChG');
  await user.click(screen.getByTestId('key-enter'));
  expect(getAxisDisplayPureTextValue('X')).toBe('StorEd');
  await user.click(screen.getByTestId('key-enter'));
  await scrollSetupTo(user, (text) => text === 'End', 'End');
  await user.click(screen.getByTestId('key-enter'));
}

describe('Direction sign flip — live readout integration (US-002)', () => {
  beforeEach(() => { localStorage.clear(); });

  it('flips the live X reading only after the setup transaction is saved', async () => {
    const { user } = await renderSimulator();
    await user.click(screen.getByTestId('btn-toggle-unit'));
    emitPosition(10, 6, 0);
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(10, 4); });

    await setXDirectionRight(user);
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(-10, 4); });
    expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(6, 4);
  });

  it('keeps the selected-axis sign on subsequent live encoder movement', async () => {
    const { user } = await renderSimulator();
    await user.click(screen.getByTestId('btn-toggle-unit'));
    emitPosition(4, 0, 0);
    await setXDirectionRight(user);

    emitPosition(12, 0, 0);
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(-12, 4); });
    emitPosition(3, 9, 0);
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(-3, 4); });
    expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(9, 4);
  });
});

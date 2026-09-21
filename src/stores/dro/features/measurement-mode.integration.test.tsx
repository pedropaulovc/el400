/** Integration coverage for saved per-axis radius/diameter mode. */
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

async function setAxisDiameter(user: UserEvent, axis: 'X' | 'Y' | 'Z') {
  await user.click(screen.getByTestId('btn-settings'));
  await user.click(screen.getByTestId(`axis-select-${axis.toLowerCase()}`));
  await scrollSetupTo(user, (text) => text === 'rAd' || text === 'diA', 'measurement mode');
  if (rawAxisText('X') !== 'diA') await user.click(screen.getByTestId('key-6'));
  expect(getAxisDisplayPureTextValue('X')).toBe('diA');

  await scrollSetupTo(user, (text) => text === 'SAU ChG', 'SAU ChG');
  await user.click(screen.getByTestId('key-enter'));
  expect(getAxisDisplayPureTextValue('X')).toBe('StorEd');
  await user.click(screen.getByTestId('key-enter'));
  await scrollSetupTo(user, (text) => text === 'End', 'End');
  await user.click(screen.getByTestId('key-enter'));
}

describe('Diameter ×2 — live readout integration (US-041)', () => {
  beforeEach(() => { localStorage.clear(); });

  it('doubles the selected X readout after SAU ChG', async () => {
    const { user } = await renderSimulator();
    await user.click(screen.getByTestId('btn-toggle-unit'));
    emitPosition(1, 3, 0);
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(1, 4); });

    await setAxisDiameter(user, 'X');
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(2, 4); });
    expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(3, 4);
  });

  it('keeps diameter scaling on subsequent encoder movement without affecting other axes', async () => {
    const { user } = await renderSimulator();
    await user.click(screen.getByTestId('btn-toggle-unit'));
    await setAxisDiameter(user, 'X');

    emitPosition(6, 7, 0);
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(12, 4); });
    expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(7, 4);
  });
});

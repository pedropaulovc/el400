/** Integration coverage for the saved global encoder-fail warning. */
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, act, waitFor } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import type { MockMillAdapter } from '../../../adapters/MockMillAdapter';
import {
  renderSimulator,
  emitPosition,
  getAxisDisplayPureNumberValue,
  getAxisDisplayPureTextValue,
} from '../../../tests/helpers/integration-test-utils';
import { SETUP_PARAMETERS } from './setup-parameters';
import { ENCODER_FAIL_TEXT } from '../utils/displayComputation';

function rawAxisText(axis: 'X' | 'Y' | 'Z'): string {
  return (screen.getByTestId(`axis-value-${axis.toLowerCase()}`).textContent || '').trim();
}

async function scrollSetupTo(user: UserEvent, predicate: (text: string) => boolean, name: string) {
  for (let guard = 0; !predicate(rawAxisText('X')); guard += 1) {
    if (guard >= SETUP_PARAMETERS.length) throw new Error(`${name} not reachable in setup`);
    await user.click(screen.getByTestId('key-2'));
  }
}

async function setEncoderFailOn(user: UserEvent) {
  await user.click(screen.getByTestId('btn-settings'));
  await user.click(screen.getByTestId('axis-select-x'));
  await scrollSetupTo(user, (text) => text === 'EnF oFF' || text === 'EnF on', 'EnF');
  if (rawAxisText('X') !== 'EnF on') await user.click(screen.getByTestId('key-6'));

  await scrollSetupTo(user, (text) => text === 'SAU ChG', 'SAU ChG');
  await user.click(screen.getByTestId('key-enter'));
  expect(getAxisDisplayPureTextValue('X')).toBe('StorEd');
  await user.click(screen.getByTestId('key-enter'));
  await scrollSetupTo(user, (text) => text === 'End', 'End');
  await user.click(screen.getByTestId('key-enter'));
}

function setSignal(mill: MockMillAdapter, axis: 'X' | 'Y' | 'Z', signal: 'ok' | 'lost') {
  act(() => {
    mill.setEncoderSignal(axis, signal);
  });
}

describe('Encoder-fail warning — live readout integration (US-042)', () => {
  beforeEach(() => { localStorage.clear(); });

  it('shows no SIG only on the failed axis after EnF is saved on', async () => {
    const { user, mill } = await renderSimulator();
    if (!mill) throw new Error('live mill required');
    await user.click(screen.getByTestId('btn-toggle-unit'));
    emitPosition(10, 20, 30);
    await setEncoderFailOn(user);

    setSignal(mill, 'X', 'lost');
    await waitFor(() => { expect(rawAxisText('X')).toBe(ENCODER_FAIL_TEXT); });
    expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(20, 4);
    expect(getAxisDisplayPureNumberValue('Z')).toBeCloseTo(30, 4);
  });

  it('returns to the live reading when the signal is restored', async () => {
    const { user, mill } = await renderSimulator();
    if (!mill) throw new Error('live mill required');
    await user.click(screen.getByTestId('btn-toggle-unit'));
    emitPosition(7, 0, 0);
    await setEncoderFailOn(user);

    setSignal(mill, 'X', 'lost');
    await waitFor(() => { expect(rawAxisText('X')).toBe(ENCODER_FAIL_TEXT); });
    setSignal(mill, 'X', 'ok');
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(7, 4); });
  });

  it('keeps a signal loss silent while EnF remains at its saved off default', async () => {
    const { user, mill } = await renderSimulator();
    if (!mill) throw new Error('live mill required');
    await user.click(screen.getByTestId('btn-toggle-unit'));
    emitPosition(5, 0, 0);

    setSignal(mill, 'X', 'lost');
    emitPosition(5, 0, 0);
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(5, 4); });
    expect(rawAxisText('X')).not.toBe(ENCODER_FAIL_TEXT);
  });
});

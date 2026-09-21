/** Integration coverage for the saved keypad lock and its setup escape path. */
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

async function setLock(user: UserEvent, target: 'on' | 'off') {
  const targetLabel = target === 'on' ? 'LoC on' : 'LoC oFF';
  await user.click(screen.getByTestId('btn-settings'));
  expect(screen.getByTestId('axis-select-x')).toBeEnabled();
  await user.click(screen.getByTestId('axis-select-x'));
  expect(screen.getByTestId('key-2')).toBeEnabled();
  expect(screen.getByTestId('key-6')).toBeEnabled();
  expect(screen.getByTestId('key-enter')).toBeEnabled();
  await scrollSetupTo(user, (text) => text === 'LoC on' || text === 'LoC oFF', 'LoC');
  if (rawAxisText('X') !== targetLabel) await user.click(screen.getByTestId('key-6'));
  expect(getAxisDisplayPureTextValue('X')).toBe(targetLabel);

  await scrollSetupTo(user, (text) => text === 'SAU ChG', 'SAU ChG');
  await user.click(screen.getByTestId('key-enter'));
  expect(getAxisDisplayPureTextValue('X')).toBe('StorEd');
  await user.click(screen.getByTestId('key-enter'));
  await scrollSetupTo(user, (text) => text === 'End', 'End');
  await user.click(screen.getByTestId('key-enter'));
}
function expectLockedFrontPanelSemantics() {
  const settings = screen.getByTestId('btn-settings');
  expect(settings).toBeEnabled();

  for (const button of screen.getAllByRole('button')) {
    if (button.classList.contains('dro-button') && button !== settings) {
      expect(button).toBeDisabled();
    }
  }
}


describe('Keypad Lock — setup affordance and live readout integration (US-043)', () => {
  beforeEach(() => { localStorage.clear(); });

  it('blocks numeric and zero keys while live encoder movement still updates', async () => {
    const { user } = await renderSimulator();
    await user.click(screen.getByTestId('btn-toggle-unit'));
    emitPosition(10, 0, 0);
    await user.click(screen.getByTestId('axis-zero-x'));
    emitPosition(13, 0, 0);
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(3, 4); });

    await setLock(user, 'on');
    expectLockedFrontPanelSemantics();
    await user.click(screen.getByTestId('axis-zero-x'));
    await user.click(screen.getByTestId('key-5'));
    await user.click(screen.getByTestId('axis-select-y'));
    await user.click(screen.getByTestId('key-enter'));
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(3, 4); });

    emitPosition(18, 0, 0);
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(8, 4); });
  });

  it('keeps the wrench path active so a saved unlock restores normal input', async () => {
    const { user } = await renderSimulator();
    await user.click(screen.getByTestId('btn-toggle-unit'));
    emitPosition(7, 0, 0);
    await setLock(user, 'on');
    expectLockedFrontPanelSemantics();

    await user.click(screen.getByTestId('axis-zero-x'));
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(7, 4); });

    await setLock(user, 'off');
    await user.click(screen.getByTestId('axis-zero-x'));
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(0, 4); });
  });
});

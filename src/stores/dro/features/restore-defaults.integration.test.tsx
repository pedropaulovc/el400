/** Integration coverage for selected-axis `rSt oEm` restore semantics. */
import { describe, it, expect, beforeEach } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import {
  renderSimulator,
  pressEnter,
  emitPosition,
  getAxisDisplayPureNumberValue,
  getAxisDisplayPureTextValue,
} from '../../../tests/helpers/integration-test-utils';
import type { OemDefaultsSnapshot } from '../../../types/nonVolatileMemory';
import { useSettingsStore } from '../../settingsStore';
import { SETUP_PARAMETERS } from './setup-parameters';
import {
  RESTORE_DEFAULTS_LABEL,
  RESTORE_IN_PROGRESS_TEXT,
  RESTORE_DURATION_MS,
} from './restore-defaults';

type Axis = 'X' | 'Y' | 'Z';

function rawAxisText(axis: Axis): string {
  return (screen.getByTestId(`axis-value-${axis.toLowerCase()}`).textContent || '').trim();
}

async function scrollSetupTo(user: UserEvent, predicate: (text: string) => boolean, name: string) {
  for (let guard = 0; !predicate(rawAxisText('X')); guard += 1) {
    if (guard >= SETUP_PARAMETERS.length) throw new Error(`${name} not reachable in setup`);
    await user.click(screen.getByTestId('key-2'));
  }
}

async function openSetup(user: UserEvent, axis: Axis) {
  await user.click(screen.getByTestId('btn-settings'));
  await user.click(screen.getByTestId(`axis-select-${axis.toLowerCase()}`));
}

async function restoreAxisAndWait(user: UserEvent, axis: Axis) {
  await openSetup(user, axis);
  await scrollSetupTo(user, (text) => text === RESTORE_DEFAULTS_LABEL, RESTORE_DEFAULTS_LABEL);
  await pressEnter(user);
  expect(getAxisDisplayPureTextValue('X')).toBe(RESTORE_IN_PROGRESS_TEXT);
  await waitFor(
    () => { expect(rawAxisText('X')).not.toBe(RESTORE_IN_PROGRESS_TEXT); },
    { timeout: RESTORE_DURATION_MS + 2000 }
  );
}

async function expectSavedDisplayResolution(user: UserEvent, axis: Axis, expected: string) {
  await openSetup(user, axis);
  await scrollSetupTo(user, (text) => text.startsWith('dP '), 'dP');
  expect(getAxisDisplayPureTextValue('X')).toBe(expected);
  await user.click(screen.getByTestId('key-clear'));
}

describe('US-028 Restore Defaults (integration)', () => {
  beforeEach(() => { localStorage.clear(); });

  it('shows In ProG when ENT confirms rSt oEm for the selected axis', async () => {
    const { user } = await renderSimulator();
    await openSetup(user, 'Y');
    await scrollSetupTo(user, (text) => text === RESTORE_DEFAULTS_LABEL, RESTORE_DEFAULTS_LABEL);
    await pressEnter(user);
    expect(getAxisDisplayPureTextValue('X')).toBe(RESTORE_IN_PROGRESS_TEXT);
  });

  it('restores only the selected axis to factory config while preserving other axes and globals', async () => {
    const { user } = await renderSimulator();

    act(() => {
      const current = useSettingsStore.getState().nvMem;
      useSettingsStore.setState({
        nvMem: {
          ...current,
          beepEnabled: false,
          displayResolution: {
            ...current.displayResolution,
            X: '50',
            Y: '20',
          },
        },
      });
    });
    await restoreAxisAndWait(user, 'X');
    await expectSavedDisplayResolution(user, 'X', 'dP 5.0');
    await expectSavedDisplayResolution(user, 'Y', 'dP 20.0');

    await openSetup(user, 'Z');
    await scrollSetupTo(user, (text) => text === 'bEEP on' || text === 'bEEP oFF', 'bEEP');
    expect(getAxisDisplayPureTextValue('X')).toBe('bEEP oFF');
  });

  it('restores the selected axis from the captured OEM baseline without changing another axis', async () => {
    const { user } = await renderSimulator();

    act(() => {
      const current = useSettingsStore.getState().nvMem;
      const { oemDefaults: _ignored, ...factoryBaseline } = current;
      const oemDefaults: OemDefaultsSnapshot = {
        ...factoryBaseline,
        displayResolution: {
          ...factoryBaseline.displayResolution,
          X: '20',
        },
      };
      useSettingsStore.setState({
        nvMem: {
          ...current,
          displayResolution: {
            ...current.displayResolution,
            X: '50',
            Y: '10',
          },
          oemDefaults,
        },
      });
    });
    await restoreAxisAndWait(user, 'X');
    await expectSavedDisplayResolution(user, 'X', 'dP 20.0');
    await expectSavedDisplayResolution(user, 'Y', 'dP 10.0');
  });

  it('preserves the selected-axis datum and learned SDM job data', async () => {
    const { user } = await renderSimulator();
    await user.click(screen.getByTestId('btn-toggle-unit'));
    emitPosition(5, 2, 3);
    await user.click(screen.getByTestId('axis-zero-x'));

    await user.click(screen.getByTestId('btn-sdm'));
    await user.click(screen.getByTestId('key-4'));
    expect(getAxisDisplayPureTextValue('X')).toBe('LEArn');
    await pressEnter(user);
    await pressEnter(user);
    await user.click(screen.getByTestId('axis-select-x'));
    await user.click(screen.getByTestId('axis-select-x'));
    await user.click(screen.getByTestId('key-clear'));

    emitPosition(6, 2, 3);
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(1, 4); });
    await restoreAxisAndWait(user, 'X');
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(1, 4); });

    await user.click(screen.getByTestId('btn-sdm'));
    await user.click(screen.getByTestId('key-6'));
    await pressEnter(user);
    await pressEnter(user);
    expect(rawAxisText('X')).not.toBe('no dAtA');
    expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(-1, 4);
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, act, waitFor } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import {
  renderSimulator,
  typeValue,
  pressEnter,
  emitPosition,
  getAxisDisplayPureTextValue,
} from '../../../tests/helpers/integration-test-utils';
import { useSettingsStore } from '../../settingsStore';
import { SETUP_PARAMETERS } from './setup-parameters';
import { BOLT_HOLE_INTRO_DURATION_MS } from './bolt-hole';

const AXES = ['X', 'Y', 'Z'] as const;
type Axis = (typeof AXES)[number];

function rawAxisText(axis: Axis): string {
  return (screen.getByTestId(`axis-value-${axis.toLowerCase()}`).textContent || '').trim();
}

function axisIsBlinking(axis: Axis): boolean {
  return screen
    .getByTestId(`axis-display-${axis.toLowerCase()}`)
    .querySelector('[data-blinking="true"]') !== null;
}

function expectWarningAxes(...activeAxes: Axis[]) {
  expect(screen.queryByTestId('audio-indicator') !== null).toBe(activeAxes.length > 0);
  for (const axis of AXES) expect(axisIsBlinking(axis)).toBe(activeAxes.includes(axis));
}

async function scrollSetupTo(user: UserEvent, predicate: (text: string) => boolean, name: string) {
  for (let guard = 0; !predicate(rawAxisText('X')); guard += 1) {
    if (guard >= SETUP_PARAMETERS.length) throw new Error(`${name} not reachable in setup`);
    await user.click(screen.getByTestId('key-2'));
  }
}

async function openZeroApproach(user: UserEvent, axis: Axis) {
  await user.click(screen.getByTestId('btn-settings'));
  expect(getAxisDisplayPureTextValue('X')).toBe('SELECt');
  await user.click(screen.getByTestId(`axis-select-${axis.toLowerCase()}`));
  await scrollSetupTo(user, (text) => text === 'ZEro AP', 'ZEro AP');
}

async function saveAndExitSetup(user: UserEvent) {
  await scrollSetupTo(user, (text) => text === 'SAU ChG', 'SAU ChG');
  await pressEnter(user);
  expect(getAxisDisplayPureTextValue('X')).toBe('StorEd');
  await pressEnter(user);
  expect(getAxisDisplayPureTextValue('X')).toBe('SAU ChG');
  await scrollSetupTo(user, (text) => text === 'End', 'End');
  await pressEnter(user);
}

async function stageConfiguredWarning(
  user: UserEvent,
  axis: Axis,
  distanceMm: string,
  toleranceMm: string
) {
  await openZeroApproach(user, axis);

  await pressEnter(user);
  expect(rawAxisText('X')).toBe('bU22 oF');
  await user.click(screen.getByTestId('key-6'));
  expect(rawAxisText('X')).toBe('bU22 on');

  await user.click(screen.getByTestId('key-2'));
  expect(getAxisDisplayPureTextValue('X')).toBe('BP diSt');
  await pressEnter(user);
  expect(rawAxisText('X')).toBe('0.0508');
  await pressEnter(user);
  expect(rawAxisText('X')).toBe('0');
  await typeValue(user, distanceMm);
  await pressEnter(user);
  expect(getAxisDisplayPureTextValue('X')).toBe('BP toLr');

  await pressEnter(user);
  expect(rawAxisText('X')).toBe('0.0000');
  await pressEnter(user);
  expect(rawAxisText('X')).toBe('0');
  await typeValue(user, toleranceMm);
  await pressEnter(user);
}

async function startDistanceToGoX(user: UserEvent, targetMm: string) {
  await user.click(screen.getByTestId('btn-distance-to-go'));
  await user.click(screen.getByTestId('axis-select-x'));
  await typeValue(user, targetMm);
  await pressEnter(user);
  await user.click(screen.getByTestId('btn-distance-to-go'));
}

async function enterCirclePattern(user: UserEvent) {
  await user.click(screen.getByTestId('btn-bolt-circle'));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(BOLT_HOLE_INTRO_DURATION_MS + 10);
  });
  await pressEnter(user);
  await typeValue(user, '0'); await pressEnter(user);
  await typeValue(user, '0'); await pressEnter(user);
  await typeValue(user, '10'); await pressEnter(user);
  await typeValue(user, '0'); await pressEnter(user);
  await typeValue(user, '4'); await pressEnter(user);
}

async function enterLinearPatternOnY(user: UserEvent) {
  await user.click(screen.getByTestId('btn-function'));
  expect(getAxisDisplayPureTextValue('X')).toBe('CEntrE');
  await user.click(screen.getByTestId('key-6'));
  expect(getAxisDisplayPureTextValue('X')).toBe('LinEAr');
  await pressEnter(user);
  await user.click(screen.getByTestId('axis-select-y'));
  await typeValue(user, '10');
  await pressEnter(user);
}

describe('Near-zero warning — manual-authoritative integration', () => {
  beforeEach(() => { localStorage.clear(); });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stages the nested per-axis BUZZ, BP distance, and tolerance editors, then warns in idle only after SAU ChG', async () => {
    const { user } = await renderSimulator();
    await user.click(screen.getByTestId('btn-toggle-unit'));
    emitPosition(0.2, 0, 0);

    await stageConfiguredWarning(user, 'X', '0.0762', '0.0254');
    expect(useSettingsStore.getState().nvMem.zeroApproachEnabled.X).toBe(false);
    expect(useSettingsStore.getState().nvMem.zeroApproachDistance.X).toBe('0.002');
    await saveAndExitSetup(user);

    expectWarningAxes();
    emitPosition(0.07, 0, 0);
    await waitFor(() => { expectWarningAxes('X'); });

    emitPosition(0.09, 0, 0);
    await waitFor(() => { expectWarningAxes('X'); });

    emitPosition(0.11, 0, 0);
    await waitFor(() => { expectWarningAxes(); });
  });

  it('C first abandons a partial numeric editor, then discards the whole setup draft', async () => {
    const { user } = await renderSimulator();
    await openZeroApproach(user, 'Y');
    await pressEnter(user);
    await user.click(screen.getByTestId('key-6'));
    await user.click(screen.getByTestId('key-2'));
    await pressEnter(user);
    await pressEnter(user);
    await typeValue(user, '0.1');

    await user.click(screen.getByTestId('key-clear'));
    expect(getAxisDisplayPureTextValue('X')).toBe('BP diSt');
    await user.click(screen.getByTestId('key-clear'));

    await openZeroApproach(user, 'Y');
    await pressEnter(user);
    expect(rawAxisText('X')).toBe('bU22 oF');
    expect(useSettingsStore.getState().nvMem.zeroApproachEnabled.Y).toBe(false);
  });

  it('keeps the mandatory 50 um target warning active with BUZZ off and arms only preset axes', async () => {
    const { user } = await renderSimulator();
    await user.click(screen.getByTestId('btn-toggle-unit'));
    emitPosition(12, 0, 0);

    await startDistanceToGoX(user, '20');
    emitPosition(31.94, 0, 0);
    await waitFor(() => { expectWarningAxes(); });

    // Exact 50 µm boundary after subtracting nonzero machine coordinates.
    emitPosition(31.95, 0, 0);
    await waitFor(() => { expectWarningAxes('X'); });
    expect(useSettingsStore.getState().nvMem.zeroApproachEnabled).toEqual({
      X: false,
      Y: false,
      Z: false,
    });
  });

  it('arms PCD X/Y targets but not a zero-valued Z, and disarms current-number and jump displays', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { user } = await renderSimulator();
    await user.click(screen.getByTestId('btn-toggle-unit'));
    await enterCirclePattern(user);

    emitPosition(9.97, 0, 0);
    expectWarningAxes('X', 'Y');

    await user.click(screen.getByTestId('key-8'));
    expectWarningAxes();

    await user.click(screen.getByTestId('key-8'));
    expectWarningAxes('X', 'Y');
    await user.click(screen.getByTestId('key-2'));
    expectWarningAxes();
  });

  it('arms only the selected axis in a linear pattern', async () => {
    const { user } = await renderSimulator();
    await user.click(screen.getByTestId('btn-toggle-unit'));
    await enterLinearPatternOnY(user);
    expectWarningAxes('Y');
  });

  it('does not invent a warning for a missing SDM run step', async () => {
    const { user } = await renderSimulator();
    await user.click(screen.getByTestId('btn-sdm'));
    await user.click(screen.getByTestId('key-6'));
    expect(getAxisDisplayPureTextValue('X')).toBe('rUn');
    await pressEnter(user);
    await pressEnter(user);

    expect(rawAxisText('X')).toBe('no dAtA');
    expectWarningAxes();
  });

  it('arms only X/Y on a center result even when Z is zero', async () => {
    const { user } = await renderSimulator();
    await user.click(screen.getByTestId('btn-toggle-unit'));
    emitPosition(-1, -1, 0);

    await user.click(screen.getByTestId('btn-function'));
    await pressEnter(user);
    expect(getAxisDisplayPureTextValue('X')).toBe('CirCLE');
    await user.click(screen.getByTestId('key-6'));
    expect(getAxisDisplayPureTextValue('X')).toBe('LinE');
    await pressEnter(user);
    await user.click(screen.getByTestId('key-6'));

    emitPosition(1, 1, 0);
    await user.click(screen.getByTestId('key-6'));
    emitPosition(0.03, -0.03, 0);

    await waitFor(() => { expectWarningAxes('X', 'Y'); });
    expect(rawAxisText('Z')).toBe('CEntrE');
  });
});

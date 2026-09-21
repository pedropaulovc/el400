import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import {
  renderSimulator,
  typeValue,
  pressEnter,
  emitPosition,
  getAxisDisplayPureTextValue,
} from '../../../tests/helpers/integration-test-utils';
import { SETUP_PARAMETERS } from './setup-parameters';

let keypadBeepCount = 0;
let warningBeepCount = 0;

class TrackingAudioContext {
  state = 'running';
  currentTime = 0;
  destination = {};

  createBufferSource() {
    return {
      buffer: null,
      connect: () => ({}),
      start: () => { keypadBeepCount += 1; },
      stop: () => undefined,
    };
  }

  createOscillator() {
    return {
      type: 'sine',
      frequency: { value: 0 },
      connect: () => ({}),
      start: () => { warningBeepCount += 1; },
      stop: () => undefined,
    };
  }

  createGain() {
    return {
      gain: {
        value: 1,
        setValueAtTime: () => undefined,
        linearRampToValueAtTime: () => undefined,
      },
      connect: () => ({}),
    };
  }

  decodeAudioData() {
    return Promise.resolve({});
  }

  resume() {
    return Promise.resolve();
  }
}

function rawAxisText(axis: 'X' | 'Y' | 'Z'): string {
  return (screen.getByTestId(`axis-value-${axis.toLowerCase()}`).textContent || '').trim();
}

async function scrollSetupTo(user: UserEvent, predicate: (text: string) => boolean, name: string) {
  for (let guard = 0; !predicate(rawAxisText('X')); guard += 1) {
    if (guard >= SETUP_PARAMETERS.length) throw new Error(`${name} not reachable in setup`);
    await user.click(screen.getByTestId('key-2'));
  }
}

async function openBeepParameter(user: UserEvent) {
  await user.click(screen.getByTestId('btn-settings'));
  await user.click(screen.getByTestId('axis-select-x'));
  await scrollSetupTo(user, (text) => text === 'bEEP on' || text === 'bEEP oFF', 'bEEP');
}

async function saveAndExitSetup(user: UserEvent) {
  await scrollSetupTo(user, (text) => text === 'SAU ChG', 'SAU ChG');
  await pressEnter(user);
  expect(getAxisDisplayPureTextValue('X')).toBe('StorEd');
  await pressEnter(user);
  await scrollSetupTo(user, (text) => text === 'End', 'End');
  await pressEnter(user);
}

async function saveBeep(user: UserEvent, enabled: boolean) {
  await openBeepParameter(user);
  const target = enabled ? 'bEEP on' : 'bEEP oFF';
  if (rawAxisText('X') !== target) await user.click(screen.getByTestId('key-6'));
  expect(getAxisDisplayPureTextValue('X')).toBe(target);
  await saveAndExitSetup(user);
}

async function startDistanceToGoX(user: UserEvent, targetMm: string) {
  await user.click(screen.getByTestId('btn-distance-to-go'));
  await user.click(screen.getByTestId('axis-select-x'));
  await typeValue(user, targetMm);
  await pressEnter(user);
  await user.click(screen.getByTestId('btn-distance-to-go'));
}

describe('Keypad beep — live audio integration (US-025)', () => {
  let originalAudioContext: typeof AudioContext;

  beforeEach(() => {
    localStorage.clear();
    keypadBeepCount = 0;
    warningBeepCount = 0;
    originalAudioContext = global.AudioContext;
    global.AudioContext = TrackingAudioContext as unknown as typeof AudioContext;
  });

  afterEach(() => {
    global.AudioContext = originalAudioContext;
  });

  it('shows bEEP on as the saved factory choice', async () => {
    const { user } = await renderSimulator();
    await openBeepParameter(user);
    expect(getAxisDisplayPureTextValue('X')).toBe('bEEP on');
  });

  it('treats an off choice as a draft until SAU ChG', async () => {
    const { user } = await renderSimulator();
    await openBeepParameter(user);
    await user.click(screen.getByTestId('key-6'));
    expect(getAxisDisplayPureTextValue('X')).toBe('bEEP oFF');

    keypadBeepCount = 0;
    await user.click(screen.getByTestId('key-1'));
    await waitFor(() => { expect(keypadBeepCount).toBe(1); });

    await user.click(screen.getByTestId('key-clear'));
    await openBeepParameter(user);
    expect(getAxisDisplayPureTextValue('X')).toBe('bEEP on');
  });

  it('beeps on keypad presses while the saved choice is on', async () => {
    const { user } = await renderSimulator();
    keypadBeepCount = 0;
    await user.click(screen.getByTestId('key-1'));
    await user.click(screen.getByTestId('key-2'));
    await user.click(screen.getByTestId('key-3'));
    await waitFor(() => { expect(keypadBeepCount).toBe(3); });
  });

  it('silences keypad presses after bEEP off is saved', async () => {
    const { user } = await renderSimulator();
    await saveBeep(user, false);

    keypadBeepCount = 0;
    await user.click(screen.getByTestId('key-1'));
    await user.click(screen.getByTestId('key-2'));
    await user.click(screen.getByTestId('key-3'));
    expect(keypadBeepCount).toBe(0);
  });

  it('keeps mandatory target warning audio with both keypad bEEP and configured BUZZ off', async () => {
    const { user } = await renderSimulator();
    await user.click(screen.getByTestId('btn-toggle-unit'));
    emitPosition(0, 0, 0);
    await saveBeep(user, false);

    keypadBeepCount = 0;
    warningBeepCount = 0;
    await startDistanceToGoX(user, '10');
    emitPosition(9.96, 0, 0);

    await waitFor(() => { expect(warningBeepCount).toBeGreaterThan(0); });
    expect(keypadBeepCount).toBe(0);
  });
});

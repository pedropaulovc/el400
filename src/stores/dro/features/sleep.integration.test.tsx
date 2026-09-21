/** Integration coverage for the setup-driven display sleep timer. */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, act } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import {
  renderSimulator,
  typeValue,
  pressEnter,
  emitMillTick,
  emitPosition,
  getAxisDisplayPureTextValue,
  getAxisDisplayPureNumberValue,
} from '../../../tests/helpers/integration-test-utils';
import { SETUP_PARAMETERS } from './setup-parameters';
import { MINUTES_TO_MS } from './sleep';

function isAsleep(): boolean {
  return screen.getByTestId('display-panel').getAttribute('data-display-power') === 'asleep';
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

async function scrollSetupTo(user: UserEvent, label: string) {
  for (let guard = 0; getAxisDisplayPureTextValue('X') !== label; guard += 1) {
    if (guard >= SETUP_PARAMETERS.length) throw new Error(`${label} not reachable in setup`);
    await user.click(screen.getByTestId('key-2'));
  }
}

async function configureSleep(user: UserEvent, minutes: string) {
  await user.click(screen.getByTestId('btn-settings'));
  await user.click(screen.getByTestId('axis-select-x'));
  await scrollSetupTo(user, 'SLEEP t');

  await pressEnter(user);
  expect(screen.getByTestId('axis-value-x').textContent.trim()).toBe('000');
  await pressEnter(user);
  expect(screen.getByTestId('axis-value-x').textContent.trim()).toBe('0');
  await typeValue(user, minutes);
  await pressEnter(user);
  expect(getAxisDisplayPureTextValue('X')).toBe('SAU ChG');

  await pressEnter(user);
  expect(getAxisDisplayPureTextValue('X')).toBe('StorEd');
  await pressEnter(user);
  expect(getAxisDisplayPureTextValue('X')).toBe('SAU ChG');
  await user.click(screen.getByTestId('key-clear'));
}

describe('US-026 Display Sleep Timer (integration)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sleeps after the configured idle interval while unchanged live encoder ticks do not reset it', async () => {
    const { user } = await renderSimulator();
    await configureSleep(user, '5');
    expect(isAsleep()).toBe(false);

    advance(4 * MINUTES_TO_MS);
    for (let count = 0; count < 5; count += 1) emitMillTick();
    advance(MINUTES_TO_MS);

    expect(isAsleep()).toBe(true);
    for (const axis of ['x', 'y', 'z']) expect(screen.getByTestId(`axis-value-${axis}`)).toBeEmptyDOMElement();
    emitMillTick();
    expect(isAsleep()).toBe(true);
  });

  it('a physical move resets the live activity deadline and later wakes the display', async () => {
    const { user } = await renderSimulator();
    await configureSleep(user, '5');

    advance(4 * MINUTES_TO_MS);
    emitPosition(1, 0, 0);
    advance(MINUTES_TO_MS);
    expect(isAsleep()).toBe(false);

    advance(4 * MINUTES_TO_MS);
    expect(isAsleep()).toBe(true);

    emitPosition(2, 0, 0);
    expect(isAsleep()).toBe(false);
  });

  it('front-panel activity resets the deadline and the waking press is consumed', async () => {
    const { user } = await renderSimulator();
    await user.click(screen.getByTestId('axis-select-x'));
    await typeValue(user, '20');
    await pressEnter(user);
    expect(getAxisDisplayPureNumberValue('X')).toBe(20);
    await configureSleep(user, '5');

    advance(4 * MINUTES_TO_MS);
    await user.click(screen.getByTestId('key-5'));
    advance(MINUTES_TO_MS);
    expect(isAsleep()).toBe(false);

    advance(4 * MINUTES_TO_MS);
    expect(isAsleep()).toBe(true);
    await user.click(screen.getByTestId('axis-zero-x'));
    expect(isAsleep()).toBe(false);
    expect(getAxisDisplayPureNumberValue('X')).toBe(20);
    // The first Zero X wakes only; the second press performs the zero.
    await user.click(screen.getByTestId('axis-zero-x'));
    expect(getAxisDisplayPureNumberValue('X')).toBe(0);
  });

  it('never sleeps while SLEEP t remains at its saved zero default', async () => {
    await renderSimulator();
    advance(120 * MINUTES_TO_MS);
    emitMillTick();
    expect(isAsleep()).toBe(false);
  });
});

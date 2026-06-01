import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderSimulator,
  getAxisDisplayPureNumberValue,
} from '../tests/helpers/integration-test-utils';
import { useDROStore } from '../stores/droStore';

// Audio relies on AudioContext, which jsdom lacks. Stub the shared utility so
// the keyboard handler's beep does not blow up the render.
vi.mock('../utils/audio', () => ({ playClickSound: vi.fn() }));

/**
 * Integration tests for US-038 keyboard shortcuts.
 *
 * These press REAL keys through userEvent against the fully-rendered simulator
 * (focus on the container, then keyboard input) — no store backdoors. They
 * assert the observable result: display values, LED state and state-machine
 * transitions, exactly as a user would see them.
 */
describe('US-038 Keyboard Shortcuts Integration', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.clear();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  /** Focuses the simulator container so shortcuts are in scope. */
  async function focusSimulator(user: ReturnType<typeof userEvent.setup>) {
    const container = screen.getByTestId('el400-simulator');
    await user.click(container);
    container.focus();
  }

  it('AC 38.1/38.3/38.7 — selects axis and enters a value with the keyboard', async () => {
    const { user } = await renderSimulator();
    await focusSimulator(user);

    await user.keyboard('x');
    await user.keyboard('1');
    await user.keyboard('2');
    await user.keyboard('3');
    await user.keyboard('{Enter}');

    expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(123, 4);
  });

  it('AC 38.4 — decimal point produces a fractional value', async () => {
    const { user } = await renderSimulator();
    await focusSimulator(user);

    await user.keyboard('y');
    await user.keyboard('1');
    // Bracket notation drives a real `code` (jsdom/userEvent emit Unknown for a
    // bare '.'); a real browser sends `Period` exactly like this.
    await user.keyboard('[Period]');
    await user.keyboard('5');
    await user.keyboard('{Enter}');

    expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(1.5, 4);
  });

  it('AC 38.5 — minus toggles the sign', async () => {
    const { user } = await renderSimulator();
    await focusSimulator(user);

    await user.keyboard('x');
    await user.keyboard('5');
    await user.keyboard('[Minus]');
    await user.keyboard('{Enter}');

    expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(-5, 4);
  });

  it('AC 38.6 — Escape clears the input buffer before confirm', async () => {
    const { user } = await renderSimulator();
    await focusSimulator(user);

    await user.keyboard('x');
    await user.keyboard('9');
    await user.keyboard('9');
    await user.keyboard('{Escape}');
    await user.keyboard('{Enter}');

    // After clear, confirming should not commit 99.
    expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(0, 4);
  });

  it('AC 38.8 — Shift+X zeros the X axis', async () => {
    const { user } = await renderSimulator();
    await focusSimulator(user);

    await user.keyboard('x');
    await user.keyboard('5');
    await user.keyboard('0');
    await user.keyboard('{Enter}');
    expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(50, 4);

    await user.keyboard('{Shift>}X{/Shift}');
    expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(0, 4);
  });

  it('AC 38.13 — Shift+0 zeros all axes', async () => {
    const { user } = await renderSimulator();
    await focusSimulator(user);

    await user.keyboard('x');
    await user.keyboard('1');
    await user.keyboard('0');
    await user.keyboard('{Enter}');
    await user.keyboard('y');
    await user.keyboard('2');
    await user.keyboard('0');
    await user.keyboard('{Enter}');

    expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(10, 4);
    expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(20, 4);

    await user.keyboard('{Shift>}0{/Shift}');

    expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(0, 4);
    expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(0, 4);
    expect(getAxisDisplayPureNumberValue('Z')).toBeCloseTo(0, 4);
  });

  it('AC 38.10 — A toggles ABS/INC', async () => {
    const { user } = await renderSimulator();
    await focusSimulator(user);

    expect(screen.getByTestId('led-abs').querySelector('input')).toBeChecked();

    await user.keyboard('a');

    expect(screen.getByTestId('led-inc').querySelector('input')).toBeChecked();
    expect(screen.getByTestId('led-abs').querySelector('input')).not.toBeChecked();
  });

  it('AC 38.11 — U toggles inch/mm', async () => {
    const { user } = await renderSimulator();
    await focusSimulator(user);

    const inchChecked = screen.getByTestId('led-inch').querySelector('input')?.checked;

    await user.keyboard('u');

    const inchCheckedAfter = screen.getByTestId('led-inch').querySelector('input')?.checked;
    expect(inchCheckedAfter).toBe(!inchChecked);
  });

  it('AC 38.9 — W opens the settings menu', async () => {
    const { user } = await renderSimulator();
    await focusSimulator(user);

    await user.keyboard('w');

    expect(useDROStore.getState().stateName).toBe('setup-select');
  });

  it('AC 38.12 — R activates the reference function', async () => {
    const { user } = await renderSimulator();
    await focusSimulator(user);

    await user.keyboard('r');

    expect(useDROStore.getState().stateName).toBe('reference-menu-home');
  });

  it.each([
    ['k', 'calculator-idle'],
    ['f', 'function-menu-center'],
    ['b', 'bolt-hole-intro'],
    ['o', 'arc-contour-intro'],
    ['g', 'angle-hole-intro'],
    ['d', 'grid-intro'],
    ['s', 'sdm-intro'],
  ])('AC 38.14-38.21 — "%s" enters %s', async (key, expectedState) => {
    const { user } = await renderSimulator();
    await focusSimulator(user);

    await user.keyboard(key);

    expect(useDROStore.getState().stateName).toBe(expectedState);
  });

  it('AC 38.19 — H halves the selected axis value', async () => {
    const { user } = await renderSimulator();
    await focusSimulator(user);

    await user.keyboard('x');
    await user.keyboard('1');
    await user.keyboard('0');
    await user.keyboard('0');
    await user.keyboard('{Enter}');
    expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(100, 4);

    await user.keyboard('h');

    expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(50, 4);
  });

  it('AC 38.22 — shortcuts do not fire while typing in a text input', async () => {
    const { user } = await renderSimulator();

    // A stray text input mounted inside the simulator must keep its keystrokes.
    const container = screen.getByTestId('el400-simulator');
    const input = document.createElement('input');
    input.setAttribute('data-testid', 'stray-input');
    container.appendChild(input);

    input.focus();
    await user.keyboard('a'); // would toggle ABS/INC if not guarded

    expect(screen.getByTestId('led-abs').querySelector('input')).toBeChecked();
    expect(input.value).toBe('a');
  });

  it('does not react to keys outside the simulator container', async () => {
    const { user } = await renderSimulator();

    // Focus the document body (outside the simulator), then press a shortcut key.
    document.body.focus();
    await user.keyboard('a');

    // ABS should remain selected: the container-scoped handler never ran.
    expect(screen.getByTestId('led-abs').querySelector('input')).toBeChecked();
  });
});

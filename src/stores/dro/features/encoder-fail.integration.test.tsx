import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderSimulator,
  getAxisDisplayPureNumberValue,
} from '../../../tests/helpers/integration-test-utils';
import { initializeDROMillConnection } from '../../droStore';
import { initializeMillStore } from '../../millStore';
import { MockMillAdapter } from '../../../adapters/MockMillAdapter';
import { ENCODER_FAIL_TEXT } from '../utils/displayComputation';

/**
 * Integration tests: US-042 Encoder-Fail Warning (ENF).
 *
 * Real-input discipline (mandatory):
 * - The ENF setting is turned on by clicking the actual setup buttons
 *   (btn-settings, the 8/2 item-scroll keys, the 6 choice-cycle key, End + ent),
 *   exactly as an operator would. No direct nvMem mutation.
 * - Signal loss is driven by a connected MockMillAdapter via
 *   setEncoderSignal(axis, 'lost'), which fires the production
 *   adapter -> millStore -> droStore MILL_STATE_CHANGED path — the same pipe a
 *   real encoder dropout would travel. No window hooks, no forced display writes.
 *
 * Label contract (manual section 6.2): the EnF parameter renders `EnF oFF`
 * (default) and `EnF on`. These strings appear on no other parameter, so they
 * uniquely identify the EnF item while scrolling. Note *2: the affected axis
 * shows `no SIG` when the encoder cable drops.
 *
 * @see project/user-stories/06-configuration/US-042-encoder-fail-warning.md
 */
describe('Encoder-fail warning — live readout integration (US-042)', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let cleanup: (() => void) | null = null;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.clear();
  });

  afterEach(() => {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
    consoleWarnSpy.mockRestore();
  });

  /** Connect a MockMillAdapter to the rendered simulator and return it. */
  async function connectMockMill(): Promise<MockMillAdapter> {
    initializeDROMillConnection();
    const mock = new MockMillAdapter();
    await act(async () => {
      cleanup = await initializeMillStore(mock);
    });
    return mock;
  }

  /** Emit a new absolute encoder position (real MILL_STATE_CHANGED path). */
  async function emitPosition(mock: MockMillAdapter, x: number, y: number, z: number) {
    await act(async () => {
      mock.setPosition(x, y, z);
    });
  }

  /** Drop the encoder signal on an axis via the real adapter event. */
  async function dropSignal(mock: MockMillAdapter, axis: 'X' | 'Y' | 'Z') {
    await act(async () => {
      mock.setEncoderSignal(axis, 'lost');
    });
  }

  /** Restore the encoder signal on an axis via the real adapter event. */
  async function restoreSignal(mock: MockMillAdapter, axis: 'X' | 'Y' | 'Z') {
    await act(async () => {
      mock.setEncoderSignal(axis, 'ok');
    });
  }

  function rawAxisText(axis: 'X' | 'Y' | 'Z'): string {
    const el = screen.getByTestId(`axis-value-${axis.toLowerCase()}`);
    return (el.textContent || '').trim();
  }

  async function waitForAxisText(axis: 'X' | 'Y' | 'Z', expected: string) {
    await waitFor(() => { expect(rawAxisText(axis)).toBe(expected); });
  }

  function isEnfLabel(t: string): boolean {
    return t === 'EnF oFF' || t === 'EnF on';
  }

  /**
   * Drive the real setup menu to set EnF on: open setup, select X (EnF is global
   * but the shell still needs an axis chosen to enter the parameter list), scroll
   * to the EnF parameter, cycle the choice to `EnF on`, exit via End + ent.
   */
  async function setEnfOn(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByTestId('btn-settings'));
    await waitForAxisText('X', 'SELECt');
    await user.click(screen.getByTestId('axis-select-x'));

    // Scroll down (key-2) until the EnF parameter is highlighted.
    let guard = 0;
    while (!isEnfLabel(rawAxisText('X'))) {
      await user.click(screen.getByTestId('key-2'));
      guard += 1;
      if (guard > 30) throw new Error('EnF parameter not found in setup menu');
    }

    // Cycle the choice (key-6) until it reads `EnF on`.
    guard = 0;
    while (rawAxisText('X') !== 'EnF on') {
      await user.click(screen.getByTestId('key-6'));
      guard += 1;
      if (guard > 4) throw new Error('EnF on choice not reachable by cycling');
    }

    // Exit to idle via the terminal End item + ent.
    guard = 0;
    while (rawAxisText('X') !== 'End') {
      await user.click(screen.getByTestId('key-2'));
      guard += 1;
      if (guard > 30) throw new Error('End item not found while exiting setup');
    }
    await user.click(screen.getByTestId('key-enter'));
    // Back in idle: X shows a live numeric reading (no longer the 'End' label).
    await waitFor(() => { expect(rawAxisText('X')).toMatch(/^-?\d/); });
  }

  it('shows no SIG on the affected axis when ENF on and signal drops (AC 42.3)', async () => {
    const user = userEvent.setup();
    renderSimulator();
    const mock = await connectMockMill();

    await user.click(screen.getByTestId('btn-toggle-unit')); // mm
    await emitPosition(mock, 10, 20, 30);
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(10, 4); });

    await setEnfOn(user);

    // X encoder cable drops — only X shows no SIG; Y/Z still read position.
    await dropSignal(mock, 'X');
    await waitForAxisText('X', ENCODER_FAIL_TEXT);
    expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(20, 4);
    expect(getAxisDisplayPureNumberValue('Z')).toBeCloseTo(30, 4);
  });

  it('clears the warning once the signal is restored (AC 42.5)', async () => {
    const user = userEvent.setup();
    renderSimulator();
    const mock = await connectMockMill();

    await user.click(screen.getByTestId('btn-toggle-unit')); // mm
    await emitPosition(mock, 7, 0, 0);
    await setEnfOn(user);

    await dropSignal(mock, 'X');
    await waitForAxisText('X', ENCODER_FAIL_TEXT);

    await restoreSignal(mock, 'X');
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(7, 4); });
  });

  it('with ENF off (default), a dropped signal is silent (AC 42.4)', async () => {
    const user = userEvent.setup();
    renderSimulator();
    const mock = await connectMockMill();

    await user.click(screen.getByTestId('btn-toggle-unit')); // mm
    await emitPosition(mock, 5, 0, 0);
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(5, 4); });

    // ENF left at its default (off): a dropout must not show no SIG.
    await dropSignal(mock, 'X');
    // Emit another position so the display recomputes after the dropout.
    await emitPosition(mock, 5, 0, 0);
    await waitFor(() => { expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(5, 4); });
    expect(rawAxisText('X')).not.toBe(ENCODER_FAIL_TEXT);
  });
});

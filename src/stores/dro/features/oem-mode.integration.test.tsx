/**
 * Integration tests: US-044 OEM Mode (custom default baseline).
 *
 * Drives the full simulator through real front-panel buttons (btn-settings,
 * axis-select-x, the 2/8 item-scroll keys, the numeric keys for the password,
 * key-enter, key-clear) and asserts the LIVE settings store / localStorage. No
 * forced state, no window backdoors, no faked localStorage writes — the password
 * is typed on the real numeric keypad and persistence flows through the real
 * settingsStore (localStorage-backed).
 *
 * Covered:
 * - AC 44.1: the `oEm mod` row is reachable in setup.
 * - AC 44.2: ENT on `oEm mod` opens a password prompt; the correct code enters OEM Mode.
 * - AC 44.3: ENT in OEM Mode stores the live config as nvMem.oemDefaults.
 * - AC 44.5: enabling `EnF on` then storing makes encoder-fail part of the baseline.
 * - AC 44.6: the stored baseline round-trips through localStorage (survives a power cycle).
 * - AC 44.7: a wrong code is rejected — OEM Mode is NOT entered, no baseline captured.
 *
 * @see project/user-stories/06-configuration/US-044-oem-mode.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderSimulator,
  getAxisDisplayPureTextValue,
} from '../../../tests/helpers/integration-test-utils';
import { useSettingsStore } from '../../settingsStore';
import { NON_VOLATILE_MEMORY_STORAGE_KEY } from '../../../types/nonVolatileMemory';
import {
  OEM_PASSWORD_PROMPT,
  OEM_MODE_TEXT,
  OEM_REJECTED_TEXT,
  OEM_MODE_SETUP_LABEL,
} from './oem-mode';
import { SETUP_SAVED_TEXT } from './save-changes';

/** Type one digit on the real numeric keypad. */
async function pressDigit(user: ReturnType<typeof userEvent.setup>, digit: string) {
  await user.click(screen.getByTestId(`key-${digit}`));
}

/** Type the full correct OEM password (35726) on the real keypad. */
async function typeCorrectPassword(user: ReturnType<typeof userEvent.setup>) {
  for (const d of '35726'.split('')) await pressDigit(user, d);
}

describe('US-044 OEM Mode (integration)', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.clear();
    useSettingsStore.getState().resetMemory();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  /** Open setup, pick X, scroll down to the `oEm mod` row (AC 44.1). */
  async function gotoOemRow(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByTestId('btn-settings'));
    await waitFor(() => { expect(getAxisDisplayPureTextValue('X')).toBe('SELECt'); });
    await user.click(screen.getByTestId('axis-select-x'));

    let guard = 0;
    while (getAxisDisplayPureTextValue('X') !== OEM_MODE_SETUP_LABEL) {
      await user.click(screen.getByTestId('key-2'));
      guard += 1;
      if (guard > 40) throw new Error('oEm mod row not reachable in setup');
    }
  }

  /** Turn `EnF on` via the real setup buttons (worked example, AC 44.5). */
  async function setEnfOn(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByTestId('btn-settings'));
    await waitFor(() => { expect(getAxisDisplayPureTextValue('X')).toBe('SELECt'); });
    await user.click(screen.getByTestId('axis-select-x'));
    let guard = 0;
    while (getAxisDisplayPureTextValue('X') !== 'EnF oFF' && getAxisDisplayPureTextValue('X') !== 'EnF on') {
      await user.click(screen.getByTestId('key-2'));
      guard += 1;
      if (guard > 40) throw new Error('EnF row not reachable');
    }
    guard = 0;
    while (getAxisDisplayPureTextValue('X') !== 'EnF on') {
      await user.click(screen.getByTestId('key-6'));
      guard += 1;
      if (guard > 4) throw new Error('EnF on not reachable by cycling');
    }
    // Exit setup (EnF commits on change, so it is already saved); leave via clear.
    await user.click(screen.getByTestId('key-clear'));
  }

  it('reaches the oEm mod row and opens a password prompt on ENT (AC 44.1/44.2)', async () => {
    const user = userEvent.setup();
    renderSimulator();

    await gotoOemRow(user);
    expect(getAxisDisplayPureTextValue('X')).toBe(OEM_MODE_SETUP_LABEL);

    await user.click(screen.getByTestId('key-enter'));
    expect(getAxisDisplayPureTextValue('X')).toBe(OEM_PASSWORD_PROMPT);
  });

  it('the correct password enters OEM Mode (AC 44.2)', async () => {
    const user = userEvent.setup();
    renderSimulator();

    await gotoOemRow(user);
    await user.click(screen.getByTestId('key-enter')); // password prompt
    await typeCorrectPassword(user);
    // The typed code is never echoed — the prompt stays put while typing.
    expect(getAxisDisplayPureTextValue('X')).toBe(OEM_PASSWORD_PROMPT);
    await user.click(screen.getByTestId('key-enter')); // validate
    expect(getAxisDisplayPureTextValue('X')).toBe(OEM_MODE_TEXT);
  });

  it('storing in OEM Mode captures the live config as the baseline (AC 44.3)', async () => {
    const user = userEvent.setup();
    renderSimulator();

    expect(useSettingsStore.getState().nvMem.oemDefaults).toBeNull();

    await gotoOemRow(user);
    await user.click(screen.getByTestId('key-enter'));
    await typeCorrectPassword(user);
    await user.click(screen.getByTestId('key-enter')); // enter OEM Mode
    expect(getAxisDisplayPureTextValue('X')).toBe(OEM_MODE_TEXT);

    await user.click(screen.getByTestId('key-enter')); // STORE
    expect(getAxisDisplayPureTextValue('X')).toBe(SETUP_SAVED_TEXT);

    expect(useSettingsStore.getState().nvMem.oemDefaults).not.toBeNull();
  });

  it('worked example: EnF on becomes the OEM baseline and round-trips localStorage (AC 44.5/44.6)', async () => {
    const user = userEvent.setup();
    renderSimulator();

    // Turn ENF on first (real setup buttons), then store it as the OEM baseline.
    await setEnfOn(user);
    expect(useSettingsStore.getState().nvMem.encoderFailWarning).toBe(true);

    await gotoOemRow(user);
    await user.click(screen.getByTestId('key-enter'));
    await typeCorrectPassword(user);
    await user.click(screen.getByTestId('key-enter')); // enter OEM Mode
    await user.click(screen.getByTestId('key-enter')); // STORE baseline
    expect(getAxisDisplayPureTextValue('X')).toBe(SETUP_SAVED_TEXT);

    // The baseline captured EnF on (AC 44.5).
    expect(useSettingsStore.getState().nvMem.oemDefaults?.encoderFailWarning).toBe(true);

    // ...and it round-trips through the localStorage middleware (AC 44.6 persistence).
    await waitFor(() => {
      const raw = localStorage.getItem(NON_VOLATILE_MEMORY_STORAGE_KEY);
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(parsed.state.nvMem.oemDefaults.encoderFailWarning).toBe(true);
    });
  });

  it('a wrong password is rejected — OEM Mode not entered, no baseline (AC 44.7)', async () => {
    const user = userEvent.setup();
    renderSimulator();

    await gotoOemRow(user);
    await user.click(screen.getByTestId('key-enter')); // password prompt

    // Type a wrong code on the real keypad.
    for (const d of '0000'.split('')) await pressDigit(user, d);
    await user.click(screen.getByTestId('key-enter')); // validate -> reject

    expect(getAxisDisplayPureTextValue('X')).toBe(OEM_REJECTED_TEXT);
    expect(getAxisDisplayPureTextValue('X')).not.toBe(OEM_MODE_TEXT);
    // No baseline captured.
    expect(useSettingsStore.getState().nvMem.oemDefaults).toBeNull();

    // The rejection auto-dismisses back to the oEm mod row (OEM never entered).
    await waitFor(
      () => { expect(getAxisDisplayPureTextValue('X')).toBe(OEM_MODE_SETUP_LABEL); },
      { timeout: 2000 }
    );
  });
});

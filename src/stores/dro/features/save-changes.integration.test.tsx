/**
 * Integration tests: US-027 Setup Menu — Save Changes (SAV CHG).
 *
 * Drives the full simulator through real setup buttons (btn-settings,
 * axis-select-*, the 8/2 item-scroll keys, the 4/6 choice-cycle keys, key-enter,
 * key-clear) and asserts the LIVE settings store / localStorage. No forced state,
 * no window hooks, no direct localStorage poking to fake a save.
 *
 * Covered:
 * - AC27.2/27.3: ENT on SAV CHG persists a draft-only SC change to nvMem.
 * - AC27.4: a confirmation message (StorEd) is shown.
 * - AC27.5: the persisted value round-trips through the settingsStore localStorage
 *   middleware (read back from the storage key).
 * - AC27.6: exiting via End (or C) WITHOUT SAV CHG leaves nvMem unchanged.
 *
 * @see project/user-stories/06-configuration/US-027-save-changes.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import type userEvent from '@testing-library/user-event';
import {
  renderSimulator,
  getAxisDisplayPureTextValue,
} from '../../../tests/helpers/integration-test-utils';
import { useSettingsStore } from '../../settingsStore';
import { NON_VOLATILE_MEMORY_STORAGE_KEY } from '../../../types/nonVolatileMemory';

describe('US-027 Save Changes (integration)', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.clear();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  /** Open setup, pick X, scroll up to the SC parameter (draft-only). */
  async function gotoSC(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByTestId('btn-settings'));
    await user.click(screen.getByTestId('axis-select-x'));
    while (!getAxisDisplayPureTextValue('X').startsWith('SC')) {
      await user.click(screen.getByTestId('key-8'));
    }
  }

  /** Scroll (up) from anywhere in the parameter list to a given exact label. */
  async function scrollToLabel(user: ReturnType<typeof userEvent.setup>, label: string) {
    let guard = 0;
    while (getAxisDisplayPureTextValue('X') !== label) {
      await user.click(screen.getByTestId('key-8'));
      guard += 1;
      if (guard > 30) throw new Error(`label ${label} not reachable`);
    }
  }

  it('ENT on SAV CHG persists an SC change and shows the confirmation (AC27.2-27.5)', async () => {
    const { user } = await renderSimulator();

    await gotoSC(user);
    expect(getAxisDisplayPureTextValue('X')).toBe('SC 5.0');
    // Lower the resolution: 5 -> 2 -> 1 micron (draft only).
    await user.click(screen.getByTestId('key-4'));
    await user.click(screen.getByTestId('key-4'));
    expect(getAxisDisplayPureTextValue('X')).toBe('SC 1.0');
    // Still unsaved in nvMem.
    expect(useSettingsStore.getState().nvMem.scaleResolution.X).toBe('5');

    // Scroll to SAV CHG and confirm with ENT.
    await scrollToLabel(user, 'SAU ChG');
    await user.click(screen.getByTestId('key-enter'));

    // Confirmation message (AC27.4).
    expect(getAxisDisplayPureTextValue('X')).toBe('StorEd');

    // nvMem committed (AC27.3) and round-trips through localStorage (AC27.5).
    expect(useSettingsStore.getState().nvMem.scaleResolution.X).toBe('1');
    await waitFor(() => {
      const raw = localStorage.getItem(NON_VOLATILE_MEMORY_STORAGE_KEY);
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(parsed.state.nvMem.scaleResolution.X).toBe('1');
    });
  });

  it('the confirmation auto-returns to the SAV CHG item (AC27.4)', async () => {
    const { user } = await renderSimulator();

    await gotoSC(user);
    await user.click(screen.getByTestId('key-4')); // draft SC 2.0
    await scrollToLabel(user, 'SAU ChG');
    await user.click(screen.getByTestId('key-enter'));
    expect(getAxisDisplayPureTextValue('X')).toBe('StorEd');

    // The hook dispatches SETUP_SAVED_TIMEOUT after a delay; wait for the menu.
    await waitFor(
      () => { expect(getAxisDisplayPureTextValue('X')).toBe('SAU ChG'); },
      { timeout: 2000 }
    );
  });

  it('exiting via End WITHOUT SAV CHG discards the SC change (AC27.6)', async () => {
    const { user } = await renderSimulator();

    await gotoSC(user);
    await user.click(screen.getByTestId('key-4')); // draft SC 2.0
    expect(getAxisDisplayPureTextValue('X')).toBe('SC 2.0');

    // Walk to End and exit without saving.
    await scrollToLabel(user, 'End');
    await user.click(screen.getByTestId('key-enter'));

    // Back to idle; nvMem untouched (AC27.6).
    expect(() => getAxisDisplayPureTextValue('X')).toThrow();
    expect(useSettingsStore.getState().nvMem.scaleResolution.X).toBe('5');
  });

  it('exiting via C (clear) WITHOUT SAV CHG discards the SC change (AC27.6)', async () => {
    const { user } = await renderSimulator();

    await gotoSC(user);
    await user.click(screen.getByTestId('key-4')); // draft SC 2.0
    await user.click(screen.getByTestId('key-clear')); // exit, discard

    expect(() => getAxisDisplayPureTextValue('X')).toThrow();
    expect(useSettingsStore.getState().nvMem.scaleResolution.X).toBe('5');
  });

  it('a saved change followed by a NEW unsaved change keeps only the saved one (AC27.6)', async () => {
    const { user } = await renderSimulator();

    // Save SC -> 2.0.
    await gotoSC(user);
    await user.click(screen.getByTestId('key-4')); // SC 2.0
    await scrollToLabel(user, 'SAU ChG');
    await user.click(screen.getByTestId('key-enter'));
    expect(useSettingsStore.getState().nvMem.scaleResolution.X).toBe('2');

    // Wait for the menu to come back, make a NEW draft change, then exit via End.
    await waitFor(
      () => { expect(getAxisDisplayPureTextValue('X')).toBe('SAU ChG'); },
      { timeout: 2000 }
    );
    await scrollToLabel(user, 'SC 2.0');
    await user.click(screen.getByTestId('key-4')); // draft SC 1.0 (unsaved)
    await scrollToLabel(user, 'End');
    await user.click(screen.getByTestId('key-enter'));

    // Only the saved 2.0 survives; the unsaved 1.0 is discarded.
    expect(useSettingsStore.getState().nvMem.scaleResolution.X).toBe('2');
  });
});

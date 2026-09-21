/**
 * Integration tests: setup changes form one draft transaction. ENT on SAU ChG
 * commits it atomically and shows StorEd; End and C discard unsaved drafts.
 * Persistence is exercised through the real front-panel setup flow.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import {
  renderSimulator,
  getAxisDisplayPureTextValue,
} from '../../../tests/helpers/integration-test-utils';
import { useSettingsStore } from '../../settingsStore';
import { NON_VOLATILE_MEMORY_STORAGE_KEY } from '../../../types/nonVolatileMemory';

describe('US-027 Save Changes (integration)', () => {
  beforeEach(() => {
    localStorage.clear();
  });


  /** Open setup, pick X, scroll up to the SC parameter (draft-only). */
  async function gotoSC(user: UserEvent) {
    await user.click(screen.getByTestId('btn-settings'));
    await user.click(screen.getByTestId('axis-select-x'));
    while (!getAxisDisplayPureTextValue('X').startsWith('SC')) {
      await user.click(screen.getByTestId('key-8'));
    }
  }

  /** Scroll (up) from anywhere in the parameter list to a given exact label. */
  async function scrollToLabel(user: UserEvent, label: string) {
    let guard = 0;
    while (getAxisDisplayPureTextValue('X') !== label) {
      await user.click(screen.getByTestId('key-8'));
      guard += 1;
      if (guard > 30) throw new Error(`label ${label} not reachable`);
    }
  }

  it('ENT on SAU ChG persists an SC change and shows the confirmation (AC27.2-27.5)', async () => {
    const { user } = await renderSimulator();

    await gotoSC(user);
    expect(getAxisDisplayPureTextValue('X')).toBe('SC 5.0');
    // Lower the resolution: 5 -> 2 -> 1 micron (draft only).
    await user.click(screen.getByTestId('key-4'));
    await user.click(screen.getByTestId('key-4'));
    expect(getAxisDisplayPureTextValue('X')).toBe('SC 1.0');
    // Still unsaved in nvMem.
    expect(useSettingsStore.getState().nvMem.scaleResolution.X).toBe('5');

    // Scroll to SAU ChG and confirm with ENT.
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

  it('the next key dismisses StorEd without replaying that key on SAU ChG', async () => {
    const { user } = await renderSimulator();

    await gotoSC(user);
    await user.click(screen.getByTestId('key-4'));
    await scrollToLabel(user, 'SAU ChG');
    await user.click(screen.getByTestId('key-enter'));
    expect(getAxisDisplayPureTextValue('X')).toBe('StorEd');

    await user.click(screen.getByTestId('key-enter'));
    expect(getAxisDisplayPureTextValue('X')).toBe('SAU ChG');
    expect(useSettingsStore.getState().nvMem.scaleResolution.X).toBe('2');
  });

  it('exiting via End without SAU ChG discards the SC change (AC27.6)', async () => {
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

  it('exiting via C without SAU ChG discards the SC change (AC27.6)', async () => {
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

    // Dismiss StorEd, make a NEW draft change, then exit via End.
    await user.click(screen.getByTestId('key-enter'));
    expect(getAxisDisplayPureTextValue('X')).toBe('SAU ChG');
    await scrollToLabel(user, 'SC 2.0');
    await user.click(screen.getByTestId('key-4')); // draft SC 1.0 (unsaved)
    await scrollToLabel(user, 'End');
    await user.click(screen.getByTestId('key-enter'));

    // Only the saved 2.0 survives; the unsaved 1.0 is discarded.
    expect(useSettingsStore.getState().nvMem.scaleResolution.X).toBe('2');
  });
});

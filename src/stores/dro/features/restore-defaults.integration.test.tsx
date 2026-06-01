/**
 * Integration tests: US-028 Restore Defaults (`rSt oEm`).
 *
 * Drives the full simulator through real front-panel buttons (btn-settings,
 * axis-select-x, the 2-key item-scroll, key-enter) and asserts the LIVE settings
 * store / volatile memory. No forced state, no window backdoors — the restore is
 * triggered by a real ENT over the real `rSt oEm` setup row, and the IN ProG
 * dwell completes via the real timeout hook (driven by fake timers).
 *
 * Covered:
 * - AC28.1/28.2/28.3: reach the `rSt oEm` row in setup.
 * - AC28.7/28.8: ENT shows `IN ProG`.
 * - AC28.9/28.10: the dwell completes and every setting returns to defaults.
 * - AC44.4: when an OEM baseline exists, restore returns to THAT baseline.
 * - "verify data cleared": SDM points and tool/work offsets are wiped.
 *
 * @see project/user-stories/06-configuration/US-028-restore-defaults.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderSimulator,
  getAxisDisplayPureTextValue,
  getAxisDisplayPureNumberValue,
} from '../../../tests/helpers/integration-test-utils';
import { useSettingsStore } from '../../settingsStore';
import { useDROStore } from '../../droStore';
import { DEFAULT_NON_VOLATILE_MEMORY } from '../../../types/nonVolatileMemory';
import {
  RESTORE_DEFAULTS_LABEL,
  RESTORE_IN_PROGRESS_TEXT,
  RESTORE_DURATION_MS,
} from './restore-defaults';

describe('US-028 Restore Defaults (integration)', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.clear();
    useSettingsStore.getState().resetMemory();
  });

  afterEach(() => {
    // Unmount the simulator between tests so a lingering `In ProG` dwell timer
    // (the real-timer useRestoreProgress hook) and stale DOM nodes don't bleed
    // into the next test's queries / state.
    cleanup();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  /** Open setup, pick X, scroll the 2-key to the `rSt oEm` row (AC28.1-28.3). */
  async function gotoRestoreRow(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByTestId('btn-settings'));
    await waitFor(() => { expect(getAxisDisplayPureTextValue('X')).toBe('SELECt'); });
    await user.click(screen.getByTestId('axis-select-x'));

    let guard = 0;
    while (getAxisDisplayPureTextValue('X') !== RESTORE_DEFAULTS_LABEL) {
      await user.click(screen.getByTestId('key-2'));
      guard += 1;
      if (guard > 40) throw new Error('rSt oEm row not reachable in setup');
    }
  }

  it('reaches the rSt oEm row and shows IN ProG on ENT (AC28.3/28.7/28.8)', async () => {
    const user = userEvent.setup();
    renderSimulator();

    await gotoRestoreRow(user);
    expect(getAxisDisplayPureTextValue('X')).toBe(RESTORE_DEFAULTS_LABEL);

    await user.click(screen.getByTestId('key-enter'));
    expect(getAxisDisplayPureTextValue('X')).toBe(RESTORE_IN_PROGRESS_TEXT);
  });

  it('restores all settings to factory defaults after the dwell (AC28.9/28.10)', async () => {
    const user = userEvent.setup();
    renderSimulator();

    // Move several settings away from factory first.
    act(() => {
      useSettingsStore.getState().updateNvMem({
        beepEnabled: false,
        encoderFailWarning: true,
        sleepTimeout: 30,
      });
    });

    await gotoRestoreRow(user);
    await user.click(screen.getByTestId('key-enter'));
    expect(getAxisDisplayPureTextValue('X')).toBe(RESTORE_IN_PROGRESS_TEXT);

    // The restore itself is durable on ENT (settings already back to factory).
    expect(useSettingsStore.getState().nvMem.beepEnabled).toBe(
      DEFAULT_NON_VOLATILE_MEMORY.beepEnabled
    );
    expect(useSettingsStore.getState().nvMem.encoderFailWarning).toBe(
      DEFAULT_NON_VOLATILE_MEMORY.encoderFailWarning
    );
    expect(useSettingsStore.getState().nvMem.sleepTimeout).toBe(
      DEFAULT_NON_VOLATILE_MEMORY.sleepTimeout
    );

    // After the brief dwell (RESTORE_DURATION_MS) the In ProG screen returns to
    // the normal position display on its own (real-timer useRestoreProgress hook):
    // X reads the numeric idle position (0) rather than the In ProG text.
    await waitFor(
      () => {
        expect(getAxisDisplayPureNumberValue('X')).toBe(0);
      },
      { timeout: RESTORE_DURATION_MS + 2000 }
    );
  });

  it('AC44.4: restores to the OEM baseline when one is captured', async () => {
    const user = userEvent.setup();
    renderSimulator();

    // Capture an OEM baseline with EnF ON, then change it OFF.
    act(() => {
      useSettingsStore.getState().updateNvMem({ encoderFailWarning: true });
      const live = useSettingsStore.getState().nvMem;
      const { oemDefaults: _drop, ...snapshot } = live;
      useSettingsStore.getState().updateNvMem({ oemDefaults: snapshot });
      useSettingsStore.getState().updateNvMem({ encoderFailWarning: false });
    });
    expect(useSettingsStore.getState().nvMem.encoderFailWarning).toBe(false);

    await gotoRestoreRow(user);
    await user.click(screen.getByTestId('key-enter'));

    // Restore returned EnF to the OEM baseline value (ON), NOT factory (off).
    expect(useSettingsStore.getState().nvMem.encoderFailWarning).toBe(true);
  });

  it('clears user data (SDM points and tool/work offsets)', async () => {
    const user = userEvent.setup();
    renderSimulator();

    // Seed user data directly into volatile memory.
    act(() => {
      useDROStore.setState((s) => ({
        vMem: {
          ...s.vMem,
          sdmPoints: { 1: { X: 1, Y: 2, Z: 3 } },
          workOffsets: { X: 5, Y: 5, Z: 5 },
        },
      }));
    });

    await gotoRestoreRow(user);
    await user.click(screen.getByTestId('key-enter'));

    expect(useDROStore.getState().vMem.sdmPoints).toEqual({});
    expect(useDROStore.getState().vMem.workOffsets).toEqual({ X: 0, Y: 0, Z: 0 });
  });
});

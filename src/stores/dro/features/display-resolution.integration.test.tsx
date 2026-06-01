/**
 * Integration tests for the dP display-resolution setup parameter (US-022).
 *
 * Drives the full simulator via data-testid buttons exactly as an operator
 * would: open setup (wrench), pick an axis, scroll to dP, change the value with
 * the left/right arrows, then EXIT setup and assert the live readout now renders
 * a different number of decimals. dP commits-on-change, so the effect is visible
 * the moment we return to the normal screen.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderSimulator,
  getAxisDisplayPureTextValue,
} from '../../../tests/helpers/integration-test-utils';
import { SETUP_PARAMETERS, DISPLAY_RESOLUTION_ID } from './setup-parameters';

const DP_INDEX = SETUP_PARAMETERS.findIndex((p) => p.id === DISPLAY_RESOLUTION_ID);

/** Open setup, pick the given axis, and scroll up to the dP item. */
async function gotoDP(user: ReturnType<typeof userEvent.setup>, axis: 'x' | 'y' | 'z') {
  await user.click(screen.getByTestId('btn-settings'));
  await user.click(screen.getByTestId(`axis-select-${axis}`));
  for (let i = 0; i < DP_INDEX; i++) {
    await user.click(screen.getByTestId('key-8'));
  }
}

/** Exit setup back to the idle readout via the wrench then CLEAR (discard nothing committed). */
async function exitSetup(user: ReturnType<typeof userEvent.setup>) {
  // Re-press setup to return to SELECT, then CLEAR to idle.
  await user.click(screen.getByTestId('btn-settings'));
  await user.click(screen.getByTestId('key-clear'));
}

/** Count fractional digits in the live screen-reader readout for an axis. */
function axisDecimals(axis: 'X' | 'Y' | 'Z'): number {
  const trimmed = screen.getByTestId(`axis-value-${axis.toLowerCase()}`).textContent.trim();
  const dot = trimmed.indexOf('.');
  return dot === -1 ? 0 : trimmed.length - dot - 1;
}

describe('US-022 dP display resolution (integration)', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.clear();
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('default value shown at dP is 5 micron (AC22.2)', async () => {
    const { user } = await renderSimulator();
    await gotoDP(user, 'x');
    expect(getAxisDisplayPureTextValue('X')).toBe('dP 5.0');
  });

  it('default readout shows 4 decimals (AC22.2)', async () => {
    await renderSimulator();
    // Default: live X shows 4 fractional digits.
    expect(axisDecimals('X')).toBe(4);
  });

  it('coarsening dP to 50 micron drops the readout to 3 decimals (AC22.4, AC22.5)', async () => {
    const { user } = await renderSimulator();
    await gotoDP(user, 'x');
    // 5 -> 10 -> 20 -> 50 via right arrow.
    await user.click(screen.getByTestId('key-6'));
    await user.click(screen.getByTestId('key-6'));
    await user.click(screen.getByTestId('key-6'));
    expect(getAxisDisplayPureTextValue('X')).toBe('dP 50.0');
    await exitSetup(user);
    // Live readout now renders 3 decimals for X.
    expect(axisDecimals('X')).toBe(3);
  });

  it('dP is per-axis: coarsening X leaves Y at 4 decimals (AC22.3)', async () => {
    const { user } = await renderSimulator();
    await gotoDP(user, 'x');
    await user.click(screen.getByTestId('key-6')); // 5 -> 10
    await user.click(screen.getByTestId('key-6')); // 10 -> 20
    await user.click(screen.getByTestId('key-6')); // 20 -> 50
    await exitSetup(user);
    expect(axisDecimals('X')).toBe(3);
    expect(axisDecimals('Y')).toBe(4);
  });

  it('does not log a multi-reducer conflict while changing dP', async () => {
    const { user } = await renderSimulator();
    await gotoDP(user, 'x');
    await user.click(screen.getByTestId('key-4'));
    await user.click(screen.getByTestId('key-6'));
    const conflict = errorSpy.mock.calls.some((c: unknown[]) =>
      String(c[0]).includes('Multiple reducers handled the same event')
    );
    expect(conflict).toBe(false);
  });
});

/**
 * Integration tests for the SC scale-resolution setup parameter (US-021).
 *
 * Drives the full simulator via data-testid buttons exactly as an operator
 * would: open setup (wrench), pick an axis, scroll to SC, and change the value
 * with the left/right arrows. Asserts the X-axis screen-reader text.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import type userEvent from '@testing-library/user-event';
import {
  renderSimulator,
  getAxisDisplayPureTextValue,
} from '../../../tests/helpers/integration-test-utils';
import { SETUP_PARAMETERS, SCALE_RESOLUTION_ID } from './setup-parameters';

const SC_INDEX = SETUP_PARAMETERS.findIndex((p) => p.id === SCALE_RESOLUTION_ID);

/** Open setup, pick X, and scroll up to the SC item. */
async function gotoSC(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTestId('btn-settings'));
  await user.click(screen.getByTestId('axis-select-x'));
  // currentParamIndex starts at 0; press up (key-8) SC_INDEX times.
  for (let i = 0; i < SC_INDEX; i++) {
    await user.click(screen.getByTestId('key-8'));
  }
}

describe('US-021 SC scale resolution (integration)', () => {
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

  it('default value shown at SC is 5 micron (AC21.4)', async () => {
    const { user } = await renderSimulator();
    await gotoSC(user);
    expect(getAxisDisplayPureTextValue('X')).toBe('SC 5.0');
  });

  it('left arrow lowers the resolution toward 1 micron (AC21.5)', async () => {
    const { user } = await renderSimulator();
    await gotoSC(user);
    await user.click(screen.getByTestId('key-4')); // 5 -> 2
    expect(getAxisDisplayPureTextValue('X')).toBe('SC 2.0');
    await user.click(screen.getByTestId('key-4')); // 2 -> 1
    expect(getAxisDisplayPureTextValue('X')).toBe('SC 1.0');
  });

  it('right arrow reaches coarse special values (AC21.6)', async () => {
    const { user } = await renderSimulator();
    await gotoSC(user);
    await user.click(screen.getByTestId('key-6')); // 5 -> 10
    expect(getAxisDisplayPureTextValue('X')).toBe('SC 10.0');
  });

  it('does not log a multi-reducer conflict while changing SC', async () => {
    const { user } = await renderSimulator();
    await gotoSC(user);
    await user.click(screen.getByTestId('key-4'));
    await user.click(screen.getByTestId('key-6'));
    const conflict = errorSpy.mock.calls.some((c: unknown[]) =>
      String(c[0]).includes('Multiple reducers handled the same event')
    );
    expect(conflict).toBe(false);
  });
});

/**
 * Integration tests for setup menu navigation (US-039).
 *
 * Drives the full simulator via data-testid buttons and asserts the X-axis
 * display text, mirroring how a real operator navigates the setup menu.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderSimulator,
  getAxisDisplayPureTextValue,
} from '../../../tests/helpers/integration-test-utils';

describe('US-039 Setup Menu Navigation (integration)', () => {
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

  it('enters setup, shows SELECT, then first parameter after axis select (AC 39.1, 39.2)', async () => {
    const user = userEvent.setup();
    renderSimulator();

    await user.click(screen.getByTestId('btn-settings'));
    expect(getAxisDisplayPureTextValue('X')).toBe('SELECt');

    await user.click(screen.getByTestId('axis-select-x'));
    expect(getAxisDisplayPureTextValue('X')).toBe('LinEAr');
  });

  it('up/down scrolls items and wraps around (AC 39.3)', async () => {
    const user = userEvent.setup();
    renderSimulator();

    await user.click(screen.getByTestId('btn-settings'));
    await user.click(screen.getByTestId('axis-select-x'));
    expect(getAxisDisplayPureTextValue('X')).toBe('LinEAr');

    // Up advances through the registry to the terminal End item. The exact
    // middle items grow as setup stories land (SC added by US-021, tAPEr on by
    // US-045), so walk up until End rather than hard-coding the count.
    await user.click(screen.getByTestId('key-8'));
    expect(getAxisDisplayPureTextValue('X')).toBe('EnF on');
    while (getAxisDisplayPureTextValue('X') !== 'End') {
      await user.click(screen.getByTestId('key-8'));
    }
    expect(getAxisDisplayPureTextValue('X')).toBe('End');

    // One more up wraps to the first item.
    await user.click(screen.getByTestId('key-8'));
    expect(getAxisDisplayPureTextValue('X')).toBe('LinEAr');

    // Down from the first item wraps to the last (End).
    await user.click(screen.getByTestId('key-2'));
    expect(getAxisDisplayPureTextValue('X')).toBe('End');
  });

  it('left/right cycles choices for the current item with wrap (AC 39.4)', async () => {
    const user = userEvent.setup();
    renderSimulator();

    await user.click(screen.getByTestId('btn-settings'));
    await user.click(screen.getByTestId('axis-select-x'));
    expect(getAxisDisplayPureTextValue('X')).toBe('LinEAr');

    await user.click(screen.getByTestId('key-6'));
    expect(getAxisDisplayPureTextValue('X')).toBe('AnGULAr');
    await user.click(screen.getByTestId('key-4'));
    expect(getAxisDisplayPureTextValue('X')).toBe('LinEAr');
  });

  it('re-pressing setup returns to SELECT to pick another axis (AC 39.6)', async () => {
    const user = userEvent.setup();
    renderSimulator();

    await user.click(screen.getByTestId('btn-settings'));
    await user.click(screen.getByTestId('axis-select-y'));
    expect(getAxisDisplayPureTextValue('X')).toBe('LinEAr');

    await user.click(screen.getByTestId('btn-settings'));
    expect(getAxisDisplayPureTextValue('X')).toBe('SELECt');

    await user.click(screen.getByTestId('axis-select-z'));
    expect(getAxisDisplayPureTextValue('X')).toBe('LinEAr');
  });

  it('End + ent exits to the normal operating screen (AC 39.7)', async () => {
    const user = userEvent.setup();
    renderSimulator();

    await user.click(screen.getByTestId('btn-settings'));
    await user.click(screen.getByTestId('axis-select-x'));

    // Navigate up to the terminal End item, then press enter.
    while (getAxisDisplayPureTextValue('X') !== 'End') {
      await user.click(screen.getByTestId('key-8'));
    }
    expect(getAxisDisplayPureTextValue('X')).toBe('End');
    await user.click(screen.getByTestId('key-enter'));

    // Back to idle: X shows a numeric position (0), not setup text.
    expect(() => getAxisDisplayPureTextValue('X')).toThrow();
  });

  it('does not log a multi-reducer conflict during navigation', async () => {
    const user = userEvent.setup();
    renderSimulator();

    await user.click(screen.getByTestId('btn-settings'));
    await user.click(screen.getByTestId('axis-select-x'));
    await user.click(screen.getByTestId('key-8'));
    await user.click(screen.getByTestId('key-6'));
    await user.click(screen.getByTestId('key-4'));

    const conflictLogged = consoleErrorSpy.mock.calls.some((call: unknown[]) =>
      String(call[0]).includes('Multiple reducers handled the same event')
    );
    expect(conflictLogged).toBe(false);
  });
});

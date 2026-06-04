/**
 * Integration tests for setup menu navigation (US-039).
 *
 * Drives the full simulator via data-testid buttons and asserts the X-axis
 * display text, mirroring how a real operator navigates the setup menu.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import {
  renderSimulator,
  getAxisDisplayPureTextValue,
} from '../../../tests/helpers/integration-test-utils';

/**
 * The authoritative top-level setup-menu order, as the X display renders each
 * item on first view with factory-default settings (localStorage cleared).
 *
 * Source of truth, in priority order:
 *  - EL400 operation manual section 6.2 "Parameters Setting" / "table 2"
 *    (references/el400-operation-manual/ocr/markdown.md lines 450-484): the
 *    canonical navigable order — LinEAr, SC, dP, rAd, LEFt, (CALiB), EnF,
 *    (AUH Fn / SErIAL), dro, (Prb dLY / PULSE), tAPEr, (Adition), LoC, SLEEP,
 *    SAU ChG, rSt oEm, oEm mod, End. Items in parentheses are not yet
 *    implemented in this simulator and are therefore absent here.
 *  - DRO PROS video walkthrough (references/el400-dro-overview-video/MANUAL.md
 *    Part 1 §1.4-1.19, timestamps [02:18]-[11:39]) for the implemented extras
 *    the §6.2 table omits: the zero-approach trio (ZERO AP / bP / tL, §1.13
 *    [08:36]) and bEEP (§1.14 [09:32]) sit just after LoC and before SLEEP.
 *
 * tAPEr shows `tAPEr X` (not the table's generic `tAPEron`) because the factory
 * default taperOnAxis is 'X'; dEP nEG (Z depth-sense, US-002 AC2.4) has no
 * §6.2 row and is grouped with the other per/global geometry settings.
 */
const EXPECTED_SETUP_MENU_ORDER = [
  'LinEAr',
  'SC 5.0',
  'dP 5.0',
  'rAd',
  'LEFt',
  'EnF oFF',
  'dro t',
  'tAPEr X',
  'dEP nEG',
  'LoC oFF',
  'bU22 oF',
  'bP .002',
  'tL .000',
  'bEEP on',
  'SLP oFF',
  'SAU ChG',
  'rSt oEm',
  'oEm mod',
  'End',
] as const;

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
    const { user } = await renderSimulator();

    await user.click(screen.getByTestId('btn-settings'));
    expect(getAxisDisplayPureTextValue('X')).toBe('SELECt');

    await user.click(screen.getByTestId('axis-select-x'));
    expect(getAxisDisplayPureTextValue('X')).toBe('LinEAr');
  });

  it('up/down scrolls items and wraps around (AC 39.3)', async () => {
    const { user } = await renderSimulator();

    await user.click(screen.getByTestId('btn-settings'));
    await user.click(screen.getByTestId('axis-select-x'));
    expect(getAxisDisplayPureTextValue('X')).toBe('LinEAr');

    // Down (key-2) advances toward End: the second item is SC 5.0 (manual
    // section 6.2 / video §1.5 [03:08]).
    await user.click(screen.getByTestId('key-2'));
    expect(getAxisDisplayPureTextValue('X')).toBe('SC 5.0');

    // Up (key-8) goes back toward LinEAr.
    await user.click(screen.getByTestId('key-8'));
    expect(getAxisDisplayPureTextValue('X')).toBe('LinEAr');

    // Up from the first item wraps to the last (End).
    await user.click(screen.getByTestId('key-8'));
    expect(getAxisDisplayPureTextValue('X')).toBe('End');

    // Down from the last item wraps back to the first.
    await user.click(screen.getByTestId('key-2'));
    expect(getAxisDisplayPureTextValue('X')).toBe('LinEAr');
  });

  it('scrolling down visits every parameter in manual section 6.2 / video order', async () => {
    const { user } = await renderSimulator();

    await user.click(screen.getByTestId('btn-settings'));
    await user.click(screen.getByTestId('axis-select-x'));

    // Walk the whole menu with the DOWN key, recording the label shown at each
    // stop. The sequence must match the authoritative §6.2 / video order, with
    // a single down-press moving to the next item (not wrapping backwards).
    const visited: string[] = [getAxisDisplayPureTextValue('X')];
    for (let i = 1; i < EXPECTED_SETUP_MENU_ORDER.length; i++) {
      await user.click(screen.getByTestId('key-2'));
      visited.push(getAxisDisplayPureTextValue('X'));
    }
    expect(visited).toEqual([...EXPECTED_SETUP_MENU_ORDER]);

    // One more DOWN past End wraps back to the first item (AC 39.3).
    await user.click(screen.getByTestId('key-2'));
    expect(getAxisDisplayPureTextValue('X')).toBe('LinEAr');
  });

  it('left/right cycles choices for the current item with wrap (AC 39.4)', async () => {
    const { user } = await renderSimulator();

    await user.click(screen.getByTestId('btn-settings'));
    await user.click(screen.getByTestId('axis-select-x'));
    expect(getAxisDisplayPureTextValue('X')).toBe('LinEAr');

    await user.click(screen.getByTestId('key-6'));
    expect(getAxisDisplayPureTextValue('X')).toBe('AnGULAr');
    await user.click(screen.getByTestId('key-4'));
    expect(getAxisDisplayPureTextValue('X')).toBe('LinEAr');
  });

  it('re-pressing setup returns to SELECT to pick another axis (AC 39.6)', async () => {
    const { user } = await renderSimulator();

    await user.click(screen.getByTestId('btn-settings'));
    await user.click(screen.getByTestId('axis-select-y'));
    expect(getAxisDisplayPureTextValue('X')).toBe('LinEAr');

    await user.click(screen.getByTestId('btn-settings'));
    expect(getAxisDisplayPureTextValue('X')).toBe('SELECt');

    await user.click(screen.getByTestId('axis-select-z'));
    expect(getAxisDisplayPureTextValue('X')).toBe('LinEAr');
  });

  it('End + ent exits to the normal operating screen (AC 39.7)', async () => {
    const { user } = await renderSimulator();

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
    const { user } = await renderSimulator();

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

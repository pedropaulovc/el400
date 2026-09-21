/**
 * Integration tests for setup menu navigation (US-039).
 *
 * Drives the full simulator via data-testid buttons and asserts the X-axis
 * display text, mirroring how a real operator navigates the setup menu.
 */

import { describe, it, expect, beforeEach } from 'vitest';
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
 *    defines the canonical order.
 *  - The implemented registry also includes the manual's serial, probe-delay,
 *    and output-mode rows, plus the video-documented zero-approach and keypad
 *    beep rows.
 *
 * Choice edits are previews until SAU ChG. End and C leave setup without
 * committing the draft transaction.
 */
const EXPECTED_SETUP_MENU_ORDER = [
  'LinEAr',
  'SC 5.0',
  'dP 5.0',
  'rAd',
  'LEFt',
  'CALib',
  'EnF oFF',
  'AUX Fn',
  'SEr iAL',
  'dro t',
  'Prb dLY',
  'PULSE',
  'tAPEr X',
  'dEP nEG',
  'LoC oFF',
  'ZEro AP',
  'BP diSt',
  'BP toLr',
  'bEEP on',
  'SLEEP t',
  'SAU ChG',
  'rSt oEm',
  'oEm mod',
  'End',
] as const;

describe('US-039 Setup Menu Navigation (integration)', () => {
  beforeEach(() => {
    localStorage.clear();
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

  it('End exits and discards an unsaved choice', async () => {
    const { user } = await renderSimulator();

    await user.click(screen.getByTestId('btn-settings'));
    await user.click(screen.getByTestId('axis-select-x'));
    await user.click(screen.getByTestId('key-6'));
    expect(getAxisDisplayPureTextValue('X')).toBe('AnGULAr');

    await user.click(screen.getByTestId('key-8'));
    expect(getAxisDisplayPureTextValue('X')).toBe('End');
    await user.click(screen.getByTestId('key-enter'));

    expect(() => getAxisDisplayPureTextValue('X')).toThrow();

    await user.click(screen.getByTestId('btn-settings'));
    await user.click(screen.getByTestId('axis-select-x'));
    expect(getAxisDisplayPureTextValue('X')).toBe('LinEAr');
  });

});

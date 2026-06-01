/**
 * Reducer-level tests for navigating to and changing the dP display-resolution
 * parameter via the shared setup shell (US-022 over US-039).
 *
 * dP controls how many decimals the readout shows (per axis). Unlike SC, dP
 * commits-on-change to nvMem (like Direction, US-002) so the live readout
 * precision updates immediately on exit -- the draft-only SAU CHG save engine
 * (US-027) is not yet wired.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { setupReducer } from './setup';
import { createTestState, DEFAULT_TEST_CONTEXT } from '../test-utils';
import { INITIAL_SETUP_DATA, type SetupData } from '../droStateMachine';
import type { DROStatePayload } from '../types';
import { SETUP_PARAMETERS, DISPLAY_RESOLUTION_ID } from './setup-parameters';
import { DEFAULT_NON_VOLATILE_MEMORY } from '../../../types/nonVolatileMemory';
import { useSettingsStore } from '../../settingsStore';

const DP_INDEX = SETUP_PARAMETERS.findIndex((p) => p.id === DISPLAY_RESOLUTION_ID);

function paramState(data: Partial<SetupData>): DROStatePayload {
  const merged: SetupData = { ...INITIAL_SETUP_DATA, selectedAxis: 'X', ...data };
  return { ...createTestState('setup-parameter'), stateData: merged };
}

function xText(payload: DROStatePayload | null): string {
  if (payload === null) throw new Error('reducer returned null');
  return String(payload.display.X);
}

describe('dP display resolution via setup shell (US-022)', () => {
  beforeEach(() => {
    useSettingsStore.setState({ nvMem: DEFAULT_NON_VOLATILE_MEMORY });
  });

  it('is reachable in the registry (AC22.1)', () => {
    expect(DP_INDEX).toBeGreaterThanOrEqual(0);
  });

  it('shows the committed default (dP 5.0) when highlighted (AC22.2)', () => {
    const at = paramState({ selectedAxis: 'X', currentParamIndex: DP_INDEX });
    const shown = setupReducer(
      setupReducer(at, { eventName: 'KEY_8_UP' }, DEFAULT_TEST_CONTEXT)!,
      { eventName: 'KEY_2_DOWN' },
      DEFAULT_TEST_CONTEXT
    );
    expect(xText(shown)).toBe('dP 5.0');
  });

  it('left arrow changes 5 -> 2 (finer choice) (AC22.4)', () => {
    const result = setupReducer(
      paramState({ currentParamIndex: DP_INDEX }),
      { eventName: 'KEY_4_LEFT' },
      DEFAULT_TEST_CONTEXT
    );
    expect((result?.stateData as SetupData).draftValues['X:display-resolution']).toBe('2');
    expect(xText(result)).toBe('dP 2.0');
  });

  it('right arrow reaches the special coarse value (dP 50.0) (AC22.4)', () => {
    let s = paramState({ currentParamIndex: DP_INDEX });
    for (let i = 0; i < 3; i++) s = setupReducer(s, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT)!;
    expect(xText(s)).toBe('dP 50.0');
  });

  it('commits the chosen value to nvMem on change (immediate effect)', () => {
    setupReducer(paramState({ currentParamIndex: DP_INDEX }), { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);
    // 5 -> 10 micron committed to X.
    expect(useSettingsStore.getState().nvMem.displayResolution.X).toBe('10');
  });

  it('keeps dP per-axis: changing X does not move Y off its committed value (AC22.3)', () => {
    setupReducer(
      paramState({ selectedAxis: 'X', currentParamIndex: DP_INDEX }),
      { eventName: 'KEY_6_RIGHT' },
      DEFAULT_TEST_CONTEXT
    );
    const after = useSettingsStore.getState().nvMem.displayResolution;
    expect(after.X).toBe('10');
    expect(after.Y).toBe('5');
    expect(after.Z).toBe('5');
  });

  it('seeds the highlighted value from a non-default committed nvMem value', () => {
    const ctx = {
      ...DEFAULT_TEST_CONTEXT,
      nvMem: {
        ...DEFAULT_TEST_CONTEXT.nvMem,
        displayResolution: { X: '50', Y: '5', Z: '5' } as const,
      },
    };
    const at = paramState({ selectedAxis: 'X', currentParamIndex: DP_INDEX });
    const shown = setupReducer(
      setupReducer(at, { eventName: 'KEY_8_UP' }, ctx)!,
      { eventName: 'KEY_2_DOWN' },
      ctx
    );
    expect(xText(shown)).toBe('dP 50.0');
  });

  it('is independent of scale resolution SC (AC22.3): dP commit leaves SC untouched', () => {
    setupReducer(paramState({ currentParamIndex: DP_INDEX }), { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);
    expect(useSettingsStore.getState().nvMem.scaleResolution).toEqual(
      DEFAULT_NON_VOLATILE_MEMORY.scaleResolution
    );
  });
});

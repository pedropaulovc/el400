/**
 * Reducer-level tests for navigating to and changing the SC scale-resolution
 * parameter via the shared setup shell (US-021 over US-039).
 *
 * These exercise the framework end-to-end for a real per-axis nvMem-backed
 * parameter: highlight SC, see the committed value, cycle choices, and confirm
 * per-axis isolation of the draft.
 */

import { describe, it, expect } from 'vitest';
import { setupReducer } from './setup';
import { createTestState, DEFAULT_TEST_CONTEXT } from '../test-utils';
import { INITIAL_SETUP_DATA, type SetupData } from '../droStateMachine';
import type { DROStatePayload } from '../types';
import { SETUP_PARAMETERS, SCALE_RESOLUTION_ID } from './setup-parameters';

const SC_INDEX = SETUP_PARAMETERS.findIndex((p) => p.id === SCALE_RESOLUTION_ID);

function paramState(data: Partial<SetupData>): DROStatePayload {
  const merged: SetupData = { ...INITIAL_SETUP_DATA, selectedAxis: 'X', ...data };
  return { ...createTestState('setup-parameter'), stateData: merged };
}

function xText(payload: DROStatePayload | null): string {
  if (payload === null) throw new Error('reducer returned null');
  return String(payload.display.X);
}

describe('SC scale resolution via setup shell (US-021)', () => {
  it('is reachable in the registry', () => {
    expect(SC_INDEX).toBeGreaterThanOrEqual(0);
  });

  it('shows the committed default (SC 5.0) when highlighted (AC21.4)', () => {
    // Land on SC by navigating; recompute display via a no-op up/down round trip.
    const at = paramState({ selectedAxis: 'X', currentParamIndex: SC_INDEX });
    const shown = setupReducer(setupReducer(at, { eventName: 'KEY_8_UP' }, DEFAULT_TEST_CONTEXT)!, { eventName: 'KEY_2_DOWN' }, DEFAULT_TEST_CONTEXT);
    expect(xText(shown)).toBe('SC 5.0');
  });

  it('left arrow changes 5 -> 2 (next coarser/finer choice) (AC21.5)', () => {
    // choices ascending; LEFT decrements index: 5 (idx5) -> 2 (idx4).
    const result = setupReducer(paramState({ currentParamIndex: SC_INDEX }), { eventName: 'KEY_4_LEFT' }, DEFAULT_TEST_CONTEXT);
    expect((result?.stateData as SetupData).draftValues['X:scale-resolution']).toBe('2');
    expect(xText(result)).toBe('SC 2.0');
  });

  it('cycles down through finer resolutions to 1 micron (AC21.5)', () => {
    // From 5: LEFT -> 2, LEFT -> 1.
    const once = setupReducer(paramState({ currentParamIndex: SC_INDEX }), { eventName: 'KEY_4_LEFT' }, DEFAULT_TEST_CONTEXT)!;
    const twice = setupReducer(once, { eventName: 'KEY_4_LEFT' }, DEFAULT_TEST_CONTEXT);
    expect(xText(twice)).toBe('SC 1.0');
  });

  it('right arrow reaches the special coarse values (AC21.6)', () => {
    // From 5: RIGHT -> 10, RIGHT -> 20, RIGHT -> 50.
    let s = paramState({ currentParamIndex: SC_INDEX });
    for (let i = 0; i < 3; i++) s = setupReducer(s, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT)!;
    expect(xText(s)).toBe('SC 50.0');
  });

  it('keeps SC per-axis: changing X does not move Y off its committed value (AC21.x)', () => {
    const xChanged = setupReducer(paramState({ selectedAxis: 'X', currentParamIndex: SC_INDEX }), { eventName: 'KEY_4_LEFT' }, DEFAULT_TEST_CONTEXT)!;
    const draft = (xChanged.stateData as SetupData).draftValues;
    expect(draft['X:scale-resolution']).toBe('2');
    expect(draft['Y:scale-resolution']).toBeUndefined();

    // View Y with the same draft map -> still the committed default.
    const yView = paramState({ selectedAxis: 'Y', currentParamIndex: SC_INDEX, draftValues: draft });
    const yShown = setupReducer(setupReducer(yView, { eventName: 'KEY_8_UP' }, DEFAULT_TEST_CONTEXT)!, { eventName: 'KEY_2_DOWN' }, DEFAULT_TEST_CONTEXT);
    expect(xText(yShown)).toBe('SC 5.0');
  });

  it('seeds the highlighted value from a non-default committed nvMem value', () => {
    const ctx = {
      ...DEFAULT_TEST_CONTEXT,
      nvMem: {
        ...DEFAULT_TEST_CONTEXT.nvMem,
        scaleResolution: { X: '1', Y: '5', Z: '5' } as const,
      },
    };
    const at = paramState({ selectedAxis: 'X', currentParamIndex: SC_INDEX });
    const shown = setupReducer(setupReducer(at, { eventName: 'KEY_8_UP' }, ctx)!, { eventName: 'KEY_2_DOWN' }, ctx);
    expect(xText(shown)).toBe('SC 1.0');
  });
});

/**
 * Inch/MM Mode Feature Reducer Tests
 */

import { describe, it, expect } from 'vitest';
import { inchMmReducer } from './inch-mm';
import type { DROStatePayload } from '../types';
import { INITIAL_DRO_STATE_DATA } from '../droStateMachine';

describe('inchMmReducer', () => {
  it('should return null for non-inch-mm states', () => {
    const state: DROStatePayload = {
      stateName: 'idle',
      stateData: INITIAL_DRO_STATE_DATA,
    };

    expect(inchMmReducer(state, { eventName: 'MODE_TOGGLE_COMPLETE' })).toBeNull();
  });

  it('should transition to idle on MODE_TOGGLE_COMPLETE', () => {
    const state: DROStatePayload = {
      stateName: 'inch-mm-mode',
      stateData: INITIAL_DRO_STATE_DATA,
    };

    const result = inchMmReducer(state, { eventName: 'MODE_TOGGLE_COMPLETE' });

    expect(result?.stateName).toBe('idle');
    expect(result?.stateData.stateDataType).toBe('none');
  });

  it('should return current state for unhandled events', () => {
    const state: DROStatePayload = {
      stateName: 'inch-mm-mode',
      stateData: INITIAL_DRO_STATE_DATA,
    };

    expect(inchMmReducer(state, { eventName: 'KEY_ENTER' })).toBe(state);
    expect(inchMmReducer(state, { eventName: 'BTN_INCH_MM' })).toBe(state);
  });
});

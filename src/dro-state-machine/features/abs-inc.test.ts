/**
 * ABS/INC Mode Feature Reducer Tests
 */

import { describe, it, expect } from 'vitest';
import { absIncReducer } from './abs-inc';
import type { DROStatePayload } from '../types';
import { INITIAL_DRO_STATE_DATA } from '../droStateMachine';

describe('absIncReducer', () => {
  it('should return null for non-abs-inc states', () => {
    const state: DROStatePayload = {
      stateName: 'idle',
      stateData: INITIAL_DRO_STATE_DATA,
    };

    expect(absIncReducer(state, { eventName: 'MODE_TOGGLE_COMPLETE' })).toBeNull();
  });

  it('should transition to idle on MODE_TOGGLE_COMPLETE', () => {
    const state: DROStatePayload = {
      stateName: 'abs-inc-mode',
      stateData: INITIAL_DRO_STATE_DATA,
    };

    const result = absIncReducer(state, { eventName: 'MODE_TOGGLE_COMPLETE' });

    expect(result?.stateName).toBe('idle');
    expect(result?.stateData.stateDataType).toBe('none');
  });

  it('should return current state for unhandled events', () => {
    const state: DROStatePayload = {
      stateName: 'abs-inc-mode',
      stateData: INITIAL_DRO_STATE_DATA,
    };

    expect(absIncReducer(state, { eventName: 'KEY_ENTER' })).toBe(state);
    expect(absIncReducer(state, { eventName: 'BTN_ABS_INC' })).toBe(state);
  });
});

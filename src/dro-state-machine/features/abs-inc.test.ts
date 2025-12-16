/**
 * ABS/INC Mode Feature Reducer Tests
 */

import { describe, it, expect } from 'vitest';
import { absIncReducer } from './abs-inc';
import type { DROShape } from '../types';
import { INITIAL_DRO_CONTEXT } from '../droStateMachine';

describe('absIncReducer', () => {
  it('should return null for non-abs-inc states', () => {
    const state: DROShape = {
      state: 'idle',
      data: INITIAL_DRO_CONTEXT,
    };

    expect(absIncReducer(state, { type: 'MODE_TOGGLE_COMPLETE' })).toBeNull();
  });

  it('should transition to idle on MODE_TOGGLE_COMPLETE', () => {
    const state: DROShape = {
      state: 'abs-inc-mode',
      data: INITIAL_DRO_CONTEXT,
    };

    const result = absIncReducer(state, { type: 'MODE_TOGGLE_COMPLETE' });

    expect(result?.state).toBe('idle');
    expect(result?.data.type).toBe('none');
  });

  it('should return current state for unhandled events', () => {
    const state: DROShape = {
      state: 'abs-inc-mode',
      data: INITIAL_DRO_CONTEXT,
    };

    expect(absIncReducer(state, { type: 'KEY_ENTER' })).toBe(state);
    expect(absIncReducer(state, { type: 'BTN_ABS_INC' })).toBe(state);
  });
});

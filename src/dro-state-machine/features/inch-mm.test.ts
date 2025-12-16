/**
 * Inch/MM Mode Feature Reducer Tests
 */

import { describe, it, expect } from 'vitest';
import { inchMmReducer } from './inch-mm';
import type { DROShape } from '../types';
import { INITIAL_DRO_CONTEXT } from '../droStateMachine';

describe('inchMmReducer', () => {
  it('should return null for non-inch-mm states', () => {
    const state: DROShape = {
      state: 'idle',
      data: INITIAL_DRO_CONTEXT,
    };

    expect(inchMmReducer(state, { type: 'MODE_TOGGLE_COMPLETE' })).toBeNull();
  });

  it('should transition to idle on MODE_TOGGLE_COMPLETE', () => {
    const state: DROShape = {
      state: 'inch-mm-mode',
      data: INITIAL_DRO_CONTEXT,
    };

    const result = inchMmReducer(state, { type: 'MODE_TOGGLE_COMPLETE' });

    expect(result?.state).toBe('idle');
    expect(result?.data.type).toBe('none');
  });

  it('should return current state for unhandled events', () => {
    const state: DROShape = {
      state: 'inch-mm-mode',
      data: INITIAL_DRO_CONTEXT,
    };

    expect(inchMmReducer(state, { type: 'KEY_ENTER' })).toBe(state);
    expect(inchMmReducer(state, { type: 'BTN_INCH_MM' })).toBe(state);
  });
});

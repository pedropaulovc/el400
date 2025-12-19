/**
 * ABS/INC Mode Feature Reducer Tests
 */

import { describe, it, expect } from 'vitest';
import { absIncReducer } from './abs-inc';
import { createTestState, DEFAULT_TEST_CONTEXT } from '../test-utils';

describe('absIncReducer', () => {
  it('should return null for non-abs-inc states', () => {
    const state = createTestState('idle');
    expect(absIncReducer(state, { eventName: 'MODE_TOGGLE_COMPLETE' }, DEFAULT_TEST_CONTEXT)).toBeNull();
  });

  it('should transition to idle on MODE_TOGGLE_COMPLETE', () => {
    const state = createTestState('abs-inc-mode');
    const result = absIncReducer(state, { eventName: 'MODE_TOGGLE_COMPLETE' }, DEFAULT_TEST_CONTEXT);

    expect(result?.stateName).toBe('idle');
    expect(result?.stateData.stateDataType).toBe('none');
  });

  it('should return current state for unhandled events', () => {
    const state = createTestState('abs-inc-mode');

    expect(absIncReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT)).toBe(state);
    expect(absIncReducer(state, { eventName: 'BTN_ABS_INC' }, DEFAULT_TEST_CONTEXT)).toBe(state);
  });
});

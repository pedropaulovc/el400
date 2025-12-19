/**
 * Inch/MM Mode Feature Reducer Tests
 */

import { describe, it, expect } from 'vitest';
import { inchMmReducer } from './inch-mm';
import { createTestState, DEFAULT_TEST_CONTEXT } from '../test-utils';

describe('inchMmReducer', () => {
  it('should return null for non-inch-mm states', () => {
    const state = createTestState('idle');
    expect(inchMmReducer(state, { eventName: 'MODE_TOGGLE_COMPLETE' }, DEFAULT_TEST_CONTEXT)).toBeNull();
  });

  it('should transition to idle on MODE_TOGGLE_COMPLETE', () => {
    const state = createTestState('inch-mm-mode');
    const result = inchMmReducer(state, { eventName: 'MODE_TOGGLE_COMPLETE' }, DEFAULT_TEST_CONTEXT);

    expect(result?.stateName).toBe('idle');
    expect(result?.stateData.stateDataType).toBe('none');
  });

  it('should return current state for unhandled events', () => {
    const state = createTestState('inch-mm-mode');

    expect(inchMmReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT)).toBe(state);
    expect(inchMmReducer(state, { eventName: 'BTN_INCH_MM' }, DEFAULT_TEST_CONTEXT)).toBe(state);
  });
});

/**
 * Keypad Feature Reducer Tests
 *
 * Tests for keypad input handling and input buffer management.
 */

import { describe, it, expect } from 'vitest';
import { keypadReducer, getBufferValue } from './keypad';
import { createTestState, DEFAULT_TEST_CONTEXT } from '../test-utils';
import type { DROStatePayload } from '../types';
import { INITIAL_DRO_STATE_DATA } from '../droStateMachine';
import { INITIAL_VOLATILE_MEMORY_STATE } from '../../types/volatileMemory';

describe('keypadReducer', () => {
  describe('state handling', () => {
    it('should return null for non-idle states', () => {
      const state = createTestState('boot');
      const result = keypadReducer(state, { eventName: 'KEY_5' }, DEFAULT_TEST_CONTEXT);
      expect(result).toBeNull();
    });

    it('should handle idle state', () => {
      const state = createTestState('idle');
      const result = keypadReducer(state, { eventName: 'KEY_5' }, DEFAULT_TEST_CONTEXT);
      expect(result).not.toBeNull();
    });
  });

  describe('digit input', () => {
    it('should append digit 0 to input buffer', () => {
      const state = createTestState('idle');
      const result = keypadReducer(state, { eventName: 'KEY_0' }, DEFAULT_TEST_CONTEXT);
      expect(result?.vMem.inputBuffer).toBe('0');
    });

    it('should append digit 5 to input buffer', () => {
      const state = createTestState('idle');
      const result = keypadReducer(state, { eventName: 'KEY_5' }, DEFAULT_TEST_CONTEXT);
      expect(result?.vMem.inputBuffer).toBe('5');
    });

    it('should append digit 8 (KEY_8_UP) to input buffer', () => {
      const state = createTestState('idle');
      const result = keypadReducer(state, { eventName: 'KEY_8_UP' }, DEFAULT_TEST_CONTEXT);
      expect(result?.vMem.inputBuffer).toBe('8');
    });

    it('should append multiple digits', () => {
      let state = createTestState('idle');
      state = keypadReducer(state, { eventName: 'KEY_1' }, DEFAULT_TEST_CONTEXT)!;
      state = keypadReducer(state, { eventName: 'KEY_2_DOWN' }, DEFAULT_TEST_CONTEXT)!;
      state = keypadReducer(state, { eventName: 'KEY_3' }, DEFAULT_TEST_CONTEXT)!;
      expect(state.vMem.inputBuffer).toBe('123');
    });
  });

  describe('decimal point', () => {
    it('should append decimal point', () => {
      const state: DROStatePayload = {
        stateName: 'idle',
        stateData: INITIAL_DRO_STATE_DATA,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '12' },
      };
      const result = keypadReducer(state, { eventName: 'KEY_DECIMAL' }, DEFAULT_TEST_CONTEXT);
      expect(result?.vMem.inputBuffer).toBe('12.');
    });

    it('should not add second decimal point', () => {
      const state: DROStatePayload = {
        stateName: 'idle',
        stateData: INITIAL_DRO_STATE_DATA,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '12.5' },
      };
      const result = keypadReducer(state, { eventName: 'KEY_DECIMAL' }, DEFAULT_TEST_CONTEXT);
      expect(result?.vMem.inputBuffer).toBe('12.5');
    });
  });

  describe('sign toggle', () => {
    it('should add negative sign to positive number', () => {
      const state: DROStatePayload = {
        stateName: 'idle',
        stateData: INITIAL_DRO_STATE_DATA,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '42' },
      };
      const result = keypadReducer(state, { eventName: 'KEY_SIGN' }, DEFAULT_TEST_CONTEXT);
      expect(result?.vMem.inputBuffer).toBe('-42');
    });

    it('should remove negative sign from negative number', () => {
      const state: DROStatePayload = {
        stateName: 'idle',
        stateData: INITIAL_DRO_STATE_DATA,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '-42' },
      };
      const result = keypadReducer(state, { eventName: 'KEY_SIGN' }, DEFAULT_TEST_CONTEXT);
      expect(result?.vMem.inputBuffer).toBe('42');
    });

    it('should add negative sign to empty buffer', () => {
      const state = createTestState('idle');
      const result = keypadReducer(state, { eventName: 'KEY_SIGN' }, DEFAULT_TEST_CONTEXT);
      expect(result?.vMem.inputBuffer).toBe('-');
    });
  });

  describe('clear', () => {
    it('should clear input buffer when not empty', () => {
      const state: DROStatePayload = {
        stateName: 'idle',
        stateData: INITIAL_DRO_STATE_DATA,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '123' },
      };
      const result = keypadReducer(state, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);
      expect(result?.vMem.inputBuffer).toBe('');
    });

    it('should clear active axis when buffer is empty', () => {
      const state: DROStatePayload = {
        stateName: 'idle',
        stateData: INITIAL_DRO_STATE_DATA,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '', activeAxis: 'X' },
      };
      const result = keypadReducer(state, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);
      expect(result?.vMem.activeAxis).toBeNull();
    });

    it('should return unchanged state when buffer and active axis are both null/empty', () => {
      const state = createTestState('idle');
      const result = keypadReducer(state, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);
      expect(result).toBe(state);
    });
  });

  describe('unhandled events', () => {
    it('should return null for KEY_ENTER', () => {
      const state = createTestState('idle');
      const result = keypadReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);
      expect(result).toBeNull();
    });

    it('should return null for button events', () => {
      const state = createTestState('idle');
      expect(keypadReducer(state, { eventName: 'BTN_FUNCTION' }, DEFAULT_TEST_CONTEXT)).toBeNull();
      expect(keypadReducer(state, { eventName: 'BTN_ZERO_X' }, DEFAULT_TEST_CONTEXT)).toBeNull();
    });
  });
});

describe('getBufferValue', () => {
  it('should return number for valid buffer', () => {
    expect(getBufferValue('123')).toBe(123);
    expect(getBufferValue('12.5')).toBe(12.5);
    expect(getBufferValue('-42')).toBe(-42);
    expect(getBufferValue('-12.5')).toBe(-12.5);
  });

  it('should return null for empty buffer', () => {
    expect(getBufferValue('')).toBeNull();
  });

  it('should return null for just a sign', () => {
    expect(getBufferValue('-')).toBeNull();
  });

  it('should return null for just a decimal point', () => {
    expect(getBufferValue('.')).toBeNull();
  });
});

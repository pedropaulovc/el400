/**
 * Idle State Feature Reducer Tests
 *
 * Tests for the idle state, which is the default operating state of the DRO.
 */

import { describe, it, expect } from 'vitest';
import { idleReducer } from './idle';
import type { DROStatePayload } from '../types';
import { INITIAL_DRO_STATE_DATA } from '../droStateMachine';

describe('idleReducer', () => {
  describe('state handling', () => {
    it('should return null for non-idle states', () => {
      const state: DROStatePayload = {
        stateName: 'boot',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      const result = idleReducer(state, { eventName: 'BTN_ABS_INC' });

      expect(result).toBeNull();
    });

    it('should handle idle state', () => {
      const state: DROStatePayload = {
        stateName: 'idle',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      const result = idleReducer(state, { eventName: 'KEY_5' });
      expect(result).not.toBeNull();
    });
  });

  describe('idle state', () => {
    it('should transition to abs-inc-mode on BTN_ABS_INC', () => {
      const state: DROStatePayload = {
        stateName: 'idle',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      const result = idleReducer(state, { eventName: 'BTN_ABS_INC' });

      expect(result?.stateName).toBe('abs-inc-mode');
      expect(result?.stateData).toBe(state.stateData);
    });

    it('should transition to inch-mm-mode on BTN_INCH_MM', () => {
      const state: DROStatePayload = {
        stateName: 'idle',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      const result = idleReducer(state, { eventName: 'BTN_INCH_MM' });

      expect(result?.stateName).toBe('inch-mm-mode');
      expect(result?.stateData).toBe(state.stateData);
    });

    it('should transition to function-menu-center on BTN_FUNCTION', () => {
      const state: DROStatePayload = {
        stateName: 'idle',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      const result = idleReducer(state, { eventName: 'BTN_FUNCTION' });

      expect(result?.stateName).toBe('function-menu-center');
      expect(result?.stateData.stateDataType).toBe('none');
    });

    it('should return current state for unhandled events', () => {
      const state: DROStatePayload = {
        stateName: 'idle',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      expect(idleReducer(state, { eventName: 'KEY_ENTER' })).toBe(state);
      expect(idleReducer(state, { eventName: 'KEY_4_LEFT' })).toBe(state);
      expect(idleReducer(state, { eventName: 'KEY_6_RIGHT' })).toBe(state);
      expect(idleReducer(state, { eventName: 'KEY_CLEAR' })).toBe(state);
    });

    it('should ignore numeric key events', () => {
      const state: DROStatePayload = {
        stateName: 'idle',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      const numericKeys = ['KEY_0', 'KEY_1', 'KEY_2_DOWN', 'KEY_3', 'KEY_4_LEFT', 'KEY_5', 'KEY_6_RIGHT', 'KEY_7', 'KEY_8_UP', 'KEY_9'] as const;

      for (const key of numericKeys) {
        const result = idleReducer(state, { eventName: key });
        expect(result).toBe(state);
      }
    });
  });

  describe('data preservation', () => {
    it('should preserve data during mode toggle transitions', () => {
      const customData = { stateDataType: 'none' as const };
      const state: DROStatePayload = {
        stateName: 'idle',
        stateData: customData,
      };

      const result = idleReducer(state, { eventName: 'BTN_ABS_INC' });

      expect(result?.stateData).toBe(customData);
    });

    it('should reset data when entering function menu', () => {
      const state: DROStatePayload = {
        stateName: 'idle',
        stateData: { stateDataType: 'none' },
      };

      const result = idleReducer(state, { eventName: 'BTN_FUNCTION' });

      expect(result?.stateData).toEqual({ stateDataType: 'none' });
    });
  });
});

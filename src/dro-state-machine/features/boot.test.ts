/**
 * Boot Feature Reducer Tests
 *
 * Tests for boot sequence states: 'boot' and 'show-boot-message'.
 */

import { describe, it, expect } from 'vitest';
import { bootReducer } from './boot';
import type { DROStatePayload } from '../types';
import { INITIAL_DRO_STATE_DATA } from '../droStateMachine';

describe('bootReducer', () => {
  describe('state handling', () => {
    it('should return null for non-boot states', () => {
      const state: DROStatePayload = {
        stateName: 'function-menu-center',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      const result = bootReducer(state, { eventName: 'KEY_CLEAR' });

      expect(result).toBeNull();
    });

    it('should return null for idle state', () => {
      const state: DROStatePayload = {
        stateName: 'idle',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      const result = bootReducer(state, { eventName: 'BTN_ABS_INC' });

      expect(result).toBeNull();
    });

    it('should handle boot states', () => {
      const bootStates = ['boot', 'show-boot-message'] as const;

      for (const bootState of bootStates) {
        const state: DROStatePayload = {
          stateName: bootState,
          stateData: INITIAL_DRO_STATE_DATA,
        };

        // Should not return null for boot states (may return current state if event not handled)
        const result = bootReducer(state, { eventName: 'KEY_5' });
        expect(result).not.toBeNull();
      }
    });
  });

  describe('boot state', () => {
    it('should transition to show-boot-message on BOOT_STARTED with skipMessage=false', () => {
      const state: DROStatePayload = {
        stateName: 'boot',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      const result = bootReducer(state, { eventName: 'BOOT_STARTED', skipBootMessage: false });

      expect(result?.stateName).toBe('show-boot-message');
      expect(result?.stateData.stateDataType).toBe('none');
    });

    it('should transition to idle on BOOT_STARTED with skipMessage=true', () => {
      const state: DROStatePayload = {
        stateName: 'boot',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      const result = bootReducer(state, { eventName: 'BOOT_STARTED', skipBootMessage: true });

      expect(result?.stateName).toBe('idle');
      expect(result?.stateData.stateDataType).toBe('none');
    });

    it('should return current state for unhandled events', () => {
      const state: DROStatePayload = {
        stateName: 'boot',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      const result = bootReducer(state, { eventName: 'BTN_FUNCTION' });

      expect(result).toBe(state);
    });

    it('should ignore mode toggle events during boot', () => {
      const state: DROStatePayload = {
        stateName: 'boot',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      expect(bootReducer(state, { eventName: 'BTN_ABS_INC' })).toBe(state);
      expect(bootReducer(state, { eventName: 'BTN_INCH_MM' })).toBe(state);
    });
  });

  describe('show-boot-message state', () => {
    it('should transition to idle on BOOT_MESSAGE_TIMEOUT', () => {
      const state: DROStatePayload = {
        stateName: 'boot-show-message',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      const result = bootReducer(state, { eventName: 'BOOT_MESSAGE_TIMEOUT' });

      expect(result?.stateName).toBe('idle');
      expect(result?.stateData.stateDataType).toBe('none');
    });

    it('should transition to idle on KEY_CLEAR', () => {
      const state: DROStatePayload = {
        stateName: 'boot-show-message',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      const result = bootReducer(state, { eventName: 'KEY_CLEAR' });

      expect(result?.stateName).toBe('idle');
      expect(result?.stateData.stateDataType).toBe('none');
    });

    it('should return current state for unhandled events', () => {
      const state: DROStatePayload = {
        stateName: 'boot-show-message',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      const result = bootReducer(state, { eventName: 'KEY_ENTER' });

      expect(result).toBe(state);
    });
  });

});

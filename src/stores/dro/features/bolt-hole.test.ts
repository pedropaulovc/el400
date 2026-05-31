/**
 * Tests for Bolt Hole Circle Feature Reducer
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { boltHoleReducer, useBoltHoleIntro, BOLT_HOLE_INTRO_DURATION_MS } from './bolt-hole';
import { INITIAL_BOLT_HOLE_DATA, type DROStateName } from '../droStateMachine';
import { DEFAULT_TEST_CONTEXT } from '../test-utils';
import type { DROStatePayload } from '../types';
import { INITIAL_VOLATILE_MEMORY_STATE } from '../../../types/volatileMemory';
import { INITIAL_DISPLAY_STATE } from '../utils/displayComputation';

describe('boltHoleReducer', () => {
  describe('bolt-hole-intro state', () => {
    it('should transition to bolt-hole-menu-select on BOLT_HOLE_INTRO_TIMEOUT', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-intro',
        stateData: INITIAL_BOLT_HOLE_DATA,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'abs' },
        display: { X: 'b hoLE', Y: 0, Z: '' }, // Intro display
      };

      const result = boltHoleReducer(state, { eventName: 'BOLT_HOLE_INTRO_TIMEOUT' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('bolt-hole-menu-select');
      expect(result?.stateData.stateDataType).toBe('bolt-hole');
      // Display should show CIRCLE menu option with Y=0
      expect(result?.display.X).toBe('CirCLE');
      expect(result?.display.Y).toBe(0);
      expect(result?.display.Z).toBe('');
    });

    it('should have intro display showing "b hoLE" on X and 0 on Y', () => {
      // This test verifies the expected intro display format
      // The intro display is set by idleReducer when entering bolt-hole-intro
      const introState: DROStatePayload = {
        stateName: 'bolt-hole-intro',
        stateData: INITIAL_BOLT_HOLE_DATA,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'abs' },
        display: { X: 'b hoLE', Y: 0, Z: '' },
      };

      // The intro state should preserve the "b hoLE" display until timeout
      const result = boltHoleReducer(introState, { eventName: 'KEY_5' }, DEFAULT_TEST_CONTEXT);
      expect(result).toBe(introState); // Unchanged - ignores key input
      expect(introState.display.X).toBe('b hoLE');
      expect(introState.display.Y).toBe(0);
      expect(introState.display.Z).toBe('');
    });

    it('should exit to idle with KEY_CLEAR from intro state', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-intro',
        stateData: INITIAL_BOLT_HOLE_DATA,
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
        display: INITIAL_DISPLAY_STATE,
      };

      const result = boltHoleReducer(state, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('idle');
    });

    it('should return statePayload for other events in intro state', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-intro',
        stateData: INITIAL_BOLT_HOLE_DATA,
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
        display: INITIAL_DISPLAY_STATE,
      };

      const result = boltHoleReducer(state, { eventName: 'KEY_0' }, DEFAULT_TEST_CONTEXT);

      expect(result).toBe(state);
    });
  });

  describe('non-bolt-hole states', () => {
    it('should return null for non-bolt-hole states', () => {
      const state: DROStatePayload = {
        stateName: 'calculator-idle',
        stateData: {
          stateDataType: 'calculator',
          firstValue: null,
          operation: null,
          currentValue: 0,
        },
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
        display: INITIAL_DISPLAY_STATE,
      };

      const result = boltHoleReducer(state, { eventName: 'BTN_BOLT_HOLE' }, DEFAULT_TEST_CONTEXT);

      expect(result).toBeNull();
    });
  });

  describe('bolt-hole-menu-select state', () => {
    it('should toggle from CIRCLE to ARC with KEY_6_RIGHT', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-menu-select',
        stateData: INITIAL_BOLT_HOLE_DATA,
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
        display: INITIAL_DISPLAY_STATE,
      };

      const result = boltHoleReducer(state, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('bolt-hole-menu-select');
      if (result?.stateData.stateDataType === 'bolt-hole') {
        expect(result.stateData.boltHoleMode).toBe('ARC');
      }
      // Display should show ARC menu option
      expect(result?.display.X).toBe('ArC');
    });

    it('should toggle from ARC to CIRCLE with KEY_6_RIGHT', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-menu-select',
        stateData: { ...INITIAL_BOLT_HOLE_DATA, boltHoleMode: 'ARC' },
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
        display: INITIAL_DISPLAY_STATE,
      };

      const result = boltHoleReducer(state, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      if (result?.stateData.stateDataType === 'bolt-hole') {
        expect(result.stateData.boltHoleMode).toBe('CIRCLE');
      }
      // Display should show CIRCLE menu option
      expect(result?.display.X).toBe('CirCLE');
    });

    it('should transition to center-x entry when CIRCLE mode is confirmed', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-menu-select',
        stateData: INITIAL_BOLT_HOLE_DATA,
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
        display: INITIAL_DISPLAY_STATE,
      };

      const result = boltHoleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('bolt-hole-circle-center-x');
      expect(result?.vMem.inputBuffer).toBe('');
      // Display should show center X: X shows buffer value (0), Y shows prompt
      expect(result?.display.X).toBe(0);
      expect(result?.display.Y).toBe('EntCnt0');
      expect(result?.display.Z).toBe('');
    });

    it('should transition to arc center-x entry when ARC mode is confirmed', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-menu-select',
        stateData: { ...INITIAL_BOLT_HOLE_DATA, boltHoleMode: 'ARC' },
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
        display: INITIAL_DISPLAY_STATE,
      };

      const result = boltHoleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('bolt-hole-arc-center-x');
      expect(result?.vMem.inputBuffer).toBe('');
      // center-x layout: X shows buffer value (0), Y shows prompt
      expect(result?.display.X).toBe(0);
      expect(result?.display.Y).toBe('EntCnt0');
      expect(result?.display.Z).toBe('');
    });
  });

  describe('parameter entry states', () => {
    it('should accept center X coordinate', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-circle-center-x',
        stateData: INITIAL_BOLT_HOLE_DATA,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '1.75' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = boltHoleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('bolt-hole-circle-center-y');
      if (result?.stateData.stateDataType === 'bolt-hole') {
        // 1.75 inches = 44.45mm (default context uses inches)
        expect(result.stateData.centerX).toBeCloseTo(44.45, 4);
      }
      expect(result?.vMem.inputBuffer).toBe('');
      // Display should show center Y: X shows prompt, Y shows buffer value (0)
      expect(result?.display.X).toBe('EntCnt1');
      expect(result?.display.Y).toBe(0);
      expect(result?.display.Z).toBe('');
    });

    it('should accept center Y coordinate', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-circle-center-y',
        stateData: { ...INITIAL_BOLT_HOLE_DATA, centerX: 44.45 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '1.25' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = boltHoleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('bolt-hole-circle-radius');
      if (result?.stateData.stateDataType === 'bolt-hole') {
        // 1.25 inches = 31.75mm (default context uses inches)
        expect(result.stateData.centerY).toBeCloseTo(31.75, 4);
      }
      // Display should show radius prompt (numeric 0)
      expect(result?.display.X).toBe('rAdiUS');
      expect(result?.display.Y).toBe(0);
    });

    it('should accept radius value', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-circle-radius',
        stateData: { ...INITIAL_BOLT_HOLE_DATA, centerX: 44.45, centerY: 31.75 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '0.95' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = boltHoleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('bolt-hole-circle-angle');
      if (result?.stateData.stateDataType === 'bolt-hole') {
        // 0.95 inches = 24.13mm (default context uses inches)
        expect(result.stateData.radius).toBeCloseTo(24.13, 4);
      }
      // Display should show angle prompt (numeric 0)
      expect(result?.display.X).toBe('AnGLE');
      expect(result?.display.Y).toBe(0);
    });

    it('should reject zero or negative radius', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-circle-radius',
        stateData: { ...INITIAL_BOLT_HOLE_DATA, centerX: 44.45, centerY: 31.75 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '0' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = boltHoleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result).toBeNull();
    });

    it('should accept starting angle', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-circle-angle',
        stateData: {
          ...INITIAL_BOLT_HOLE_DATA,
          centerX: 44.45,
          centerY: 31.75,
          radius: 24.13,
        },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '20' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = boltHoleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('bolt-hole-circle-holes');
      if (result?.stateData.stateDataType === 'bolt-hole') {
        expect(result.stateData.startAngle).toBe(20);
      }
      // Display should show holes prompt (numeric 0)
      expect(result?.display.X).toBe('hoLES');
      expect(result?.display.Y).toBe(0);
    });

    it('should normalize angle to 0-359 range', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-circle-angle',
        stateData: {
          ...INITIAL_BOLT_HOLE_DATA,
          centerX: 44.45,
          centerY: 31.75,
          radius: 24.13,
        },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '400' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = boltHoleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      if (result?.stateData.stateDataType === 'bolt-hole') {
        expect(result.stateData.startAngle).toBe(40); // 400 % 360 = 40
      }
    });

    it('should accept hole count and switch to INC mode', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-circle-holes',
        stateData: {
          ...INITIAL_BOLT_HOLE_DATA,
          centerX: 44.45,
          centerY: 31.75,
          radius: 24.13,
          startAngle: 20,
        },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '6', mode: 'abs' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = boltHoleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('bolt-hole-circle-navigate');
      expect(result?.vMem.mode).toBe('inc'); // Should switch to INC mode
      if (result?.stateData.stateDataType === 'bolt-hole') {
        expect(result.stateData.holeCount).toBe(6);
        expect(result.stateData.currentHole).toBe(1);
      }
    });

    it('should reject hole count less than 2', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-circle-holes',
        stateData: {
          ...INITIAL_BOLT_HOLE_DATA,
          centerX: 44.45,
          centerY: 31.75,
          radius: 24.13,
          startAngle: 20,
        },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '1' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = boltHoleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result).toBeNull();
    });

    it('should reject hole count greater than 999', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-circle-holes',
        stateData: {
          ...INITIAL_BOLT_HOLE_DATA,
          centerX: 44.45,
          centerY: 31.75,
          radius: 24.13,
          startAngle: 20,
        },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '1000' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = boltHoleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result).toBeNull();
    });

    it('should floor fractional hole count values', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-circle-holes',
        stateData: {
          ...INITIAL_BOLT_HOLE_DATA,
          centerX: 44.45,
          centerY: 31.75,
          radius: 24.13,
          startAngle: 20,
        },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '6.8' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = boltHoleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      if (result?.stateData.stateDataType === 'bolt-hole') {
        expect(result.stateData.holeCount).toBe(6);
      }
    });

    it('should append digit to input buffer and update display', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-circle-center-x',
        stateData: INITIAL_BOLT_HOLE_DATA,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '1' },
        display: { X: 1, Y: 'EntCnt0', Z: '' },
      };

      const result = boltHoleReducer(state, { eventName: 'KEY_5' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.vMem.inputBuffer).toBe('15');
      // For center-x: X shows buffer value, Y shows prompt
      expect(result?.display.X).toBe(15);
      expect(result?.display.Y).toBe('EntCnt0');
      expect(result?.display.Z).toBe('');
    });

    it('should append decimal to input buffer and update display', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-circle-center-x',
        stateData: INITIAL_BOLT_HOLE_DATA,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '1' },
        display: { X: 1, Y: 'EntCnt0', Z: '' },
      };

      const result = boltHoleReducer(state, { eventName: 'KEY_DECIMAL' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.vMem.inputBuffer).toBe('1.');
      // "1." parses to 1, displayed as numeric on X for center-x state
      expect(result?.display.X).toBe(1);
      expect(result?.display.Y).toBe('EntCnt0');
      expect(result?.display.Z).toBe('');
    });

    it('should toggle sign in input buffer and update display', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-circle-center-x',
        stateData: INITIAL_BOLT_HOLE_DATA,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '1.5' },
        display: { X: 1.5, Y: 'EntCnt0', Z: '' },
      };

      const result = boltHoleReducer(state, { eventName: 'KEY_SIGN' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.vMem.inputBuffer).toBe('-1.5');
      expect(result?.display.X).toBe(-1.5);
      expect(result?.display.Y).toBe('EntCnt0');
      expect(result?.display.Z).toBe('');
    });

    it('should show hoLES prompt when entering holes state', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-circle-holes',
        stateData: {
          ...INITIAL_BOLT_HOLE_DATA,
          centerX: 44.45,
          centerY: 31.75,
          radius: 24.13,
          startAngle: 20,
        },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '' },
        display: { X: 'hoLES', Y: 0, Z: 0 },
      };

      // Typing a digit should update the buffer and display
      // Note: KEY_6_RIGHT is a navigation key that also functions as digit 6
      const result = boltHoleReducer(state, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.vMem.inputBuffer).toBe('6');
      expect(result?.display.X).toBe('hoLES');
      expect(result?.display.Y).toBe(6);
    });
  });

  describe('hole navigation', () => {
    const navigateState: DROStatePayload = {
      stateName: 'bolt-hole-circle-navigate',
      stateData: {
        ...INITIAL_BOLT_HOLE_DATA,
        centerX: 44.45,
        centerY: 31.75,
        radius: 24.13,
        startAngle: 0,
        holeCount: 6,
        currentHole: 1,
      },
      vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'inc' },
      display: INITIAL_DISPLAY_STATE,
    };

    it('should advance to next hole with KEY_6_RIGHT', () => {
      const result = boltHoleReducer(
        navigateState,
        { eventName: 'KEY_6_RIGHT' },
        DEFAULT_TEST_CONTEXT
      );

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('bolt-hole-circle-navigate');
      if (result?.stateData.stateDataType === 'bolt-hole') {
        expect(result.stateData.currentHole).toBe(2);
      }
    });

    it('should wrap to hole 1 when advancing from last hole', () => {
      const lastHoleState: DROStatePayload = {
        ...navigateState,
        stateData: {
          ...(navigateState.stateData as typeof INITIAL_BOLT_HOLE_DATA),
          currentHole: 6,
        },
      };

      const result = boltHoleReducer(
        lastHoleState,
        { eventName: 'KEY_6_RIGHT' },
        DEFAULT_TEST_CONTEXT
      );

      expect(result).not.toBeNull();
      if (result?.stateData.stateDataType === 'bolt-hole') {
        expect(result.stateData.currentHole).toBe(1);
      }
    });

    it('should go to previous hole with KEY_4_LEFT', () => {
      const hole2State: DROStatePayload = {
        ...navigateState,
        stateData: {
          ...(navigateState.stateData as typeof INITIAL_BOLT_HOLE_DATA),
          currentHole: 2,
        },
      };

      const result = boltHoleReducer(hole2State, { eventName: 'KEY_4_LEFT' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      if (result?.stateData.stateDataType === 'bolt-hole') {
        expect(result.stateData.currentHole).toBe(1);
      }
    });

    it('should wrap to last hole when going back from hole 1', () => {
      const result = boltHoleReducer(
        navigateState,
        { eventName: 'KEY_4_LEFT' },
        DEFAULT_TEST_CONTEXT
      );

      expect(result).not.toBeNull();
      if (result?.stateData.stateDataType === 'bolt-hole') {
        expect(result.stateData.currentHole).toBe(6);
      }
    });

    it('should put current hole number in inputBuffer with KEY_8_UP', () => {
      const result = boltHoleReducer(navigateState, { eventName: 'KEY_8_UP' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('bolt-hole-circle-navigate');
      expect(result?.vMem.inputBuffer).toBe('1');
    });

    it('should clear input buffer with KEY_2_DOWN (prepare for jump)', () => {
      const result = boltHoleReducer(
        navigateState,
        { eventName: 'KEY_2_DOWN' },
        DEFAULT_TEST_CONTEXT
      );

      expect(result).not.toBeNull();
      expect(result?.vMem.inputBuffer).toBe('');
    });

    it('should jump to specific hole with buffered number and ENTER', () => {
      const jumpState: DROStatePayload = {
        ...navigateState,
        vMem: { ...navigateState.vMem, inputBuffer: '4' },
      };

      const result = boltHoleReducer(jumpState, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      if (result?.stateData.stateDataType === 'bolt-hole') {
        expect(result.stateData.currentHole).toBe(4);
      }
      expect(result?.vMem.inputBuffer).toBe('');
    });

    it('should reject jump to hole number less than 1', () => {
      const jumpState: DROStatePayload = {
        ...navigateState,
        vMem: { ...navigateState.vMem, inputBuffer: '0' },
      };

      const result = boltHoleReducer(jumpState, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result).toBeNull();
    });

    it('should reject jump to hole number greater than hole count', () => {
      const jumpState: DROStatePayload = {
        ...navigateState,
        vMem: { ...navigateState.vMem, inputBuffer: '7' },
      };

      const result = boltHoleReducer(jumpState, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result).toBeNull();
    });

    it('should floor fractional hole numbers when jumping', () => {
      const jumpState: DROStatePayload = {
        ...navigateState,
        vMem: { ...navigateState.vMem, inputBuffer: '4.7' },
      };

      const result = boltHoleReducer(jumpState, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      if (result?.stateData.stateDataType === 'bolt-hole') {
        expect(result.stateData.currentHole).toBe(4);
      }
    });

    it('should accept digit input in navigate state', () => {
      const result = boltHoleReducer(navigateState, { eventName: 'KEY_3' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.vMem.inputBuffer).toBe('3');
    });
  });

  describe('exiting bolt hole mode', () => {
    it('should exit to idle with KEY_CLEAR from menu select', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-menu-select',
        stateData: INITIAL_BOLT_HOLE_DATA,
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
        display: INITIAL_DISPLAY_STATE,
      };

      const result = boltHoleReducer(state, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('idle');
      expect(result?.stateData.stateDataType).toBe('none');
    });

    it('should exit to idle with KEY_CLEAR from any parameter entry state when buffer is empty', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-circle-radius',
        stateData: { ...INITIAL_BOLT_HOLE_DATA, centerX: 44.45, centerY: 31.75 },
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
        display: INITIAL_DISPLAY_STATE,
      };

      const result = boltHoleReducer(state, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('idle');
    });

    it('should erase last digit with KEY_CLEAR when buffer has content (backspace)', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-circle-radius',
        stateData: { ...INITIAL_BOLT_HOLE_DATA, centerX: 44.45, centerY: 31.75 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '123' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = boltHoleReducer(state, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('bolt-hole-circle-radius'); // Same state
      expect(result?.vMem.inputBuffer).toBe('12'); // Last digit removed
    });

    it('should erase buffer completely with multiple KEY_CLEAR presses', () => {
      let state: DROStatePayload = {
        stateName: 'bolt-hole-circle-center-y',
        stateData: { ...INITIAL_BOLT_HOLE_DATA, centerX: 5 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '123' },
        display: INITIAL_DISPLAY_STATE,
      };

      // First clear: 123 -> 12
      let result = boltHoleReducer(state, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);
      expect(result?.vMem.inputBuffer).toBe('12');
      state = result!;

      // Second clear: 12 -> 1
      result = boltHoleReducer(state, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);
      expect(result?.vMem.inputBuffer).toBe('1');
      state = result!;

      // Third clear: 1 -> ''
      result = boltHoleReducer(state, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);
      expect(result?.vMem.inputBuffer).toBe('');
      state = result!;

      // Fourth clear: empty buffer -> exit to idle
      result = boltHoleReducer(state, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('idle');
    });

    it('should exit to idle with KEY_CLEAR from navigate state', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-circle-navigate',
        stateData: {
          ...INITIAL_BOLT_HOLE_DATA,
          centerX: 44.45,
          centerY: 31.75,
          radius: 24.13,
          startAngle: 0,
          holeCount: 6,
          currentHole: 3,
        },
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
        display: INITIAL_DISPLAY_STATE,
      };

      const result = boltHoleReducer(state, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('idle');
    });
  });

  describe('invalid states', () => {
    it('should handle navigation state with missing parameters', () => {
      const invalidState: DROStatePayload = {
        stateName: 'bolt-hole-circle-navigate',
        stateData: INITIAL_BOLT_HOLE_DATA, // Has null values
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
        display: INITIAL_DISPLAY_STATE,
      };

      const result = boltHoleReducer(
        invalidState,
        { eventName: 'KEY_6_RIGHT' },
        DEFAULT_TEST_CONTEXT
      );

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('idle');
    });
  });

  describe('display computation', () => {
    it('should update display on MILL_STATE_CHANGED in navigate state', () => {
      const navigateState: DROStatePayload = {
        stateName: 'bolt-hole-circle-navigate',
        stateData: {
          ...INITIAL_BOLT_HOLE_DATA,
          centerX: 0,
          centerY: 0,
          radius: 25.4, // 1 inch in mm (values are stored in mm internally)
          startAngle: 0,
          holeCount: 4,
          currentHole: 1,
        },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'inc' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = boltHoleReducer(
        navigateState,
        { eventName: 'MILL_STATE_CHANGED' },
        DEFAULT_TEST_CONTEXT
      );

      expect(result).not.toBeNull();
      expect(result?.display).toBeDefined();
      // Hole 1 at 0 degrees with radius 25.4mm (1 inch) should be at (25.4, 0) mm
      // Distance to go = (25.4, 0) - (0, 0) = (25.4, 0) mm = (1, 0) inches
      // Default test context uses inches
      expect(result?.display.X).toBeCloseTo(1, 4);
      expect(result?.display.Y).toBeCloseTo(0, 4);
    });

    it('should update display on MILL_STATE_CHANGED in parameter entry state', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-circle-center-x',
        stateData: INITIAL_BOLT_HOLE_DATA,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '5' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = boltHoleReducer(
        state,
        { eventName: 'MILL_STATE_CHANGED' },
        DEFAULT_TEST_CONTEXT
      );

      expect(result).not.toBeNull();
      expect(result?.display).toBeDefined();
      // For center-x: X shows buffer value, Y shows prompt
      expect(result?.display.X).toBe(5); // numeric value
      expect(result?.display.Y).toBe('EntCnt0');
      expect(result?.display.Z).toBe('');
    });
  });

  describe('unit conversion', () => {
    describe('inch mode (default)', () => {
      it('should convert center X from inches to mm', () => {
        const state: DROStatePayload = {
          stateName: 'bolt-hole-circle-center-x',
          stateData: INITIAL_BOLT_HOLE_DATA,
          vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '0.5' },
          display: INITIAL_DISPLAY_STATE,
        };

        const result = boltHoleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

        expect(result).not.toBeNull();
        expect(result?.stateName).toBe('bolt-hole-circle-center-y');
        if (result?.stateData.stateDataType === 'bolt-hole') {
          // 0.5 inches = 12.7mm
          expect(result.stateData.centerX).toBeCloseTo(12.7, 4);
        }
      });

      it('should convert center Y from inches to mm', () => {
        const state: DROStatePayload = {
          stateName: 'bolt-hole-circle-center-y',
          stateData: { ...INITIAL_BOLT_HOLE_DATA, centerX: 12.7 },
          vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '-0.3' },
          display: INITIAL_DISPLAY_STATE,
        };

        const result = boltHoleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

        expect(result).not.toBeNull();
        expect(result?.stateName).toBe('bolt-hole-circle-radius');
        if (result?.stateData.stateDataType === 'bolt-hole') {
          // -0.3 inches = -7.62mm
          expect(result.stateData.centerY).toBeCloseTo(-7.62, 4);
        }
      });

      it('should convert radius from inches to mm', () => {
        const state: DROStatePayload = {
          stateName: 'bolt-hole-circle-radius',
          stateData: { ...INITIAL_BOLT_HOLE_DATA, centerX: 12.7, centerY: -7.62 },
          vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '1.0' },
          display: INITIAL_DISPLAY_STATE,
        };

        const result = boltHoleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

        expect(result).not.toBeNull();
        expect(result?.stateName).toBe('bolt-hole-circle-angle');
        if (result?.stateData.stateDataType === 'bolt-hole') {
          // 1.0 inch = 25.4mm
          expect(result.stateData.radius).toBeCloseTo(25.4, 4);
        }
      });
    });

    describe('mm mode', () => {
      const mmContext = {
        ...DEFAULT_TEST_CONTEXT,
        nvMem: { ...DEFAULT_TEST_CONTEXT.nvMem, defaultUnit: 'mm' as const },
      };

      it('should store center X in mm without conversion', () => {
        const state: DROStatePayload = {
          stateName: 'bolt-hole-circle-center-x',
          stateData: INITIAL_BOLT_HOLE_DATA,
          vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '12.7' },
          display: INITIAL_DISPLAY_STATE,
        };

        const result = boltHoleReducer(state, { eventName: 'KEY_ENTER' }, mmContext);

        expect(result).not.toBeNull();
        expect(result?.stateName).toBe('bolt-hole-circle-center-y');
        if (result?.stateData.stateDataType === 'bolt-hole') {
          // 12.7mm stored as-is
          expect(result.stateData.centerX).toBeCloseTo(12.7, 4);
        }
      });

      it('should store center Y in mm without conversion', () => {
        const state: DROStatePayload = {
          stateName: 'bolt-hole-circle-center-y',
          stateData: { ...INITIAL_BOLT_HOLE_DATA, centerX: 12.7 },
          vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '-7.62' },
          display: INITIAL_DISPLAY_STATE,
        };

        const result = boltHoleReducer(state, { eventName: 'KEY_ENTER' }, mmContext);

        expect(result).not.toBeNull();
        expect(result?.stateName).toBe('bolt-hole-circle-radius');
        if (result?.stateData.stateDataType === 'bolt-hole') {
          // -7.62mm stored as-is
          expect(result.stateData.centerY).toBeCloseTo(-7.62, 4);
        }
      });

      it('should store radius in mm without conversion', () => {
        const state: DROStatePayload = {
          stateName: 'bolt-hole-circle-radius',
          stateData: { ...INITIAL_BOLT_HOLE_DATA, centerX: 12.7, centerY: -7.62 },
          vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '25.4' },
          display: INITIAL_DISPLAY_STATE,
        };

        const result = boltHoleReducer(state, { eventName: 'KEY_ENTER' }, mmContext);

        expect(result).not.toBeNull();
        expect(result?.stateName).toBe('bolt-hole-circle-angle');
        if (result?.stateData.stateDataType === 'bolt-hole') {
          // 25.4mm stored as-is
          expect(result.stateData.radius).toBeCloseTo(25.4, 4);
        }
      });
    });

    describe('hole position calculations use stored mm values', () => {
      it('should calculate hole positions correctly with inch input', () => {
        // Complete workflow: enter parameters in inches, verify hole positions in mm
        const context = DEFAULT_TEST_CONTEXT; // inch mode

        // Enter center X = 0.5" -> 12.7mm
        let state: DROStatePayload = {
          stateName: 'bolt-hole-circle-center-x',
          stateData: INITIAL_BOLT_HOLE_DATA,
          vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '0.5' },
          display: INITIAL_DISPLAY_STATE,
        };
        let result = boltHoleReducer(state, { eventName: 'KEY_ENTER' }, context);
        expect(result?.stateData.stateDataType === 'bolt-hole' && result.stateData.centerX).toBeCloseTo(12.7, 4);

        // Enter center Y = -0.3" -> -7.62mm
        state = result!;
        state.vMem = { ...state.vMem, inputBuffer: '-0.3' };
        result = boltHoleReducer(state, { eventName: 'KEY_ENTER' }, context);
        expect(result?.stateData.stateDataType === 'bolt-hole' && result.stateData.centerY).toBeCloseTo(-7.62, 4);

        // Enter radius = 1.0" -> 25.4mm
        state = result!;
        state.vMem = { ...state.vMem, inputBuffer: '1' };
        result = boltHoleReducer(state, { eventName: 'KEY_ENTER' }, context);
        expect(result?.stateData.stateDataType === 'bolt-hole' && result.stateData.radius).toBeCloseTo(25.4, 4);

        // Enter angle = 0
        state = result!;
        state.vMem = { ...state.vMem, inputBuffer: '0' };
        result = boltHoleReducer(state, { eventName: 'KEY_ENTER' }, context);

        // Enter holes = 4
        state = result!;
        state.vMem = { ...state.vMem, inputBuffer: '4' };
        result = boltHoleReducer(state, { eventName: 'KEY_ENTER' }, context);

        // Verify hole 1 position at 0° is calculated correctly in mm
        // Hole 1: X = centerX + radius*cos(0) = 12.7 + 25.4 = 38.1mm
        //         Y = centerY + radius*sin(0) = -7.62 + 0 = -7.62mm
        expect(result?.stateName).toBe('bolt-hole-circle-navigate');
        // Display should show distance in inches from origin (0, 0) to hole 1 (38.1mm, -7.62mm)
        // X: 38.1mm = 1.5 inches, Y: -7.62mm = -0.3 inches
        expect(result?.display.X).toBeCloseTo(1.5, 4);
        expect(result?.display.Y).toBeCloseTo(-0.3, 4);
      });
    });
  });

  describe('helper functions edge cases', () => {
    it('should handle calculateHolePosition with incomplete bolt data', () => {
      // This tests the internal calculateHolePosition function via MILL_STATE_CHANGED
      const state: DROStatePayload = {
        stateName: 'bolt-hole-circle-navigate',
        stateData: {
          stateDataType: 'bolt-hole',
          boltHoleMode: 'CIRCLE',
          centerX: null, // Incomplete data
          centerY: null,
          radius: null,
          startAngle: null,
          endAngle: null,
          holeCount: null,
          currentHole: 1,
        },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'inc' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = boltHoleReducer(
        state,
        { eventName: 'MILL_STATE_CHANGED' },
        DEFAULT_TEST_CONTEXT
      );

      expect(result).not.toBeNull();
      // When hole position can't be calculated, it defaults to (0, 0)
      // Distance from origin (0, 0) to (0, 0) = (0, 0)
      expect(result?.display.X).toBe(0);
      expect(result?.display.Y).toBe(0);
    });

    it('should handle invalid buffer values during display computation', () => {
      // Test with invalid characters that would parse to NaN
      const state: DROStatePayload = {
        stateName: 'bolt-hole-circle-center-x',
        stateData: INITIAL_BOLT_HOLE_DATA,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: 'abc' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = boltHoleReducer(
        state,
        { eventName: 'MILL_STATE_CHANGED' },
        DEFAULT_TEST_CONTEXT
      );

      expect(result).not.toBeNull();
      // Invalid buffer should display as 0
      expect(result?.display.X).toBe(0);
      expect(result?.display.Y).toBe('EntCnt0');
    });
  });

  describe('edge cases and error handling', () => {
    it('should return null when pressing unhandled event in menu-select state', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-menu-select',
        stateData: INITIAL_BOLT_HOLE_DATA,
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
        display: INITIAL_DISPLAY_STATE,
      };

      // KEY_0 is not handled in menu-select (only KEY_6_RIGHT and KEY_ENTER)
      const result = boltHoleReducer(state, { eventName: 'KEY_0' }, DEFAULT_TEST_CONTEXT);

      expect(result).toBeNull();
    });

    it('should return null when buffer is empty in center-x state', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-circle-center-x',
        stateData: INITIAL_BOLT_HOLE_DATA,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = boltHoleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result).toBeNull();
    });

    it('should return null when pressing unhandled event in center-x state', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-circle-center-x',
        stateData: INITIAL_BOLT_HOLE_DATA,
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
        display: INITIAL_DISPLAY_STATE,
      };

      // BTN_ABS_INC is not handled in center-x
      const result = boltHoleReducer(state, { eventName: 'BTN_ABS_INC' }, DEFAULT_TEST_CONTEXT);

      expect(result).toBeNull();
    });

    it('should return null when buffer is empty in center-y state', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-circle-center-y',
        stateData: { ...INITIAL_BOLT_HOLE_DATA, centerX: 10 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = boltHoleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result).toBeNull();
    });

    it('should return null when pressing unhandled event in center-y state', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-circle-center-y',
        stateData: { ...INITIAL_BOLT_HOLE_DATA, centerX: 10 },
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
        display: INITIAL_DISPLAY_STATE,
      };

      const result = boltHoleReducer(state, { eventName: 'BTN_ABS_INC' }, DEFAULT_TEST_CONTEXT);

      expect(result).toBeNull();
    });

    it('should return null when pressing unhandled event in radius state', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-circle-radius',
        stateData: { ...INITIAL_BOLT_HOLE_DATA, centerX: 10, centerY: 10 },
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
        display: INITIAL_DISPLAY_STATE,
      };

      const result = boltHoleReducer(state, { eventName: 'BTN_ABS_INC' }, DEFAULT_TEST_CONTEXT);

      expect(result).toBeNull();
    });

    it('should return null when buffer is empty in angle state', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-circle-angle',
        stateData: { ...INITIAL_BOLT_HOLE_DATA, centerX: 10, centerY: 10, radius: 5 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = boltHoleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result).toBeNull();
    });

    it('should return null when pressing unhandled event in angle state', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-circle-angle',
        stateData: { ...INITIAL_BOLT_HOLE_DATA, centerX: 10, centerY: 10, radius: 5 },
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
        display: INITIAL_DISPLAY_STATE,
      };

      const result = boltHoleReducer(state, { eventName: 'BTN_ABS_INC' }, DEFAULT_TEST_CONTEXT);

      expect(result).toBeNull();
    });

    it('should return null when pressing unhandled event in holes state', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-circle-holes',
        stateData: {
          ...INITIAL_BOLT_HOLE_DATA,
          centerX: 10,
          centerY: 10,
          radius: 5,
          startAngle: 0,
        },
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
        display: INITIAL_DISPLAY_STATE,
      };

      const result = boltHoleReducer(state, { eventName: 'BTN_ABS_INC' }, DEFAULT_TEST_CONTEXT);

      expect(result).toBeNull();
    });

    it('should return null when pressing unhandled event in navigate state', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-circle-navigate',
        stateData: {
          ...INITIAL_BOLT_HOLE_DATA,
          centerX: 10,
          centerY: 10,
          radius: 5,
          startAngle: 0,
          holeCount: 4,
          currentHole: 1,
        },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'inc' },
        display: INITIAL_DISPLAY_STATE,
      };

      // BTN_ABS_INC is not handled in navigate
      const result = boltHoleReducer(state, { eventName: 'BTN_ABS_INC' }, DEFAULT_TEST_CONTEXT);

      expect(result).toBeNull();
    });

    it('should handle MILL_STATE_CHANGED in intro state', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-intro',
        stateData: INITIAL_BOLT_HOLE_DATA,
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
        display: { X: 'b hoLE', Y: 0, Z: '' },
      };

      const result = boltHoleReducer(
        state,
        { eventName: 'MILL_STATE_CHANGED' },
        DEFAULT_TEST_CONTEXT
      );

      // Should return the same state unchanged
      expect(result).toBe(state);
    });

    it('should handle MILL_STATE_CHANGED in menu-select state', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-menu-select',
        stateData: INITIAL_BOLT_HOLE_DATA,
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
        display: { X: 'CirCLE', Y: 0, Z: '' },
      };

      const result = boltHoleReducer(
        state,
        { eventName: 'MILL_STATE_CHANGED' },
        DEFAULT_TEST_CONTEXT
      );

      // Should return the same state unchanged
      expect(result).toBe(state);
    });
  });
});

describe('boltHoleReducer - ARC mode (US-017)', () => {
  // Arc parameters stored in mm. DEFAULT_TEST_CONTEXT is inch mode, so entered
  // values are converted; angles are unit-independent.
  const ARC_BASE = {
    ...INITIAL_BOLT_HOLE_DATA,
    boltHoleMode: 'ARC' as const,
    centerX: 0,
    centerY: 0,
    radius: 25.4, // 1 inch in mm
  };

  describe('parameter entry flow', () => {
    it('accepts arc center X and advances to center Y', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-arc-center-x',
        stateData: { ...INITIAL_BOLT_HOLE_DATA, boltHoleMode: 'ARC' },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '1.75' },
        display: INITIAL_DISPLAY_STATE,
      };
      const result = boltHoleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('bolt-hole-arc-center-y');
      if (result?.stateData.stateDataType === 'bolt-hole') {
        expect(result.stateData.centerX).toBeCloseTo(44.45, 4); // 1.75in -> mm
      }
      expect(result?.display.X).toBe('EntCnt1');
    });

    it('accepts arc center Y and advances to radius', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-arc-center-y',
        stateData: { ...INITIAL_BOLT_HOLE_DATA, boltHoleMode: 'ARC', centerX: 44.45 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '1.25' },
        display: INITIAL_DISPLAY_STATE,
      };
      const result = boltHoleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('bolt-hole-arc-radius');
      expect(result?.display.X).toBe('rAdiUS');
    });

    it('accepts arc radius and advances to start angle', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-arc-radius',
        stateData: { ...ARC_BASE, radius: null },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '0.7' },
        display: INITIAL_DISPLAY_STATE,
      };
      const result = boltHoleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('bolt-hole-arc-start-angle');
      // Start angle prompt mirrors circle ("AnGLE")
      expect(result?.display.X).toBe('AnGLE');
    });

    it('rejects zero or negative arc radius', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-arc-radius',
        stateData: { ...ARC_BASE, radius: null },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '0' },
        display: INITIAL_DISPLAY_STATE,
      };
      expect(boltHoleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT)).toBeNull();
    });

    it('accepts start angle and advances to end angle with "End" prompt', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-arc-start-angle',
        stateData: ARC_BASE,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '45' },
        display: INITIAL_DISPLAY_STATE,
      };
      const result = boltHoleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('bolt-hole-arc-end-angle');
      if (result?.stateData.stateDataType === 'bolt-hole') {
        expect(result.stateData.startAngle).toBe(45);
      }
      expect(result?.display.X).toBe('End');
    });

    it('accepts end angle and advances to holes', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-arc-end-angle',
        stateData: { ...ARC_BASE, startAngle: 45 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '260' },
        display: INITIAL_DISPLAY_STATE,
      };
      const result = boltHoleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('bolt-hole-arc-holes');
      if (result?.stateData.stateDataType === 'bolt-hole') {
        expect(result.stateData.endAngle).toBe(260);
      }
      expect(result?.display.X).toBe('hoLES');
    });

    it('normalizes end angle to 0-359 range', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-arc-end-angle',
        stateData: { ...ARC_BASE, startAngle: 0 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '370' },
        display: INITIAL_DISPLAY_STATE,
      };
      const result = boltHoleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);
      if (result?.stateData.stateDataType === 'bolt-hole') {
        expect(result.stateData.endAngle).toBe(10); // 370 % 360
      }
    });

    it('accepts hole count and switches to arc-navigate + INC mode', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-arc-holes',
        stateData: { ...ARC_BASE, startAngle: 45, endAngle: 260 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '6', mode: 'abs' },
        display: INITIAL_DISPLAY_STATE,
      };
      const result = boltHoleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('bolt-hole-arc-navigate');
      expect(result?.vMem.mode).toBe('inc');
      if (result?.stateData.stateDataType === 'bolt-hole') {
        expect(result.stateData.holeCount).toBe(6);
        expect(result.stateData.currentHole).toBe(1);
      }
    });

    it('allows a single hole in arc mode (start == end edge case)', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-arc-holes',
        stateData: { ...ARC_BASE, startAngle: 45, endAngle: 45 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '1' },
        display: INITIAL_DISPLAY_STATE,
      };
      const result = boltHoleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('bolt-hole-arc-navigate');
      if (result?.stateData.stateDataType === 'bolt-hole') {
        expect(result.stateData.holeCount).toBe(1);
      }
    });

    it('rejects hole count greater than 999', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-arc-holes',
        stateData: { ...ARC_BASE, startAngle: 45, endAngle: 260 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '1000' },
        display: INITIAL_DISPLAY_STATE,
      };
      expect(boltHoleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT)).toBeNull();
    });
  });

  describe('hole distribution geometry (AC17.8 / AC17.10)', () => {
    // Helper: drive a navigate state to a given hole and read distance-to-go
    // display, which equals (holePosition - currentPosition). With center at
    // origin and current position 0, the display IS the hole position (in mm
    // when context is mm). We assert angles via positions instead.
    const mmContext = {
      ...DEFAULT_TEST_CONTEXT,
      nvMem: { ...DEFAULT_TEST_CONTEXT.nvMem, defaultUnit: 'mm' as const },
    };

    function holePositionAt(data: typeof ARC_BASE, hole: number) {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-arc-navigate',
        stateData: { ...data, currentHole: hole },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'inc' },
        display: INITIAL_DISPLAY_STATE,
      };
      const result = boltHoleReducer(state, { eventName: 'MILL_STATE_CHANGED' }, mmContext);
      return { x: result!.display.X as number, y: result!.display.Y as number };
    }

    it('distributes 6 holes evenly across 45deg..260deg inclusive', () => {
      const data = { ...ARC_BASE, radius: 1, startAngle: 45, endAngle: 260, holeCount: 6 };
      // spacing = (260-45)/(6-1) = 43; angles: 45,88,131,174,217,260
      const expected = [45, 88, 131, 174, 217, 260];
      expected.forEach((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const pos = holePositionAt(data, i + 1);
        expect(pos.x).toBeCloseTo(Math.cos(rad), 4);
        expect(pos.y).toBeCloseTo(Math.sin(rad), 4);
      });
    });

    it('first and last hole sit exactly on start and end angles', () => {
      const data = { ...ARC_BASE, radius: 1, startAngle: 10, endAngle: 100, holeCount: 4 };
      const first = holePositionAt(data, 1);
      const last = holePositionAt(data, 4);
      expect(first.x).toBeCloseTo(Math.cos((10 * Math.PI) / 180), 4);
      expect(last.x).toBeCloseTo(Math.cos((100 * Math.PI) / 180), 4);
      expect(last.y).toBeCloseTo(Math.sin((100 * Math.PI) / 180), 4);
    });

    it('spans across 0deg (350deg..10deg) wrapping CCW (AC17.10)', () => {
      // span = (10-350+360)%360 = 20; spacing = 20/3 = 6.667
      // angles: 350, 356.67, 363.33->3.33, 370->10
      const data = { ...ARC_BASE, radius: 1, startAngle: 350, endAngle: 10, holeCount: 4 };
      const expected = [350, 356.6667, 3.3333, 10];
      expected.forEach((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const pos = holePositionAt(data, i + 1);
        expect(pos.x).toBeCloseTo(Math.cos(rad), 3);
        expect(pos.y).toBeCloseTo(Math.sin(rad), 3);
      });
    });

    it('single hole sits at the start angle', () => {
      const data = { ...ARC_BASE, radius: 1, startAngle: 45, endAngle: 45, holeCount: 1 };
      const pos = holePositionAt(data, 1);
      expect(pos.x).toBeCloseTo(Math.cos((45 * Math.PI) / 180), 4);
      expect(pos.y).toBeCloseTo(Math.sin((45 * Math.PI) / 180), 4);
    });
  });

  describe('hole navigation (AC17.9)', () => {
    const navState: DROStatePayload = {
      stateName: 'bolt-hole-arc-navigate',
      stateData: { ...ARC_BASE, radius: 25.4, startAngle: 0, endAngle: 180, holeCount: 4, currentHole: 1 },
      vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'inc' },
      display: INITIAL_DISPLAY_STATE,
    };

    it('advances to next hole with KEY_6_RIGHT and stays in arc-navigate', () => {
      const result = boltHoleReducer(navState, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('bolt-hole-arc-navigate');
      if (result?.stateData.stateDataType === 'bolt-hole') {
        expect(result.stateData.currentHole).toBe(2);
      }
    });

    it('goes to previous hole with KEY_4_LEFT', () => {
      const hole3: DROStatePayload = {
        ...navState,
        stateData: { ...(navState.stateData as typeof ARC_BASE), currentHole: 3 },
      };
      const result = boltHoleReducer(hole3, { eventName: 'KEY_4_LEFT' }, DEFAULT_TEST_CONTEXT);
      if (result?.stateData.stateDataType === 'bolt-hole') {
        expect(result.stateData.currentHole).toBe(2);
      }
    });

    it('wraps from last hole to first with KEY_6_RIGHT', () => {
      const last: DROStatePayload = {
        ...navState,
        stateData: { ...(navState.stateData as typeof ARC_BASE), currentHole: 4 },
      };
      const result = boltHoleReducer(last, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);
      if (result?.stateData.stateDataType === 'bolt-hole') {
        expect(result.stateData.currentHole).toBe(1);
      }
    });

    it('exits to idle with KEY_CLEAR from arc-navigate', () => {
      const result = boltHoleReducer(navState, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('idle');
    });
  });

  describe('exit and backspace', () => {
    it('exits to idle with KEY_CLEAR from arc parameter entry (empty buffer)', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-arc-radius',
        stateData: { ...ARC_BASE, radius: null },
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
        display: INITIAL_DISPLAY_STATE,
      };
      const result = boltHoleReducer(state, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('idle');
    });

    it('backspaces the buffer with KEY_CLEAR in arc end-angle entry', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-arc-end-angle',
        stateData: { ...ARC_BASE, startAngle: 0 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '26' },
        display: INITIAL_DISPLAY_STATE,
      };
      const result = boltHoleReducer(state, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('bolt-hole-arc-end-angle');
      expect(result?.vMem.inputBuffer).toBe('2');
    });
  });
});

describe('useBoltHoleIntro hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should dispatch BOLT_HOLE_INTRO_TIMEOUT after intro duration when in intro state', () => {
    const mockDispatch = vi.fn();

    renderHook(() => {
      useBoltHoleIntro(mockDispatch, 'bolt-hole-intro');
    });

    // Dispatch should not be called immediately
    expect(mockDispatch).not.toHaveBeenCalled();

    // Fast-forward time by intro duration
    act(() => {
      vi.advanceTimersByTime(BOLT_HOLE_INTRO_DURATION_MS);
    });

    // Dispatch should be called with BOLT_HOLE_INTRO_TIMEOUT
    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith({ eventName: 'BOLT_HOLE_INTRO_TIMEOUT' });
  });

  it('should not dispatch when not in intro state', () => {
    const mockDispatch = vi.fn();

    renderHook(() => {
      useBoltHoleIntro(mockDispatch, 'idle');
    });

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(BOLT_HOLE_INTRO_DURATION_MS + 100);
    });

    // Dispatch should never be called
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('should cleanup timer when state changes from intro to another state', () => {
    const mockDispatch = vi.fn();

    const { rerender } = renderHook(
      ({ state }: { state: DROStateName }) => {
        useBoltHoleIntro(mockDispatch, state);
      },
      { initialProps: { state: 'bolt-hole-intro' as DROStateName } }
    );

    // Change state before timer expires
    act(() => {
      vi.advanceTimersByTime(BOLT_HOLE_INTRO_DURATION_MS / 2);
    });

    rerender({ state: 'idle' as DROStateName });

    // Complete the rest of the time
    act(() => {
      vi.advanceTimersByTime(BOLT_HOLE_INTRO_DURATION_MS);
    });

    // Dispatch should not be called since timer was cleaned up
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('should create new timer when re-entering intro state', () => {
    const mockDispatch = vi.fn();

    const { rerender } = renderHook(
      ({ state }: { state: DROStateName }) => {
        useBoltHoleIntro(mockDispatch, state);
      },
      { initialProps: { state: 'idle' as DROStateName } }
    );

    // Enter intro state
    rerender({ state: 'bolt-hole-intro' as DROStateName });

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(BOLT_HOLE_INTRO_DURATION_MS);
    });

    // Dispatch should be called
    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith({ eventName: 'BOLT_HOLE_INTRO_TIMEOUT' });
  });
});

/**
 * AC 2.5 — macro canonical-convention guard.
 *
 * Macros compute against the standard sign convention (Figure 1) regardless of
 * the operator's per-axis Direction / Z depth-sense preference, because they read
 * stored mm and compute distance-to-go directly (holePos - currentPos), never the
 * signed display path (`computeDisplayPosition`/`directionSign`). So the X/Y hole
 * coordinates a macro GENERATES — and their distance-to-go readout — are invariant
 * to nvMem.axisDirection / nvMem.zDepthSense. Generated holes therefore land where
 * the figures show, no matter how the scales were installed or how the operator
 * prefers to count.
 *
 * The Z field of a 2D drill macro is the operator's live tool-depth readout passed
 * through (not a generated coordinate), so per the spec Implementation Note it
 * correctly DOES follow the Z preference — that is asserted separately below, and
 * is explicitly NOT an AC 2.5 violation.
 */
describe('boltHoleReducer - AC 2.5 macro canonical convention', () => {
  // mm units so the asserted distances are raw millimetres (no inch conversion).
  function ctxWith(nvOverrides: Partial<typeof DEFAULT_TEST_CONTEXT.nvMem>) {
    return {
      ...DEFAULT_TEST_CONTEXT,
      nvMem: { ...DEFAULT_TEST_CONTEXT.nvMem, defaultUnit: 'mm' as const, ...nvOverrides },
    };
  }

  const NORMAL = { X: 'normal', Y: 'normal', Z: 'normal' } as const;
  const REVERSED = { X: 'reversed', Y: 'reversed', Z: 'reversed' } as const;

  // A fully-specified circle pattern with a non-trivial current position so the
  // X/Y distance-to-go is non-zero (a zero distance would mask a sign flip).
  const navigateState: DROStatePayload = {
    stateName: 'bolt-hole-circle-navigate',
    stateData: {
      ...INITIAL_BOLT_HOLE_DATA,
      centerX: 44.45,
      centerY: 31.75,
      radius: 24.13,
      startAngle: 30,
      holeCount: 6,
      currentHole: 1,
    },
    vMem: {
      ...INITIAL_VOLATILE_MEMORY_STATE,
      mode: 'inc',
      manualAbsoluteValues: { X: 10, Y: -5, Z: 9 },
      incrementalValues: { X: 10, Y: -5, Z: 9 },
    },
    display: INITIAL_DISPLAY_STATE,
  };

  /** Drive a next-hole press and return the resulting distance-to-go display. */
  function navigateDisplay(nvOverrides: Partial<typeof DEFAULT_TEST_CONTEXT.nvMem>) {
    const result = boltHoleReducer(navigateState, { eventName: 'KEY_6_RIGHT' }, ctxWith(nvOverrides));
    if (result === null) throw new Error('navigate reducer returned null');
    return result.display;
  }

  it('X/Y distance-to-go is invariant to per-axis Direction (all reversed)', () => {
    const normal = navigateDisplay({ axisDirection: NORMAL });
    const reversed = navigateDisplay({ axisDirection: REVERSED });
    expect(reversed.X).toBe(normal.X);
    expect(reversed.Y).toBe(normal.Y);
  });

  it('X/Y distance-to-go is invariant to single-axis Direction flips', () => {
    const normal = navigateDisplay({ axisDirection: NORMAL });
    const xRev = navigateDisplay({ axisDirection: { X: 'reversed', Y: 'normal', Z: 'normal' } });
    const yRev = navigateDisplay({ axisDirection: { X: 'normal', Y: 'reversed', Z: 'normal' } });
    expect(xRev.X).toBe(normal.X);
    expect(yRev.Y).toBe(normal.Y);
  });

  it('X/Y distance-to-go is invariant to the Z depth-sense preference', () => {
    const normal = navigateDisplay({ zDepthSense: 'depth-negative' });
    const depthPos = navigateDisplay({ zDepthSense: 'depth-positive' });
    expect(depthPos.X).toBe(normal.X);
    expect(depthPos.Y).toBe(normal.Y);
  });

  it('generated X/Y distances are the expected canonical values', () => {
    // Hole 2 of a 6-hole circle, startAngle 30°, so angle = 30 + 60 = 90°.
    // holePos = center + radius·(cos90°, sin90°) = (44.45, 31.75 + 24.13) = (44.45, 55.88).
    // current = (10, -5). distance-to-go = (34.45, 60.88).
    const display = navigateDisplay({ axisDirection: NORMAL });
    expect(typeof display.X === 'number' ? display.X : NaN).toBeCloseTo(34.45, 4);
    expect(typeof display.Y === 'number' ? display.Y : NaN).toBeCloseTo(60.88, 4);
  });

  it('Z field is the live tool-depth passthrough and follows the Z preference (NOT AC 2.5 scope)', () => {
    // Per the spec Implementation Note: the Z field of a 2D macro is the operator's
    // live tool-depth readout, not a macro-generated coordinate, so it correctly
    // honours the Z preference. (reversed-Z and depth-positive each invert it;
    // together they cancel — the double-inversion documented in directionSign.)
    const normalZ = navigateDisplay({ axisDirection: NORMAL }).Z;
    const zReversed = navigateDisplay({ axisDirection: { X: 'normal', Y: 'normal', Z: 'reversed' } }).Z;
    const depthPos = navigateDisplay({ zDepthSense: 'depth-positive' }).Z;
    expect(zReversed).toBe(-(normalZ as number));
    expect(depthPos).toBe(-(normalZ as number));
  });
});

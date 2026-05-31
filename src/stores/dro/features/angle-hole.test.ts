/**
 * Tests for Angle Hole (Linear Hole Pattern) Feature Reducer
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  angleHoleReducer,
  useAngleHoleIntro,
  ANGLE_HOLE_INTRO_DURATION_MS,
} from './angle-hole';
import { INITIAL_ANGLE_HOLE_DATA, type DROStateName } from '../droStateMachine';
import { DEFAULT_TEST_CONTEXT } from '../test-utils';
import type { DROStatePayload } from '../types';
import { INITIAL_VOLATILE_MEMORY_STATE } from '../../../types/volatileMemory';
import { INITIAL_DISPLAY_STATE } from '../utils/displayComputation';

describe('angleHoleReducer', () => {
  describe('angle-hole-intro state', () => {
    it('should transition to angle-hole-start-x on ANGLE_HOLE_INTRO_TIMEOUT', () => {
      const state: DROStatePayload = {
        stateName: 'angle-hole-intro',
        stateData: INITIAL_ANGLE_HOLE_DATA,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'abs' },
        display: { X: 'AnGhoLE', Y: 0, Z: '' },
      };

      const result = angleHoleReducer(
        state,
        { eventName: 'ANGLE_HOLE_INTRO_TIMEOUT' },
        DEFAULT_TEST_CONTEXT
      );

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('angle-hole-start-x');
      expect(result?.stateData.stateDataType).toBe('angle-hole');
      // start-x: X shows buffer value (0), Y shows prompt
      expect(result?.display.X).toBe(0);
      expect(result?.display.Y).toBe('EntCnt0');
      expect(result?.display.Z).toBe('');
    });

    it('should ignore key input during intro', () => {
      const introState: DROStatePayload = {
        stateName: 'angle-hole-intro',
        stateData: INITIAL_ANGLE_HOLE_DATA,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'abs' },
        display: { X: 'AnGhoLE', Y: 0, Z: '' },
      };

      const result = angleHoleReducer(introState, { eventName: 'KEY_5' }, DEFAULT_TEST_CONTEXT);
      expect(result).toBe(introState);
    });

    it('should exit to idle with KEY_CLEAR from intro state', () => {
      const state: DROStatePayload = {
        stateName: 'angle-hole-intro',
        stateData: INITIAL_ANGLE_HOLE_DATA,
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
        display: INITIAL_DISPLAY_STATE,
      };

      const result = angleHoleReducer(state, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('idle');
    });
  });

  describe('non-angle-hole states', () => {
    it('should return null for non-angle-hole states', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-intro',
        stateData: {
          stateDataType: 'bolt-hole',
          boltHoleMode: 'CIRCLE',
          centerX: null,
          centerY: null,
          radius: null,
          startAngle: null,
          endAngle: null,
          holeCount: null,
          currentHole: 1,
        },
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
        display: INITIAL_DISPLAY_STATE,
      };

      const result = angleHoleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);
      expect(result).toBeNull();
    });
  });

  describe('parameter entry states', () => {
    it('should accept start X coordinate and advance to start Y', () => {
      const state: DROStatePayload = {
        stateName: 'angle-hole-start-x',
        stateData: INITIAL_ANGLE_HOLE_DATA,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '0.45' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = angleHoleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('angle-hole-start-y');
      if (result?.stateData.stateDataType === 'angle-hole') {
        // 0.45 inches = 11.43mm (default context uses inches)
        expect(result.stateData.startX).toBeCloseTo(11.43, 4);
      }
      expect(result?.vMem.inputBuffer).toBe('');
      expect(result?.display.X).toBe('EntCnt1');
      expect(result?.display.Y).toBe(0);
    });

    it('should accept start Y coordinate and advance to pitch', () => {
      const state: DROStatePayload = {
        stateName: 'angle-hole-start-y',
        stateData: { ...INITIAL_ANGLE_HOLE_DATA, startX: 11.43 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '0.65' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = angleHoleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('angle-hole-pitch');
      if (result?.stateData.stateDataType === 'angle-hole') {
        expect(result.stateData.startY).toBeCloseTo(16.51, 4);
      }
      expect(result?.display.X).toBe('P itCh');
      expect(result?.display.Y).toBe(0);
    });

    it('should accept pitch and advance to angle', () => {
      const state: DROStatePayload = {
        stateName: 'angle-hole-pitch',
        stateData: { ...INITIAL_ANGLE_HOLE_DATA, startX: 11.43, startY: 16.51 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '0.5' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = angleHoleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('angle-hole-angle');
      if (result?.stateData.stateDataType === 'angle-hole') {
        // 0.5 inches = 12.7mm
        expect(result.stateData.pitch).toBeCloseTo(12.7, 4);
      }
      expect(result?.display.X).toBe('AnGLE');
    });

    it('should reject zero or negative pitch', () => {
      const state: DROStatePayload = {
        stateName: 'angle-hole-pitch',
        stateData: { ...INITIAL_ANGLE_HOLE_DATA, startX: 11.43, startY: 16.51 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '0' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = angleHoleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);
      expect(result).toBeNull();
    });

    it('should accept line angle and advance to holes', () => {
      const state: DROStatePayload = {
        stateName: 'angle-hole-angle',
        stateData: { ...INITIAL_ANGLE_HOLE_DATA, startX: 11.43, startY: 16.51, pitch: 12.7 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '30' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = angleHoleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('angle-hole-holes');
      if (result?.stateData.stateDataType === 'angle-hole') {
        expect(result.stateData.lineAngle).toBe(30);
      }
      expect(result?.display.X).toBe('hoLES');
    });

    it('should normalize line angle to 0-359 range', () => {
      const state: DROStatePayload = {
        stateName: 'angle-hole-angle',
        stateData: { ...INITIAL_ANGLE_HOLE_DATA, startX: 0, startY: 0, pitch: 12.7 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '400' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = angleHoleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);
      if (result?.stateData.stateDataType === 'angle-hole') {
        expect(result.stateData.lineAngle).toBe(40); // 400 % 360 = 40
      }
    });

    it('should normalize negative line angle to 0-359 range', () => {
      const state: DROStatePayload = {
        stateName: 'angle-hole-angle',
        stateData: { ...INITIAL_ANGLE_HOLE_DATA, startX: 0, startY: 0, pitch: 12.7 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '-90' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = angleHoleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);
      if (result?.stateData.stateDataType === 'angle-hole') {
        expect(result.stateData.lineAngle).toBe(270); // -90 -> 270
      }
    });

    it('should accept hole count and switch to INC mode', () => {
      const state: DROStatePayload = {
        stateName: 'angle-hole-holes',
        stateData: {
          ...INITIAL_ANGLE_HOLE_DATA,
          startX: 11.43,
          startY: 16.51,
          pitch: 12.7,
          lineAngle: 30,
        },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '6', mode: 'abs' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = angleHoleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('angle-hole-navigate');
      expect(result?.vMem.mode).toBe('inc');
      if (result?.stateData.stateDataType === 'angle-hole') {
        expect(result.stateData.holeCount).toBe(6);
        expect(result.stateData.currentHole).toBe(1);
      }
    });

    it('should reject hole count less than 2', () => {
      const state: DROStatePayload = {
        stateName: 'angle-hole-holes',
        stateData: {
          ...INITIAL_ANGLE_HOLE_DATA,
          startX: 0,
          startY: 0,
          pitch: 12.7,
          lineAngle: 30,
        },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '1' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = angleHoleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);
      expect(result).toBeNull();
    });

    it('should reject hole count greater than 999', () => {
      const state: DROStatePayload = {
        stateName: 'angle-hole-holes',
        stateData: {
          ...INITIAL_ANGLE_HOLE_DATA,
          startX: 0,
          startY: 0,
          pitch: 12.7,
          lineAngle: 30,
        },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '1000' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = angleHoleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);
      expect(result).toBeNull();
    });

    it('should floor fractional hole count values', () => {
      const state: DROStatePayload = {
        stateName: 'angle-hole-holes',
        stateData: {
          ...INITIAL_ANGLE_HOLE_DATA,
          startX: 0,
          startY: 0,
          pitch: 12.7,
          lineAngle: 30,
        },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '6.8' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = angleHoleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);
      if (result?.stateData.stateDataType === 'angle-hole') {
        expect(result.stateData.holeCount).toBe(6);
      }
    });

    it('should append digit to input buffer and update display (start-x)', () => {
      const state: DROStatePayload = {
        stateName: 'angle-hole-start-x',
        stateData: INITIAL_ANGLE_HOLE_DATA,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '1' },
        display: { X: 1, Y: 'EntCnt0', Z: '' },
      };

      const result = angleHoleReducer(state, { eventName: 'KEY_5' }, DEFAULT_TEST_CONTEXT);

      expect(result?.vMem.inputBuffer).toBe('15');
      expect(result?.display.X).toBe(15);
      expect(result?.display.Y).toBe('EntCnt0');
    });

    it('should append decimal to input buffer (pitch)', () => {
      const state: DROStatePayload = {
        stateName: 'angle-hole-pitch',
        stateData: { ...INITIAL_ANGLE_HOLE_DATA, startX: 0, startY: 0 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '1' },
        display: { X: 'P itCh', Y: 1, Z: '' },
      };

      const result = angleHoleReducer(state, { eventName: 'KEY_DECIMAL' }, DEFAULT_TEST_CONTEXT);

      expect(result?.vMem.inputBuffer).toBe('1.');
      expect(result?.display.X).toBe('P itCh');
      expect(result?.display.Y).toBe(1);
    });

    it('should toggle sign in input buffer (start-y)', () => {
      const state: DROStatePayload = {
        stateName: 'angle-hole-start-y',
        stateData: { ...INITIAL_ANGLE_HOLE_DATA, startX: 0 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '1.5' },
        display: { X: 'EntCnt1', Y: 1.5, Z: '' },
      };

      const result = angleHoleReducer(state, { eventName: 'KEY_SIGN' }, DEFAULT_TEST_CONTEXT);

      expect(result?.vMem.inputBuffer).toBe('-1.5');
      expect(result?.display.Y).toBe(-1.5);
    });

    it('should return null on KEY_ENTER with empty buffer (start-x)', () => {
      const state: DROStatePayload = {
        stateName: 'angle-hole-start-x',
        stateData: INITIAL_ANGLE_HOLE_DATA,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = angleHoleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);
      expect(result).toBeNull();
    });

    it('should return null for unhandled events in parameter entry', () => {
      const state: DROStatePayload = {
        stateName: 'angle-hole-pitch',
        stateData: { ...INITIAL_ANGLE_HOLE_DATA, startX: 0, startY: 0 },
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
        display: INITIAL_DISPLAY_STATE,
      };

      const result = angleHoleReducer(state, { eventName: 'BTN_ABS_INC' }, DEFAULT_TEST_CONTEXT);
      expect(result).toBeNull();
    });
  });

  describe('mm mode unit handling', () => {
    const mmContext = {
      ...DEFAULT_TEST_CONTEXT,
      nvMem: { ...DEFAULT_TEST_CONTEXT.nvMem, defaultUnit: 'mm' as const },
    };

    it('should store start X in mm without conversion', () => {
      const state: DROStatePayload = {
        stateName: 'angle-hole-start-x',
        stateData: INITIAL_ANGLE_HOLE_DATA,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '12.7' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = angleHoleReducer(state, { eventName: 'KEY_ENTER' }, mmContext);
      if (result?.stateData.stateDataType === 'angle-hole') {
        expect(result.stateData.startX).toBeCloseTo(12.7, 4);
      }
    });

    it('should store pitch in mm without conversion', () => {
      const state: DROStatePayload = {
        stateName: 'angle-hole-pitch',
        stateData: { ...INITIAL_ANGLE_HOLE_DATA, startX: 0, startY: 0 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '25.4' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = angleHoleReducer(state, { eventName: 'KEY_ENTER' }, mmContext);
      if (result?.stateData.stateDataType === 'angle-hole') {
        expect(result.stateData.pitch).toBeCloseTo(25.4, 4);
      }
    });
  });

  describe('hole position geometry (via navigate display)', () => {
    // mm context so display values equal stored mm positions directly
    const mmContext = {
      ...DEFAULT_TEST_CONTEXT,
      nvMem: { ...DEFAULT_TEST_CONTEXT.nvMem, defaultUnit: 'mm' as const },
    };

    function navigateState(
      overrides: Partial<{
        startX: number;
        startY: number;
        pitch: number;
        lineAngle: number;
        holeCount: number;
        currentHole: number;
      }>
    ): DROStatePayload {
      return {
        stateName: 'angle-hole-navigate',
        stateData: {
          ...INITIAL_ANGLE_HOLE_DATA,
          startX: 0,
          startY: 0,
          pitch: 10,
          lineAngle: 0,
          holeCount: 5,
          currentHole: 1,
          ...overrides,
        },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'inc' },
        display: INITIAL_DISPLAY_STATE,
      };
    }

    it('hole 1 is at the start point (distance-to-go = start - 0)', () => {
      const result = angleHoleReducer(
        navigateState({ startX: 12, startY: 7, currentHole: 1 }),
        { eventName: 'MILL_STATE_CHANGED' },
        mmContext
      );
      // Current position is origin (0,0); hole 1 is at start (12, 7)
      expect(result?.display.X).toBeCloseTo(12, 4);
      expect(result?.display.Y).toBeCloseTo(7, 4);
    });

    it('horizontal line at 0deg: holes spaced by pitch along X, Y unchanged', () => {
      // pitch 10, angle 0, hole 3 => x = 0 + 2*10*cos0 = 20, y = 0
      const result = angleHoleReducer(
        navigateState({ pitch: 10, lineAngle: 0, currentHole: 3 }),
        { eventName: 'MILL_STATE_CHANGED' },
        mmContext
      );
      expect(result?.display.X).toBeCloseTo(20, 4);
      expect(result?.display.Y).toBeCloseTo(0, 4);
    });

    it('vertical line at 90deg: holes spaced by pitch along Y, X unchanged', () => {
      // pitch 10, angle 90, hole 4 => x = 0, y = 3*10 = 30
      const result = angleHoleReducer(
        navigateState({ pitch: 10, lineAngle: 90, currentHole: 4 }),
        { eventName: 'MILL_STATE_CHANGED' },
        mmContext
      );
      expect(result?.display.X).toBeCloseTo(0, 4);
      expect(result?.display.Y).toBeCloseTo(30, 4);
    });

    it('30deg line: hole 2 follows cos/sin offset from start', () => {
      // start (0,0), pitch 10, angle 30, hole 2 => x = 10*cos30 = 8.6603, y = 10*sin30 = 5
      const result = angleHoleReducer(
        navigateState({ pitch: 10, lineAngle: 30, currentHole: 2 }),
        { eventName: 'MILL_STATE_CHANGED' },
        mmContext
      );
      expect(result?.display.X).toBeCloseTo(8.6603, 3);
      expect(result?.display.Y).toBeCloseTo(5, 4);
    });

    it('180deg line: holes go in -X direction', () => {
      // pitch 10, angle 180, hole 2 => x = 10*cos180 = -10, y = 0
      const result = angleHoleReducer(
        navigateState({ pitch: 10, lineAngle: 180, currentHole: 2 }),
        { eventName: 'MILL_STATE_CHANGED' },
        mmContext
      );
      expect(result?.display.X).toBeCloseTo(-10, 4);
      expect(result?.display.Y).toBeCloseTo(0, 4);
    });

    it('270deg line: holes go in -Y direction', () => {
      // pitch 10, angle 270, hole 2 => x = 0, y = 10*sin270 = -10
      const result = angleHoleReducer(
        navigateState({ pitch: 10, lineAngle: 270, currentHole: 2 }),
        { eventName: 'MILL_STATE_CHANGED' },
        mmContext
      );
      expect(result?.display.X).toBeCloseTo(0, 4);
      expect(result?.display.Y).toBeCloseTo(-10, 4);
    });

    it('returns (0,0) distance when parameters incomplete', () => {
      const result = angleHoleReducer(
        {
          stateName: 'angle-hole-navigate',
          stateData: INITIAL_ANGLE_HOLE_DATA,
          vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'inc' },
          display: INITIAL_DISPLAY_STATE,
        },
        { eventName: 'MILL_STATE_CHANGED' },
        mmContext
      );
      expect(result?.display.X).toBe(0);
      expect(result?.display.Y).toBe(0);
    });
  });

  describe('hole navigation', () => {
    const navState: DROStatePayload = {
      stateName: 'angle-hole-navigate',
      stateData: {
        ...INITIAL_ANGLE_HOLE_DATA,
        startX: 0,
        startY: 0,
        pitch: 12.7,
        lineAngle: 0,
        holeCount: 6,
        currentHole: 1,
      },
      vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'inc' },
      display: INITIAL_DISPLAY_STATE,
    };

    it('advances to next hole with KEY_6_RIGHT', () => {
      const result = angleHoleReducer(navState, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);
      if (result?.stateData.stateDataType === 'angle-hole') {
        expect(result.stateData.currentHole).toBe(2);
      }
    });

    it('wraps from last hole to first with KEY_6_RIGHT', () => {
      const last = {
        ...navState,
        stateData: { ...(navState.stateData as typeof INITIAL_ANGLE_HOLE_DATA), currentHole: 6 },
      };
      const result = angleHoleReducer(last, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);
      if (result?.stateData.stateDataType === 'angle-hole') {
        expect(result.stateData.currentHole).toBe(1);
      }
    });

    it('goes to previous hole with KEY_4_LEFT', () => {
      const hole2 = {
        ...navState,
        stateData: { ...(navState.stateData as typeof INITIAL_ANGLE_HOLE_DATA), currentHole: 2 },
      };
      const result = angleHoleReducer(hole2, { eventName: 'KEY_4_LEFT' }, DEFAULT_TEST_CONTEXT);
      if (result?.stateData.stateDataType === 'angle-hole') {
        expect(result.stateData.currentHole).toBe(1);
      }
    });

    it('wraps from first hole to last with KEY_4_LEFT', () => {
      const result = angleHoleReducer(navState, { eventName: 'KEY_4_LEFT' }, DEFAULT_TEST_CONTEXT);
      if (result?.stateData.stateDataType === 'angle-hole') {
        expect(result.stateData.currentHole).toBe(6);
      }
    });

    it('shows current hole number in buffer with KEY_8_UP', () => {
      const result = angleHoleReducer(navState, { eventName: 'KEY_8_UP' }, DEFAULT_TEST_CONTEXT);
      expect(result?.vMem.inputBuffer).toBe('1');
    });

    it('clears buffer with KEY_2_DOWN (prepare for jump)', () => {
      const seeded = { ...navState, vMem: { ...navState.vMem, inputBuffer: '99' } };
      const result = angleHoleReducer(seeded, { eventName: 'KEY_2_DOWN' }, DEFAULT_TEST_CONTEXT);
      expect(result?.vMem.inputBuffer).toBe('');
    });

    it('jumps to specific hole with buffered number and ENTER', () => {
      const jump = { ...navState, vMem: { ...navState.vMem, inputBuffer: '4' } };
      const result = angleHoleReducer(jump, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);
      if (result?.stateData.stateDataType === 'angle-hole') {
        expect(result.stateData.currentHole).toBe(4);
      }
      expect(result?.vMem.inputBuffer).toBe('');
    });

    it('rejects jump to hole number less than 1', () => {
      const jump = { ...navState, vMem: { ...navState.vMem, inputBuffer: '0' } };
      const result = angleHoleReducer(jump, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);
      expect(result).toBeNull();
    });

    it('rejects jump to hole number greater than hole count', () => {
      const jump = { ...navState, vMem: { ...navState.vMem, inputBuffer: '7' } };
      const result = angleHoleReducer(jump, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);
      expect(result).toBeNull();
    });

    it('accepts digit input in navigate state', () => {
      const result = angleHoleReducer(navState, { eventName: 'KEY_3' }, DEFAULT_TEST_CONTEXT);
      expect(result?.vMem.inputBuffer).toBe('3');
    });

    it('returns null for unhandled event in navigate state', () => {
      const result = angleHoleReducer(navState, { eventName: 'BTN_ABS_INC' }, DEFAULT_TEST_CONTEXT);
      expect(result).toBeNull();
    });

    it('exits to idle when navigate state has missing holeCount', () => {
      const result = angleHoleReducer(
        {
          stateName: 'angle-hole-navigate',
          stateData: INITIAL_ANGLE_HOLE_DATA,
          vMem: INITIAL_VOLATILE_MEMORY_STATE,
          display: INITIAL_DISPLAY_STATE,
        },
        { eventName: 'KEY_6_RIGHT' },
        DEFAULT_TEST_CONTEXT
      );
      expect(result?.stateName).toBe('idle');
    });
  });

  describe('exiting angle hole mode', () => {
    it('exits to idle with KEY_CLEAR from parameter entry when buffer empty', () => {
      const state: DROStatePayload = {
        stateName: 'angle-hole-pitch',
        stateData: { ...INITIAL_ANGLE_HOLE_DATA, startX: 0, startY: 0 },
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
        display: INITIAL_DISPLAY_STATE,
      };
      const result = angleHoleReducer(state, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('idle');
    });

    it('erases last digit with KEY_CLEAR when buffer has content (backspace)', () => {
      const state: DROStatePayload = {
        stateName: 'angle-hole-pitch',
        stateData: { ...INITIAL_ANGLE_HOLE_DATA, startX: 0, startY: 0 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '123' },
        display: INITIAL_DISPLAY_STATE,
      };
      const result = angleHoleReducer(state, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('angle-hole-pitch');
      expect(result?.vMem.inputBuffer).toBe('12');
    });

    it('exits to idle with KEY_CLEAR from navigate state', () => {
      const state: DROStatePayload = {
        stateName: 'angle-hole-navigate',
        stateData: {
          ...INITIAL_ANGLE_HOLE_DATA,
          startX: 0,
          startY: 0,
          pitch: 12.7,
          lineAngle: 0,
          holeCount: 6,
          currentHole: 3,
        },
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
        display: INITIAL_DISPLAY_STATE,
      };
      const result = angleHoleReducer(state, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('idle');
    });

    it('restores ABS mode on exit', () => {
      const state: DROStatePayload = {
        stateName: 'angle-hole-navigate',
        stateData: {
          ...INITIAL_ANGLE_HOLE_DATA,
          startX: 0,
          startY: 0,
          pitch: 12.7,
          lineAngle: 0,
          holeCount: 6,
          currentHole: 1,
        },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'inc' },
        display: INITIAL_DISPLAY_STATE,
      };
      const result = angleHoleReducer(state, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);
      expect(result?.vMem.mode).toBe('abs');
    });
  });

  describe('MILL_STATE_CHANGED in non-display states', () => {
    it('returns state unchanged in intro state', () => {
      const state: DROStatePayload = {
        stateName: 'angle-hole-intro',
        stateData: INITIAL_ANGLE_HOLE_DATA,
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
        display: { X: 'AnGhoLE', Y: 0, Z: '' },
      };
      const result = angleHoleReducer(state, { eventName: 'MILL_STATE_CHANGED' }, DEFAULT_TEST_CONTEXT);
      expect(result).toBe(state);
    });

    it('updates display on MILL_STATE_CHANGED in parameter entry state', () => {
      const state: DROStatePayload = {
        stateName: 'angle-hole-start-x',
        stateData: INITIAL_ANGLE_HOLE_DATA,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '5' },
        display: INITIAL_DISPLAY_STATE,
      };
      const result = angleHoleReducer(state, { eventName: 'MILL_STATE_CHANGED' }, DEFAULT_TEST_CONTEXT);
      expect(result?.display.X).toBe(5);
      expect(result?.display.Y).toBe('EntCnt0');
    });
  });
});

describe('useAngleHoleIntro hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('dispatches ANGLE_HOLE_INTRO_TIMEOUT after intro duration when in intro state', () => {
    const mockDispatch = vi.fn();
    renderHook(() => {
      useAngleHoleIntro(mockDispatch, 'angle-hole-intro');
    });

    expect(mockDispatch).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(ANGLE_HOLE_INTRO_DURATION_MS);
    });

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith({ eventName: 'ANGLE_HOLE_INTRO_TIMEOUT' });
  });

  it('does not dispatch when not in intro state', () => {
    const mockDispatch = vi.fn();
    renderHook(() => {
      useAngleHoleIntro(mockDispatch, 'idle');
    });

    act(() => {
      vi.advanceTimersByTime(ANGLE_HOLE_INTRO_DURATION_MS + 100);
    });

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('cleans up timer when state changes from intro', () => {
    const mockDispatch = vi.fn();
    const { rerender } = renderHook(
      ({ state }: { state: DROStateName }) => {
        useAngleHoleIntro(mockDispatch, state);
      },
      { initialProps: { state: 'angle-hole-intro' as DROStateName } }
    );

    act(() => {
      vi.advanceTimersByTime(ANGLE_HOLE_INTRO_DURATION_MS / 2);
    });
    rerender({ state: 'idle' as DROStateName });
    act(() => {
      vi.advanceTimersByTime(ANGLE_HOLE_INTRO_DURATION_MS);
    });

    expect(mockDispatch).not.toHaveBeenCalled();
  });
});

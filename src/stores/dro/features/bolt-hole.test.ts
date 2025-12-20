/**
 * Tests for Bolt Hole Circle Feature Reducer
 */

import { describe, it, expect } from 'vitest';
import { boltHoleReducer } from './bolt-hole';
import { INITIAL_BOLT_HOLE_DATA } from '../droStateMachine';
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
        display: INITIAL_DISPLAY_STATE,
      };

      const result = boltHoleReducer(state, { eventName: 'BOLT_HOLE_INTRO_TIMEOUT' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('bolt-hole-menu-select');
      expect(result?.stateData.stateDataType).toBe('bolt-hole');
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
    });

    it('should exit to idle when ARC mode is selected (not implemented)', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-menu-select',
        stateData: { ...INITIAL_BOLT_HOLE_DATA, boltHoleMode: 'ARC' },
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
        display: INITIAL_DISPLAY_STATE,
      };

      const result = boltHoleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('idle');
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
        expect(result.stateData.centerX).toBe(1.75);
      }
      expect(result?.vMem.inputBuffer).toBe('');
    });

    it('should accept center Y coordinate', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-circle-center-y',
        stateData: { ...INITIAL_BOLT_HOLE_DATA, centerX: 1.75 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '1.25' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = boltHoleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('bolt-hole-circle-radius');
      if (result?.stateData.stateDataType === 'bolt-hole') {
        expect(result.stateData.centerY).toBe(1.25);
      }
    });

    it('should accept radius value', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-circle-radius',
        stateData: { ...INITIAL_BOLT_HOLE_DATA, centerX: 1.75, centerY: 1.25 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '0.95' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = boltHoleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('bolt-hole-circle-angle');
      if (result?.stateData.stateDataType === 'bolt-hole') {
        expect(result.stateData.radius).toBe(0.95);
      }
    });

    it('should reject zero or negative radius', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-circle-radius',
        stateData: { ...INITIAL_BOLT_HOLE_DATA, centerX: 1.75, centerY: 1.25 },
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
          centerX: 1.75,
          centerY: 1.25,
          radius: 0.95,
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
    });

    it('should normalize angle to 0-359 range', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-circle-angle',
        stateData: {
          ...INITIAL_BOLT_HOLE_DATA,
          centerX: 1.75,
          centerY: 1.25,
          radius: 0.95,
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
          centerX: 1.75,
          centerY: 1.25,
          radius: 0.95,
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
          centerX: 1.75,
          centerY: 1.25,
          radius: 0.95,
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
          centerX: 1.75,
          centerY: 1.25,
          radius: 0.95,
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
          centerX: 1.75,
          centerY: 1.25,
          radius: 0.95,
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

    it('should append digit to input buffer', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-circle-center-x',
        stateData: INITIAL_BOLT_HOLE_DATA,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '1' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = boltHoleReducer(state, { eventName: 'KEY_5' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.vMem.inputBuffer).toBe('15');
    });

    it('should append decimal to input buffer', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-circle-center-x',
        stateData: INITIAL_BOLT_HOLE_DATA,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '1' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = boltHoleReducer(state, { eventName: 'KEY_DECIMAL' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.vMem.inputBuffer).toBe('1.');
    });

    it('should toggle sign in input buffer', () => {
      const state: DROStatePayload = {
        stateName: 'bolt-hole-circle-center-x',
        stateData: INITIAL_BOLT_HOLE_DATA,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '1.5' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = boltHoleReducer(state, { eventName: 'KEY_SIGN' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.vMem.inputBuffer).toBe('-1.5');
    });
  });

  describe('hole navigation', () => {
    const navigateState: DROStatePayload = {
      stateName: 'bolt-hole-circle-navigate',
      stateData: {
        ...INITIAL_BOLT_HOLE_DATA,
        centerX: 1.75,
        centerY: 1.25,
        radius: 0.95,
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
        stateData: { ...INITIAL_BOLT_HOLE_DATA, centerX: 1.75, centerY: 1.25 },
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
        stateData: { ...INITIAL_BOLT_HOLE_DATA, centerX: 1.75, centerY: 1.25 },
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
          centerX: 1.75,
          centerY: 1.25,
          radius: 0.95,
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
      expect(result?.display.X).toBe('Cnt X');
      expect(result?.display.Y).toBe('5');
    });
  });
});

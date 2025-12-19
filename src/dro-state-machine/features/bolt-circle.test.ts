/**
 * Tests for Bolt Circle (PCD) Feature Reducer
 */

import { describe, it, expect } from 'vitest';
import { boltCircleReducer } from './bolt-circle';
import { INITIAL_BOLT_CIRCLE_DATA } from '../droStateMachine';
import { DEFAULT_TEST_CONTEXT } from '../test-utils';
import type { DROStatePayload } from '../types';
import { INITIAL_VOLATILE_MEMORY_STATE } from '../../types/volatileMemory';

describe('boltCircleReducer', () => {
  describe('entering PCD mode from idle', () => {
    it('should transition to pcd-menu-select when BTN_PCD is pressed in ABS mode', () => {
      const state: DROStatePayload = {
        stateName: 'idle',
        stateData: { stateDataType: 'none' },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'abs' },
      };

      const result = boltCircleReducer(state, { eventName: 'BTN_PCD' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('pcd-menu-select');
      expect(result?.stateData.stateDataType).toBe('bolt-circle');
      if (result?.stateData.stateDataType === 'bolt-circle') {
        expect(result.stateData.pcdMode).toBe('CIRCLE');
      }
    });

    it('should not transition when BTN_PCD is pressed in INC mode', () => {
      const state: DROStatePayload = {
        stateName: 'idle',
        stateData: { stateDataType: 'none' },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'inc' },
      };

      const result = boltCircleReducer(state, { eventName: 'BTN_PCD' }, DEFAULT_TEST_CONTEXT);

      expect(result).toBeNull();
    });

    it('should return null for non-idle states', () => {
      const state: DROStatePayload = {
        stateName: 'calculator-idle',
        stateData: { stateDataType: 'calculator', firstValue: null, operation: null, currentValue: 0 },
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
      };

      const result = boltCircleReducer(state, { eventName: 'BTN_PCD' }, DEFAULT_TEST_CONTEXT);

      expect(result).toBeNull();
    });
  });

  describe('pcd-menu-select state', () => {
    it('should toggle from CIRCLE to ARC with KEY_6_RIGHT', () => {
      const state: DROStatePayload = {
        stateName: 'pcd-menu-select',
        stateData: INITIAL_BOLT_CIRCLE_DATA,
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
      };

      const result = boltCircleReducer(state, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('pcd-menu-select');
      if (result?.stateData.stateDataType === 'bolt-circle') {
        expect(result.stateData.pcdMode).toBe('ARC');
      }
    });

    it('should toggle from ARC to CIRCLE with KEY_6_RIGHT', () => {
      const state: DROStatePayload = {
        stateName: 'pcd-menu-select',
        stateData: { ...INITIAL_BOLT_CIRCLE_DATA, pcdMode: 'ARC' },
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
      };

      const result = boltCircleReducer(state, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      if (result?.stateData.stateDataType === 'bolt-circle') {
        expect(result.stateData.pcdMode).toBe('CIRCLE');
      }
    });

    it('should transition to center-x entry when CIRCLE mode is confirmed', () => {
      const state: DROStatePayload = {
        stateName: 'pcd-menu-select',
        stateData: INITIAL_BOLT_CIRCLE_DATA,
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
      };

      const result = boltCircleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('pcd-circle-center-x');
      expect(result?.vMem.inputBuffer).toBe('');
    });

    it('should exit to idle when ARC mode is selected (not implemented)', () => {
      const state: DROStatePayload = {
        stateName: 'pcd-menu-select',
        stateData: { ...INITIAL_BOLT_CIRCLE_DATA, pcdMode: 'ARC' },
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
      };

      const result = boltCircleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('idle');
    });
  });

  describe('parameter entry states', () => {
    it('should accept center X coordinate', () => {
      const state: DROStatePayload = {
        stateName: 'pcd-circle-center-x',
        stateData: INITIAL_BOLT_CIRCLE_DATA,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '1.75' },
      };

      const result = boltCircleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('pcd-circle-center-y');
      if (result?.stateData.stateDataType === 'bolt-circle') {
        expect(result.stateData.centerX).toBe(1.75);
      }
      expect(result?.vMem.inputBuffer).toBe('');
    });

    it('should accept center Y coordinate', () => {
      const state: DROStatePayload = {
        stateName: 'pcd-circle-center-y',
        stateData: { ...INITIAL_BOLT_CIRCLE_DATA, centerX: 1.75 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '1.25' },
      };

      const result = boltCircleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('pcd-circle-radius');
      if (result?.stateData.stateDataType === 'bolt-circle') {
        expect(result.stateData.centerY).toBe(1.25);
      }
    });

    it('should accept radius value', () => {
      const state: DROStatePayload = {
        stateName: 'pcd-circle-radius',
        stateData: { ...INITIAL_BOLT_CIRCLE_DATA, centerX: 1.75, centerY: 1.25 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '0.95' },
      };

      const result = boltCircleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('pcd-circle-angle');
      if (result?.stateData.stateDataType === 'bolt-circle') {
        expect(result.stateData.radius).toBe(0.95);
      }
    });

    it('should reject zero or negative radius', () => {
      const state: DROStatePayload = {
        stateName: 'pcd-circle-radius',
        stateData: { ...INITIAL_BOLT_CIRCLE_DATA, centerX: 1.75, centerY: 1.25 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '0' },
      };

      const result = boltCircleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result).toBeNull();
    });

    it('should accept starting angle', () => {
      const state: DROStatePayload = {
        stateName: 'pcd-circle-angle',
        stateData: {
          ...INITIAL_BOLT_CIRCLE_DATA,
          centerX: 1.75,
          centerY: 1.25,
          radius: 0.95,
        },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '20' },
      };

      const result = boltCircleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('pcd-circle-holes');
      if (result?.stateData.stateDataType === 'bolt-circle') {
        expect(result.stateData.startAngle).toBe(20);
      }
    });

    it('should normalize angle to 0-359 range', () => {
      const state: DROStatePayload = {
        stateName: 'pcd-circle-angle',
        stateData: {
          ...INITIAL_BOLT_CIRCLE_DATA,
          centerX: 1.75,
          centerY: 1.25,
          radius: 0.95,
        },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '400' },
      };

      const result = boltCircleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      if (result?.stateData.stateDataType === 'bolt-circle') {
        expect(result.stateData.startAngle).toBe(40); // 400 % 360 = 40
      }
    });

    it('should accept hole count and switch to INC mode', () => {
      const state: DROStatePayload = {
        stateName: 'pcd-circle-holes',
        stateData: {
          ...INITIAL_BOLT_CIRCLE_DATA,
          centerX: 1.75,
          centerY: 1.25,
          radius: 0.95,
          startAngle: 20,
        },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '6', mode: 'abs' },
      };

      const result = boltCircleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('pcd-circle-navigate');
      expect(result?.vMem.mode).toBe('inc'); // Should switch to INC mode
      if (result?.stateData.stateDataType === 'bolt-circle') {
        expect(result.stateData.holeCount).toBe(6);
        expect(result.stateData.currentHole).toBe(1);
      }
    });

    it('should reject hole count less than 2', () => {
      const state: DROStatePayload = {
        stateName: 'pcd-circle-holes',
        stateData: {
          ...INITIAL_BOLT_CIRCLE_DATA,
          centerX: 1.75,
          centerY: 1.25,
          radius: 0.95,
          startAngle: 20,
        },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '1' },
      };

      const result = boltCircleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result).toBeNull();
    });

    it('should reject hole count greater than 999', () => {
      const state: DROStatePayload = {
        stateName: 'pcd-circle-holes',
        stateData: {
          ...INITIAL_BOLT_CIRCLE_DATA,
          centerX: 1.75,
          centerY: 1.25,
          radius: 0.95,
          startAngle: 20,
        },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '1000' },
      };

      const result = boltCircleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result).toBeNull();
    });

    it('should floor fractional hole count values', () => {
      const state: DROStatePayload = {
        stateName: 'pcd-circle-holes',
        stateData: {
          ...INITIAL_BOLT_CIRCLE_DATA,
          centerX: 1.75,
          centerY: 1.25,
          radius: 0.95,
          startAngle: 20,
        },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '6.8' },
      };

      const result = boltCircleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      if (result?.stateData.stateDataType === 'bolt-circle') {
        expect(result.stateData.holeCount).toBe(6);
      }
    });
  });

  describe('hole navigation', () => {
    const navigateState: DROStatePayload = {
      stateName: 'pcd-circle-navigate',
      stateData: {
        ...INITIAL_BOLT_CIRCLE_DATA,
        centerX: 1.75,
        centerY: 1.25,
        radius: 0.95,
        startAngle: 0,
        holeCount: 6,
        currentHole: 1,
      },
      vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'inc' },
    };

    it('should advance to next hole with KEY_6_RIGHT', () => {
      const result = boltCircleReducer(navigateState, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('pcd-circle-navigate');
      if (result?.stateData.stateDataType === 'bolt-circle') {
        expect(result.stateData.currentHole).toBe(2);
      }
    });

    it('should wrap to hole 1 when advancing from last hole', () => {
      const lastHoleState: DROStatePayload = {
        ...navigateState,
        stateData: {
          ...navigateState.stateData,
          currentHole: 6,
        } as any,
      };

      const result = boltCircleReducer(lastHoleState, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      if (result?.stateData.stateDataType === 'bolt-circle') {
        expect(result.stateData.currentHole).toBe(1);
      }
    });

    it('should go to previous hole with KEY_4_LEFT', () => {
      const hole2State: DROStatePayload = {
        ...navigateState,
        stateData: {
          ...navigateState.stateData,
          currentHole: 2,
        } as any,
      };

      const result = boltCircleReducer(hole2State, { eventName: 'KEY_4_LEFT' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      if (result?.stateData.stateDataType === 'bolt-circle') {
        expect(result.stateData.currentHole).toBe(1);
      }
    });

    it('should wrap to last hole when going back from hole 1', () => {
      const result = boltCircleReducer(navigateState, { eventName: 'KEY_4_LEFT' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      if (result?.stateData.stateDataType === 'bolt-circle') {
        expect(result.stateData.currentHole).toBe(6);
      }
    });

    it('should stay on current hole with KEY_8_UP (show current)', () => {
      const result = boltCircleReducer(navigateState, { eventName: 'KEY_8_UP' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('pcd-circle-navigate');
      if (result?.stateData.stateDataType === 'bolt-circle') {
        expect(result.stateData.currentHole).toBe(1);
      }
    });

    it('should clear input buffer with KEY_2_DOWN (prepare for jump)', () => {
      const result = boltCircleReducer(navigateState, { eventName: 'KEY_2_DOWN' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.vMem.inputBuffer).toBe('');
    });

    it('should jump to specific hole with buffered number and ENTER', () => {
      const jumpState: DROStatePayload = {
        ...navigateState,
        vMem: { ...navigateState.vMem, inputBuffer: '4' },
      };

      const result = boltCircleReducer(jumpState, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      if (result?.stateData.stateDataType === 'bolt-circle') {
        expect(result.stateData.currentHole).toBe(4);
      }
      expect(result?.vMem.inputBuffer).toBe('');
    });

    it('should reject jump to hole number less than 1', () => {
      const jumpState: DROStatePayload = {
        ...navigateState,
        vMem: { ...navigateState.vMem, inputBuffer: '0' },
      };

      const result = boltCircleReducer(jumpState, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result).toBeNull();
    });

    it('should reject jump to hole number greater than hole count', () => {
      const jumpState: DROStatePayload = {
        ...navigateState,
        vMem: { ...navigateState.vMem, inputBuffer: '7' },
      };

      const result = boltCircleReducer(jumpState, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result).toBeNull();
    });

    it('should floor fractional hole numbers when jumping', () => {
      const jumpState: DROStatePayload = {
        ...navigateState,
        vMem: { ...navigateState.vMem, inputBuffer: '4.7' },
      };

      const result = boltCircleReducer(jumpState, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      if (result?.stateData.stateDataType === 'bolt-circle') {
        expect(result.stateData.currentHole).toBe(4);
      }
    });
  });

  describe('exiting PCD mode', () => {
    it('should exit to idle with KEY_CLEAR from menu select', () => {
      const state: DROStatePayload = {
        stateName: 'pcd-menu-select',
        stateData: INITIAL_BOLT_CIRCLE_DATA,
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
      };

      const result = boltCircleReducer(state, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('idle');
      expect(result?.stateData.stateDataType).toBe('none');
    });

    it('should exit to idle with KEY_CLEAR from any parameter entry state', () => {
      const state: DROStatePayload = {
        stateName: 'pcd-circle-radius',
        stateData: { ...INITIAL_BOLT_CIRCLE_DATA, centerX: 1.75, centerY: 1.25 },
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
      };

      const result = boltCircleReducer(state, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('idle');
    });

    it('should exit to idle with KEY_CLEAR from navigate state', () => {
      const state: DROStatePayload = {
        stateName: 'pcd-circle-navigate',
        stateData: {
          ...INITIAL_BOLT_CIRCLE_DATA,
          centerX: 1.75,
          centerY: 1.25,
          radius: 0.95,
          startAngle: 0,
          holeCount: 6,
          currentHole: 3,
        },
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
      };

      const result = boltCircleReducer(state, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('idle');
    });
  });

  describe('invalid states', () => {
    it('should handle navigation state with missing parameters', () => {
      const invalidState: DROStatePayload = {
        stateName: 'pcd-circle-navigate',
        stateData: INITIAL_BOLT_CIRCLE_DATA, // Has null values
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
      };

      const result = boltCircleReducer(invalidState, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('idle');
    });
  });
});

/**
 * Axis Operations Feature Reducer Tests
 *
 * Tests for axis selection, zeroing, and value entry operations.
 */

import { describe, it, expect } from 'vitest';
import { axisOperationsReducer } from './axis-operations';
import type { DROStatePayload, DROReducerContext } from '../types';
import { INITIAL_DRO_STATE_DATA } from '../droStateMachine';
import { createTestState, DEFAULT_TEST_CONTEXT } from '../test-utils';
import { INITIAL_VOLATILE_MEMORY_STATE } from '../../../types/volatileMemory';
import { INITIAL_DISPLAY_STATE } from '../utils/displayComputation';
import { DEFAULT_NON_VOLATILE_MEMORY } from '../../../types/nonVolatileMemory';

/** Helper to create idle state with specific vMem */
function idleStateWithVMem(vMemOverrides: Partial<typeof INITIAL_VOLATILE_MEMORY_STATE>): DROStatePayload {
  return {
    stateName: 'idle',
    stateData: INITIAL_DRO_STATE_DATA,
    vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, ...vMemOverrides },
    display: INITIAL_DISPLAY_STATE,
  };
}

/** Create context with connected mill at specific position */
function connectedContext(position: { x: number; y: number; z: number }): DROReducerContext {
  return {
    millState: {
      position,
      probe: { pinState: '', triggered: false },
      connected: true,
      controllerType: 'cncjs',
    },
    nvMem: DEFAULT_NON_VOLATILE_MEMORY,
  };
}

describe('axisOperationsReducer', () => {
  describe('state handling', () => {
    it('should return null for non-idle states', () => {
      const nonIdleStates = ['boot', 'boot-show-message', 'calculator-idle', 'function-menu-center'] as const;

      for (const stateName of nonIdleStates) {
        const state = createTestState(stateName);
        const result = axisOperationsReducer(state, { eventName: 'BTN_SELECT_X' }, DEFAULT_TEST_CONTEXT);
        expect(result).toBeNull();
      }
    });
  });

  describe('axis selection', () => {
    it('should select X axis on BTN_SELECT_X', () => {
      const state = createTestState('idle');
      const result = axisOperationsReducer(state, { eventName: 'BTN_SELECT_X' }, DEFAULT_TEST_CONTEXT);

      expect(result?.vMem.activeAxis).toBe('X');
      expect(result?.vMem.inputBuffer).toBe('');
    });

    it('should select Y axis on BTN_SELECT_Y', () => {
      const state = createTestState('idle');
      const result = axisOperationsReducer(state, { eventName: 'BTN_SELECT_Y' }, DEFAULT_TEST_CONTEXT);

      expect(result?.vMem.activeAxis).toBe('Y');
      expect(result?.vMem.inputBuffer).toBe('');
    });

    it('should select Z axis on BTN_SELECT_Z', () => {
      const state = createTestState('idle');
      const result = axisOperationsReducer(state, { eventName: 'BTN_SELECT_Z' }, DEFAULT_TEST_CONTEXT);

      expect(result?.vMem.activeAxis).toBe('Z');
      expect(result?.vMem.inputBuffer).toBe('');
    });

    it('should clear input buffer when selecting axis', () => {
      const state = idleStateWithVMem({ inputBuffer: '123', activeAxis: 'Y' });
      const result = axisOperationsReducer(state, { eventName: 'BTN_SELECT_X' }, DEFAULT_TEST_CONTEXT);

      expect(result?.vMem.activeAxis).toBe('X');
      expect(result?.vMem.inputBuffer).toBe('');
    });
  });

  describe('zero single axis - manual mode (abs)', () => {
    it('should zero X axis in abs mode (manual)', () => {
      const state = idleStateWithVMem({
        mode: 'abs',
        manualAbsoluteValues: { X: 100, Y: 50, Z: 25 },
      });
      const result = axisOperationsReducer(state, { eventName: 'BTN_ZERO_X' }, DEFAULT_TEST_CONTEXT);

      expect(result?.vMem.manualAbsoluteValues.X).toBe(0);
      expect(result?.vMem.manualAbsoluteValues.Y).toBe(50);
      expect(result?.vMem.manualAbsoluteValues.Z).toBe(25);
      expect(result?.vMem.activeAxis).toBeNull();
    });

    it('should zero Y axis in abs mode (manual)', () => {
      const state = idleStateWithVMem({
        mode: 'abs',
        manualAbsoluteValues: { X: 100, Y: 50, Z: 25 },
      });
      const result = axisOperationsReducer(state, { eventName: 'BTN_ZERO_Y' }, DEFAULT_TEST_CONTEXT);

      expect(result?.vMem.manualAbsoluteValues.X).toBe(100);
      expect(result?.vMem.manualAbsoluteValues.Y).toBe(0);
      expect(result?.vMem.manualAbsoluteValues.Z).toBe(25);
    });

    it('should zero Z axis in abs mode (manual)', () => {
      const state = idleStateWithVMem({
        mode: 'abs',
        manualAbsoluteValues: { X: 100, Y: 50, Z: 25 },
      });
      const result = axisOperationsReducer(state, { eventName: 'BTN_ZERO_Z' }, DEFAULT_TEST_CONTEXT);

      expect(result?.vMem.manualAbsoluteValues.X).toBe(100);
      expect(result?.vMem.manualAbsoluteValues.Y).toBe(50);
      expect(result?.vMem.manualAbsoluteValues.Z).toBe(0);
    });
  });

  describe('zero single axis - connected mode (abs)', () => {
    it('should set work offset to machine position when zeroing X in connected mode', () => {
      const state = idleStateWithVMem({
        mode: 'abs',
        workOffsets: { X: 0, Y: 0, Z: 0 },
      });
      const context = connectedContext({ x: 150, y: 75, z: 30 });
      const result = axisOperationsReducer(state, { eventName: 'BTN_ZERO_X' }, context);

      expect(result?.vMem.workOffsets.X).toBe(150);
      expect(result?.vMem.workOffsets.Y).toBe(0);
      expect(result?.vMem.workOffsets.Z).toBe(0);
    });

    it('should set work offset to machine position when zeroing Y in connected mode', () => {
      const state = idleStateWithVMem({
        mode: 'abs',
        workOffsets: { X: 10, Y: 20, Z: 30 },
      });
      const context = connectedContext({ x: 150, y: 75, z: 30 });
      const result = axisOperationsReducer(state, { eventName: 'BTN_ZERO_Y' }, context);

      expect(result?.vMem.workOffsets.X).toBe(10);
      expect(result?.vMem.workOffsets.Y).toBe(75);
      expect(result?.vMem.workOffsets.Z).toBe(30);
    });

    it('should set work offset to machine position when zeroing Z in connected mode', () => {
      const state = idleStateWithVMem({
        mode: 'abs',
        workOffsets: { X: 0, Y: 0, Z: 0 },
      });
      const context = connectedContext({ x: 100, y: 200, z: 300 });
      const result = axisOperationsReducer(state, { eventName: 'BTN_ZERO_Z' }, context);

      expect(result?.vMem.workOffsets.Z).toBe(300);
    });
  });

  describe('zero single axis - inc mode', () => {
    it('should zero X incremental value in inc mode', () => {
      const state = idleStateWithVMem({
        mode: 'inc',
        incrementalValues: { X: 100, Y: 50, Z: 25 },
      });
      const result = axisOperationsReducer(state, { eventName: 'BTN_ZERO_X' }, DEFAULT_TEST_CONTEXT);

      expect(result?.vMem.incrementalValues.X).toBe(0);
      expect(result?.vMem.incrementalValues.Y).toBe(50);
      expect(result?.vMem.incrementalValues.Z).toBe(25);
    });

    it('should zero Y incremental value in inc mode', () => {
      const state = idleStateWithVMem({
        mode: 'inc',
        incrementalValues: { X: 100, Y: 50, Z: 25 },
      });
      const result = axisOperationsReducer(state, { eventName: 'BTN_ZERO_Y' }, DEFAULT_TEST_CONTEXT);

      expect(result?.vMem.incrementalValues.Y).toBe(0);
    });

    it('should zero Z incremental value in inc mode', () => {
      const state = idleStateWithVMem({
        mode: 'inc',
        incrementalValues: { X: 100, Y: 50, Z: 25 },
      });
      const result = axisOperationsReducer(state, { eventName: 'BTN_ZERO_Z' }, DEFAULT_TEST_CONTEXT);

      expect(result?.vMem.incrementalValues.Z).toBe(0);
    });
  });

  describe('zero all axes - manual mode (abs)', () => {
    it('should zero all manual absolute values in abs mode', () => {
      const state = idleStateWithVMem({
        mode: 'abs',
        manualAbsoluteValues: { X: 100, Y: 200, Z: 300 },
      });
      const result = axisOperationsReducer(state, { eventName: 'BTN_ZERO_ALL' }, DEFAULT_TEST_CONTEXT);

      expect(result?.vMem.manualAbsoluteValues).toEqual({ X: 0, Y: 0, Z: 0 });
      expect(result?.vMem.activeAxis).toBeNull();
      expect(result?.vMem.inputBuffer).toBe('');
    });
  });

  describe('zero all axes - connected mode (abs)', () => {
    it('should set all work offsets to machine positions in connected mode', () => {
      const state = idleStateWithVMem({
        mode: 'abs',
        workOffsets: { X: 0, Y: 0, Z: 0 },
      });
      const context = connectedContext({ x: 100, y: 200, z: 300 });
      const result = axisOperationsReducer(state, { eventName: 'BTN_ZERO_ALL' }, context);

      expect(result?.vMem.workOffsets).toEqual({ X: 100, Y: 200, Z: 300 });
    });
  });

  describe('zero all axes - inc mode', () => {
    it('should zero all incremental values in inc mode', () => {
      const state = idleStateWithVMem({
        mode: 'inc',
        incrementalValues: { X: 100, Y: 200, Z: 300 },
      });
      const result = axisOperationsReducer(state, { eventName: 'BTN_ZERO_ALL' }, DEFAULT_TEST_CONTEXT);

      expect(result?.vMem.incrementalValues).toEqual({ X: 0, Y: 0, Z: 0 });
    });
  });

  describe('KEY_ENTER value entry - manual mode (abs)', () => {
    it('should set axis value from input buffer', () => {
      const state = idleStateWithVMem({
        mode: 'abs',
        activeAxis: 'X',
        inputBuffer: '50',
        manualAbsoluteValues: { X: 0, Y: 0, Z: 0 },
      });
      const result = axisOperationsReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      // Value is converted from display unit (inch by default) to mm
      // 50 inches = 1270 mm
      expect(result?.vMem.manualAbsoluteValues.X).toBeCloseTo(1270, 1);
      expect(result?.vMem.inputBuffer).toBe('');
    });

    it('should set axis value in mm mode', () => {
      const state = idleStateWithVMem({
        mode: 'abs',
        activeAxis: 'Y',
        inputBuffer: '25.4',
        manualAbsoluteValues: { X: 0, Y: 0, Z: 0 },
      });
      const context: DROReducerContext = {
        ...DEFAULT_TEST_CONTEXT,
        nvMem: { ...DEFAULT_NON_VOLATILE_MEMORY, defaultUnit: 'mm' },
      };
      const result = axisOperationsReducer(state, { eventName: 'KEY_ENTER' }, context);

      expect(result?.vMem.manualAbsoluteValues.Y).toBeCloseTo(25.4, 1);
    });

    it('should return null if no active axis', () => {
      const state = idleStateWithVMem({
        activeAxis: null,
        inputBuffer: '50',
      });
      const result = axisOperationsReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result).toBeNull();
    });

    it('should return null if input buffer is empty', () => {
      const state = idleStateWithVMem({
        activeAxis: 'X',
        inputBuffer: '',
      });
      const result = axisOperationsReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result).toBeNull();
    });

    it('should handle negative values', () => {
      const state = idleStateWithVMem({
        mode: 'abs',
        activeAxis: 'Z',
        inputBuffer: '-10',
        manualAbsoluteValues: { X: 0, Y: 0, Z: 0 },
      });
      const context: DROReducerContext = {
        ...DEFAULT_TEST_CONTEXT,
        nvMem: { ...DEFAULT_NON_VOLATILE_MEMORY, defaultUnit: 'mm' },
      };
      const result = axisOperationsReducer(state, { eventName: 'KEY_ENTER' }, context);

      expect(result?.vMem.manualAbsoluteValues.Z).toBeCloseTo(-10, 1);
    });
  });

  describe('KEY_ENTER value entry - connected mode (abs)', () => {
    it('should adjust work offset to show desired value in connected mode', () => {
      // Machine is at x=100, we want to display 25
      // So offset should be 100 - 25 = 75
      const state = idleStateWithVMem({
        mode: 'abs',
        activeAxis: 'X',
        inputBuffer: '25',
        workOffsets: { X: 0, Y: 0, Z: 0 },
      });
      const context: DROReducerContext = {
        millState: {
          position: { x: 100, y: 0, z: 0 },
          probe: { pinState: '', triggered: false },
          connected: true,
          controllerType: 'cncjs',
        },
        nvMem: { ...DEFAULT_NON_VOLATILE_MEMORY, defaultUnit: 'mm' },
      };
      const result = axisOperationsReducer(state, { eventName: 'KEY_ENTER' }, context);

      // offset = machinePos - desiredValue = 100 - 25 = 75
      expect(result?.vMem.workOffsets.X).toBeCloseTo(75, 1);
      expect(result?.vMem.inputBuffer).toBe('');
    });

    it('should handle setting value on Y axis in connected mode', () => {
      const state = idleStateWithVMem({
        mode: 'abs',
        activeAxis: 'Y',
        inputBuffer: '50',
        workOffsets: { X: 0, Y: 0, Z: 0 },
      });
      const context: DROReducerContext = {
        millState: {
          position: { x: 0, y: 200, z: 0 },
          probe: { pinState: '', triggered: false },
          connected: true,
          controllerType: 'cncjs',
        },
        nvMem: { ...DEFAULT_NON_VOLATILE_MEMORY, defaultUnit: 'mm' },
      };
      const result = axisOperationsReducer(state, { eventName: 'KEY_ENTER' }, context);

      // offset = 200 - 50 = 150
      expect(result?.vMem.workOffsets.Y).toBeCloseTo(150, 1);
    });

    it('should handle setting value on Z axis in connected mode', () => {
      const state = idleStateWithVMem({
        mode: 'abs',
        activeAxis: 'Z',
        inputBuffer: '-5',
        workOffsets: { X: 0, Y: 0, Z: 0 },
      });
      const context: DROReducerContext = {
        millState: {
          position: { x: 0, y: 0, z: 10 },
          probe: { pinState: '', triggered: false },
          connected: true,
          controllerType: 'cncjs',
        },
        nvMem: { ...DEFAULT_NON_VOLATILE_MEMORY, defaultUnit: 'mm' },
      };
      const result = axisOperationsReducer(state, { eventName: 'KEY_ENTER' }, context);

      // offset = 10 - (-5) = 15
      expect(result?.vMem.workOffsets.Z).toBeCloseTo(15, 1);
    });
  });

  describe('KEY_ENTER value entry - inc mode', () => {
    it('should set incremental value from input buffer', () => {
      const state = idleStateWithVMem({
        mode: 'inc',
        activeAxis: 'X',
        inputBuffer: '100',
        incrementalValues: { X: 0, Y: 0, Z: 0 },
      });
      const context: DROReducerContext = {
        ...DEFAULT_TEST_CONTEXT,
        nvMem: { ...DEFAULT_NON_VOLATILE_MEMORY, defaultUnit: 'mm' },
      };
      const result = axisOperationsReducer(state, { eventName: 'KEY_ENTER' }, context);

      expect(result?.vMem.incrementalValues.X).toBeCloseTo(100, 1);
    });
  });

  describe('display computation', () => {
    it('should compute display after zeroing axis', () => {
      const state = idleStateWithVMem({
        mode: 'abs',
        manualAbsoluteValues: { X: 100, Y: 200, Z: 300 },
      });
      const result = axisOperationsReducer(state, { eventName: 'BTN_ZERO_X' }, DEFAULT_TEST_CONTEXT);

      expect(result?.display).toBeDefined();
      // X should be 0 after zeroing
      expect(result?.display.X).toBe(0);
    });

    it('should compute display after zeroing all axes', () => {
      const state = idleStateWithVMem({
        mode: 'abs',
        manualAbsoluteValues: { X: 100, Y: 200, Z: 300 },
      });
      const result = axisOperationsReducer(state, { eventName: 'BTN_ZERO_ALL' }, DEFAULT_TEST_CONTEXT);

      expect(result?.display).toBeDefined();
      expect(result?.display.X).toBe(0);
      expect(result?.display.Y).toBe(0);
      expect(result?.display.Z).toBe(0);
    });

    it('should compute display after entering value', () => {
      const state = idleStateWithVMem({
        mode: 'abs',
        activeAxis: 'X',
        inputBuffer: '25.4',
        manualAbsoluteValues: { X: 0, Y: 0, Z: 0 },
      });
      const context: DROReducerContext = {
        ...DEFAULT_TEST_CONTEXT,
        nvMem: { ...DEFAULT_NON_VOLATILE_MEMORY, defaultUnit: 'mm' },
      };
      const result = axisOperationsReducer(state, { eventName: 'KEY_ENTER' }, context);

      expect(result?.display).toBeDefined();
      expect(result?.display.X).toBeCloseTo(25.4, 1);
    });
  });

  describe('unhandled events', () => {
    it('should return null for unhandled events', () => {
      const state = createTestState('idle');

      expect(axisOperationsReducer(state, { eventName: 'BTN_FUNCTION' }, DEFAULT_TEST_CONTEXT)).toBeNull();
      expect(axisOperationsReducer(state, { eventName: 'BTN_CALCULATOR' }, DEFAULT_TEST_CONTEXT)).toBeNull();
      expect(axisOperationsReducer(state, { eventName: 'KEY_5' }, DEFAULT_TEST_CONTEXT)).toBeNull();
    });
  });
});

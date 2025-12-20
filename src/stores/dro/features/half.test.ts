/**
 * Half Feature Reducer Tests
 *
 * Tests for the half function that divides the active axis value by 2.
 */

import { describe, it, expect } from 'vitest';
import { halfReducer } from './half';
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

describe('halfReducer', () => {
  describe('state handling', () => {
    it('should return null for non-idle states', () => {
      const nonIdleStates = ['boot', 'boot-show-message', 'calculator-idle', 'function-menu-center'] as const;

      for (const stateName of nonIdleStates) {
        const state = createTestState(stateName);
        const result = halfReducer(state, { eventName: 'BTN_HALF' }, DEFAULT_TEST_CONTEXT);
        expect(result).toBeNull();
      }
    });

    it('should return null for non-BTN_HALF events', () => {
      const state = idleStateWithVMem({ activeAxis: 'X' });

      expect(halfReducer(state, { eventName: 'KEY_5' }, DEFAULT_TEST_CONTEXT)).toBeNull();
      expect(halfReducer(state, { eventName: 'BTN_ZERO_X' }, DEFAULT_TEST_CONTEXT)).toBeNull();
      expect(halfReducer(state, { eventName: 'BTN_FUNCTION' }, DEFAULT_TEST_CONTEXT)).toBeNull();
    });
  });

  describe('no active axis', () => {
    it('should return current state if no axis is selected', () => {
      const state = idleStateWithVMem({
        activeAxis: null,
        manualAbsoluteValues: { X: 100, Y: 200, Z: 300 },
      });
      const result = halfReducer(state, { eventName: 'BTN_HALF' }, DEFAULT_TEST_CONTEXT);

      expect(result).toBe(state);
    });
  });

  describe('half in abs mode - manual (disconnected)', () => {
    it('should halve X axis value', () => {
      const state = idleStateWithVMem({
        mode: 'abs',
        activeAxis: 'X',
        manualAbsoluteValues: { X: 100, Y: 200, Z: 300 },
      });
      const result = halfReducer(state, { eventName: 'BTN_HALF' }, DEFAULT_TEST_CONTEXT);

      expect(result?.vMem.manualAbsoluteValues.X).toBe(50);
      expect(result?.vMem.manualAbsoluteValues.Y).toBe(200);
      expect(result?.vMem.manualAbsoluteValues.Z).toBe(300);
    });

    it('should halve Y axis value', () => {
      const state = idleStateWithVMem({
        mode: 'abs',
        activeAxis: 'Y',
        manualAbsoluteValues: { X: 100, Y: 200, Z: 300 },
      });
      const result = halfReducer(state, { eventName: 'BTN_HALF' }, DEFAULT_TEST_CONTEXT);

      expect(result?.vMem.manualAbsoluteValues.Y).toBe(100);
    });

    it('should halve Z axis value', () => {
      const state = idleStateWithVMem({
        mode: 'abs',
        activeAxis: 'Z',
        manualAbsoluteValues: { X: 100, Y: 200, Z: 300 },
      });
      const result = halfReducer(state, { eventName: 'BTN_HALF' }, DEFAULT_TEST_CONTEXT);

      expect(result?.vMem.manualAbsoluteValues.Z).toBe(150);
    });

    it('should handle negative values', () => {
      const state = idleStateWithVMem({
        mode: 'abs',
        activeAxis: 'X',
        manualAbsoluteValues: { X: -100, Y: 0, Z: 0 },
      });
      const result = halfReducer(state, { eventName: 'BTN_HALF' }, DEFAULT_TEST_CONTEXT);

      expect(result?.vMem.manualAbsoluteValues.X).toBe(-50);
    });

    it('should handle zero values', () => {
      const state = idleStateWithVMem({
        mode: 'abs',
        activeAxis: 'X',
        manualAbsoluteValues: { X: 0, Y: 0, Z: 0 },
      });
      const result = halfReducer(state, { eventName: 'BTN_HALF' }, DEFAULT_TEST_CONTEXT);

      expect(result?.vMem.manualAbsoluteValues.X).toBe(0);
    });

    it('should handle fractional results', () => {
      const state = idleStateWithVMem({
        mode: 'abs',
        activeAxis: 'X',
        manualAbsoluteValues: { X: 25, Y: 0, Z: 0 },
      });
      const result = halfReducer(state, { eventName: 'BTN_HALF' }, DEFAULT_TEST_CONTEXT);

      expect(result?.vMem.manualAbsoluteValues.X).toBe(12.5);
    });
  });

  describe('half in abs mode - connected', () => {
    it('should adjust work offset to show half the current display value', () => {
      // Machine at x=100, work offset=0, so display shows 100
      // Half of 100 is 50, so new offset = machinePos - halfValue = 100 - 50 = 50
      const state = idleStateWithVMem({
        mode: 'abs',
        activeAxis: 'X',
        workOffsets: { X: 0, Y: 0, Z: 0 },
      });
      const context = connectedContext({ x: 100, y: 0, z: 0 });
      const result = halfReducer(state, { eventName: 'BTN_HALF' }, context);

      expect(result?.vMem.workOffsets.X).toBe(50);
    });

    it('should handle Y axis in connected mode', () => {
      const state = idleStateWithVMem({
        mode: 'abs',
        activeAxis: 'Y',
        workOffsets: { X: 0, Y: 0, Z: 0 },
      });
      const context = connectedContext({ x: 0, y: 200, z: 0 });
      const result = halfReducer(state, { eventName: 'BTN_HALF' }, context);

      // Display is 200, half is 100, offset = 200 - 100 = 100
      expect(result?.vMem.workOffsets.Y).toBe(100);
    });

    it('should handle Z axis in connected mode', () => {
      const state = idleStateWithVMem({
        mode: 'abs',
        activeAxis: 'Z',
        workOffsets: { X: 0, Y: 0, Z: 0 },
      });
      const context = connectedContext({ x: 0, y: 0, z: 50 });
      const result = halfReducer(state, { eventName: 'BTN_HALF' }, context);

      expect(result?.vMem.workOffsets.Z).toBe(25);
    });

    it('should handle existing work offset', () => {
      // Machine at x=100, offset=20, display shows 100-20=80
      // Half of 80 is 40, new offset = 100 - 40 = 60
      const state = idleStateWithVMem({
        mode: 'abs',
        activeAxis: 'X',
        workOffsets: { X: 20, Y: 0, Z: 0 },
      });
      const context = connectedContext({ x: 100, y: 0, z: 0 });
      const result = halfReducer(state, { eventName: 'BTN_HALF' }, context);

      expect(result?.vMem.workOffsets.X).toBe(60);
    });

    it('should handle negative display values in connected mode', () => {
      // Machine at x=-100, offset=0, display shows -100
      // Half of -100 is -50, new offset = -100 - (-50) = -50
      const state = idleStateWithVMem({
        mode: 'abs',
        activeAxis: 'X',
        workOffsets: { X: 0, Y: 0, Z: 0 },
      });
      const context = connectedContext({ x: -100, y: 0, z: 0 });
      const result = halfReducer(state, { eventName: 'BTN_HALF' }, context);

      expect(result?.vMem.workOffsets.X).toBe(-50);
    });
  });

  describe('half in inc mode', () => {
    it('should halve X incremental value', () => {
      const state = idleStateWithVMem({
        mode: 'inc',
        activeAxis: 'X',
        incrementalValues: { X: 100, Y: 200, Z: 300 },
      });
      const result = halfReducer(state, { eventName: 'BTN_HALF' }, DEFAULT_TEST_CONTEXT);

      expect(result?.vMem.incrementalValues.X).toBe(50);
      expect(result?.vMem.incrementalValues.Y).toBe(200);
      expect(result?.vMem.incrementalValues.Z).toBe(300);
    });

    it('should halve Y incremental value', () => {
      const state = idleStateWithVMem({
        mode: 'inc',
        activeAxis: 'Y',
        incrementalValues: { X: 100, Y: 200, Z: 300 },
      });
      const result = halfReducer(state, { eventName: 'BTN_HALF' }, DEFAULT_TEST_CONTEXT);

      expect(result?.vMem.incrementalValues.Y).toBe(100);
    });

    it('should halve Z incremental value', () => {
      const state = idleStateWithVMem({
        mode: 'inc',
        activeAxis: 'Z',
        incrementalValues: { X: 100, Y: 200, Z: 300 },
      });
      const result = halfReducer(state, { eventName: 'BTN_HALF' }, DEFAULT_TEST_CONTEXT);

      expect(result?.vMem.incrementalValues.Z).toBe(150);
    });

    it('should handle negative incremental values', () => {
      const state = idleStateWithVMem({
        mode: 'inc',
        activeAxis: 'X',
        incrementalValues: { X: -80, Y: 0, Z: 0 },
      });
      const result = halfReducer(state, { eventName: 'BTN_HALF' }, DEFAULT_TEST_CONTEXT);

      expect(result?.vMem.incrementalValues.X).toBe(-40);
    });
  });

  describe('display computation', () => {
    it('should compute display after halving', () => {
      const state = idleStateWithVMem({
        mode: 'abs',
        activeAxis: 'X',
        manualAbsoluteValues: { X: 100, Y: 200, Z: 300 },
      });
      const result = halfReducer(state, { eventName: 'BTN_HALF' }, DEFAULT_TEST_CONTEXT);

      expect(result?.display).toBeDefined();
      // Display should show halved value (50mm in default inch display = ~1.97 inches)
      expect(result?.display.X).toBeCloseTo(50 / 25.4, 2);
    });

    it('should compute display in mm mode', () => {
      const state = idleStateWithVMem({
        mode: 'abs',
        activeAxis: 'X',
        manualAbsoluteValues: { X: 100, Y: 0, Z: 0 },
      });
      const context: DROReducerContext = {
        ...DEFAULT_TEST_CONTEXT,
        nvMem: { ...DEFAULT_NON_VOLATILE_MEMORY, defaultUnit: 'mm' },
      };
      const result = halfReducer(state, { eventName: 'BTN_HALF' }, context);

      expect(result?.display.X).toBe(50);
    });
  });

  describe('repeated halving', () => {
    it('should allow multiple halves in sequence', () => {
      let state = idleStateWithVMem({
        mode: 'abs',
        activeAxis: 'X',
        manualAbsoluteValues: { X: 100, Y: 0, Z: 0 },
      });

      // First half: 100 -> 50
      state = halfReducer(state, { eventName: 'BTN_HALF' }, DEFAULT_TEST_CONTEXT)!;
      expect(state.vMem.manualAbsoluteValues.X).toBe(50);

      // Second half: 50 -> 25
      state = halfReducer(state, { eventName: 'BTN_HALF' }, DEFAULT_TEST_CONTEXT)!;
      expect(state.vMem.manualAbsoluteValues.X).toBe(25);

      // Third half: 25 -> 12.5
      state = halfReducer(state, { eventName: 'BTN_HALF' }, DEFAULT_TEST_CONTEXT)!;
      expect(state.vMem.manualAbsoluteValues.X).toBe(12.5);
    });
  });
});

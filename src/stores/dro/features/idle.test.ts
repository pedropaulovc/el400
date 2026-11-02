/**
 * Idle State Feature Reducer Tests
 *
 * Tests for the idle state, which is the default operating state of the DRO.
 * Note: BTN_ABS_INC is handled by absIncReducer, BTN_INCH_MM by inchMmReducer.
 */

import { describe, it, expect } from 'vitest';
import { idleReducer } from './idle';
import type { DROEventPayload } from '../droStateMachine';
import { INITIAL_DRO_STATE_DATA } from '../droStateMachine';
import { createTestState, DEFAULT_TEST_CONTEXT } from '../test-utils';
import { INITIAL_VOLATILE_MEMORY_STATE } from '../../../types/volatileMemory';
import { DEFAULT_NON_VOLATILE_MEMORY } from '../../../types/nonVolatileMemory';
import { INITIAL_DISPLAY_STATE } from '../utils/displayComputation';
import type { DROReducerContext, DROStatePayload } from '../types';


describe('connected INC motion', () => {
  it.each(['X', 'Y', 'Z'] as const)('tracks live %s motion relative to its INC datum', (axis) => {
    const state: DROStatePayload = {
      ...createTestState('idle'),
      vMem: {
        ...INITIAL_VOLATILE_MEMORY_STATE,
        mode: 'inc',
        workOffsets: { X: 1, Y: 2, Z: 3 },
        incrementalOffsets: { X: 10, Y: 20, Z: 30 },
        incrementalValues: { X: 71, Y: 72, Z: 73 },
      },
    };
    const context: DROReducerContext = {
      ...DEFAULT_TEST_CONTEXT,
      millState: {
        ...DEFAULT_TEST_CONTEXT.millState,
        connected: true,
        position: { x: 14, y: 24, z: 34 },
      },
      nvMem: { ...DEFAULT_NON_VOLATILE_MEMORY, defaultUnit: 'mm' },
    };
    const first = idleReducer(state, { eventName: 'MILL_STATE_CHANGED' }, context)!;
    expect(first.display).toEqual({ X: 4, Y: 4, Z: 4 });

    const machineAxis = { X: 'x', Y: 'y', Z: 'z' } as const;
    const key = machineAxis[axis];
    const movedContext: DROReducerContext = {
      ...context,
      millState: {
        ...context.millState,
        position: { ...context.millState.position, [key]: context.millState.position[key] - 7 },
      },
    };
    const moved = idleReducer(first, { eventName: 'MILL_STATE_CHANGED' }, movedContext)!;
    expect(moved.display).toEqual({ ...first.display, [axis]: -3 });
    expect(moved.vMem).toEqual(state.vMem);
  });

  it.each(['X', 'Y', 'Z'] as const)('keeps the disconnected %s manual counter independent of machine motion', (axis) => {
    const state: DROStatePayload = {
      ...createTestState('idle'),
      vMem: {
        ...INITIAL_VOLATILE_MEMORY_STATE,
        mode: 'inc',
        incrementalOffsets: { X: 10, Y: 20, Z: 30 },
        incrementalValues: { X: 7, Y: -8, Z: 9 },
      },
    };
    const context: DROReducerContext = {
      ...DEFAULT_TEST_CONTEXT,
      millState: {
        ...DEFAULT_TEST_CONTEXT.millState,
        connected: false,
        position: { x: 100, y: 200, z: 300 },
      },
      nvMem: { ...DEFAULT_NON_VOLATILE_MEMORY, defaultUnit: 'mm' },
    };
    const result = idleReducer(state, { eventName: 'MILL_STATE_CHANGED' }, context)!;
    expect(result.display[axis]).toBe(state.vMem.incrementalValues[axis]);
    expect(result.vMem).toEqual(state.vMem);
  });
});
describe('idleReducer', () => {
  describe('state handling', () => {
    it('should return null for non-idle states', () => {
      const state = createTestState('boot');
      const result = idleReducer(state, { eventName: 'MILL_STATE_CHANGED' }, DEFAULT_TEST_CONTEXT);
      expect(result).toBeNull();
    });

    it('should process events only when in idle state', () => {
      const idleState = createTestState('idle');
      const nonIdleState = createTestState('boot');

      // Specific events are handled in idle state
      expect(idleReducer(idleState, { eventName: 'MILL_STATE_CHANGED' }, DEFAULT_TEST_CONTEXT)).not.toBeNull();
      expect(idleReducer(idleState, { eventName: 'BTN_FUNCTION' }, DEFAULT_TEST_CONTEXT)).not.toBeNull();

      // But not in other states
      expect(idleReducer(nonIdleState, { eventName: 'MILL_STATE_CHANGED' }, DEFAULT_TEST_CONTEXT)).toBeNull();
      expect(idleReducer(nonIdleState, { eventName: 'BTN_FUNCTION' }, DEFAULT_TEST_CONTEXT)).toBeNull();
    });
  });

  describe('idle state', () => {
    it('should transition to function-menu-center on BTN_FUNCTION', () => {
      const state = createTestState('idle');
      const result = idleReducer(state, { eventName: 'BTN_FUNCTION' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('function-menu-center');
      expect(result?.stateData.stateDataType).toBe('none');
    });

    it('should return null for unhandled events (handled by other reducers)', () => {
      const state = createTestState('idle');

      expect(idleReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT)).toBeNull();
      expect(idleReducer(state, { eventName: 'KEY_4_LEFT' }, DEFAULT_TEST_CONTEXT)).toBeNull();
      expect(idleReducer(state, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT)).toBeNull();
      expect(idleReducer(state, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT)).toBeNull();
    });

    it('should return null for numeric key events (handled by keypadReducer)', () => {
      const state = createTestState('idle');
      const numericKeys = ['KEY_0', 'KEY_1', 'KEY_2_DOWN', 'KEY_3', 'KEY_4_LEFT', 'KEY_5', 'KEY_6_RIGHT', 'KEY_7', 'KEY_8_UP', 'KEY_9'] as const;

      for (const key of numericKeys) {
        const result = idleReducer(state, { eventName: key }, DEFAULT_TEST_CONTEXT);
        expect(result).toBeNull();
      }
    });

    it('should return null for BTN_ABS_INC (handled by absIncReducer)', () => {
      const state = createTestState('idle');
      const result = idleReducer(state, { eventName: 'BTN_ABS_INC' }, DEFAULT_TEST_CONTEXT);
      expect(result).toBeNull();
    });

    it('should return null for BTN_INCH_MM (handled by inchMmReducer)', () => {
      const state = createTestState('idle');
      const result = idleReducer(state, { eventName: 'BTN_INCH_MM' }, DEFAULT_TEST_CONTEXT);
      expect(result).toBeNull();
    });

    it('should return null for boot and mode toggle events (handled by other reducers)', () => {
      const state = createTestState('idle');

      const systemEvents: DROEventPayload[] = [
        { eventName: 'BOOT_STARTED', skipBootMessage: false },
        { eventName: 'BOOT_MESSAGE_TIMEOUT' },
        { eventName: 'ABS_INC_TOGGLE_COMPLETE' },
      ];

      for (const event of systemEvents) {
        const result = idleReducer(state, event, DEFAULT_TEST_CONTEXT);
        expect(result).toBeNull();
      }
    });

    it('should handle MILL_STATE_CHANGED by recomputing display', () => {
      const state = createTestState('idle');
      const result = idleReducer(state, { eventName: 'MILL_STATE_CHANGED' }, DEFAULT_TEST_CONTEXT);
      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('idle');
      expect(result?.display).toBeDefined();
    });

    it('should compute display from non-zero mill position', () => {
      // Create state with manual absolute values (disconnected mode)
      const state: DROStatePayload = {
        stateName: 'idle',
        stateData: INITIAL_DRO_STATE_DATA,
        vMem: {
          ...INITIAL_VOLATILE_MEMORY_STATE,
          mode: 'abs',
          manualAbsoluteValues: { X: 25.4, Y: 50.8, Z: 76.2 },
        },
        display: INITIAL_DISPLAY_STATE,
      };

      // Context with mm as default unit
      const context: DROReducerContext = {
        millState: {
          position: { x: 0, y: 0, z: 0 },
          probe: { pinState: '', triggered: false },
          connected: false,
          controllerType: 'noop',
          encoderSignal: { X: 'ok', Y: 'ok', Z: 'ok' },
        },
        nvMem: { ...DEFAULT_NON_VOLATILE_MEMORY, defaultUnit: 'mm' },
      };

      const result = idleReducer(state, { eventName: 'MILL_STATE_CHANGED' }, context);

      expect(result?.stateName).toBe('idle');
      // Display should show the manual absolute values in mm
      expect(result?.display.X).toBe(25.4);
      expect(result?.display.Y).toBe(50.8);
      expect(result?.display.Z).toBe(76.2);
    });

    it('should compute display with unit conversion (mm to inch)', () => {
      // Create state with manual absolute values in mm
      const state: DROStatePayload = {
        stateName: 'idle',
        stateData: INITIAL_DRO_STATE_DATA,
        vMem: {
          ...INITIAL_VOLATILE_MEMORY_STATE,
          mode: 'abs',
          manualAbsoluteValues: { X: 25.4, Y: 50.8, Z: 76.2 }, // 1", 2", 3" in mm
        },
        display: INITIAL_DISPLAY_STATE,
      };

      // Context with inch as default unit
      const context: DROReducerContext = {
        millState: {
          position: { x: 0, y: 0, z: 0 },
          probe: { pinState: '', triggered: false },
          connected: false,
          controllerType: 'noop',
          encoderSignal: { X: 'ok', Y: 'ok', Z: 'ok' },
        },
        nvMem: { ...DEFAULT_NON_VOLATILE_MEMORY, defaultUnit: 'inch' },
      };

      const result = idleReducer(state, { eventName: 'MILL_STATE_CHANGED' }, context);

      expect(result?.stateName).toBe('idle');
      // Display should convert mm to inches (25.4mm = 1", 50.8mm = 2", 76.2mm = 3")
      expect(result?.display.X).toBeCloseTo(1, 5);
      expect(result?.display.Y).toBeCloseTo(2, 5);
      expect(result?.display.Z).toBeCloseTo(3, 5);
    });
  });

  describe('data preservation', () => {
    it('should reset data when entering function menu', () => {
      const state = createTestState('idle', { stateDataType: 'none' });
      const result = idleReducer(state, { eventName: 'BTN_FUNCTION' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateData).toEqual({ stateDataType: 'none' });
    });
  });
});

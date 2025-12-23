/**
 * Distance-to-Go Feature Reducer Tests (US-008)
 *
 * Tests for target entry and distance-to-go display.
 */

import { describe, it, expect } from 'vitest';
import { distanceToGoReducer } from './distance-to-go';
import type { DROStatePayload, DROReducerContext } from '../types';
import { INITIAL_DRO_STATE_DATA, INITIAL_PRESET_DATA } from '../droStateMachine';
import type { PresetData } from '../droStateMachine';
import { createTestState, DEFAULT_TEST_CONTEXT } from '../test-utils';
import { INITIAL_VOLATILE_MEMORY_STATE } from '../../../types/volatileMemory';
import { INITIAL_DISPLAY_STATE } from '../utils/displayComputation';
import { createDefaultMillState } from '../../../types/millState';
import { DEFAULT_NON_VOLATILE_MEMORY } from '../../../types/nonVolatileMemory';

/** Helper to create state with input buffer for testing */
function stateWithBuffer(
  stateName: DROStatePayload['stateName'],
  stateData: DROStatePayload['stateData'],
  inputBuffer: string
): DROStatePayload {
  return {
    stateName,
    stateData,
    vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer },
    display: INITIAL_DISPLAY_STATE,
  };
}

/** Helper to create a connected context with a specific position */
function connectedContext(position: { x: number; y: number; z: number }): DROReducerContext {
  return {
    millState: {
      ...createDefaultMillState('mock'),
      connected: true,
      position,
    },
    nvMem: DEFAULT_NON_VOLATILE_MEMORY,
  };
}

describe('distanceToGoReducer', () => {
  describe('entering preset mode', () => {
    it('should transition from idle to preset-select on BTN_DISTANCE_TO_GO', () => {
      const state = createTestState('idle');
      const result = distanceToGoReducer(state, { eventName: 'BTN_DISTANCE_TO_GO' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('preset-select');
      expect(result?.stateData).toEqual(INITIAL_PRESET_DATA);
    });

    it('should show SELECT on all axes when entering preset-select', () => {
      const state = createTestState('idle');
      const result = distanceToGoReducer(state, { eventName: 'BTN_DISTANCE_TO_GO' }, DEFAULT_TEST_CONTEXT);

      expect(result?.display.X).toBe('SELECt');
      expect(result?.display.Y).toBe('SELECt');
      expect(result?.display.Z).toBe('SELECt');
    });

    it('should return null for non-idle/non-preset states', () => {
      const state = createTestState('boot');
      const result = distanceToGoReducer(state, { eventName: 'BTN_DISTANCE_TO_GO' }, DEFAULT_TEST_CONTEXT);
      expect(result).toBeNull();
    });

    it('should return null when in INC mode (distance-to-go only available in ABS mode)', () => {
      const state: DROStatePayload = {
        ...createTestState('idle'),
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'inc' },
      };
      const result = distanceToGoReducer(state, { eventName: 'BTN_DISTANCE_TO_GO' }, DEFAULT_TEST_CONTEXT);
      expect(result).toBeNull();
    });
  });

  describe('axis selection from preset-select', () => {
    it('should transition to preset-input-x on BTN_SELECT_X', () => {
      const state = createTestState('preset-select', INITIAL_PRESET_DATA);
      const result = distanceToGoReducer(state, { eventName: 'BTN_SELECT_X' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('preset-input-x');
      expect((result?.stateData as PresetData).activeInputAxis).toBe('X');
    });

    it('should transition to preset-input-y on BTN_SELECT_Y', () => {
      const state = createTestState('preset-select', INITIAL_PRESET_DATA);
      const result = distanceToGoReducer(state, { eventName: 'BTN_SELECT_Y' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('preset-input-y');
      expect((result?.stateData as PresetData).activeInputAxis).toBe('Y');
    });

    it('should transition to preset-input-z on BTN_SELECT_Z', () => {
      const state = createTestState('preset-select', INITIAL_PRESET_DATA);
      const result = distanceToGoReducer(state, { eventName: 'BTN_SELECT_Z' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('preset-input-z');
      expect((result?.stateData as PresetData).activeInputAxis).toBe('Z');
    });

    it('should clear input buffer when entering input mode', () => {
      const state = stateWithBuffer('preset-select', INITIAL_PRESET_DATA, '123');
      const result = distanceToGoReducer(state, { eventName: 'BTN_SELECT_X' }, DEFAULT_TEST_CONTEXT);

      expect(result?.vMem.inputBuffer).toBe('');
    });
  });

  describe('numeric input in preset-input states', () => {
    it('should append digits to input buffer', () => {
      const state = stateWithBuffer('preset-input-x', { ...INITIAL_PRESET_DATA, activeInputAxis: 'X' }, '');
      const result = distanceToGoReducer(state, { eventName: 'KEY_5' }, DEFAULT_TEST_CONTEXT);

      expect(result?.vMem.inputBuffer).toBe('5');
    });

    it('should append multiple digits', () => {
      const state = stateWithBuffer('preset-input-x', { ...INITIAL_PRESET_DATA, activeInputAxis: 'X' }, '12');
      const result = distanceToGoReducer(state, { eventName: 'KEY_3' }, DEFAULT_TEST_CONTEXT);

      expect(result?.vMem.inputBuffer).toBe('123');
    });

    it('should append decimal point', () => {
      const state = stateWithBuffer('preset-input-x', { ...INITIAL_PRESET_DATA, activeInputAxis: 'X' }, '12');
      const result = distanceToGoReducer(state, { eventName: 'KEY_DECIMAL' }, DEFAULT_TEST_CONTEXT);

      expect(result?.vMem.inputBuffer).toBe('12.');
    });

    it('should toggle sign', () => {
      const state = stateWithBuffer('preset-input-x', { ...INITIAL_PRESET_DATA, activeInputAxis: 'X' }, '50');
      const result = distanceToGoReducer(state, { eventName: 'KEY_SIGN' }, DEFAULT_TEST_CONTEXT);

      expect(result?.vMem.inputBuffer).toBe('-50');
    });

    it('should show input value on display for active axis', () => {
      const state = stateWithBuffer('preset-input-x', { ...INITIAL_PRESET_DATA, activeInputAxis: 'X' }, '100');
      const result = distanceToGoReducer(state, { eventName: 'KEY_5' }, DEFAULT_TEST_CONTEXT);

      expect(result?.display.X).toBe('1005');
      expect(result?.display.Y).toBe('SELECt');
      expect(result?.display.Z).toBe('SELECt');
    });
  });

  describe('committing preset value with KEY_ENTER', () => {
    it('should store value and return to preset-select on KEY_ENTER', () => {
      const state = stateWithBuffer('preset-input-x', { ...INITIAL_PRESET_DATA, activeInputAxis: 'X' }, '100');
      const result = distanceToGoReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('preset-select');
      // Value is converted from inches (default) to mm: 100 * 25.4 = 2540
      expect((result?.stateData as PresetData).presetTargets.X).toBeCloseTo(2540, 1);
      expect((result?.stateData as PresetData).activeInputAxis).toBeNull();
    });

    it('should store zero value when buffer is empty', () => {
      const state = stateWithBuffer('preset-input-y', { ...INITIAL_PRESET_DATA, activeInputAxis: 'Y' }, '');
      const result = distanceToGoReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('preset-select');
      expect((result?.stateData as PresetData).presetTargets.Y).toBe(0);
    });

    it('should preserve previously entered values when entering new axis', () => {
      const presetData: PresetData = {
        ...INITIAL_PRESET_DATA,
        presetTargets: { X: 2540, Y: null, Z: null }, // 100 inches in mm
        activeInputAxis: 'Y',
      };
      const state = stateWithBuffer('preset-input-y', presetData, '50');
      const result = distanceToGoReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      // Both X and Y should be set
      expect((result?.stateData as PresetData).presetTargets.X).toBeCloseTo(2540, 1);
      expect((result?.stateData as PresetData).presetTargets.Y).toBeCloseTo(1270, 1); // 50 * 25.4
    });

    it('should show stored values on display after commit', () => {
      const state = stateWithBuffer('preset-input-x', { ...INITIAL_PRESET_DATA, activeInputAxis: 'X' }, '100');
      const result = distanceToGoReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      // X should show the stored value (100 inches), Y and Z should show SELECT
      expect(result?.display.X).toBe(100);
      expect(result?.display.Y).toBe('SELECt');
      expect(result?.display.Z).toBe('SELECt');
    });
  });

  describe('canceling input with KEY_CLEAR', () => {
    it('should return to preset-select without saving on KEY_CLEAR from input state', () => {
      const state = stateWithBuffer('preset-input-x', { ...INITIAL_PRESET_DATA, activeInputAxis: 'X' }, '100');
      const result = distanceToGoReducer(state, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('preset-select');
      expect((result?.stateData as PresetData).presetTargets.X).toBeNull();
      expect(result?.vMem.inputBuffer).toBe('');
    });

    it('should exit to idle on KEY_CLEAR from preset-select', () => {
      const state = createTestState('preset-select', INITIAL_PRESET_DATA);
      const result = distanceToGoReducer(state, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('idle');
      expect(result?.stateData).toEqual(INITIAL_DRO_STATE_DATA);
    });
  });

  describe('executing preset with BTN_DISTANCE_TO_GO', () => {
    it('should transition to distance-to-go on BTN_DISTANCE_TO_GO when at least one axis has preset', () => {
      const presetData: PresetData = {
        ...INITIAL_PRESET_DATA,
        presetTargets: { X: 2540, Y: null, Z: null }, // 100 inches in mm
      };
      const state = createTestState('preset-select', presetData);
      const result = distanceToGoReducer(state, { eventName: 'BTN_DISTANCE_TO_GO' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('distance-to-go');
    });

    it('should not transition if no presets are set', () => {
      const state = createTestState('preset-select', INITIAL_PRESET_DATA);
      const result = distanceToGoReducer(state, { eventName: 'BTN_DISTANCE_TO_GO' }, DEFAULT_TEST_CONTEXT);

      // Should return null (no transition) when no presets entered
      expect(result).toBeNull();
    });

    it('should show distance-to-go on display (target - current position)', () => {
      const presetData: PresetData = {
        ...INITIAL_PRESET_DATA,
        presetTargets: { X: 2540, Y: 1270, Z: null }, // 100 and 50 inches in mm
      };
      const state = createTestState('preset-select', presetData);
      // Current position is 0, so distance = preset - 0 = preset value
      const result = distanceToGoReducer(state, { eventName: 'BTN_DISTANCE_TO_GO' }, DEFAULT_TEST_CONTEXT);

      expect(result?.display.X).toBe(100); // 2540mm / 25.4 = 100 inches
      expect(result?.display.Y).toBe(50);  // 1270mm / 25.4 = 50 inches
      expect(result?.display.Z).toBe(0);   // No preset, shows current position (0)
    });

    it('should set mode to INC when entering distance-to-go (INC LED turns on)', () => {
      const presetData: PresetData = {
        ...INITIAL_PRESET_DATA,
        presetTargets: { X: 2540, Y: null, Z: null },
      };
      const state = createTestState('preset-select', presetData);
      const result = distanceToGoReducer(state, { eventName: 'BTN_DISTANCE_TO_GO' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('distance-to-go');
      expect(result?.vMem.mode).toBe('inc');
    });
  });

  describe('distance-to-go state', () => {
    it('should update display on MILL_STATE_CHANGED', () => {
      const presetData: PresetData = {
        ...INITIAL_PRESET_DATA,
        presetTargets: { X: 2540, Y: null, Z: null }, // 100 inches target
      };
      const state = createTestState('distance-to-go', presetData);

      // Simulate machine moved to X=25.4mm (1 inch)
      const context = connectedContext({ x: 25.4, y: 0, z: 0 });

      const result = distanceToGoReducer(state, { eventName: 'MILL_STATE_CHANGED' }, context);

      // Distance = 100 inches target - 1 inch current = 99 inches remaining
      expect(result?.display.X).toBeCloseTo(99, 1);
    });

    it('should exit to idle on KEY_CLEAR and restore ABS mode', () => {
      const presetData: PresetData = {
        ...INITIAL_PRESET_DATA,
        presetTargets: { X: 2540, Y: null, Z: null },
      };
      const state: DROStatePayload = {
        ...createTestState('distance-to-go', presetData),
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'inc' }, // In INC mode during distance-to-go
      };
      const result = distanceToGoReducer(state, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('idle');
      expect(result?.stateData).toEqual(INITIAL_DRO_STATE_DATA);
      expect(result?.vMem.mode).toBe('abs'); // Mode restored to ABS
    });

    it('should return to preset-select on BTN_DISTANCE_TO_GO and restore ABS mode', () => {
      const presetData: PresetData = {
        ...INITIAL_PRESET_DATA,
        presetTargets: { X: 2540, Y: null, Z: null },
      };
      const state: DROStatePayload = {
        ...createTestState('distance-to-go', presetData),
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'inc' }, // In INC mode during distance-to-go
      };
      const result = distanceToGoReducer(state, { eventName: 'BTN_DISTANCE_TO_GO' }, DEFAULT_TEST_CONTEXT);

      expect(result?.stateName).toBe('preset-select');
      expect((result?.stateData as PresetData).presetTargets.X).toBe(2540);
      expect(result?.vMem.mode).toBe('abs'); // Mode restored to ABS
    });
  });

  describe('display computation in distance-to-go', () => {
    it('should show negative distance when past target', () => {
      const presetData: PresetData = {
        ...INITIAL_PRESET_DATA,
        presetTargets: { X: 2540, Y: null, Z: null }, // Target: 100 inches
      };
      const state = createTestState('distance-to-go', presetData);

      // Machine is at 150 inches (beyond target)
      const context = connectedContext({ x: 3810, y: 0, z: 0 }); // 150 * 25.4 = 3810mm

      const result = distanceToGoReducer(state, { eventName: 'MILL_STATE_CHANGED' }, context);

      // Distance = 100 - 150 = -50 inches (past the target)
      expect(result?.display.X).toBeCloseTo(-50, 1);
    });

    it('should show zero when at target position', () => {
      const presetData: PresetData = {
        ...INITIAL_PRESET_DATA,
        presetTargets: { X: 2540, Y: null, Z: null }, // Target: 100 inches
      };
      const state = createTestState('distance-to-go', presetData);

      // Machine is exactly at target
      const context = connectedContext({ x: 2540, y: 0, z: 0 });

      const result = distanceToGoReducer(state, { eventName: 'MILL_STATE_CHANGED' }, context);

      expect(result?.display.X).toBeCloseTo(0, 1);
    });

    it('should show normal position for axes without presets', () => {
      const presetData: PresetData = {
        ...INITIAL_PRESET_DATA,
        presetTargets: { X: 2540, Y: null, Z: null }, // Only X has preset
      };
      const state = createTestState('distance-to-go', presetData);

      // Machine at some position
      const context = connectedContext({ x: 0, y: 254, z: 508 }); // Y=10in, Z=20in

      const result = distanceToGoReducer(state, { eventName: 'MILL_STATE_CHANGED' }, context);

      expect(result?.display.X).toBe(100); // Distance to preset
      expect(result?.display.Y).toBeCloseTo(10, 1); // Normal position (no preset)
      expect(result?.display.Z).toBeCloseTo(20, 1); // Normal position (no preset)
    });
  });

  describe('edge cases', () => {
    it('should handle negative preset values', () => {
      const state = stateWithBuffer('preset-input-x', { ...INITIAL_PRESET_DATA, activeInputAxis: 'X' }, '-50');
      const result = distanceToGoReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect((result?.stateData as PresetData).presetTargets.X).toBeCloseTo(-1270, 1); // -50 inches = -1270mm
    });

    it('should handle decimal preset values', () => {
      const state = stateWithBuffer('preset-input-x', { ...INITIAL_PRESET_DATA, activeInputAxis: 'X' }, '1.5');
      const result = distanceToGoReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect((result?.stateData as PresetData).presetTargets.X).toBeCloseTo(38.1, 1); // 1.5 inches = 38.1mm
    });
  });

  describe('inch-mm toggle in distance-to-go states', () => {
    it('should toggle unit in preset-select state', () => {
      const presetData: PresetData = {
        ...INITIAL_PRESET_DATA,
        presetTargets: { X: 25.4, Y: null, Z: null }, // 1 inch stored in mm
      };
      const state = createTestState('preset-select', presetData);
      const context: DROReducerContext = {
        ...DEFAULT_TEST_CONTEXT,
        nvMem: { ...DEFAULT_NON_VOLATILE_MEMORY, defaultUnit: 'inch' },
      };

      const result = distanceToGoReducer(state, { eventName: 'BTN_INCH_MM' }, context);

      expect(result?.stateName).toBe('preset-select');
      // Display should show value in mm now (25.4mm = 1 inch)
      expect(result?.display.X).toBeCloseTo(25.4, 1);
    });

    it('should toggle unit in preset-input state', () => {
      const presetData: PresetData = {
        ...INITIAL_PRESET_DATA,
        presetTargets: { X: null, Y: 50.8, Z: null }, // Y has value (2 inches in mm)
        activeInputAxis: 'X',
      };
      const state = stateWithBuffer('preset-input-x', presetData, '5');
      const context: DROReducerContext = {
        ...DEFAULT_TEST_CONTEXT,
        nvMem: { ...DEFAULT_NON_VOLATILE_MEMORY, defaultUnit: 'inch' },
      };

      const result = distanceToGoReducer(state, { eventName: 'BTN_INCH_MM' }, context);

      expect(result?.stateName).toBe('preset-input-x');
      // Input buffer should remain unchanged (raw value)
      expect(result?.display.X).toBe('5');
      // Y should now display in mm
      expect(result?.display.Y).toBeCloseTo(50.8, 1);
    });

    it('should toggle unit in distance-to-go state', () => {
      const presetData: PresetData = {
        ...INITIAL_PRESET_DATA,
        presetTargets: { X: 2540, Y: null, Z: null }, // Target: 100 inches in mm
      };
      const state = createTestState('distance-to-go', presetData);

      // Machine at 50 inches (1270mm)
      const context: DROReducerContext = {
        millState: {
          ...createDefaultMillState('mock'),
          connected: true,
          position: { x: 1270, y: 0, z: 0 },
        },
        nvMem: { ...DEFAULT_NON_VOLATILE_MEMORY, defaultUnit: 'inch' },
      };

      const result = distanceToGoReducer(state, { eventName: 'BTN_INCH_MM' }, context);

      expect(result?.stateName).toBe('distance-to-go');
      // Distance = 2540 - 1270 = 1270mm (displayed in mm after toggle)
      expect(result?.display.X).toBeCloseTo(1270, 0);
    });
  });
});

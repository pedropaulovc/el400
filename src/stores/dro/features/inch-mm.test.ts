/**
 * Inch/MM Mode Feature Reducer Tests
 *
 * Tests for inch/mm unit toggling from idle state.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { inchMmReducer } from './inch-mm';
import { createTestState, DEFAULT_TEST_CONTEXT } from '../test-utils';
import type { DROStatePayload, DROReducerContext } from '../types';
import { INITIAL_DRO_STATE_DATA } from '../droStateMachine';
import { INITIAL_VOLATILE_MEMORY_STATE } from '../../../types/volatileMemory';
import { DEFAULT_NON_VOLATILE_MEMORY } from '../../../types/nonVolatileMemory';
import { INITIAL_DISPLAY_STATE } from '../utils/displayComputation';
import { useSettingsStore } from '../../settingsStore';

describe('inchMmReducer', () => {
  beforeEach(() => {
    // Reset settings store before each test
    useSettingsStore.setState({
      nvMem: DEFAULT_NON_VOLATILE_MEMORY,
    });
  });

  describe('state handling', () => {
    it('should return null for non-idle states', () => {
      const state = createTestState('boot');
      const result = inchMmReducer(state, { eventName: 'BTN_INCH_MM' }, DEFAULT_TEST_CONTEXT);
      expect(result).toBeNull();
    });

    it('should return null for other events in idle state', () => {
      const state = createTestState('idle');
      expect(inchMmReducer(state, { eventName: 'BTN_ABS_INC' }, DEFAULT_TEST_CONTEXT)).toBeNull();
      expect(inchMmReducer(state, { eventName: 'BTN_FUNCTION' }, DEFAULT_TEST_CONTEXT)).toBeNull();
      expect(inchMmReducer(state, { eventName: 'KEY_5' }, DEFAULT_TEST_CONTEXT)).toBeNull();
    });
  });

  describe('BTN_INCH_MM in idle state', () => {
    it('should stay in idle state', () => {
      const state = createTestState('idle');
      const result = inchMmReducer(state, { eventName: 'BTN_INCH_MM' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('idle');
    });

    it('should toggle unit from inch to mm in nvMem', () => {
      // Start with inch
      useSettingsStore.setState({
        nvMem: { ...DEFAULT_NON_VOLATILE_MEMORY, defaultUnit: 'inch' },
      });

      const context: DROReducerContext = {
        ...DEFAULT_TEST_CONTEXT,
        nvMem: { ...DEFAULT_NON_VOLATILE_MEMORY, defaultUnit: 'inch' },
      };

      const state = createTestState('idle');
      inchMmReducer(state, { eventName: 'BTN_INCH_MM' }, context);

      // Check nvMem was updated
      expect(useSettingsStore.getState().nvMem.defaultUnit).toBe('mm');
    });

    it('should toggle unit from mm to inch in nvMem', () => {
      // Start with mm
      useSettingsStore.setState({
        nvMem: { ...DEFAULT_NON_VOLATILE_MEMORY, defaultUnit: 'mm' },
      });

      const context: DROReducerContext = {
        ...DEFAULT_TEST_CONTEXT,
        nvMem: { ...DEFAULT_NON_VOLATILE_MEMORY, defaultUnit: 'mm' },
      };

      const state = createTestState('idle');
      inchMmReducer(state, { eventName: 'BTN_INCH_MM' }, context);

      // Check nvMem was updated
      expect(useSettingsStore.getState().nvMem.defaultUnit).toBe('inch');
    });

    it('should compute display with new unit', () => {
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

      // Start with mm, toggle to inch
      useSettingsStore.setState({
        nvMem: { ...DEFAULT_NON_VOLATILE_MEMORY, defaultUnit: 'mm' },
      });

      const context: DROReducerContext = {
        millState: {
          position: { x: 0, y: 0, z: 0 },
          probe: { pinState: '', triggered: false },
          connected: false,
          controllerType: 'noop',
        },
        nvMem: { ...DEFAULT_NON_VOLATILE_MEMORY, defaultUnit: 'mm' },
      };

      const result = inchMmReducer(state, { eventName: 'BTN_INCH_MM' }, context);

      // Display should now be in inches (25.4mm = 1", 50.8mm = 2", 76.2mm = 3")
      expect(result?.display.X).toBeCloseTo(1, 5);
      expect(result?.display.Y).toBeCloseTo(2, 5);
      expect(result?.display.Z).toBeCloseTo(3, 5);
    });

    it('should preserve vMem state', () => {
      const state: DROStatePayload = {
        stateName: 'idle',
        stateData: INITIAL_DRO_STATE_DATA,
        vMem: {
          ...INITIAL_VOLATILE_MEMORY_STATE,
          inputBuffer: '123',
          activeAxis: 'X',
        },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = inchMmReducer(state, { eventName: 'BTN_INCH_MM' }, DEFAULT_TEST_CONTEXT);

      expect(result?.vMem.inputBuffer).toBe('123');
      expect(result?.vMem.activeAxis).toBe('X');
    });
  });
});

/**
 * Settings Menu Feature Reducer Tests
 */

import { describe, it, expect } from 'vitest';
import { settingsReducer } from './settings';
import { createTestState, DEFAULT_TEST_CONTEXT } from '../test-utils';
import { INITIAL_SETTINGS_DATA } from '../droStateMachine';
import type { SettingsData } from '../droStateMachine';

describe('Settings Menu Reducer', () => {
  describe('Entry', () => {
    it('should enter settings menu from idle with wrench button', () => {
      const state = createTestState('idle');
      const result = settingsReducer(state, { eventName: 'BTN_WRENCH' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('settings-select-axis');
      expect(result?.stateData).toEqual(INITIAL_SETTINGS_DATA);
      expect(result?.display.X).toBe('SELECt');
    });

    it('should not handle wrench button from non-idle state', () => {
      const state = createTestState('calculator-idle');
      const result = settingsReducer(state, { eventName: 'BTN_WRENCH' }, DEFAULT_TEST_CONTEXT);

      expect(result).toBeNull();
    });
  });

  describe('Axis Selection', () => {
    it('should select X axis and enter settings menu', () => {
      const state = createTestState('settings-select-axis', INITIAL_SETTINGS_DATA);
      const result = settingsReducer(state, { eventName: 'BTN_SELECT_X' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('settings-menu');
      expect((result?.stateData as SettingsData).selectedAxis).toBe('X');
      expect((result?.stateData as SettingsData).currentParameter).toBe('SCALE_TYPE');
    });

    it('should select Y axis and enter settings menu', () => {
      const state = createTestState('settings-select-axis', INITIAL_SETTINGS_DATA);
      const result = settingsReducer(state, { eventName: 'BTN_SELECT_Y' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('settings-menu');
      expect((result?.stateData as SettingsData).selectedAxis).toBe('Y');
    });

    it('should select Z axis and enter settings menu', () => {
      const state = createTestState('settings-select-axis', INITIAL_SETTINGS_DATA);
      const result = settingsReducer(state, { eventName: 'BTN_SELECT_Z' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('settings-menu');
      expect((result?.stateData as SettingsData).selectedAxis).toBe('Z');
    });

    it('should exit to idle with clear key', () => {
      const state = createTestState('settings-select-axis', INITIAL_SETTINGS_DATA);
      const result = settingsReducer(state, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('idle');
    });
  });

  describe('Menu Navigation', () => {
    const settingsData: SettingsData = {
      stateDataType: 'settings',
      selectedAxis: 'X',
      currentParameter: 'SCALE_TYPE',
      parameterIndex: 0,
      tempConfig: {},
    };

    it('should navigate down to next parameter', () => {
      const state = createTestState('settings-menu', settingsData);
      const result = settingsReducer(state, { eventName: 'KEY_2_DOWN' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('settings-menu');
      expect((result?.stateData as SettingsData).currentParameter).toBe('SC');
      expect((result?.stateData as SettingsData).parameterIndex).toBe(1);
    });

    it('should navigate up to previous parameter', () => {
      const dataAtSC: SettingsData = {
        ...settingsData,
        currentParameter: 'SC',
        parameterIndex: 1,
      };
      const state = createTestState('settings-menu', dataAtSC);
      const result = settingsReducer(state, { eventName: 'KEY_8_UP' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('settings-menu');
      expect((result?.stateData as SettingsData).currentParameter).toBe('SCALE_TYPE');
      expect((result?.stateData as SettingsData).parameterIndex).toBe(0);
    });

    it('should wrap around when navigating down from last parameter', () => {
      const dataAtEnd: SettingsData = {
        ...settingsData,
        currentParameter: 'END',
        parameterIndex: 13,
      };
      const state = createTestState('settings-menu', dataAtEnd);
      const result = settingsReducer(state, { eventName: 'KEY_2_DOWN' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect((result?.stateData as SettingsData).currentParameter).toBe('SCALE_TYPE');
      expect((result?.stateData as SettingsData).parameterIndex).toBe(0);
    });

    it('should wrap around when navigating up from first parameter', () => {
      const state = createTestState('settings-menu', settingsData);
      const result = settingsReducer(state, { eventName: 'KEY_8_UP' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect((result?.stateData as SettingsData).currentParameter).toBe('END');
      expect((result?.stateData as SettingsData).parameterIndex).toBe(13);
    });
  });

  describe('Parameter Modification', () => {
    it('should toggle scale type from linear to angular', () => {
      const settingsData: SettingsData = {
        stateDataType: 'settings',
        selectedAxis: 'X',
        currentParameter: 'SCALE_TYPE',
        parameterIndex: 0,
        tempConfig: {},
      };
      const state = createTestState('settings-menu', settingsData);
      const result = settingsReducer(state, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('settings-menu');
      expect((result?.stateData as SettingsData).tempConfig.axisConfig?.X.scaleType).toBe('angular');
    });

    it('should toggle direction from left to right', () => {
      const settingsData: SettingsData = {
        stateDataType: 'settings',
        selectedAxis: 'X',
        currentParameter: 'DIRECTION',
        parameterIndex: 4,
        tempConfig: {},
      };
      const state = createTestState('settings-menu', settingsData);
      const result = settingsReducer(state, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect((result?.stateData as SettingsData).tempConfig.axisConfig?.X.scaleDirection).toBe('right');
    });

    it('should toggle beep from on to off', () => {
      const settingsData: SettingsData = {
        stateDataType: 'settings',
        selectedAxis: 'X',
        currentParameter: 'BEEP',
        parameterIndex: 9,
        tempConfig: {},
      };
      const state = createTestState('settings-menu', settingsData);
      const result = settingsReducer(state, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect((result?.stateData as SettingsData).tempConfig.beepEnabled).toBe(false);
    });

    it('should cycle scale resolution values', () => {
      const settingsData: SettingsData = {
        stateDataType: 'settings',
        selectedAxis: 'X',
        currentParameter: 'SC',
        parameterIndex: 1,
        tempConfig: {},
      };
      const state = createTestState('settings-menu', settingsData);

      // First cycle: 5 -> 10
      const result1 = settingsReducer(state, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);
      expect((result1?.stateData as SettingsData).tempConfig.axisConfig?.X.scaleResolution).toBe(10);

      // Second cycle: 10 -> 20
      const result2 = settingsReducer(result1!, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);
      expect((result2?.stateData as SettingsData).tempConfig.axisConfig?.X.scaleResolution).toBe(20);

      // Third cycle: 20 -> 1 (wraps around)
      const result3 = settingsReducer(result2!, { eventName: 'KEY_6_RIGHT' }, DEFAULT_TEST_CONTEXT);
      expect((result3?.stateData as SettingsData).tempConfig.axisConfig?.X.scaleResolution).toBe(1);
    });
  });

  describe('Exit Actions', () => {
    it('should exit to idle when END parameter is selected and enter pressed', () => {
      const settingsData: SettingsData = {
        stateDataType: 'settings',
        selectedAxis: 'X',
        currentParameter: 'END',
        parameterIndex: 13,
        tempConfig: {},
      };
      const state = createTestState('settings-menu', settingsData);
      const result = settingsReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('idle');
    });

    it('should exit to idle when SAV CHG is selected and enter pressed', () => {
      const settingsData: SettingsData = {
        stateDataType: 'settings',
        selectedAxis: 'X',
        currentParameter: 'SAV_CHG',
        parameterIndex: 11,
        tempConfig: { beepEnabled: false },
      };
      const state = createTestState('settings-menu', settingsData);
      const result = settingsReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('idle');
      // TODO: Verify that settings are saved to nvMem via context callback
    });

    it('should exit to idle when RST DEF is selected and enter pressed', () => {
      const settingsData: SettingsData = {
        stateDataType: 'settings',
        selectedAxis: 'X',
        currentParameter: 'RST_DEF',
        parameterIndex: 12,
        tempConfig: {},
      };
      const state = createTestState('settings-menu', settingsData);
      const result = settingsReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('idle');
      // TODO: Implement password prompt and restore defaults
    });

    it('should exit and discard changes with clear key', () => {
      const settingsData: SettingsData = {
        stateDataType: 'settings',
        selectedAxis: 'X',
        currentParameter: 'BEEP',
        parameterIndex: 9,
        tempConfig: { beepEnabled: false },
      };
      const state = createTestState('settings-menu', settingsData);
      const result = settingsReducer(state, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('idle');
      // Temp config changes should be discarded
    });
  });

  describe('Display Computation', () => {
    it('should show SELECT on X axis during axis selection', () => {
      const state = createTestState('idle');
      const result = settingsReducer(state, { eventName: 'BTN_WRENCH' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.display.X).toBe('SELECt');
      expect(result?.display.Y).toBe('');
      expect(result?.display.Z).toBe('');
    });

    it('should show parameter name on X axis and value on Y axis in menu', () => {
      const settingsData: SettingsData = {
        stateDataType: 'settings',
        selectedAxis: 'X',
        currentParameter: 'BEEP',
        parameterIndex: 9,
        tempConfig: {},
      };
      const state = createTestState('settings-menu', settingsData);

      // Display is computed by the reducer, but we'll check after navigation
      const result = settingsReducer(state, { eventName: 'KEY_2_DOWN' }, DEFAULT_TEST_CONTEXT);
      expect(result).not.toBeNull();
      // Parameter text should be shown on X axis
      expect(result?.display.X).toBeTruthy();
      // Value text should be shown on Y axis
      expect(result?.display.Y).toBeTruthy();
    });
  });
});

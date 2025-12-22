/**
 * DRO State Machine Types
 *
 * Defines the unified DRO state machine that manages boot sequence,
 * mode toggles, and function menu states.
 */

import type { AxisValues, VolatileMemoryState } from '../../types/volatileMemory';
import { INITIAL_VOLATILE_MEMORY_STATE } from '../../types/volatileMemory';
import type { DisplayState } from './utils/displayComputation';
import { createDisplay } from './utils/displayComputation';

/**
 * Model number displayed during boot sequence.
 */
export const MODEL_NUMBER = 'EL400';

/**
 * Software version displayed during boot sequence.
 */
export const SOFTWARE_VERSION = 'vEr 1.0.0';

/**
 * Boot display state - shown when initial state is 'boot'.
 */
export const BOOT_DISPLAY: DisplayState = createDisplay(MODEL_NUMBER, SOFTWARE_VERSION, '');

// ─────────────────────────────────────────────────────────────────
// DRO STATE - Flat string union, no nested substates
// ─────────────────────────────────────────────────────────────────

export type DROStateName =
  // Boot sequence
  | 'boot'
  | 'boot-show-message'
  // Normal operation
  | 'idle'
  // Transitional toggle states
  | 'abs-inc-mode'
  // Function menu selection states
  | 'function-menu-center'
  | 'function-menu-circle'
  | 'function-menu-line'
  | 'function-menu-linear'
  | 'function-menu-polar'
  // Center line states (2 points)
  | 'function-menu-center-line-point-1'
  | 'function-menu-center-line-point-2'
  | 'function-menu-center-line-result'
  // Center circle states (3 points)
  | 'function-menu-center-circle-point-1'
  | 'function-menu-center-circle-point-2'
  | 'function-menu-center-circle-point-3'
  | 'function-menu-center-circle-result'
  // Calculator states
  | 'calculator-idle'
  | 'calculator-add'
  | 'calculator-sub'
  | 'calculator-multi'
  | 'calculator-div'
  // Bolt hole circle states
  | 'bolt-hole-intro'
  | 'bolt-hole-menu-select'
  | 'bolt-hole-circle-center-x'
  | 'bolt-hole-circle-center-y'
  | 'bolt-hole-circle-radius'
  | 'bolt-hole-circle-angle'
  | 'bolt-hole-circle-holes'
  | 'bolt-hole-circle-navigate'
  // Preset / Distance-to-Go states (US-008)
  | 'preset-select'
  | 'preset-input-x'
  | 'preset-input-y'
  | 'preset-input-z'
  | 'distance-to-go'
  // Settings menu states
  | 'settings-select-axis'
  | 'settings-menu';

// ─────────────────────────────────────────────────────────────────
// DRO CONTEXT - Discriminated union for feature-specific data
// ─────────────────────────────────────────────────────────────────

/** Base interface ensures all context types have a discriminator */
interface BaseDROStateData {
  readonly stateDataType: string;
}

/** Discriminated union - each feature has its own state data type */
export type DROStateData =
  | EmptyData
  | CenterFindingData
  | BoltHoleData
  | ArcData
  | CalculatorData
  | PresetData
  | SettingsData;

/** Compile-time assertion: all context types must extend BaseDROContext */
type _AssertContextHasType = DROStateData extends BaseDROStateData ? true : never;
// @ts-expect-error - Type is used only for compile-time assertion, not at runtime
const _assertContextHasType: _AssertContextHasType = true;

export interface EmptyData extends BaseDROStateData {
  readonly stateDataType: 'none';
}

export interface CenterFindingData extends BaseDROStateData {
  readonly stateDataType: 'center-finding';
  storedPoints: StoredPoint[];
  centerResult: AxisValues | null;
}

export interface BoltHoleData extends BaseDROStateData {
  readonly stateDataType: 'bolt-hole';
  boltHoleMode: 'CIRCLE' | 'ARC';
  centerX: number | null;
  centerY: number | null;
  radius: number | null;
  startAngle: number | null;
  holeCount: number | null;
  currentHole: number;
}

export interface ArcData extends BaseDROStateData {
  readonly stateDataType: 'arc';
  // TODO: define arc-specific fields when implementing arc feature
}

export interface CalculatorData extends BaseDROStateData {
  readonly stateDataType: 'calculator';
  firstValue: number | null;
  operation: 'ADD' | 'SUB' | 'MULTI' | 'DIV' | null;
  currentValue: number | string;
}

export interface PresetData extends BaseDROStateData {
  readonly stateDataType: 'preset';
  presetTargets: {
    X: number | null;  // Target in mm (null = not set)
    Y: number | null;
    Z: number | null;
  };
  activeInputAxis: 'X' | 'Y' | 'Z' | null;
}

/** Settings menu parameter types */
export type SettingsParameter =
  | 'SCALE_TYPE'      // LINEAR/ANGULAR
  | 'SC'              // Scale resolution
  | 'DP'              // Display resolution
  | 'RAD_DIA'         // Radius/Diameter
  | 'DIRECTION'       // LEFT/RIGHT
  | 'CALIB'           // Error compensation
  | 'ZERO_AP'         // Zero approach warning
  | 'BP_DIST'         // Backplane distance
  | 'BP_TOLR'         // Backplane tolerance
  | 'BEEP'            // Keypad beep
  | 'SLEEP_T'         // Sleep timer
  | 'SAV_CHG'         // Save changes
  | 'RST_DEF'         // Restore defaults
  | 'END';            // Exit menu

export interface SettingsData extends BaseDROStateData {
  readonly stateDataType: 'settings';
  /** Currently selected axis for configuration */
  selectedAxis: 'X' | 'Y' | 'Z' | null;
  /** Current menu parameter */
  currentParameter: SettingsParameter;
  /** Index in parameter list (for scrolling) */
  parameterIndex: number;
  /** Temporary config changes (not saved until SAV CHG) */
  tempConfig: Partial<import('../../types/nonVolatileMemory').NonVolatileMemory>;
}

/** Stored point for center finding operations */
export interface StoredPoint {
  X: number;
  Y: number;
  Z: number;
}

// ─────────────────────────────────────────────────────────────────
// DRO EVENTS - Raw key/button events, state machine interprets
// ─────────────────────────────────────────────────────────────────

export type DROEventPayload =
  // System events
  | { eventName: 'BOOT_STARTED'; skipBootMessage: boolean }
  | { eventName: 'BOOT_MESSAGE_TIMEOUT' }
  | { eventName: 'ABS_INC_TOGGLE_COMPLETE' }
  | { eventName: 'MILL_STATE_CHANGED' }
  | { eventName: 'BOLT_HOLE_INTRO_TIMEOUT' }
  // Raw key presses - keypad emits these without knowing current state
  | { eventName: 'KEY_0' }
  | { eventName: 'KEY_1' }
  | { eventName: 'KEY_2_DOWN' }
  | { eventName: 'KEY_3' }
  | { eventName: 'KEY_4_LEFT' }
  | { eventName: 'KEY_5' }
  | { eventName: 'KEY_6_RIGHT' }
  | { eventName: 'KEY_7' }
  | { eventName: 'KEY_8_UP' }
  | { eventName: 'KEY_9' }
  | { eventName: 'KEY_DECIMAL' }
  | { eventName: 'KEY_SIGN' }
  | { eventName: 'KEY_CLEAR' }
  | { eventName: 'KEY_ENTER' }
  // Programmatic buffer manipulation (for API use, not keypad)
  | { eventName: 'SET_INPUT_BUFFER'; value: string }
  // Button presses
  | { eventName: 'BTN_ABS_INC' }
  | { eventName: 'BTN_INCH_MM' }
  | { eventName: 'BTN_FUNCTION' }
  | { eventName: 'BTN_CALCULATOR' }
  | { eventName: 'BTN_ZERO_X' }
  | { eventName: 'BTN_ZERO_Y' }
  | { eventName: 'BTN_ZERO_Z' }
  | { eventName: 'BTN_DISTANCE_TO_GO' }
  // Axis selection buttons (select without zeroing)
  // In calculator mode, BTN_SELECT_Y cycles operations
  | { eventName: 'BTN_SELECT_X' }
  | { eventName: 'BTN_SELECT_Y' }
  | { eventName: 'BTN_SELECT_Z' }
  // Secondary function buttons
  | { eventName: 'BTN_HALF' }
  | { eventName: 'BTN_BOLT_HOLE' }
  | { eventName: 'BTN_WRENCH' };

// ─────────────────────────────────────────────────────────────────
// STATE HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────

/** Check if state is a function menu selection state (not collecting points) */
export const isFunctionMenuSelectionState = (s: DROStateName): boolean =>
  s.startsWith('function-menu-') &&
  !s.includes('-point-') &&
  !s.includes('-result');

/** Check if state is in center line workflow */
export const isCenterLineState = (s: DROStateName): boolean =>
  s.includes('center-line-');

/** Check if state is in center circle workflow */
export const isCenterCircleState = (s: DROStateName): boolean =>
  s.includes('center-circle-');

/** Check if state is collecting points (any point-N state) */
export const isCollectingPoints = (s: DROStateName): boolean =>
  s.endsWith('-point-1') || s.endsWith('-point-2') || s.endsWith('-point-3');

/** Check if state is showing a result */
export const isResultState = (s: DROStateName): boolean => s.endsWith('-result');

/** Check if function menu is active (any function-menu-* state) */
export const isFunctionActive = (s: DROStateName): boolean =>
  s.startsWith('function-menu-');

/** Check if calculator mode is active */
export const isCalculatorActive = (s: DROStateName): boolean =>
  s.startsWith('calculator-');

/** Check if bolt hole mode is active */
export const isBoltHoleActive = (s: DROStateName): boolean =>
  s.startsWith('bolt-hole-');

/** Check if FN LED should be active (function menu or bolt hole modes) */
export const isFnLedActive = (s: DROStateName): boolean =>
  isFunctionActive(s) || isBoltHoleActive(s);

/** Check if preset/distance-to-go mode is active */
export const isPresetActive = (s: DROStateName): boolean =>
  s.startsWith('preset-') || s === 'distance-to-go';

/** Check if settings menu is active */
export const isSettingsActive = (s: DROStateName): boolean =>
  s.startsWith('settings-');

// ─────────────────────────────────────────────────────────────────
// INITIAL VALUES
// ─────────────────────────────────────────────────────────────────

export const INITIAL_DRO_STATE: DROStateName = 'boot';

export const INITIAL_DRO_STATE_DATA: DROStateData = { stateDataType: 'none' };

export const INITIAL_CENTER_FINDING_DATA: CenterFindingData = {
  stateDataType: 'center-finding',
  storedPoints: [],
  centerResult: null,
};

export const INITIAL_CALCULATOR_DATA: CalculatorData = {
  stateDataType: 'calculator',
  firstValue: null,
  operation: null,
  currentValue: 0,
};

export const INITIAL_BOLT_HOLE_DATA: BoltHoleData = {
  stateDataType: 'bolt-hole',
  boltHoleMode: 'CIRCLE',
  centerX: null,
  centerY: null,
  radius: null,
  startAngle: null,
  holeCount: null,
  currentHole: 1,
};

export const INITIAL_PRESET_DATA: PresetData = {
  stateDataType: 'preset',
  presetTargets: {
    X: null,
    Y: null,
    Z: null,
  },
  activeInputAxis: null,
};

export const INITIAL_SETTINGS_DATA: SettingsData = {
  stateDataType: 'settings',
  selectedAxis: null,
  currentParameter: 'SCALE_TYPE',
  parameterIndex: 0,
  tempConfig: {},
};

/**
 * Initial DRO state payload including vMem and display.
 * Used by context to initialize the reducer.
 */
export interface DROStatePayloadInit {
  stateName: DROStateName;
  stateData: DROStateData;
  vMem: VolatileMemoryState;
  display: DisplayState;
}

export const INITIAL_DRO_STATE_PAYLOAD: DROStatePayloadInit = {
  stateName: INITIAL_DRO_STATE,
  stateData: INITIAL_DRO_STATE_DATA,
  vMem: INITIAL_VOLATILE_MEMORY_STATE,
  display: createDisplay('', '', ''), // Blank until boot sequence sets display
};

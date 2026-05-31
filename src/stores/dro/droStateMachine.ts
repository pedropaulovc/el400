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
  // Arc contouring (step drilling) states (US-018)
  | 'arc-contour-intro'
  | 'arc-contour-center-x'
  | 'arc-contour-center-y'
  | 'arc-contour-radius'
  | 'arc-contour-start-angle'
  | 'arc-contour-end-angle'
  | 'arc-contour-tool-diameter'
  | 'arc-contour-cut-type'
  | 'arc-contour-max-cut'
  | 'arc-contour-navigate'
  // Preset / Distance-to-Go states (US-008)
  | 'preset-select'
  | 'preset-input-x'
  | 'preset-input-y'
  | 'preset-input-z'
  | 'distance-to-go'
  // Setup menu states (US-039)
  | 'setup-select'
  | 'setup-parameter';

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
  | SetupData;

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

/** Cut offset type for arc contouring (which side of the radius the tool runs). */
export type ArcCutType = 'INT' | 'EXT' | 'MID';

export interface ArcData extends BaseDROStateData {
  readonly stateDataType: 'arc';
  centerX: number | null;
  centerY: number | null;
  radius: number | null;
  startAngle: number | null;
  endAngle: number | null;
  toolDiameter: number | null;
  cutType: ArcCutType;
  maxCut: number | null;
  pointCount: number | null;
  currentPoint: number;
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

export interface SetupData extends BaseDROStateData {
  readonly stateDataType: 'setup';
  /** Axis being configured; null while showing the SELECT prompt. */
  selectedAxis: 'X' | 'Y' | 'Z' | null;
  /** Index into SETUP_PARAMETERS of the highlighted item. */
  currentParamIndex: number;
  /**
   * Uncommitted parameter values keyed by "<axis|GLOBAL>:<paramId>".
   * Per-axis params are scoped to selectedAxis; global params use the GLOBAL
   * key. Committed only on SAU CHG exit (US-027); discarded on End (AC 39.8).
   */
  draftValues: Record<string, string>;
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
  | { eventName: 'ARC_CONTOUR_INTRO_TIMEOUT' }
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
  | { eventName: 'BTN_SETUP' }
  // Axis selection buttons (select without zeroing)
  // In calculator mode, BTN_SELECT_Y cycles operations
  | { eventName: 'BTN_SELECT_X' }
  | { eventName: 'BTN_SELECT_Y' }
  | { eventName: 'BTN_SELECT_Z' }
  // Secondary function buttons
  | { eventName: 'BTN_HALF' }
  | { eventName: 'BTN_BOLT_HOLE' }
  | { eventName: 'BTN_ARC_CONTOUR' };

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

/** Check if arc contouring mode is active */
export const isArcContourActive = (s: DROStateName): boolean =>
  s.startsWith('arc-contour-');

/** Check if FN LED should be active (function menu, bolt hole, or arc contour modes) */
export const isFnLedActive = (s: DROStateName): boolean =>
  isFunctionActive(s) || isBoltHoleActive(s) || isArcContourActive(s);

/** Check if preset/distance-to-go mode is active */
export const isPresetActive = (s: DROStateName): boolean =>
  s.startsWith('preset-') || s === 'distance-to-go';

/** Check if setup menu is active (any setup-* state) */
export const isSetupActive = (s: DROStateName): boolean =>
  s.startsWith('setup-');

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

export const INITIAL_ARC_DATA: ArcData = {
  stateDataType: 'arc',
  centerX: null,
  centerY: null,
  radius: null,
  startAngle: null,
  endAngle: null,
  toolDiameter: null,
  cutType: 'INT',
  maxCut: null,
  pointCount: null,
  currentPoint: 1,
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

export const INITIAL_SETUP_DATA: SetupData = {
  stateDataType: 'setup',
  selectedAxis: null,
  currentParamIndex: 0,
  draftValues: {},
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

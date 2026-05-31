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
  // Angle hole (linear hole pattern) states (US-019)
  | 'angle-hole-intro'
  | 'angle-hole-start-x'
  | 'angle-hole-start-y'
  | 'angle-hole-pitch'
  | 'angle-hole-angle'
  | 'angle-hole-holes'
  | 'angle-hole-navigate'
  // Linear bolt hole states (US-029)
  | 'linear-bolt-hole-axis'
  | 'linear-bolt-hole-pitch'
  | 'linear-bolt-hole-holes'
  | 'linear-bolt-hole-navigate'
  // Grid drilling states (US-020)
  | 'grid-intro'
  | 'grid-start-x'
  | 'grid-start-y'
  | 'grid-pitch-x'
  | 'grid-pitch-y'
  | 'grid-angle'
  | 'grid-holes-x'
  | 'grid-holes-y'
  | 'grid-navigate'
  // Preset / Distance-to-Go states (US-008)
  | 'preset-select'
  | 'preset-input-x'
  | 'preset-input-y'
  | 'preset-input-z'
  | 'distance-to-go'
  // Setup menu states (US-039)
  | 'setup-select'
  | 'setup-parameter'
  // Taper calculation (lathe function, US-045)
  | 'function-menu-taper'
  | 'taper-active';

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
  | AngleHoleData
  | LinearBoltHoleData
  | GridData
  | ArcData
  | CalculatorData
  | PresetData
  | SetupData
  | TaperData;

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

export interface AngleHoleData extends BaseDROStateData {
  readonly stateDataType: 'angle-hole';
  startX: number | null;
  startY: number | null;
  pitch: number | null;
  lineAngle: number | null;
  holeCount: number | null;
  currentHole: number;
}

export interface LinearBoltHoleData extends BaseDROStateData {
  readonly stateDataType: 'linear-bolt-hole';
  /** Axis along which the linear pattern is generated (null until selected) */
  axis: 'X' | 'Y' | 'Z' | null;
  /** Spacing between holes, stored in mm (null until entered) */
  pitch: number | null;
  /** Total number of holes in the pattern (null until entered) */
  holeCount: number | null;
  /** 1-indexed current hole the user is navigating to */
  currentHole: number;
}

export interface GridData extends BaseDROStateData {
  readonly stateDataType: 'grid';
  startX: number | null;   // mm
  startY: number | null;   // mm
  pitchX: number | null;   // mm, spacing along grid X axis
  pitchY: number | null;   // mm, spacing along grid Y axis
  angle: number | null;    // degrees, tilt of grid X axis from machine +X
  holesX: number | null;   // columns
  holesY: number | null;   // rows
  currentHole: number;     // 1-indexed, row-major
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

export interface TaperData extends BaseDROStateData {
  readonly stateDataType: 'taper';
  /**
   * Machine position (mm) captured when the function was entered. The taper
   * Radius and Angle are derived from the travel relative to this point, so the
   * user can (but need not) zero the axes beforehand per the manual procedure.
   */
  entryX: number;
  entryY: number;
  entryZ: number;
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
  | { eventName: 'ANGLE_HOLE_INTRO_TIMEOUT' }
  | { eventName: 'GRID_INTRO_TIMEOUT' }
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
  | { eventName: 'BTN_ANGLE_HOLE' }
  | { eventName: 'BTN_GRID' };

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

/** Check if angle hole (linear hole pattern) mode is active */
export const isAngleHoleActive = (s: DROStateName): boolean =>
  s.startsWith('angle-hole-');

/** Check if linear bolt hole mode is active (US-029) */
export const isLinearBoltHoleActive = (s: DROStateName): boolean =>
  s.startsWith('linear-bolt-hole-');

/** Check if grid drilling mode is active (US-020) */
export const isGridActive = (s: DROStateName): boolean =>
  s.startsWith('grid-');

/** Check if FN LED should be active (function menu or pattern modes) */
export const isFnLedActive = (s: DROStateName): boolean =>
  isFunctionActive(s) ||
  isBoltHoleActive(s) ||
  isAngleHoleActive(s) ||
  isLinearBoltHoleActive(s) ||
  isGridActive(s) ||
  isTaperActive(s);

/** Check if preset/distance-to-go mode is active */
export const isPresetActive = (s: DROStateName): boolean =>
  s.startsWith('preset-') || s === 'distance-to-go';

/** Check if setup menu is active (any setup-* state) */
export const isSetupActive = (s: DROStateName): boolean =>
  s.startsWith('setup-');

/** Check if taper calculation mode is active (US-045) */
export const isTaperActive = (s: DROStateName): boolean =>
  s === 'taper-active';

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

export const INITIAL_ANGLE_HOLE_DATA: AngleHoleData = {
  stateDataType: 'angle-hole',
  startX: null,
  startY: null,
  pitch: null,
  lineAngle: null,
  holeCount: null,
  currentHole: 1,
};

export const INITIAL_LINEAR_BOLT_HOLE_DATA: LinearBoltHoleData = {
  stateDataType: 'linear-bolt-hole',
  axis: null,
  pitch: null,
  holeCount: null,
  currentHole: 1,
};

export const INITIAL_GRID_DATA: GridData = {
  stateDataType: 'grid',
  startX: null,
  startY: null,
  pitchX: null,
  pitchY: null,
  angle: null,
  holesX: null,
  holesY: null,
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

export const INITIAL_SETUP_DATA: SetupData = {
  stateDataType: 'setup',
  selectedAxis: null,
  currentParamIndex: 0,
  draftValues: {},
};

export const INITIAL_TAPER_DATA: TaperData = {
  stateDataType: 'taper',
  entryX: 0,
  entryY: 0,
  entryZ: 0,
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

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
  // Polar coordinate display states (US-030)
  | 'polar-select-plane'
  | 'polar-coordinates'
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
  // Calculator trig states (unary operations - US-014)
  | 'calculator-sin'
  | 'calculator-cos'
  | 'calculator-tan'
  | 'calculator-asin'
  | 'calculator-acos'
  | 'calculator-atan'
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
  // Angle hole (linear hole pattern) states (US-019)
  | 'angle-hole-intro'
  | 'angle-hole-start-x'
  | 'angle-hole-start-y'
  | 'angle-hole-pitch'
  | 'angle-hole-angle'
  | 'angle-hole-holes'
  | 'angle-hole-navigate'
  // Bolt hole arc states (US-017)
  | 'bolt-hole-arc-center-x'
  | 'bolt-hole-arc-center-y'
  | 'bolt-hole-arc-radius'
  | 'bolt-hole-arc-start-angle'
  | 'bolt-hole-arc-end-angle'
  | 'bolt-hole-arc-holes'
  | 'bolt-hole-arc-navigate'
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
  // Sub Datum Memory (SDM) states (US-009 Learn; extended by US-010/US-011)
  | 'sdm-intro'
  | 'sdm-menu-program'
  | 'sdm-menu-learn'
  | 'sdm-menu-run'
  | 'sdm-learn-step'
  | 'sdm-learn-position'
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
  | AngleHoleData
  | LinearBoltHoleData
  | GridData
  | SdmData
  | ArcData
  | CalculatorData
  | PresetData
  | PolarData
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
  /** End angle of the arc (ARC mode only); null in CIRCLE mode */
  endAngle: number | null;
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

/**
 * Maximum number of sub-datum steps the SDM can store (manual §8.2).
 * Steps are 1-indexed, so valid step numbers are 1..MAX_SDM_STEPS.
 */
export const MAX_SDM_STEPS = 1000;

/**
 * Which of the three SDM sub-functions is selected (manual §8.2).
 * Only LEARN is implemented in US-009; PROGRAM (US-010) and RUN (US-011)
 * reuse this same data model.
 */
export type SdmMode = 'PROGRAM' | 'LEARN' | 'RUN';

/**
 * Two-press capture phase for Learn mode (manual §8.2.2): the first X press
 * shows the current step number, the second stores the position and advances.
 * Modelled as a string enum (not a boolean) so it can safely cross functions.
 */
export type SdmLearnPhase = 'awaiting-first-press' | 'step-shown';

/**
 * Sub Datum Memory state data. Shared across the SDM trilogy
 * (US-009 Learn, US-010 Program, US-011 Run).
 *
 * `points` is a sparse map keyed by 1-indexed step number; a step is only
 * present once a position has been stored for it. Each entry holds X/Y/Z
 * coordinates in millimetres (internal storage unit).
 */
export interface SdmData extends BaseDROStateData {
  readonly stateDataType: 'sdm';
  sdmMode: SdmMode;
  points: Record<number, StoredPoint>;
  /** 1-indexed step currently being learned/programmed/run. */
  currentStep: number;
  /** Learn-mode two-press capture phase (unused outside learn states). */
  learnPhase: SdmLearnPhase;
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

/** Binary calculator operations (require two operands) */
export type CalculatorBinaryOperation = 'ADD' | 'SUB' | 'MULTI' | 'DIV';

/** Unary trig calculator operations (operate on a single operand) - US-014 */
export type CalculatorTrigOperation = 'SIN' | 'COS' | 'TAN' | 'ASIN' | 'ACOS' | 'ATAN';

/** All calculator operations cycled through with the Y key */
export type CalculatorOperation = CalculatorBinaryOperation | CalculatorTrigOperation;

export interface CalculatorData extends BaseDROStateData {
  readonly stateDataType: 'calculator';
  firstValue: number | null;
  operation: CalculatorOperation | null;
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

/** Plane selected for polar coordinate display (US-030) */
export type PolarPlane = 'X-Y' | 'X-Z' | 'Y-Z';

export interface PolarData extends BaseDROStateData {
  readonly stateDataType: 'polar';
  plane: PolarPlane;
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
  | { eventName: 'ANGLE_HOLE_INTRO_TIMEOUT' }
  | { eventName: 'GRID_INTRO_TIMEOUT' }
  | { eventName: 'SDM_INTRO_TIMEOUT' }
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
  | { eventName: 'BTN_ARC_CONTOUR' }
  | { eventName: 'BTN_ANGLE_HOLE' }
  | { eventName: 'BTN_GRID' }
  | { eventName: 'BTN_SDM' };

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

/** Check if polar coordinate mode is active (US-030) */
export const isPolarActive = (s: DROStateName): boolean =>
  s.startsWith('polar-');

/** Check if calculator mode is active */
export const isCalculatorActive = (s: DROStateName): boolean =>
  s.startsWith('calculator-');

/** Check if bolt hole mode is active */
export const isBoltHoleActive = (s: DROStateName): boolean =>
  s.startsWith('bolt-hole-');

/** Check if arc contouring mode is active */
export const isArcContourActive = (s: DROStateName): boolean =>
  s.startsWith('arc-contour-');

/** Check if angle hole (linear hole pattern) mode is active */
export const isAngleHoleActive = (s: DROStateName): boolean =>
  s.startsWith('angle-hole-');

/** Check if linear bolt hole mode is active (US-029) */
export const isLinearBoltHoleActive = (s: DROStateName): boolean =>
  s.startsWith('linear-bolt-hole-');

/** Check if grid drilling mode is active (US-020) */
export const isGridActive = (s: DROStateName): boolean =>
  s.startsWith('grid-');

/** Check if Sub Datum Memory mode is active (US-009/010/011) */
export const isSdmActive = (s: DROStateName): boolean =>
  s.startsWith('sdm-');

/** Check if FN LED should be active (function menu or pattern modes) */
export const isFnLedActive = (s: DROStateName): boolean =>
  isFunctionActive(s) ||
  isBoltHoleActive(s) ||
  isArcContourActive(s) ||
  isAngleHoleActive(s) ||
  isLinearBoltHoleActive(s) ||
  isGridActive(s) ||
  isPolarActive(s);

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
  endAngle: null,
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

export const INITIAL_SDM_DATA: SdmData = {
  stateDataType: 'sdm',
  sdmMode: 'LEARN',
  points: {},
  currentStep: 1,
  learnPhase: 'awaiting-first-press',
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

export const INITIAL_POLAR_DATA: PolarData = {
  stateDataType: 'polar',
  plane: 'X-Y',
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

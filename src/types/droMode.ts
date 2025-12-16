/**
 * DRO Mode State Machine Types
 *
 * Defines the unified DRO mode state machine that manages boot sequence,
 * mode toggles, and function menu states.
 */

import type { AxisValues } from './volatileMemory';

// ─────────────────────────────────────────────────────────────────
// DRO MODE STATE - Flat string union, no nested substates
// ─────────────────────────────────────────────────────────────────

export type DROModeState =
  // Boot sequence
  | 'boot'
  | 'showMessage'
  // Normal operation
  | 'idle'
  // Transitional toggle states
  | 'abs-inc-mode'
  | 'inch-mm-mode'
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
  | 'function-menu-center-circle-result';

// ─────────────────────────────────────────────────────────────────
// DRO MODE DATA - Discriminated union for feature-specific data
// ─────────────────────────────────────────────────────────────────

/** Base interface ensures all data types have a discriminator */
interface BaseDROModeData {
  readonly type: string;
}

/** Data is a discriminated union - each feature has its own data type */
export type DROModeData =
  | NoneData
  | CenterFindingData
  | BoltHoleData
  | ArcData;

/** Compile-time assertion: all data types must extend BaseDROModeData */
type _AssertDataHasType = DROModeData extends BaseDROModeData ? true : never;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _assertDataHasType: _AssertDataHasType = true;

export interface NoneData extends BaseDROModeData {
  readonly type: 'none';
}

export interface CenterFindingData extends BaseDROModeData {
  readonly type: 'center-finding';
  storedPoints: StoredPoint[];
  centerResult: AxisValues | null;
}

export interface BoltHoleData extends BaseDROModeData {
  readonly type: 'bolt-hole';
  holeCount: number;
  radius: number;
  startAngle: number;
  currentHole: number;
}

export interface ArcData extends BaseDROModeData {
  readonly type: 'arc';
  // TODO: define arc-specific fields when implementing arc feature
}

/** Stored point for center finding operations */
export interface StoredPoint {
  X: number;
  Y: number;
  Z: number;
}

// ─────────────────────────────────────────────────────────────────
// DRO MODE EVENTS - Raw key/button events, state machine interprets
// ─────────────────────────────────────────────────────────────────

export type DROModeEvent =
  // System events
  | { type: 'BOOT_COMPLETE'; skipMessage: boolean }
  | { type: 'BOOT_MESSAGE_TIMEOUT' }
  | { type: 'MODE_TOGGLE_COMPLETE' }
  // Raw key presses - keypad emits these without knowing current state
  | { type: 'KEY_0' }
  | { type: 'KEY_1' }
  | { type: 'KEY_2_DOWN' }
  | { type: 'KEY_3' }
  | { type: 'KEY_4_LEFT' }
  | { type: 'KEY_5' }
  | { type: 'KEY_6_RIGHT' }
  | { type: 'KEY_7' }
  | { type: 'KEY_8_UP' }
  | { type: 'KEY_9' }
  | { type: 'KEY_DECIMAL' }
  | { type: 'KEY_SIGN' }
  | { type: 'KEY_CLEAR' }
  | { type: 'KEY_ENTER' }
  // Button presses
  | { type: 'BTN_ABS_INC' }
  | { type: 'BTN_INCH_MM' }
  | { type: 'BTN_FUNCTION' }
  | { type: 'BTN_ZERO_X' }
  | { type: 'BTN_ZERO_Y' }
  | { type: 'BTN_ZERO_Z' }
  | { type: 'BTN_ZERO_ALL' }
  // Data payload for point storage
  | { type: 'POINT_DATA'; point: StoredPoint };

// ─────────────────────────────────────────────────────────────────
// STATE HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────

/** Check if state is a function menu selection state (not collecting points) */
export const isFunctionMenuSelectionState = (s: DROModeState): boolean =>
  s.startsWith('function-menu-') &&
  !s.includes('-point-') &&
  !s.includes('-result');

/** Check if state is in center line workflow */
export const isCenterLineState = (s: DROModeState): boolean =>
  s.includes('center-line-');

/** Check if state is in center circle workflow */
export const isCenterCircleState = (s: DROModeState): boolean =>
  s.includes('center-circle-');

/** Check if state is collecting points (any point-N state) */
export const isCollectingPoints = (s: DROModeState): boolean =>
  s.endsWith('-point-1') || s.endsWith('-point-2') || s.endsWith('-point-3');

/** Check if state is showing a result */
export const isResultState = (s: DROModeState): boolean => s.endsWith('-result');

/** Check if function menu is active (any function-menu-* state) */
export const isFunctionActive = (s: DROModeState): boolean =>
  s.startsWith('function-menu-');

// ─────────────────────────────────────────────────────────────────
// INITIAL VALUES
// ─────────────────────────────────────────────────────────────────

export const INITIAL_DRO_MODE_STATE: DROModeState = 'boot';

export const INITIAL_DRO_MODE_DATA: DROModeData = { type: 'none' };

export const INITIAL_CENTER_FINDING_DATA: CenterFindingData = {
  type: 'center-finding',
  storedPoints: [],
  centerResult: null,
};

/**
 * Operation State Machine Types
 *
 * Defines the unified operation state machine that manages DRO modes,
 * boot sequence, and function menu states.
 */

import type { AxisValues } from './volatileMemory';

// ─────────────────────────────────────────────────────────────────
// OPERATION STATE - Flat string union, no nested substates
// ─────────────────────────────────────────────────────────────────

export type OperationState =
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
// OPERATION CONTEXT - Discriminated union for feature-specific data
// ─────────────────────────────────────────────────────────────────

/** Base interface ensures all context types have a discriminator */
interface BaseOperationContext {
  readonly type: string;
}

/** Context is a discriminated union - each feature has its own context type */
export type OperationContext =
  | NoneContext
  | CenterFindingContext
  | BoltHoleContext
  | ArcContext;

/** Compile-time assertion: all contexts must extend BaseOperationContext */
type _AssertContextHasType = OperationContext extends BaseOperationContext
  ? true
  : never;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _assertContextHasType: _AssertContextHasType = true;

export interface NoneContext extends BaseOperationContext {
  readonly type: 'none';
}

export interface CenterFindingContext extends BaseOperationContext {
  readonly type: 'center-finding';
  storedPoints: StoredPoint[];
  centerResult: AxisValues | null;
}

export interface BoltHoleContext extends BaseOperationContext {
  readonly type: 'bolt-hole';
  holeCount: number;
  radius: number;
  startAngle: number;
  currentHole: number;
}

export interface ArcContext extends BaseOperationContext {
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
// OPERATION EVENTS - Raw key/button events, state machine interprets
// ─────────────────────────────────────────────────────────────────

export type OperationEvent =
  // System events
  | { type: 'BOOT_COMPLETE'; skipMessage: boolean }
  | { type: 'BOOT_MESSAGE_TIMEOUT' }
  | { type: 'MODE_TOGGLE_COMPLETE' }
  // Raw key presses - keypad emits these without knowing current state
  | { type: 'KEY_0' }
  | { type: 'KEY_1' }
  | { type: 'KEY_2' }
  | { type: 'KEY_3' }
  | { type: 'KEY_4' } // Also left navigation
  | { type: 'KEY_5' }
  | { type: 'KEY_6' } // Also right navigation
  | { type: 'KEY_7' }
  | { type: 'KEY_8' }
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
export const isFunctionMenuSelectionState = (s: OperationState): boolean =>
  s.startsWith('function-menu-') &&
  !s.includes('-point-') &&
  !s.includes('-result');

/** Check if state is in center line workflow */
export const isCenterLineState = (s: OperationState): boolean =>
  s.includes('center-line-');

/** Check if state is in center circle workflow */
export const isCenterCircleState = (s: OperationState): boolean =>
  s.includes('center-circle-');

/** Check if state is collecting points (any point-N state) */
export const isCollectingPoints = (s: OperationState): boolean =>
  s.endsWith('-point-1') || s.endsWith('-point-2') || s.endsWith('-point-3');

/** Check if state is showing a result */
export const isResultState = (s: OperationState): boolean =>
  s.endsWith('-result');

/** Check if function menu is active (any function-menu-* state) */
export const isFunctionActive = (s: OperationState): boolean =>
  s.startsWith('function-menu-');

// ─────────────────────────────────────────────────────────────────
// INITIAL VALUES
// ─────────────────────────────────────────────────────────────────

export const INITIAL_OPERATION_STATE: OperationState = 'boot';

export const INITIAL_OPERATION_CONTEXT: OperationContext = { type: 'none' };

export const INITIAL_CENTER_FINDING_CONTEXT: CenterFindingContext = {
  type: 'center-finding',
  storedPoints: [],
  centerResult: null,
};

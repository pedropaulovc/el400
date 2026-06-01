/**
 * Unit tests: Keypad Lock gate predicate + root-reducer gating (US-043).
 *
 * These exercise the pure `isEventBlockedByKeypadLock` predicate and the root
 * `droReducer` short-circuit it drives. The integration/e2e suites cover the
 * real setup-menu lock/unlock affordance and the live readout.
 *
 * @see project/user-stories/06-configuration/US-043-keypad-lock.md
 */

import { describe, it, expect } from 'vitest';
import { isEventBlockedByKeypadLock } from './keypad-lock';
import { droReducer } from '../reducer';
import { createTestState, DEFAULT_TEST_CONTEXT } from '../test-utils';
import type { DROReducerContext } from '../types';
import type { DROEventPayload } from '../droStateMachine';
import { DEFAULT_NON_VOLATILE_MEMORY } from '../../../types/nonVolatileMemory';
import { createDefaultMillState } from '../../../types/millState';

/** Context with the keypad lock engaged. */
const LOCKED_CONTEXT: DROReducerContext = {
  millState: createDefaultMillState('noop'),
  nvMem: { ...DEFAULT_NON_VOLATILE_MEMORY, keypadLock: 'on' },
};

/** Context with the keypad lock off (default). */
const UNLOCKED_CONTEXT = DEFAULT_TEST_CONTEXT;

describe('isEventBlockedByKeypadLock (US-043)', () => {
  it('blocks nothing while the keypad is unlocked (default LoC off)', () => {
    expect(isEventBlockedByKeypadLock('idle', 'BTN_ZERO_X', DEFAULT_NON_VOLATILE_MEMORY)).toBe(
      false
    );
    expect(isEventBlockedByKeypadLock('idle', 'KEY_5', DEFAULT_NON_VOLATILE_MEMORY)).toBe(false);
  });

  it('blocks every front-panel key/button while locked (AC 43.2/43.3)', () => {
    const locked = LOCKED_CONTEXT.nvMem;
    const blocked: DROEventPayload['eventName'][] = [
      'KEY_0',
      'KEY_5',
      'KEY_ENTER',
      'KEY_CLEAR',
      'KEY_DECIMAL',
      'KEY_SIGN',
      'KEY_2_DOWN',
      'KEY_4_LEFT',
      'KEY_6_RIGHT',
      'KEY_8_UP',
      'BTN_ZERO_X',
      'BTN_ZERO_Y',
      'BTN_ZERO_Z',
      'BTN_SELECT_X',
      'BTN_ABS_INC',
      'BTN_INCH_MM',
      'BTN_FUNCTION',
      'BTN_CALCULATOR',
      'BTN_HALF',
      'BTN_BOLT_HOLE',
      'BTN_SDM',
      'BTN_REFERENCE',
      'BTN_DISTANCE_TO_GO',
    ];
    for (const eventName of blocked) {
      expect(isEventBlockedByKeypadLock('idle', eventName, locked)).toBe(true);
    }
  });

  it('never blocks the wrench/setup key while locked (AC 43.2/43.4 unlock path)', () => {
    expect(isEventBlockedByKeypadLock('idle', 'BTN_SETUP', LOCKED_CONTEXT.nvMem)).toBe(false);
  });

  it('never blocks the live position update while locked (AC 43.5)', () => {
    expect(isEventBlockedByKeypadLock('idle', 'MILL_STATE_CHANGED', LOCKED_CONTEXT.nvMem)).toBe(
      false
    );
  });

  it('never blocks other internal/system events while locked', () => {
    const internal: DROEventPayload['eventName'][] = [
      'BOOT_STARTED',
      'BOOT_MESSAGE_TIMEOUT',
      'ABS_INC_TOGGLE_COMPLETE',
      'ENCODER_REF_MARK_CROSSED',
      'SET_INPUT_BUFFER',
    ];
    for (const eventName of internal) {
      expect(isEventBlockedByKeypadLock('idle', eventName, LOCKED_CONTEXT.nvMem)).toBe(false);
    }
  });

  it('does NOT gate keys once inside setup, so the operator can navigate to LoC (AC 43.4)', () => {
    // While locked but already in a setup-* state, the left/right/up/down/enter
    // keys must work -- that is the unlock navigation path.
    expect(isEventBlockedByKeypadLock('setup-select', 'BTN_SELECT_X', LOCKED_CONTEXT.nvMem)).toBe(
      false
    );
    expect(
      isEventBlockedByKeypadLock('setup-parameter', 'KEY_6_RIGHT', LOCKED_CONTEXT.nvMem)
    ).toBe(false);
    expect(isEventBlockedByKeypadLock('setup-parameter', 'KEY_ENTER', LOCKED_CONTEXT.nvMem)).toBe(
      false
    );
  });
});

describe('droReducer keypad-lock short-circuit (US-043)', () => {
  it('returns the current state UNCHANGED for a locked key (AC 43.3/43.7)', () => {
    // A BTN_ZERO_X in idle would normally zero the axis; while locked it is a no-op.
    const idle = createTestState('idle');
    const result = droReducer(idle, { eventName: 'BTN_ZERO_X' }, LOCKED_CONTEXT);
    expect(result).toBe(idle); // reference-equal: nothing was produced
  });

  it('still processes BTN_ZERO_X normally when unlocked', () => {
    const idle = createTestState('idle');
    const result = droReducer(idle, { eventName: 'BTN_ZERO_X' }, UNLOCKED_CONTEXT);
    // Unlocked, the axis-operations reducer handles it -> state changes.
    expect(result).not.toBe(idle);
  });

  it('keeps updating the display from MILL_STATE_CHANGED while locked (AC 43.5)', () => {
    // Locked, with a non-zero mill position; the idle reducer must still recompute
    // the display from the live position.
    const lockedMoving: DROReducerContext = {
      millState: { ...createDefaultMillState('noop'), position: { x: 5, y: 0, z: 0 }, connected: true },
      nvMem: { ...DEFAULT_NON_VOLATILE_MEMORY, keypadLock: 'on', defaultUnit: 'mm' },
    };
    const idle = createTestState('idle');
    const result = droReducer(idle, { eventName: 'MILL_STATE_CHANGED' }, lockedMoving);
    // The display reflects the live 5 mm X position (not gated). With default
    // offsets the idle display equals the raw position in the active unit.
    expect(Number(result.display.X)).toBeCloseTo(5, 4);
    // The reducer produced a fresh payload (the position update was processed).
    expect(result).not.toBe(idle);
  });

  it('lets the wrench/setup key open setup while locked (AC 43.4)', () => {
    const idle = createTestState('idle');
    const result = droReducer(idle, { eventName: 'BTN_SETUP' }, LOCKED_CONTEXT);
    expect(result.stateName).toBe('setup-select');
  });
});

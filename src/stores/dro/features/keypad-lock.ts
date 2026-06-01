/**
 * Keypad Lock gate (US-043, manual §6.2 `LoC`, video §1.12)
 *
 * When the operator saves `LoC on` from the setup menu, the front panel is
 * locked so nobody can accidentally zero an axis or change a value and lose the
 * datum (note *3). The lock affects INPUT ONLY -- the live position readout keeps
 * tracking the encoders while locked (AC 43.5).
 *
 * The lock is modelled as a global enum on non-volatile memory
 * (`nvMem.keypadLock: 'off' | 'on'`), not a leaked boolean: the reducer reads it
 * from context, and the `LoC` setup parameter (setup-parameters.ts) commits it.
 * Because the commit writes nvMem immediately and nvMem is localStorage-backed,
 * the lock state survives a power cycle (AC 43.6).
 *
 * The gate itself is a single pure predicate consulted at the very top of the
 * root reducer (reducer.ts). It is deliberately additive: it does not own any
 * state transition, it only decides whether a given event should be dropped
 * before the feature reducers run. Keeping it a predicate (rather than a feature
 * reducer that returns the unchanged state) avoids the "multiple reducers handled
 * the same event" conflict log, since a dropped event never reaches the
 * iteration.
 *
 * What stays allowed while locked (AC 43.2 / 43.4 / 43.5):
 *   - The 🔧 wrench/setup key (`BTN_SETUP`): the operator must still be able to
 *     enter setup to navigate to `LoC` and set `LoC off` to unlock.
 *   - Every event once setup is already active: inside `setup-*` states the
 *     left/right/up/down/enter keys are how the operator reaches `LoC` and
 *     unlocks, so the gate steps aside there.
 *   - All internal/system events (MILL_STATE_CHANGED position ticks, boot,
 *     timeouts, encoder marks, programmatic buffer sets): these are not
 *     front-panel keys, so the readout and machinery keep running.
 *
 * What is dropped while locked: every front-panel KEY_* / BTN_* press (other
 * than BTN_SETUP) made outside setup -- numeric keys, axis zero/select, mode
 * toggles, function/calculator, secondary functions. Pressing one is a no-op
 * (AC 43.3), which is exactly what protects the datum/ABS zero (AC 43.7).
 */

import type { DROStateName, DROEventPayload } from '../droStateMachine';
import { isSetupActive, isFrontPanelKey } from '../droStateMachine';
import type { NonVolatileMemory } from '../../../types/nonVolatileMemory';

/**
 * The one front-panel key that stays live while locked: the wrench/setup key,
 * the operator's only way back into setup to turn `LoC` off (AC 43.2 / 43.4).
 */
const UNLOCK_AFFORDANCE_EVENT = 'BTN_SETUP';

/**
 * Decide whether a locked keypad should drop this event before the feature
 * reducers run. Returns true only when ALL hold:
 *   - the keypad is locked (`nvMem.keypadLock === 'on'`),
 *   - the panel is not already in a setup state (so the unlock navigation keys
 *     stay live), and
 *   - the event is a front-panel key other than the wrench/setup key.
 *
 * When this returns true the root reducer short-circuits and returns the current
 * state unchanged (a true no-op, AC 43.3). When false, the event flows to the
 * feature reducers as normal.
 */
export function isEventBlockedByKeypadLock(
  stateName: DROStateName,
  eventName: DROEventPayload['eventName'],
  nvMem: NonVolatileMemory
): boolean {
  if (nvMem.keypadLock !== 'on') return false;
  // Inside setup the operator navigates to LoC and unlocks -- never gate there.
  if (isSetupActive(stateName)) return false;
  if (eventName === UNLOCK_AFFORDANCE_EVENT) return false;
  return isFrontPanelKey(eventName);
}

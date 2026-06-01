import { useCallback } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useDispatch } from '../stores/dro';
import type { DROEventPayload } from '../stores/dro/droStateMachine';
import { playClickSound } from '../utils/audio';

/**
 * Global keyboard shortcuts for power users (US-038).
 *
 * Returns an `onKeyDown` handler meant to be attached to the simulator's root
 * container. Because it is scoped to that container, shortcuts only fire while
 * focus is somewhere inside the simulator (AC 38.22) and never hijack the rest
 * of the page. It complements — and does not replace — the Tab navigation from
 * US-037: those shortcuts dispatch the very same DRO events the on-screen
 * buttons do, so behaviour stays in lockstep with the state machine.
 *
 * Design notes:
 * - Keyed off `event.code` (physical key) for cross-keyboard-layout stability.
 * - Ctrl/Alt/Meta chords are ignored so browser/OS shortcuts keep working.
 * - Shift is a real modifier here: Shift+X/Y/Z zero an axis, Shift+0 zeros all.
 * - Typing into an <input>, <textarea> or contentEditable element is left
 *   untouched, so future text fields never lose keystrokes to a shortcut.
 */

type Shortcut =
  | { kind: 'event'; event: DROEventPayload }
  | { kind: 'zero-all' };

// Plain-key map (no Shift). `event.code` → action.
const PLAIN_SHORTCUTS: Record<string, Shortcut> = {
  // Keypad digits
  Digit0: { kind: 'event', event: { eventName: 'KEY_0' } },
  Digit1: { kind: 'event', event: { eventName: 'KEY_1' } },
  Digit2: { kind: 'event', event: { eventName: 'KEY_2_DOWN' } },
  Digit3: { kind: 'event', event: { eventName: 'KEY_3' } },
  Digit4: { kind: 'event', event: { eventName: 'KEY_4_LEFT' } },
  Digit5: { kind: 'event', event: { eventName: 'KEY_5' } },
  Digit6: { kind: 'event', event: { eventName: 'KEY_6_RIGHT' } },
  Digit7: { kind: 'event', event: { eventName: 'KEY_7' } },
  Digit8: { kind: 'event', event: { eventName: 'KEY_8_UP' } },
  Digit9: { kind: 'event', event: { eventName: 'KEY_9' } },
  Numpad0: { kind: 'event', event: { eventName: 'KEY_0' } },
  Numpad1: { kind: 'event', event: { eventName: 'KEY_1' } },
  Numpad2: { kind: 'event', event: { eventName: 'KEY_2_DOWN' } },
  Numpad3: { kind: 'event', event: { eventName: 'KEY_3' } },
  Numpad4: { kind: 'event', event: { eventName: 'KEY_4_LEFT' } },
  Numpad5: { kind: 'event', event: { eventName: 'KEY_5' } },
  Numpad6: { kind: 'event', event: { eventName: 'KEY_6_RIGHT' } },
  Numpad7: { kind: 'event', event: { eventName: 'KEY_7' } },
  Numpad8: { kind: 'event', event: { eventName: 'KEY_8_UP' } },
  Numpad9: { kind: 'event', event: { eventName: 'KEY_9' } },

  // Arrow navigation (maps to the directional keypad digits)
  ArrowUp: { kind: 'event', event: { eventName: 'KEY_8_UP' } },
  ArrowDown: { kind: 'event', event: { eventName: 'KEY_2_DOWN' } },
  ArrowLeft: { kind: 'event', event: { eventName: 'KEY_4_LEFT' } },
  ArrowRight: { kind: 'event', event: { eventName: 'KEY_6_RIGHT' } },

  // Confirm / decimal / sign / clear
  Enter: { kind: 'event', event: { eventName: 'KEY_ENTER' } },
  NumpadEnter: { kind: 'event', event: { eventName: 'KEY_ENTER' } },
  Period: { kind: 'event', event: { eventName: 'KEY_DECIMAL' } },
  NumpadDecimal: { kind: 'event', event: { eventName: 'KEY_DECIMAL' } },
  Minus: { kind: 'event', event: { eventName: 'KEY_SIGN' } },
  NumpadSubtract: { kind: 'event', event: { eventName: 'KEY_SIGN' } },
  Escape: { kind: 'event', event: { eventName: 'KEY_CLEAR' } },
  Backspace: { kind: 'event', event: { eventName: 'KEY_CLEAR' } },

  // Axis select
  KeyX: { kind: 'event', event: { eventName: 'BTN_SELECT_X' } },
  KeyY: { kind: 'event', event: { eventName: 'BTN_SELECT_Y' } },
  KeyZ: { kind: 'event', event: { eventName: 'BTN_SELECT_Z' } },

  // Primary functions
  KeyW: { kind: 'event', event: { eventName: 'BTN_SETUP' } },
  KeyA: { kind: 'event', event: { eventName: 'BTN_ABS_INC' } },
  KeyU: { kind: 'event', event: { eventName: 'BTN_INCH_MM' } },
  KeyR: { kind: 'event', event: { eventName: 'BTN_REFERENCE' } },

  // Secondary functions
  KeyB: { kind: 'event', event: { eventName: 'BTN_BOLT_HOLE' } },
  KeyO: { kind: 'event', event: { eventName: 'BTN_ARC_CONTOUR' } },
  KeyG: { kind: 'event', event: { eventName: 'BTN_ANGLE_HOLE' } },
  KeyD: { kind: 'event', event: { eventName: 'BTN_GRID' } },
  KeyK: { kind: 'event', event: { eventName: 'BTN_CALCULATOR' } },
  KeyH: { kind: 'event', event: { eventName: 'BTN_HALF' } },
  KeyS: { kind: 'event', event: { eventName: 'BTN_SDM' } },
  KeyF: { kind: 'event', event: { eventName: 'BTN_FUNCTION' } },
};

// Shift-chord map. `event.code` → action when Shift is held.
const SHIFT_SHORTCUTS: Record<string, Shortcut> = {
  KeyX: { kind: 'event', event: { eventName: 'BTN_ZERO_X' } },
  KeyY: { kind: 'event', event: { eventName: 'BTN_ZERO_Y' } },
  KeyZ: { kind: 'event', event: { eventName: 'BTN_ZERO_Z' } },
  Digit0: { kind: 'zero-all' },
  Numpad0: { kind: 'zero-all' },
};

/**
 * True when the keystroke belongs to a focused interactive control or text
 * field rather than the simulator at large.
 *
 * - Text inputs / contentEditable keep their keystrokes (AC 38.22).
 * - Buttons (and other natively-activatable controls) own Enter/Space so the
 *   keyboard-navigation flow from US-037 (Tab to a button, press Enter/Space)
 *   is not double-dispatched by the global shortcut handler. Global shortcuts
 *   are meant for when focus rests on the simulator container itself.
 */
function isOwnedByControl(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  // `isContentEditable` is the live answer; the attribute check is a jsdom-safe
  // fallback since jsdom does not always compute the former from the attribute.
  if (target.isContentEditable || target.getAttribute('contenteditable') === 'true') {
    return true;
  }

  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    tag === 'BUTTON' ||
    tag === 'A'
  );
}

export interface UseKeyboardShortcutsResult {
  onKeyDown: (event: ReactKeyboardEvent) => void;
}

export function useKeyboardShortcuts(): UseKeyboardShortcutsResult {
  const dispatch = useDispatch();

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent) => {
      // Leave Ctrl/Alt/Meta chords to the browser and OS.
      if (event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }

      // Never steal keystrokes from a focused control or text field — those
      // are handled by the element itself (US-037 button activation, typing).
      if (isOwnedByControl(event.target)) {
        return;
      }

      const table = event.shiftKey ? SHIFT_SHORTCUTS : PLAIN_SHORTCUTS;
      const shortcut = table[event.code];
      if (!shortcut) {
        return;
      }

      // Handled key: suppress browser defaults (e.g. Backspace navigation) and beep.
      event.preventDefault();
      void playClickSound();

      if (shortcut.kind === 'zero-all') {
        dispatch({ eventName: 'BTN_ZERO_X' });
        dispatch({ eventName: 'BTN_ZERO_Y' });
        dispatch({ eventName: 'BTN_ZERO_Z' });
        return;
      }

      dispatch(shortcut.event);
    },
    [dispatch],
  );

  return { onKeyDown };
}

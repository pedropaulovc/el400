import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { useDROStore } from '../stores/droStore';
import { INITIAL_VOLATILE_MEMORY_STATE } from '../types/volatileMemory';
import { INITIAL_DISPLAY_STATE } from '../stores/dro/utils/displayComputation';
import type { DROEventPayload } from '../stores/dro/droStateMachine';

// Audio is irrelevant to dispatch logic; stub it so jsdom doesn't choke on AudioContext.
vi.mock('../utils/audio', () => ({ playClickSound: vi.fn() }));
import { playClickSound } from '../utils/audio';

/**
 * Builds a minimal React keyboard event stand-in that records preventDefault calls
 * and reports a non-input target by default (so the typing-guard does not trip).
 */
function makeKeyEvent(
  init: Partial<{ key: string; code: string; shiftKey: boolean; ctrlKey: boolean; altKey: boolean; metaKey: boolean }>,
  target: EventTarget = document.createElement('div'),
): { event: ReactKeyboardEvent; preventDefault: ReturnType<typeof vi.fn> } {
  const preventDefault = vi.fn();
  const event = {
    key: init.key ?? '',
    code: init.code ?? '',
    shiftKey: init.shiftKey ?? false,
    ctrlKey: init.ctrlKey ?? false,
    altKey: init.altKey ?? false,
    metaKey: init.metaKey ?? false,
    target,
    preventDefault,
  } as unknown as ReactKeyboardEvent;
  return { event, preventDefault };
}

function setIdle(): void {
  useDROStore.setState({
    stateName: 'idle',
    stateData: { stateDataType: 'none' },
    vMem: INITIAL_VOLATILE_MEMORY_STATE,
    display: INITIAL_DISPLAY_STATE,
  });
}

/** Captures the last event dispatched into the store by spying on dispatch. */
function spyDispatch(): { calls: DROEventPayload[] } {
  const calls: DROEventPayload[] = [];
  const original = useDROStore.getState().dispatch;
  useDROStore.setState({
    dispatch: (event: DROEventPayload) => {
      calls.push(event);
      original(event);
    },
  });
  return { calls };
}

function press(
  init: Partial<{ key: string; code: string; shiftKey: boolean; ctrlKey: boolean; altKey: boolean; metaKey: boolean }>,
  target?: EventTarget,
): { preventDefault: ReturnType<typeof vi.fn>; calls: DROEventPayload[] } {
  // Install the dispatch spy BEFORE rendering: the hook captures the store's
  // dispatch reference at render time, so the swap must already be in place.
  const spy = spyDispatch();
  const { result } = renderHook(() => useKeyboardShortcuts());
  const { event, preventDefault } = makeKeyEvent(init, target);
  result.current.onKeyDown(event);
  return { preventDefault, calls: spy.calls };
}

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    setIdle();
    vi.clearAllMocks();
  });

  describe('AC 38.1 — digits enter values', () => {
    const digits: [string, string, DROEventPayload['eventName']][] = [
      ['Digit0', '0', 'KEY_0'],
      ['Digit1', '1', 'KEY_1'],
      ['Digit5', '5', 'KEY_5'],
      ['Digit9', '9', 'KEY_9'],
      ['Numpad0', '0', 'KEY_0'],
      ['Numpad7', '7', 'KEY_7'],
    ];
    it.each(digits)('%s dispatches the matching KEY event', (code, key, expected) => {
      const { calls } = press({ code, key });
      expect(calls.map((c) => c.eventName)).toContain(expected);
    });
  });

  describe('AC 38.2 — arrows map to navigation', () => {
    const arrows: [string, DROEventPayload['eventName']][] = [
      ['ArrowUp', 'KEY_8_UP'],
      ['ArrowDown', 'KEY_2_DOWN'],
      ['ArrowLeft', 'KEY_4_LEFT'],
      ['ArrowRight', 'KEY_6_RIGHT'],
    ];
    it.each(arrows)('%s dispatches %s', (code, expected) => {
      const { calls } = press({ code, key: code });
      expect(calls.map((c) => c.eventName)).toContain(expected);
    });
  });

  describe('AC 38.3/38.4/38.5/38.6 — confirm, decimal, sign, clear', () => {
    it.each([
      ['Enter', 'KEY_ENTER'],
      ['NumpadEnter', 'KEY_ENTER'],
      ['Period', 'KEY_DECIMAL'],
      ['NumpadDecimal', 'KEY_DECIMAL'],
      ['Minus', 'KEY_SIGN'],
      ['NumpadSubtract', 'KEY_SIGN'],
      ['Escape', 'KEY_CLEAR'],
      ['Backspace', 'KEY_CLEAR'],
    ] as [string, DROEventPayload['eventName']][])('%s dispatches %s', (code, expected) => {
      const { calls } = press({ code, key: code });
      expect(calls.map((c) => c.eventName)).toContain(expected);
    });
  });

  describe('AC 38.7 — X/Y/Z select axis (no shift)', () => {
    it.each([
      ['KeyX', 'BTN_SELECT_X'],
      ['KeyY', 'BTN_SELECT_Y'],
      ['KeyZ', 'BTN_SELECT_Z'],
    ] as [string, DROEventPayload['eventName']][])('%s dispatches %s', (code, expected) => {
      const { calls } = press({ code, key: code.replace('Key', '').toLowerCase() });
      expect(calls.map((c) => c.eventName)).toContain(expected);
    });
  });

  describe('AC 38.8 — Shift+X/Y/Z zero axis', () => {
    it.each([
      ['KeyX', 'BTN_ZERO_X'],
      ['KeyY', 'BTN_ZERO_Y'],
      ['KeyZ', 'BTN_ZERO_Z'],
    ] as [string, DROEventPayload['eventName']][])('Shift+%s dispatches %s', (code, expected) => {
      const { calls } = press({ code, key: code.replace('Key', ''), shiftKey: true });
      expect(calls.map((c) => c.eventName)).toContain(expected);
    });
  });

  describe('AC 38.9-38.12 — primary functions', () => {
    it.each([
      ['KeyW', 'BTN_SETUP'],
      ['KeyA', 'BTN_ABS_INC'],
      ['KeyU', 'BTN_INCH_MM'],
      ['KeyR', 'BTN_REFERENCE'],
    ] as [string, DROEventPayload['eventName']][])('%s dispatches %s', (code, expected) => {
      const { calls } = press({ code, key: code.replace('Key', '').toLowerCase() });
      expect(calls.map((c) => c.eventName)).toContain(expected);
    });
  });

  describe('AC 38.13 — Shift+0 zeros all axes', () => {
    it('dispatches BTN_ZERO_X, BTN_ZERO_Y and BTN_ZERO_Z', () => {
      const { calls } = press({ code: 'Digit0', key: '0', shiftKey: true });
      const names = calls.map((c) => c.eventName);
      expect(names).toEqual(
        expect.arrayContaining(['BTN_ZERO_X', 'BTN_ZERO_Y', 'BTN_ZERO_Z']),
      );
    });

    it('does NOT enter a digit when Shift+0 is pressed', () => {
      const { calls } = press({ code: 'Digit0', key: '0', shiftKey: true });
      expect(calls.map((c) => c.eventName)).not.toContain('KEY_0');
    });
  });

  describe('AC 38.14-38.21 — secondary functions', () => {
    it.each([
      ['KeyB', 'BTN_BOLT_HOLE'],
      ['KeyO', 'BTN_ARC_CONTOUR'],
      ['KeyG', 'BTN_ANGLE_HOLE'],
      ['KeyD', 'BTN_GRID'],
      ['KeyK', 'BTN_CALCULATOR'],
      ['KeyH', 'BTN_HALF'],
      ['KeyS', 'BTN_SDM'],
      ['KeyF', 'BTN_FUNCTION'],
    ] as [string, DROEventPayload['eventName']][])('%s dispatches %s', (code, expected) => {
      const { calls } = press({ code, key: code.replace('Key', '').toLowerCase() });
      expect(calls.map((c) => c.eventName)).toContain(expected);
    });
  });

  describe('AC 38.22 — typing guard: ignore keys from text inputs', () => {
    it('does not dispatch when target is an <input>', () => {
      const input = document.createElement('input');
      const { calls } = press({ code: 'KeyX', key: 'x' }, input);
      expect(calls).toHaveLength(0);
    });

    it('does not dispatch when target is a <textarea>', () => {
      const textarea = document.createElement('textarea');
      const { calls } = press({ code: 'KeyA', key: 'a' }, textarea);
      expect(calls).toHaveLength(0);
    });

    it('does not dispatch when target is contentEditable', () => {
      const div = document.createElement('div');
      div.setAttribute('contenteditable', 'true');
      const { calls } = press({ code: 'KeyK', key: 'k' }, div);
      expect(calls).toHaveLength(0);
    });

    it('does not dispatch when a button owns the key (US-037 Enter/Space activation)', () => {
      const button = document.createElement('button');
      const { calls } = press({ code: 'Enter', key: 'Enter' }, button);
      expect(calls).toHaveLength(0);
    });
  });

  describe('modifier keys are ignored to avoid browser conflicts', () => {
    it.each(['ctrlKey', 'altKey', 'metaKey'] as const)('%s does not trigger a shortcut', (mod) => {
      const { calls } = press({ code: 'KeyX', key: 'x', [mod]: true });
      expect(calls).toHaveLength(0);
    });
  });

  describe('AC 38.23 — audio feedback', () => {
    it('plays the click sound for a handled shortcut', () => {
      press({ code: 'KeyX', key: 'x' });
      expect(playClickSound).toHaveBeenCalled();
    });

    it('does not play for an unhandled key', () => {
      press({ code: 'KeyQ', key: 'q' });
      expect(playClickSound).not.toHaveBeenCalled();
    });
  });

  describe('AC 38.24 — preventDefault for handled keys', () => {
    it('prevents default on a handled key (Backspace navigation)', () => {
      const { preventDefault } = press({ code: 'Backspace', key: 'Backspace' });
      expect(preventDefault).toHaveBeenCalled();
    });

    it('does not prevent default for an unhandled key', () => {
      const { preventDefault } = press({ code: 'KeyQ', key: 'q' });
      expect(preventDefault).not.toHaveBeenCalled();
    });
  });
});

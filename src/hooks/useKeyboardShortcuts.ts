/**
 * Hook for keyboard shortcuts in the EL400 DRO simulator.
 * Provides direct keyboard control mirroring the on-screen buttons.
 */

import { useEffect, useCallback, type RefObject } from 'react';
import { useVolatileMemory } from './useVolatileMemory';
import { useInputBufferContext } from '../context/InputBufferContext';
import { useNonVolatileMemoryContext } from '../context/NonVolatileMemoryContext';
import {
  useDROState,
  useDRODispatch,
  isFunctionMenuSelectionState,
  isCollectingPoints,
  isCalculatorActive,
} from '../dro-state-machine';
import { playClickSound } from '../utils/audio';

/**
 * Key mappings for keyboard shortcuts.
 * Uses event.code for consistent cross-browser behavior.
 */
const KEY_TO_DIGIT: Record<string, string> = {
  // Numpad digits
  Numpad0: '0',
  Numpad1: '1',
  Numpad2: '2',
  Numpad3: '3',
  Numpad4: '4',
  Numpad5: '5',
  Numpad6: '6',
  Numpad7: '7',
  Numpad8: '8',
  Numpad9: '9',
  // Top row digits
  Digit0: '0',
  Digit1: '1',
  Digit2: '2',
  Digit3: '3',
  Digit4: '4',
  Digit5: '5',
  Digit6: '6',
  Digit7: '7',
  Digit8: '8',
  Digit9: '9',
};

const ARROW_TO_DIGIT: Record<string, string> = {
  ArrowUp: '8',
  ArrowDown: '2',
  ArrowLeft: '4',
  ArrowRight: '6',
};

/**
 * Hook for keyboard shortcuts in the EL400 DRO simulator.
 * Must be called within all required providers (VolatileMemory, InputBuffer, DRO, NonVolatileMemory).
 *
 * @param containerRef - Reference to the simulator container element. Shortcuts only work when this element or its children have focus.
 */
export function useKeyboardShortcuts(containerRef: RefObject<HTMLElement | null>): void {
  const vMem = useVolatileMemory();
  const inputBuffer = useInputBufferContext();
  const droState = useDROState();
  const dispatch = useDRODispatch();
  const { nvMem, updateNvMem } = useNonVolatileMemoryContext();

  // Handler for number input (same logic as KeypadSection)
  const handleNumber = useCallback((num: string) => {
    if (num === '4') {
      if (isFunctionMenuSelectionState(droState)) {
        dispatch({ eventName: 'KEY_4_LEFT' });
        return;
      }
    }

    if (num === '6') {
      if (isFunctionMenuSelectionState(droState)) {
        dispatch({ eventName: 'KEY_6_RIGHT' });
        return;
      }
      if (isCollectingPoints(droState)) {
        dispatch({
          eventName: 'POINT_DATA',
          point: {
            X: vMem.displayValues.X,
            Y: vMem.displayValues.Y,
            Z: vMem.displayValues.Z,
          },
        });
        return;
      }
    }

    if (isCalculatorActive(droState)) {
      inputBuffer.appendDigit(num);
      return;
    }

    if (!vMem.activeAxis) {
      return;
    }
    inputBuffer.appendDigit(num);
  }, [droState, dispatch, vMem, inputBuffer]);

  // Handler for decimal input
  const handleDecimal = useCallback(() => {
    if (isCalculatorActive(droState)) {
      inputBuffer.appendDecimal();
      return;
    }
    if (!vMem.activeAxis) {
      return;
    }
    inputBuffer.appendDecimal();
  }, [droState, vMem.activeAxis, inputBuffer]);

  // Handler for sign toggle
  const handleSign = useCallback(() => {
    if (isCalculatorActive(droState)) {
      inputBuffer.toggleSign();
      return;
    }
    if (!vMem.activeAxis) {
      return;
    }
    inputBuffer.toggleSign();
  }, [droState, vMem.activeAxis, inputBuffer]);

  // Handler for clear
  const handleClear = useCallback(() => {
    inputBuffer.clear();
    dispatch({ eventName: 'KEY_CLEAR' });
  }, [inputBuffer, dispatch]);

  // Handler for enter
  const handleEnter = useCallback(() => {
    if (isFunctionMenuSelectionState(droState)) {
      dispatch({ eventName: 'KEY_ENTER' });
      return;
    }

    if (isCalculatorActive(droState)) {
      const value = inputBuffer.getValue();
      if (value !== null) {
        dispatch({ eventName: 'KEY_ENTER', value });
        inputBuffer.clear();
      }
      return;
    }

    if (!vMem.activeAxis) {
      return;
    }
    const value = inputBuffer.getValue();
    if (value !== null) {
      vMem.setAxisValue(vMem.activeAxis, value);
      inputBuffer.clear();
    }
  }, [droState, dispatch, vMem, inputBuffer]);

  // Handler for axis selection
  const handleAxisSelect = useCallback((axis: 'X' | 'Y' | 'Z') => {
    if (axis === 'Y' && isCalculatorActive(droState)) {
      dispatch({ eventName: 'KEY_6_RIGHT' });
      return;
    }
    vMem.selectAxis(axis);
  }, [droState, dispatch, vMem]);

  // Handler for axis zeroing
  const handleAxisZero = useCallback((axis: 'X' | 'Y' | 'Z') => {
    vMem.zeroAxis(axis);
  }, [vMem]);

  // Handler for unit toggle
  const handleToggleUnit = useCallback(() => {
    updateNvMem({ defaultUnit: nvMem.defaultUnit === 'inch' ? 'mm' : 'inch' });
  }, [nvMem.defaultUnit, updateNvMem]);

  // Handler for half
  const handleHalf = useCallback(() => {
    if (vMem.activeAxis) {
      vMem.halfAxis(vMem.activeAxis);
    }
  }, [vMem]);

  // Main keyboard event handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Only handle events when container or its children have focus
    const container = containerRef.current;
    if (!container) return;

    const target = event.target as HTMLElement;

    // Don't intercept events from input/textarea elements
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return;
    }

    // Don't intercept Enter/Space when a button is focused (let the button handle it)
    // This preserves Tab+Enter accessibility navigation from US-037
    if (target.tagName === 'BUTTON' && (event.code === 'Enter' || event.code === 'Space')) {
      return;
    }

    // Check if focus is within the container
    const activeElement = document.activeElement;
    if (!activeElement) {
      return;
    }
    if (!container.contains(activeElement) && activeElement !== container) {
      return;
    }

    let handled = false;

    // Handle digit keys (numpad and top row)
    const digit = KEY_TO_DIGIT[event.code];
    if (digit !== undefined && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
      handleNumber(digit);
      handled = true;
    }

    // Handle Shift+0 for Zero All
    if ((event.code === 'Digit0' || event.code === 'Numpad0') && event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
      vMem.zeroAll();
      handled = true;
    }

    // Handle arrow keys for navigation
    const arrowDigit = ARROW_TO_DIGIT[event.code];
    if (arrowDigit !== undefined && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
      handleNumber(arrowDigit);
      handled = true;
    }

    // Handle Enter
    if ((event.code === 'Enter' || event.code === 'NumpadEnter') && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
      handleEnter();
      handled = true;
    }

    // Handle Decimal
    if ((event.code === 'Period' || event.code === 'NumpadDecimal') && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
      handleDecimal();
      handled = true;
    }

    // Handle Sign toggle
    if ((event.code === 'Minus' || event.code === 'NumpadSubtract') && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
      handleSign();
      handled = true;
    }

    // Handle Clear
    if ((event.code === 'Escape' || event.code === 'Backspace') && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
      handleClear();
      handled = true;
    }

    // Handle Axis Selection (X, Y, Z)
    if (event.code === 'KeyX' && !event.ctrlKey && !event.altKey && !event.metaKey) {
      if (event.shiftKey) {
        handleAxisZero('X');
      } else {
        handleAxisSelect('X');
      }
      handled = true;
    }

    if (event.code === 'KeyY' && !event.ctrlKey && !event.altKey && !event.metaKey) {
      if (event.shiftKey) {
        handleAxisZero('Y');
      } else {
        handleAxisSelect('Y');
      }
      handled = true;
    }

    if (event.code === 'KeyZ' && !event.ctrlKey && !event.altKey && !event.metaKey) {
      if (event.shiftKey) {
        handleAxisZero('Z');
      } else {
        handleAxisSelect('Z');
      }
      handled = true;
    }

    // Primary Functions
    if (event.code === 'KeyA' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
      vMem.toggleMode();
      handled = true;
    }

    if (event.code === 'KeyU' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
      handleToggleUnit();
      handled = true;
    }

    // Secondary Functions
    if (event.code === 'KeyF' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
      dispatch({ eventName: 'BTN_FUNCTION' });
      handled = true;
    }

    if (event.code === 'KeyK' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
      dispatch({ eventName: 'BTN_CALCULATOR' });
      handled = true;
    }

    if (event.code === 'KeyH' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
      handleHalf();
      handled = true;
    }

    // Note: Shortcuts for unimplemented features (W, R, S, B, O, G, D) are intentionally
    // not registered to avoid blocking browser shortcuts until features are implemented.

    if (handled) {
      event.preventDefault();
      void playClickSound();
    }
  }, [
    containerRef,
    handleNumber,
    handleDecimal,
    handleSign,
    handleClear,
    handleEnter,
    handleAxisSelect,
    handleAxisZero,
    handleToggleUnit,
    handleHalf,
    vMem,
    dispatch,
  ]);

  // Set up event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

/**
 * Hook for managing numeric input buffer (keypad input accumulator).
 */

import { useState, useCallback } from 'react';

export interface UseInputBufferReturn {
  /** Current buffer content as string */
  buffer: string;
  /** Append a digit (0-9) to the buffer */
  appendDigit: (digit: string) => void;
  /** Append a decimal point (if not already present) */
  appendDecimal: () => void;
  /** Toggle the sign (positive/negative) */
  toggleSign: () => void;
  /** Clear the buffer */
  clear: () => void;
  /** Get the buffer value as a number (or null if empty/invalid) */
  getValue: () => number | null;
}

/**
 * Hook for managing numeric input buffer.
 * Used by KeypadSection to accumulate digit input before committing a value.
 */
export function useInputBuffer(): UseInputBufferReturn {
  const [buffer, setBuffer] = useState('');

  const appendDigit = useCallback((digit: string) => {
    setBuffer((prev) => prev + digit);
  }, []);

  const appendDecimal = useCallback(() => {
    setBuffer((prev) => {
      if (prev.includes('.')) {
        return prev; // Already has a decimal point
      }
      return prev + '.';
    });
  }, []);

  const toggleSign = useCallback(() => {
    setBuffer((prev) => {
      if (prev.startsWith('-')) {
        return prev.slice(1);
      }
      return '-' + prev;
    });
  }, []);

  const clear = useCallback(() => {
    setBuffer('');
  }, []);

  const getValue = useCallback(() => {
    if (!buffer || buffer === '-' || buffer === '.') {
      return null;
    }
    const value = parseFloat(buffer);
    return isNaN(value) ? null : value;
  }, [buffer]);

  return {
    buffer,
    appendDigit,
    appendDecimal,
    toggleSign,
    clear,
    getValue,
  };
}

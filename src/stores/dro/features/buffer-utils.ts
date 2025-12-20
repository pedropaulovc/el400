/**
 * Buffer Utilities
 *
 * Shared utility functions for input buffer manipulation.
 * Used by both keypadReducer (for idle state) and calculatorReducer (for calculator state).
 */

/**
 * Append a digit to the input buffer.
 */
export function appendDigit(buffer: string, digit: string): string {
  return buffer + digit;
}

/**
 * Append a decimal point (if not already present).
 */
export function appendDecimal(buffer: string): string {
  if (buffer.includes('.')) {
    return buffer; // Already has a decimal point
  }
  return buffer + '.';
}

/**
 * Toggle the sign (positive/negative).
 */
export function toggleSign(buffer: string): string {
  if (buffer.startsWith('-')) {
    return buffer.slice(1);
  }
  return '-' + buffer;
}

/**
 * Get the buffer value as a number (or null if empty/invalid).
 */
export function getBufferValue(buffer: string): number | null {
  if (!buffer || buffer === '-' || buffer === '.') {
    return null;
  }
  const value = parseFloat(buffer);
  return isNaN(value) ? null : value;
}

/**
 * Remove the last character from the input buffer (backspace).
 * Returns empty string if buffer becomes empty.
 */
export function removeLastChar(buffer: string): string {
  if (buffer.length === 0) {
    return '';
  }
  return buffer.slice(0, -1);
}

/**
 * Map key event names to their digit values.
 */
export const KEY_TO_DIGIT: Record<string, string> = {
  KEY_0: '0',
  KEY_1: '1',
  KEY_2_DOWN: '2',
  KEY_3: '3',
  KEY_4_LEFT: '4',
  KEY_5: '5',
  KEY_6_RIGHT: '6',
  KEY_7: '7',
  KEY_8_UP: '8',
  KEY_9: '9',
};

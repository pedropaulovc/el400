/**
 * Shared regex patterns used across app and tests.
 */
export const VALID_NUMBER_PATTERN = /^-?\d+(\.\d+)?$/;
export const EXTRACT_NUMBER_FROM_END_PATTERN = /-?\d+(\.\d+)?$/;

/**
 * Parse a numeric value from text content, with optional precision validation.
 *
 * @param textContent - The text to parse
 * @param axis - Axis name for error messages (e.g., "X", "Y", "Z")
 * @param precision - Number of decimal places to expect.
 *                   If 0, the number must be an integer with no decimal point.
 *                   If undefined, no precision validation is performed.
 * @returns The parsed number
 * @throws Error if the content cannot be parsed or doesn't match expected precision
 */
export function parseNumericValue(
  textContent: string,
  axis: string,
  precision?: number
): number {
  const context = ` for axis ${axis}`;

  // Validate precision parameter if provided
  if (precision !== undefined) {
    if (!Number.isInteger(precision)) {
      throw new Error(`precision must be a non-negative integer, got: ${String(precision)}`);
    }
    if (precision < 0) {
      throw new Error(`precision must be a non-negative integer, got: ${String(precision)}`);
    }
  }

  const trimmedContent = textContent.trim();
  const match = trimmedContent.match(EXTRACT_NUMBER_FROM_END_PATTERN);

  if (!match) {
    throw new Error(`Expected numeric value${context}, but no numeric match found in: ${textContent}`);
  }

  const parsedValue = parseFloat(match[0]);

  if (isNaN(parsedValue)) {
    throw new Error(`Expected numeric value${context}, but parsing resulted in NaN from: ${match[0]}`);
  }

  // Validate precision if specified
  if (precision !== undefined) {
    const numberString = match[0];
    if (precision === 0) {
      // For precision 0, ensure it's an integer (no decimal point)
      if (numberString.includes('.')) {
        throw new Error(`Expected integer value${context} with precision 0, but got: ${numberString}`);
      }
    } else {
      // For other precisions, check that we have exactly `precision` decimal digits
      const decimalIndex = numberString.indexOf('.');
      if (decimalIndex === -1) {
        throw new Error(`Expected decimal value${context} with precision ${String(precision)}, but got integer: ${numberString}`);
      }
      const decimalPlaces = numberString.length - decimalIndex - 1;
      if (decimalPlaces !== precision) {
        throw new Error(`Expected ${String(precision)} decimal places${context}, but got ${String(decimalPlaces)} in: ${numberString}`);
      }
    }
  }

  return parsedValue;
}

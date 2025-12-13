/**
 * Shared constants for test utilities
 */

/**
 * Regex pattern to match valid numeric values
 * Matches: optional negative sign, one or more digits, optional decimal point followed by digits
 * Examples: "123", "-456", "12.34", "-0.5"
 */
export const VALID_NUMBER_PATTERN = /^-?\d+(\.\d+)?$/;

/**
 * Regex pattern to extract numeric value from end of string
 * Used to parse numeric values that may have prefix text
 */
export const EXTRACT_NUMBER_FROM_END_PATTERN = /-?\d+(\.\d+)?$/;

/**
 * Shared constants for e2e test helpers
 */

/**
 * Regex pattern to match valid numeric values
 * Matches: optional negative sign, one or more digits, optional decimal point followed by digits
 * Examples: "123", "-456", "12.34", "-0.5"
 */
export const VALID_NUMBER_PATTERN = /^-?\d+(\.\d+)?$/;

/**
 * Regex pattern to extract numeric value from text
 * Removes all non-numeric characters except digits, decimal point, and negative sign
 */
export const EXTRACT_NUMBER_PATTERN = /[^\d.-]/g;

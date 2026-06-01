/**
 * Seven-segment digit formatting for the axis readout.
 *
 * Pure helpers that convert an axis value into the per-glyph sequence rendered by
 * SevenSegmentDigit. Kept out of the Axis component file so the component module
 * exports only a component (react-refresh) and so the sign/format logic is unit
 * testable in isolation.
 */

/** A single seven-segment cell: the glyph plus whether its decimal point is lit. */
export interface AxisDigit {
  char: string;
  hasDecimal: boolean;
}

/** Number of seven-segment cells in the axis readout. */
export const DISPLAY_WIDTH = 8;

/**
 * Convert a numeric axis value into the per-digit glyph sequence. The first glyph
 * is the sign cell: `'-'` for negatives, a blank space for non-negatives
 * (AC 2.6 — positives carry no sign).
 *
 * `decimals` is the fractional-digit count the dP display resolution selects for
 * this axis (US-022); it defaults to the panel maximum of 4, preserving the
 * standard readout for callers that do not vary precision.
 */
export const formatNumberValue = (num: number, decimals = 4): AxisDigit[] => {
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const formatted = absNum.toFixed(decimals);

  const result: AxisDigit[] = [];

  result.push({ char: isNegative ? '-' : ' ', hasDecimal: false });

  const parts = formatted.split('.');
  const intPart = parts[0] ?? '';
  const decPart = parts[1] ?? '';
  const paddedInt = intPart.padStart(3, ' ');

  for (let i = 0; i < paddedInt.length; i++) {
    result.push({
      char: paddedInt[i] ?? ' ',
      hasDecimal: i === paddedInt.length - 1,
    });
  }

  for (const char of decPart) {
    result.push({ char, hasDecimal: false });
  }

  return result;
};

import { VALID_NUMBER_PATTERN } from "@/lib/patterns";

/** Options governing how an axis display value is routed to seven-segment cells. */
export interface FormatAxisDigitsOptions {
  /** dP fractional-digit count applied to NUMERIC values (US-022). */
  decimals: number;
  /**
   * Whether this axis counts in angular mode (US-040). Angular values arrive as
   * pre-formatted DMS strings (e.g. "12.30.00", or "90.00" which must stay two
   * decimals) and are rendered verbatim through the text path, never re-parsed
   * as a number and re-padded to `decimals`.
   */
  isAngular: boolean;
}

/**
 * Route an axis display value to its seven-segment cells (US-040 AC 40.3).
 *
 * - Angular axes always render their pre-formatted DMS string verbatim (text path).
 * - Otherwise a number, or a numeric-looking string, renders through the number
 *   path with the dP `decimals`; any other string (menu labels) renders as text.
 */
export const formatAxisDigits = (
  value: number | string,
  options: FormatAxisDigitsOptions
): AxisDigit[] => {
  // Angular DMS strings are pre-formatted (intentional digit counts and group
  // separators); render verbatim so dP decimals never re-pad them.
  if (options.isAngular && typeof value === 'string') {
    return formatTextValue(value);
  }

  if (typeof value === 'number') {
    return formatNumberValue(value, options.decimals);
  }
  // A numeric-looking string gets the dP number path; any other string (menu
  // labels) renders as text.
  if (VALID_NUMBER_PATTERN.test(value.trim())) {
    return formatNumberValue(parseFloat(value), options.decimals);
  }
  return formatTextValue(value);
};

/** Convert a text value (e.g. menu label) into right-aligned seven-segment cells. */
export const formatTextValue = (text: string): AxisDigit[] => {
  const raw: AxisDigit[] = [];

  for (const char of text) {
    if (char === '.') {
      if (raw.length > 0) {
        const lastChar = raw[raw.length - 1];
        if (lastChar) {
          lastChar.hasDecimal = true;
        }
      }
      continue;
    }
    raw.push({ char, hasDecimal: false });
  }

  const truncated = raw.slice(-DISPLAY_WIDTH);
  const padded = Array.from({ length: DISPLAY_WIDTH - truncated.length }, () => ({ char: ' ', hasDecimal: false }));

  return padded.concat(truncated);
};

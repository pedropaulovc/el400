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

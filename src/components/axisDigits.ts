/** Pure seven-segment formatting: numeric coordinates or verbatim display text. */
import { formatDisplayNumber, DISPLAY_OVERFLOW_TEXT } from '../stores/dro/utils/displayComputation';

/** A single seven-segment cell: the glyph plus whether its decimal point is lit. */
export interface AxisDigit {
  char: string;
  hasDecimal: boolean;
}

/** One sign cell followed by seven numeric cells. */
export const DISPLAY_WIDTH = 8;

/** Coordinate formatting shares its decimal rounding and overflow policy with SR text. */
export const formatNumberValue = (num: number, decimals = 4): AxisDigit[] =>
  formatTextValue(formatDisplayNumber(num, decimals));

export interface FormatAxisDigitsOptions {
  /** dP fractional-digit count applied only to numeric coordinate values. */
  decimals: number;
}

/** Strings already carry their intended input/count/DMS formatting. */
export const formatAxisDigits = (
  value: number | string,
  options: FormatAxisDigitsOptions
): AxisDigit[] => typeof value === 'number'
  ? formatNumberValue(value, options.decimals)
  : formatTextValue(value);

/** Numeric text reserves the sign cell; ordinary messages and DMS retain text layout. */
export const formatTextValue = (text: string): AxisDigit[] => {
  if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) {
    const signed = text.startsWith('-') || text.startsWith('+');
    const magnitude = signed ? text.slice(1) : text;
    const digitCount = magnitude.length - (magnitude.includes('.') ? 1 : 0);
    if (digitCount > DISPLAY_WIDTH - 1) return formatTextValue(DISPLAY_OVERFLOW_TEXT);
    const digits: AxisDigit[] = Array.from({ length: DISPLAY_WIDTH }, () => ({ char: ' ', hasDecimal: false }));
    const signCell = digits[0];
    if (signed && signCell) signCell.char = text.charAt(0);
    let cursor = DISPLAY_WIDTH - digitCount;
    for (const char of magnitude) {
      if (char === '.') {
        const previous = digits[cursor - 1];
        if (previous) previous.hasDecimal = true;
      } else {
        const cell = digits[cursor];
        if (cell) cell.char = char;
        cursor++;
      }
    }
    return digits;
  }

  const raw: AxisDigit[] = [];
  for (const char of text) {
    if (char === '.') {
      const previous = raw[raw.length - 1];
      if (previous) previous.hasDecimal = true;
    } else {
      raw.push({ char, hasDecimal: false });
    }
  }
  const truncated = raw.slice(-DISPLAY_WIDTH);
  const padded = Array.from({ length: DISPLAY_WIDTH - truncated.length }, () => ({ char: ' ', hasDecimal: false }));
  return padded.concat(truncated);
};

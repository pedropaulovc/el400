import { describe, it, expect } from 'vitest';
import { formatAxisDigits, formatNumberValue, DISPLAY_WIDTH } from './axisDigits';

function glyphs(digits: { char: string; hasDecimal: boolean }[]): string {
  return digits.map((d) => (d.hasDecimal ? `${d.char}.` : d.char)).join('').trim();
}
function rawGlyphs(digits: { char: string; hasDecimal: boolean }[]): string {
  return digits.map((d) => (d.hasDecimal ? `${d.char}.` : d.char)).join('');
}

describe('formatAxisDigits numeric and verbatim text contract', () => {
  it('pads numeric coordinates to dP while preserving an input string exactly', () => {
    expect(glyphs(formatAxisDigits(3.25, { decimals: 4 }))).toBe('3.2500');
    expect(glyphs(formatAxisDigits('003.250', { decimals: 4 }))).toBe('003.250');
    expect(glyphs(formatAxisDigits('123.', { decimals: 4 }))).toBe('123.');
    expect(glyphs(formatAxisDigits('.5', { decimals: 4 }))).toBe('.5');
  });

  it('fits a seven-digit calibration entry without appending fractional digits', () => {
    const positive = formatAxisDigits('1296000', { decimals: 4 });
    expect(rawGlyphs(positive)).toBe(' 1296000');
    expect(positive).toHaveLength(DISPLAY_WIDTH);
    const negative = formatAxisDigits('-1296000', { decimals: 4 });
    expect(rawGlyphs(negative)).toBe('-1296000');
    expect(negative).toHaveLength(DISPLAY_WIDTH);
  });

  it('reports numeric input overflow instead of truncating digits or using the sign cell', () => {
    expect(rawGlyphs(formatAxisDigits('12345678', { decimals: 4 }))).toBe(' -------');
    expect(rawGlyphs(formatAxisDigits('-12345678', { decimals: 4 }))).toBe(' -------');
  });

  it('keeps a step count and padded stored timer literal', () => {
    expect(glyphs(formatAxisDigits('1000', { decimals: 4 }))).toBe('1000');
    expect(glyphs(formatAxisDigits('005', { decimals: 4 }))).toBe('005');
  });

  it('preserves ordinary messages and DMS group separators', () => {
    expect(glyphs(formatAxisDigits('SELECt', { decimals: 4 }))).toBe('SELECt');
    expect(glyphs(formatAxisDigits('90.00', { decimals: 4 }))).toBe('90.00');
    expect(glyphs(formatAxisDigits('12.500', { decimals: 4 }))).toBe('12.500');
    expect(glyphs(formatAxisDigits('12.30.00', { decimals: 4 }))).toBe('12.30.00');
  });
});

describe('fixed-width numeric coordinate rendering', () => {
  it.each([0, 1, 2, 3, 4])('always emits eight cells at %i decimals', (decimals) => {
    expect(formatNumberValue(0, decimals)).toHaveLength(DISPLAY_WIDTH);
    expect(formatNumberValue(1e20, decimals)).toHaveLength(DISPLAY_WIDTH);
  });

  it('right-aligns coordinates without lighting an unused decimal point', () => {
    expect(rawGlyphs(formatNumberValue(0, 3))).toBe('    0.000');
    expect(rawGlyphs(formatNumberValue(0, 4))).toBe('   0.0000');
    expect(rawGlyphs(formatNumberValue(0, 0))).toBe('       0');
  });

  it('renders both signs of the diameter-to-radius decimal midpoint symmetrically', () => {
    expect(rawGlyphs(formatNumberValue(4999.9995, 3))).toBe(' 5000.000');
    expect(rawGlyphs(formatNumberValue(-4999.9995, 3))).toBe('-5000.000');
  });

  it('shows dashes when rounding crosses the seven-digit boundary', () => {
    expect(rawGlyphs(formatNumberValue(999.99995, 4))).toBe(' -------');
    expect(rawGlyphs(formatNumberValue(-999.99995, 4))).toBe(' -------');
    expect(rawGlyphs(formatNumberValue(999.99994, 4))).toBe(' 999.9999');
  });
});

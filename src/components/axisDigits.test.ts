/**
 * Unit tests for the axis digit-routing decision (`formatAxisDigits`).
 *
 * The seven-segment row renders either a NUMBER (with dP decimal padding) or a
 * pre-formatted TEXT string (verbatim). Angular axes (US-040) always render
 * their value as text because it is a pre-formatted DMS string whose group
 * separators (e.g. "12.30.00") and intentional digit counts (e.g. "90.00" must
 * stay two decimals, not be re-padded to "90.0000") must not be re-parsed as a
 * plain number.
 */
import { describe, it, expect } from 'vitest';
import { formatAxisDigits, formatNumberValue, DISPLAY_WIDTH } from './axisDigits';

/** Re-join the rendered cells (sign + digits) into a comparable glyph string. */
function glyphs(digits: { char: string; hasDecimal: boolean }[]): string {
  return digits
    .map((d) => (d.hasDecimal ? `${d.char}.` : d.char))
    .join('')
    .trim();
}

/**
 * Re-join the cells WITHOUT trimming, so blank cells (and thus left/right
 * alignment) are preserved. A lit decimal renders "X.", blanks stay a space.
 */
function rawGlyphs(digits: { char: string; hasDecimal: boolean }[]): string {
  return digits.map((d) => (d.hasDecimal ? `${d.char}.` : d.char)).join('');
}

describe('formatAxisDigits — linear (numeric) routing', () => {
  it('pads a numeric value to the dP decimals (linear default)', () => {
    const digits = formatAxisDigits(3.25, { decimals: 4, isAngular: false });
    expect(glyphs(digits)).toBe('3.2500');
  });

  it('routes a numeric string through the number path with dP decimals', () => {
    const digits = formatAxisDigits('12.5', { decimals: 4, isAngular: false });
    expect(glyphs(digits)).toBe('12.5000');
  });

  it('routes a non-numeric text value (menu label) through the text path', () => {
    const digits = formatAxisDigits('SELECt', { decimals: 4, isAngular: false });
    expect(glyphs(digits)).toBe('SELECt');
  });
});

describe('formatNumberValue — panel-width alignment across dP resolutions', () => {
  // The panel is 8 physical cells (1 sign + 7 digit). A number must always fill
  // exactly 8 cells and right-align, regardless of how many fractional digits the
  // dP resolution selects. Coarser dP (fewer decimals) must not shift the reading
  // left, which would leave a trailing blank instead of a leading one.
  it.each([0, 1, 2, 3, 4])('emits exactly DISPLAY_WIDTH cells at %i decimals', (decimals) => {
    expect(formatNumberValue(0, decimals)).toHaveLength(DISPLAY_WIDTH);
  });

  it('right-aligns 0 at the 50-micron (3-decimal) dP resolution', () => {
    // Regression: changing dP from 5.0 (4 dec) to 50.0 (3 dec) must read
    // "    0.000" (4 leading blanks), NOT "   0.000 " (a trailing blank).
    const digits = formatNumberValue(0, 3);
    expect(rawGlyphs(digits)).toBe('    0.000');
  });

  it('right-aligns 0 at the 4-decimal default (unchanged)', () => {
    const digits = formatNumberValue(0, 4);
    expect(rawGlyphs(digits)).toBe('   0.0000');
  });
});

describe('formatAxisDigits — angular DMS routing (US-040 AC 40.3)', () => {
  it('renders a dd-mn value verbatim, NOT re-padded to dP decimals', () => {
    const digits = formatAxisDigits('90.00', { decimals: 4, isAngular: true });
    // Must stay "90.00" (two decimals), never "90.0000".
    expect(glyphs(digits)).toBe('90.00');
  });

  it('renders a dd-dec value verbatim at its own 3 decimals', () => {
    const digits = formatAxisDigits('12.500', { decimals: 4, isAngular: true });
    expect(glyphs(digits)).toBe('12.500');
  });

  it('renders a dd-mn-ss value with both group separators verbatim', () => {
    const digits = formatAxisDigits('12.30.00', { decimals: 4, isAngular: true });
    expect(glyphs(digits)).toBe('12.30.00');
  });
});

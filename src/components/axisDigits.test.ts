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
import { formatAxisDigits } from './axisDigits';

/** Re-join the rendered cells (sign + digits) into a comparable glyph string. */
function glyphs(digits: { char: string; hasDecimal: boolean }[]): string {
  return digits
    .map((d) => (d.hasDecimal ? `${d.char}.` : d.char))
    .join('')
    .trim();
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

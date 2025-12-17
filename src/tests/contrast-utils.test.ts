import { describe, it, expect } from 'vitest';
import {
  APPROX_EQUAL_CONTRAST_RATIO,
  MIN_ACCESSIBLE_CONTRAST_RATIO,
  MIN_HIGH_CONTRAST_RATIO,
  getContrastRatio,
  getLuminance,
  isTransparentColor,
  parseColor,
} from './contrast-utils';

describe('contrast-utils', () => {
  describe('constants', () => {
    it('defines expected contrast thresholds', () => {
      expect(MIN_HIGH_CONTRAST_RATIO).toBe(20);
      expect(MIN_ACCESSIBLE_CONTRAST_RATIO).toBe(17);
      expect(APPROX_EQUAL_CONTRAST_RATIO).toBe(1.2);
    });
  });

  describe('isTransparentColor', () => {
    it('returns true for "none"', () => {
      expect(isTransparentColor('none')).toBe(true);
    });

    it('returns true for "transparent"', () => {
      expect(isTransparentColor('transparent')).toBe(true);
    });

    it('returns true for rgba with alpha 0', () => {
      expect(isTransparentColor('rgba(0, 0, 0, 0)')).toBe(true);
      expect(isTransparentColor('rgba(255, 255, 255, 0)')).toBe(true);
      expect(isTransparentColor('rgba(100, 150, 200, 0)')).toBe(true);
    });

    it('returns true for rgba with alpha 0.0, 0.00, etc.', () => {
      expect(isTransparentColor('rgba(0, 0, 0, 0.0)')).toBe(true);
      expect(isTransparentColor('rgba(0, 0, 0, 0.00)')).toBe(true);
      expect(isTransparentColor('rgba(0, 0, 0, 0.000)')).toBe(true);
    });

    it('returns false for rgba with non-zero alpha', () => {
      expect(isTransparentColor('rgba(0, 0, 0, 0.5)')).toBe(false);
      expect(isTransparentColor('rgba(0, 0, 0, 0.9)')).toBe(false);
      expect(isTransparentColor('rgba(0, 0, 0, 1)')).toBe(false);
    });

    it('returns false for opaque rgb colors', () => {
      expect(isTransparentColor('rgb(0, 0, 0)')).toBe(false);
      expect(isTransparentColor('rgb(255, 255, 255)')).toBe(false);
    });
  });

  describe('parseColor', () => {
    it('parses rgb colors', () => {
      expect(parseColor('rgb(0, 0, 0)')).toEqual([0, 0, 0]);
      expect(parseColor('rgb(255, 255, 255)')).toEqual([255, 255, 255]);
      expect(parseColor('rgb(100, 150, 200)')).toEqual([100, 150, 200]);
    });

    it('parses rgba colors with non-zero alpha', () => {
      expect(parseColor('rgba(0, 0, 0, 1)')).toEqual([0, 0, 0]);
      expect(parseColor('rgba(255, 255, 255, 0.5)')).toEqual([255, 255, 255]);
    });

    it('returns null for transparent colors', () => {
      expect(parseColor('transparent')).toBeNull();
      expect(parseColor('none')).toBeNull();
      expect(parseColor('rgba(0, 0, 0, 0)')).toBeNull();
    });

    it('throws for unparseable colors', () => {
      expect(() => parseColor('red')).toThrow('Cannot parse color: red');
      expect(() => parseColor('#fff')).toThrow('Cannot parse color: #fff');
      expect(() => parseColor('invalid')).toThrow('Cannot parse color: invalid');
    });
  });

  describe('getLuminance', () => {
    it('returns 0 for black', () => {
      expect(getLuminance(0, 0, 0)).toBe(0);
    });

    it('returns 1 for white', () => {
      expect(getLuminance(255, 255, 255)).toBe(1);
    });

    it('returns expected luminance for red', () => {
      const lum = getLuminance(255, 0, 0);
      expect(lum).toBeCloseTo(0.2126, 4);
    });

    it('returns expected luminance for green', () => {
      const lum = getLuminance(0, 255, 0);
      expect(lum).toBeCloseTo(0.7152, 4);
    });

    it('returns expected luminance for blue', () => {
      const lum = getLuminance(0, 0, 255);
      expect(lum).toBeCloseTo(0.0722, 4);
    });
  });

  describe('getContrastRatio', () => {
    it('returns 21:1 for black vs white', () => {
      const ratio = getContrastRatio([0, 0, 0], [255, 255, 255]);
      expect(ratio).toBeCloseTo(21, 0);
    });

    it('returns 1:1 for same colors', () => {
      expect(getContrastRatio([0, 0, 0], [0, 0, 0])).toBe(1);
      expect(getContrastRatio([255, 255, 255], [255, 255, 255])).toBe(1);
      expect(getContrastRatio([128, 128, 128], [128, 128, 128])).toBe(1);
    });

    it('is symmetric (order does not matter)', () => {
      const ratio1 = getContrastRatio([0, 0, 0], [255, 255, 255]);
      const ratio2 = getContrastRatio([255, 255, 255], [0, 0, 0]);
      expect(ratio1).toBe(ratio2);
    });

    it('calculates expected ratio for gray vs white', () => {
      // Gray (128, 128, 128) vs White should be around 4.5:1
      const ratio = getContrastRatio([128, 128, 128], [255, 255, 255]);
      expect(ratio).toBeGreaterThan(3);
      expect(ratio).toBeLessThan(5);
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  MM_PER_INCH,
  mmToInch,
  inchToMm,
  convertForDisplay,
  convertFromDisplay,
} from '../unitConversion';

describe('unitConversion', () => {
  describe('constants', () => {
    it('should define MM_PER_INCH as 25.4', () => {
      expect(MM_PER_INCH).toBe(25.4);
    });
  });

  describe('mmToInch', () => {
    it('should convert 25.4 mm to 1 inch', () => {
      expect(mmToInch(25.4)).toBeCloseTo(1, 6);
    });

    it('should convert 50.8 mm to 2 inches', () => {
      expect(mmToInch(50.8)).toBeCloseTo(2, 6);
    });

    it('should convert 0 mm to 0 inches', () => {
      expect(mmToInch(0)).toBe(0);
    });

    it('should convert negative values correctly', () => {
      expect(mmToInch(-25.4)).toBeCloseTo(-1, 6);
    });

    it('should convert 100 mm to approximately 3.937 inches', () => {
      expect(mmToInch(100)).toBeCloseTo(3.937007874, 6);
    });
  });

  describe('inchToMm', () => {
    it('should convert 1 inch to 25.4 mm', () => {
      expect(inchToMm(1)).toBeCloseTo(25.4, 6);
    });

    it('should convert 2 inches to 50.8 mm', () => {
      expect(inchToMm(2)).toBeCloseTo(50.8, 6);
    });

    it('should convert 0 inches to 0 mm', () => {
      expect(inchToMm(0)).toBe(0);
    });

    it('should convert negative values correctly', () => {
      expect(inchToMm(-1)).toBeCloseTo(-25.4, 6);
    });

    it('should convert 3.937007874 inches to approximately 100 mm', () => {
      expect(inchToMm(3.937007874)).toBeCloseTo(100, 6);
    });
  });

  describe('convertForDisplay', () => {
    it('should return value as-is when display unit is mm', () => {
      expect(convertForDisplay(100, 'mm')).toBe(100);
      expect(convertForDisplay(25.4, 'mm')).toBe(25.4);
      expect(convertForDisplay(-50.8, 'mm')).toBe(-50.8);
    });

    it('should convert from mm to inch when display unit is inch', () => {
      expect(convertForDisplay(25.4, 'inch')).toBeCloseTo(1, 6);
      expect(convertForDisplay(50.8, 'inch')).toBeCloseTo(2, 6);
      expect(convertForDisplay(100, 'inch')).toBeCloseTo(3.937007874, 6);
    });

    it('should handle zero value', () => {
      expect(convertForDisplay(0, 'mm')).toBe(0);
      expect(convertForDisplay(0, 'inch')).toBe(0);
    });

    it('should handle negative values', () => {
      expect(convertForDisplay(-25.4, 'mm')).toBe(-25.4);
      expect(convertForDisplay(-25.4, 'inch')).toBeCloseTo(-1, 6);
    });
  });

  describe('convertFromDisplay', () => {
    it('should return value as-is when current unit is mm', () => {
      expect(convertFromDisplay(100, 'mm')).toBe(100);
      expect(convertFromDisplay(25.4, 'mm')).toBe(25.4);
      expect(convertFromDisplay(-50.8, 'mm')).toBe(-50.8);
    });

    it('should convert from inch to mm when current unit is inch', () => {
      expect(convertFromDisplay(1, 'inch')).toBeCloseTo(25.4, 6);
      expect(convertFromDisplay(2, 'inch')).toBeCloseTo(50.8, 6);
      expect(convertFromDisplay(3.937007874, 'inch')).toBeCloseTo(100, 6);
    });

    it('should handle zero value', () => {
      expect(convertFromDisplay(0, 'mm')).toBe(0);
      expect(convertFromDisplay(0, 'inch')).toBe(0);
    });

    it('should handle negative values', () => {
      expect(convertFromDisplay(-25.4, 'mm')).toBe(-25.4);
      expect(convertFromDisplay(-1, 'inch')).toBeCloseTo(-25.4, 6);
    });
  });

  describe('round-trip conversions', () => {
    it('should maintain precision through mm->inch->mm conversion', () => {
      const original = 100;
      const inches = mmToInch(original);
      const backToMm = inchToMm(inches);
      expect(backToMm).toBeCloseTo(original, 6);
    });

    it('should maintain precision through inch->mm->inch conversion', () => {
      const original = 5;
      const mm = inchToMm(original);
      const backToInch = mmToInch(mm);
      expect(backToInch).toBeCloseTo(original, 6);
    });

    it('should maintain precision through convertForDisplay and convertFromDisplay', () => {
      const originalMm = 76.2;
      const asInch = convertForDisplay(originalMm, 'inch');
      const backToMm = convertFromDisplay(asInch, 'inch');
      expect(backToMm).toBeCloseTo(originalMm, 6);
    });
  });
});

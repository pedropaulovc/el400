/**
 * Unit tests for unitConversion utilities
 */

import { describe, it, expect } from 'vitest';
import {
  MM_PER_INCH,
  mmToInch,
  inchToMm,
  fromAnyUnitToMm,
  fromMmToAnyUnit,
} from './unitConversion';

describe('unitConversion', () => {
  describe('constants', () => {
    it('should have correct conversion factor', () => {
      expect(MM_PER_INCH).toBe(25.4);
    });
  });

  describe('mmToInch', () => {
    it('should convert millimeters to inches correctly', () => {
      expect(mmToInch(25.4)).toBe(1);
      expect(mmToInch(50.8)).toBe(2);
      expect(mmToInch(0)).toBe(0);
      expect(mmToInch(254)).toBe(10);
    });

    it('should handle decimal values', () => {
      expect(mmToInch(12.7)).toBeCloseTo(0.5, 10);
      expect(mmToInch(6.35)).toBeCloseTo(0.25, 10);
    });

    it('should handle negative values', () => {
      expect(mmToInch(-25.4)).toBe(-1);
      expect(mmToInch(-50.8)).toBe(-2);
    });
  });

  describe('inchToMm', () => {
    it('should convert inches to millimeters correctly', () => {
      expect(inchToMm(1)).toBe(25.4);
      expect(inchToMm(2)).toBe(50.8);
      expect(inchToMm(0)).toBe(0);
      expect(inchToMm(10)).toBe(254);
    });

    it('should handle decimal values', () => {
      expect(inchToMm(0.5)).toBe(12.7);
      expect(inchToMm(0.25)).toBe(6.35);
    });

    it('should handle negative values', () => {
      expect(inchToMm(-1)).toBe(-25.4);
      expect(inchToMm(-2)).toBe(-50.8);
    });
  });

  describe('fromAnyUnitToMm', () => {
    it('should convert from inches to mm when unit is "inch"', () => {
      expect(fromAnyUnitToMm(1, 'inch')).toBe(25.4);
      expect(fromAnyUnitToMm(2, 'inch')).toBe(50.8);
      expect(fromAnyUnitToMm(0.5, 'inch')).toBe(12.7);
    });

    it('should pass through mm values when unit is "mm"', () => {
      expect(fromAnyUnitToMm(25.4, 'mm')).toBe(25.4);
      expect(fromAnyUnitToMm(50.8, 'mm')).toBe(50.8);
      expect(fromAnyUnitToMm(0, 'mm')).toBe(0);
    });

    it('should handle negative values', () => {
      expect(fromAnyUnitToMm(-1, 'inch')).toBe(-25.4);
      expect(fromAnyUnitToMm(-25.4, 'mm')).toBe(-25.4);
    });
  });

  describe('fromMmToAnyUnit', () => {
    it('should convert from mm to inches when unit is "inch"', () => {
      expect(fromMmToAnyUnit(25.4, 'inch')).toBe(1);
      expect(fromMmToAnyUnit(50.8, 'inch')).toBe(2);
      expect(fromMmToAnyUnit(12.7, 'inch')).toBeCloseTo(0.5, 10);
    });

    it('should pass through mm values when unit is "mm"', () => {
      expect(fromMmToAnyUnit(25.4, 'mm')).toBe(25.4);
      expect(fromMmToAnyUnit(50.8, 'mm')).toBe(50.8);
      expect(fromMmToAnyUnit(0, 'mm')).toBe(0);
    });

    it('should handle negative values', () => {
      expect(fromMmToAnyUnit(-25.4, 'inch')).toBe(-1);
      expect(fromMmToAnyUnit(-25.4, 'mm')).toBe(-25.4);
    });
  });

  describe('round-trip conversions', () => {
    it('should convert inch -> mm -> inch correctly', () => {
      const originalInch = 5.25;
      const mm = fromAnyUnitToMm(originalInch, 'inch');
      const backToInch = fromMmToAnyUnit(mm, 'inch');
      expect(backToInch).toBeCloseTo(originalInch, 10);
    });

    it('should convert mm -> inch -> mm correctly', () => {
      const originalMm = 133.35;
      const inch = fromMmToAnyUnit(originalMm, 'inch');
      const backToMm = fromAnyUnitToMm(inch, 'inch');
      expect(backToMm).toBeCloseTo(originalMm, 10);
    });

    it('should preserve mm values when no conversion is needed', () => {
      const value = 42.5;
      const result = fromMmToAnyUnit(fromAnyUnitToMm(value, 'mm'), 'mm');
      expect(result).toBe(value);
    });
  });
});

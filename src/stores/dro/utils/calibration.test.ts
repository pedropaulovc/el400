import { describe, expect, it } from 'vitest';
import { applyAxisCalibration, validCalibrationPoints } from './calibration';
import { DEFAULT_NON_VOLATILE_MEMORY } from '../../../types/nonVolatileMemory';
import { INITIAL_VOLATILE_MEMORY_STATE } from '../../../types/volatileMemory';
import type { AxisCalibration } from '../../../types/calibration';

function calibrated(calibration: AxisCalibration) {
  return { ...DEFAULT_NON_VOLATILE_MEMORY, calibration: { ...DEFAULT_NON_VOLATILE_MEMORY.calibration, X: calibration } };
}

describe('axis calibration', () => {
  it('applies LEC to signed raw coordinates without changing other axes', () => {
    const settings = calibrated({ kind: 'lec', factor: 100 / 100.125 });
    expect(applyAxisCalibration('X', 100.125, INITIAL_VOLATILE_MEMORY_STATE, settings)).toBeCloseTo(100, 12);
    expect(applyAxisCalibration('X', -200.25, INITIAL_VOLATILE_MEMORY_STATE, settings)).toBeCloseTo(-200, 12);
    expect(applyAxisCalibration('Y', 100.125, INITIAL_VOLATILE_MEMORY_STATE, settings)).toBe(100.125);
  });

  it('keeps SLEC inactive before reference, then continuously interpolates and extrapolates in the raw reference frame', () => {
    const settings = calibrated({ kind: 'slec', originMm: 5, points: [
      { measuredMm: 100, referenceMm: 101 }, { measuredMm: 200, referenceMm: 200 },
    ] });
    expect(applyAxisCalibration('X', 65, INITIAL_VOLATILE_MEMORY_STATE, settings)).toBe(65);
    const referenced = { ...INITIAL_VOLATILE_MEMORY_STATE, referenceMarks: { X: 10 } };
    expect(applyAxisCalibration('X', 15, referenced, settings)).toBe(15);
    expect(applyAxisCalibration('X', 65, referenced, settings)).toBeCloseTo(65.5, 12);
    expect(applyAxisCalibration('X', 115, referenced, settings)).toBeCloseTo(116, 12);
    expect(applyAxisCalibration('X', 165, referenced, settings)).toBeCloseTo(165.5, 12);
    expect(applyAxisCalibration('X', 265, referenced, settings)).toBeCloseTo(264.5, 12);
    expect(applyAxisCalibration('X', -35, referenced, settings)).toBeCloseTo(-35.5, 12);
    expect(applyAxisCalibration('X', 115 + 1e-6, referenced, settings) - applyAxisCalibration('X', 115 - 1e-6, referenced, settings)).toBeCloseTo(2e-6, 10);
  });

  it('supports descending-axis SLEC and rejects duplicate, reversed or nonfinite points', () => {
    const points = [{ measuredMm: -10, referenceMm: -11 }, { measuredMm: -20, referenceMm: -21 }];
    expect(validCalibrationPoints(points)).toBe(true);
    const settings = calibrated({ kind: 'slec', originMm: 0, points });
    expect(applyAxisCalibration('X', -15, { ...INITIAL_VOLATILE_MEMORY_STATE, referenceMarks: { X: 0 } }, settings)).toBe(-16);
    expect(validCalibrationPoints([{ measuredMm: 0, referenceMm: 1 }])).toBe(false);
    expect(validCalibrationPoints([{ measuredMm: 10, referenceMm: 11 }, { measuredMm: 10, referenceMm: 12 }])).toBe(false);
    expect(validCalibrationPoints([{ measuredMm: 10, referenceMm: -11 }])).toBe(false);
    expect(validCalibrationPoints([{ measuredMm: Infinity, referenceMm: 11 }])).toBe(false);
    const maximum = Array.from({ length: 99 }, (_, index) => ({ measuredMm: index + 1, referenceMm: index + 1.1 }));
    expect(validCalibrationPoints(maximum)).toBe(true);
    expect(validCalibrationPoints([...maximum, { measuredMm: 100, referenceMm: 100.1 }])).toBe(false);
  });
});

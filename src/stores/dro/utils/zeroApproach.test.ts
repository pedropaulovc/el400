import { describe, it, expect } from 'vitest';
import {
  nextAxisWarning,
  computeZeroApproach,
  approachDistanceMm,
  approachToleranceMm,
  isAnyZeroApproachActive,
  ZERO_APPROACH_OFF,
} from './zeroApproach';
import {
  DEFAULT_NON_VOLATILE_MEMORY,
  type NonVolatileMemory,
} from '../../../types/nonVolatileMemory';
import type { DisplayState } from './displayComputation';

const INCH_MM = 25.4;

function nv(overrides: Partial<NonVolatileMemory>): NonVolatileMemory {
  return { ...DEFAULT_NON_VOLATILE_MEMORY, ...overrides };
}

describe('zeroApproach unit conversion', () => {
  it('converts BP DIST inch string to mm', () => {
    expect(approachDistanceMm('0.002')).toBeCloseTo(0.002 * INCH_MM, 9);
    expect(approachDistanceMm('0.010')).toBeCloseTo(0.01 * INCH_MM, 9);
  });

  it('converts BP TOLR inch string to mm; zero tolerance is 0', () => {
    expect(approachToleranceMm('0')).toBe(0);
    expect(approachToleranceMm('0.005')).toBeCloseTo(0.005 * INCH_MM, 9);
  });
});

describe('nextAxisWarning hysteresis (AC24.3, AC24.6, AC24.10)', () => {
  const distMm = 0.01 * INCH_MM; // BP DIST 0.010"
  const tolMm = 0.005 * INCH_MM; // BP TOLR 0.005"

  it('disabled never warns even at zero (AC24.2 OFF)', () => {
    expect(nextAxisWarning(0, false, false, distMm, tolMm)).toBe(false);
    expect(nextAxisWarning(0, true, false, distMm, tolMm)).toBe(false);
  });

  it('engages when within BP DIST of zero (AC24.6)', () => {
    // 0.008" away, inside 0.010" band -> engage
    expect(nextAxisWarning(0.008 * INCH_MM, false, true, distMm, tolMm)).toBe(true);
  });

  it('does not engage outside BP DIST (AC24.6 boundary)', () => {
    // 0.015" away, outside 0.010" band -> off
    expect(nextAxisWarning(0.015 * INCH_MM, false, true, distMm, tolMm)).toBe(false);
  });

  it('stays engaged within the release band BP DIST + BP TOLR (hysteresis)', () => {
    // Active, now 0.012" away: > BP DIST (0.010) but <= BP DIST+TOLR (0.015) -> stay on
    expect(nextAxisWarning(0.012 * INCH_MM, true, true, distMm, tolMm)).toBe(true);
  });

  it('clears once past the release band', () => {
    // Active, now 0.016" away: > 0.015" release band -> off
    expect(nextAxisWarning(0.016 * INCH_MM, true, true, distMm, tolMm)).toBe(false);
  });

  it('treats non-finite distance as far (no warning)', () => {
    expect(nextAxisWarning(Infinity, false, true, distMm, tolMm)).toBe(false);
    expect(nextAxisWarning(NaN, true, true, distMm, tolMm)).toBe(false);
  });
});

function display(x: number, y: number | string, z: number | string): DisplayState {
  return { X: x, Y: y, Z: z };
}

// 'distance-to-go' is a context state where the warning is auto-enabled (AC24.9).
const CTX = 'distance-to-go' as const;

describe('computeZeroApproach per-axis (AC24.10)', () => {
  it('off entirely when disabled', () => {
    const settings = nv({ zeroApproachEnabled: false, defaultUnit: 'inch' });
    const next = computeZeroApproach(display(0.0, 0.0, 0.0), settings, ZERO_APPROACH_OFF, CTX);
    expect(next).toEqual({ X: false, Y: false, Z: false });
  });

  it('engages only the axis inside BP DIST, leaves others off', () => {
    const settings = nv({
      zeroApproachEnabled: true,
      zeroApproachDistance: '0.010',
      zeroApproachTolerance: '0',
      defaultUnit: 'inch',
    });
    // X within 0.010", Y outside, Z far text
    const next = computeZeroApproach(display(0.005, 0.05, 'SELECt'), settings, ZERO_APPROACH_OFF, CTX);
    expect(next).toEqual({ X: true, Y: false, Z: false });
  });

  it('respects hysteresis carried from previous state', () => {
    const settings = nv({
      zeroApproachEnabled: true,
      zeroApproachDistance: '0.010',
      zeroApproachTolerance: '0.005',
      defaultUnit: 'inch',
    });
    const prev = { X: true, Y: false, Z: false };
    // X now 0.012" — outside BP DIST but inside release band -> stays on
    const next = computeZeroApproach(display(0.012, 0.0, 0.0), settings, prev, CTX);
    expect(next.X).toBe(true);
  });

  it('works in mm units (display value already in mm)', () => {
    const settings = nv({
      zeroApproachEnabled: true,
      zeroApproachDistance: '0.010', // 0.254 mm
      zeroApproachTolerance: '0',
      defaultUnit: 'mm',
    });
    // 0.2 mm < 0.254 mm -> engage
    const next = computeZeroApproach(display(0.2, 5, 5), settings, ZERO_APPROACH_OFF, CTX);
    expect(next.X).toBe(true);
    expect(next.Y).toBe(false);
  });

  it('is off in non-context states (idle) even at zero (AC24.9 gating)', () => {
    const settings = nv({
      zeroApproachEnabled: true,
      zeroApproachDistance: '0.010',
      zeroApproachTolerance: '0',
      defaultUnit: 'inch',
    });
    // All axes at zero, but plain idle has no target being approached.
    const next = computeZeroApproach(display(0, 0, 0), settings, ZERO_APPROACH_OFF, 'idle');
    expect(next).toEqual({ X: false, Y: false, Z: false });
  });
});

describe('isAnyZeroApproachActive', () => {
  it('true when any axis active', () => {
    expect(isAnyZeroApproachActive({ X: false, Y: true, Z: false })).toBe(true);
  });
  it('false when all off', () => {
    expect(isAnyZeroApproachActive(ZERO_APPROACH_OFF)).toBe(false);
  });
});

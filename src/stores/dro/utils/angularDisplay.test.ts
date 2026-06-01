/**
 * Unit tests for the US-040 angular counting-mode display transform.
 *
 * An axis set to `angular` counting reads a rotary encoder, so its display is an
 * ANGLE in degrees (wrapped to [0, 360)) rather than a unit-converted linear
 * distance. The raw position value is treated as degrees and is NOT inch/mm
 * converted. Linear axes are untouched. Per-axis Direction still composes on top
 * (a reversed angular axis counts the other way, i.e. 360 - value).
 *
 * @see project/user-stories/06-configuration/US-040-counting-mode.md
 */
import { describe, it, expect } from 'vitest';
import {
  computeDisplayPosition,
  computeNormalDisplay,
  wrapDegrees,
} from './displayComputation';
import type { DROReducerContext } from '../types';
import type { VolatileMemoryState } from '../../../types/volatileMemory';
import { INITIAL_VOLATILE_MEMORY_STATE } from '../../../types/volatileMemory';
import {
  DEFAULT_NON_VOLATILE_MEMORY,
  type NonVolatileMemory,
  type CountingModeByAxis,
  type AxisDirectionByAxis,
} from '../../../types/nonVolatileMemory';
import { createDefaultMillState } from '../../../types/millState';

function makeNvMem(overrides: {
  countingMode?: Partial<CountingModeByAxis>;
  axisDirection?: Partial<AxisDirectionByAxis>;
  defaultUnit?: 'inch' | 'mm';
} = {}): NonVolatileMemory {
  return {
    ...DEFAULT_NON_VOLATILE_MEMORY,
    defaultUnit: overrides.defaultUnit ?? 'mm',
    countingMode: {
      ...DEFAULT_NON_VOLATILE_MEMORY.countingMode,
      ...overrides.countingMode,
    },
    axisDirection: {
      ...DEFAULT_NON_VOLATILE_MEMORY.axisDirection,
      ...overrides.axisDirection,
    },
  };
}

function manualContext(nvMem: NonVolatileMemory): DROReducerContext {
  return { millState: createDefaultMillState('noop'), nvMem };
}

function manualVMem(absoluteMm: Partial<VolatileMemoryState['manualAbsoluteValues']>): VolatileMemoryState {
  return {
    ...INITIAL_VOLATILE_MEMORY_STATE,
    mode: 'abs',
    manualAbsoluteValues: {
      ...INITIAL_VOLATILE_MEMORY_STATE.manualAbsoluteValues,
      ...absoluteMm,
    },
  };
}

describe('wrapDegrees', () => {
  it('passes through values already in [0, 360)', () => {
    expect(wrapDegrees(0)).toBe(0);
    expect(wrapDegrees(90)).toBe(90);
    expect(wrapDegrees(359.9)).toBeCloseTo(359.9, 6);
  });

  it('wraps values at and beyond 360 back into range', () => {
    expect(wrapDegrees(360)).toBe(0);
    expect(wrapDegrees(370)).toBe(10);
    expect(wrapDegrees(725)).toBe(5);
  });

  it('wraps negative values into [0, 360)', () => {
    expect(wrapDegrees(-10)).toBe(350);
    expect(wrapDegrees(-360)).toBe(0);
    expect(wrapDegrees(-365)).toBe(355);
  });
});

describe('computeDisplayPosition — angular counting mode (US-040)', () => {
  it('an angular axis shows the position as degrees, no unit conversion (AC 40.4)', () => {
    const ctx = manualContext(makeNvMem({ countingMode: { X: 'angular' }, defaultUnit: 'inch' }));
    // 90 "mm" of raw position is read as 90 degrees, NOT converted to inches.
    const vMem = manualVMem({ X: 90 });
    expect(computeDisplayPosition('X', vMem, ctx)).toBe(90);
  });

  it('wraps an angular value past a full revolution (AC 40.4)', () => {
    const ctx = manualContext(makeNvMem({ countingMode: { X: 'angular' } }));
    const vMem = manualVMem({ X: 450 }); // 450° -> 90°
    expect(computeDisplayPosition('X', vMem, ctx)).toBe(90);
  });

  it('a linear axis is unaffected and still unit-converts (AC 40.3)', () => {
    const ctx = manualContext(makeNvMem({ countingMode: { X: 'linear' }, defaultUnit: 'inch' }));
    const vMem = manualVMem({ X: 25.4 }); // 25.4 mm -> 1 inch
    expect(computeDisplayPosition('X', vMem, ctx)).toBeCloseTo(1, 10);
  });

  it('reversed Direction composes with angular (counts the other way -> wrapped)', () => {
    const ctx = manualContext(
      makeNvMem({ countingMode: { X: 'angular' }, axisDirection: { X: 'reversed' } })
    );
    const vMem = manualVMem({ X: 90 }); // reversed: -90 -> wrap -> 270
    expect(computeDisplayPosition('X', vMem, ctx)).toBe(270);
  });

  it('is per-axis: X angular, Y linear at the same time (AC 40.5)', () => {
    const ctx = manualContext(
      makeNvMem({ countingMode: { X: 'angular', Y: 'linear' }, defaultUnit: 'mm' })
    );
    const vMem = manualVMem({ X: 370, Y: 12 });
    expect(computeDisplayPosition('X', vMem, ctx)).toBe(10); // wrapped degrees
    expect(computeDisplayPosition('Y', vMem, ctx)).toBe(12); // linear mm
  });
});

describe('computeNormalDisplay — mixed angular/linear axes (AC 40.5)', () => {
  it('renders each axis per its own counting mode', () => {
    const ctx = manualContext(
      makeNvMem({ countingMode: { X: 'angular', Y: 'linear', Z: 'angular' }, defaultUnit: 'mm' })
    );
    const vMem = manualVMem({ X: 90, Y: 5, Z: -30 });
    expect(computeNormalDisplay(vMem, ctx)).toEqual({ X: 90, Y: 5, Z: 330 });
  });

  it('all-linear default leaves every axis as linear distance', () => {
    const ctx = manualContext(makeNvMem());
    const vMem = manualVMem({ X: 1, Y: 2, Z: 3 });
    expect(computeNormalDisplay(vMem, ctx)).toEqual({ X: 1, Y: 2, Z: 3 });
  });
});

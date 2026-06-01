/**
 * Unit tests for the US-040 angular display-resolution DMS formatter (AC 40.4 /
 * AC 40.3 angular half).
 *
 * An angular axis renders its wrapped-degrees value in one of three formats the
 * `dP` (angular) parameter selects (manual §6.2 `dd.mn` / `dd.mn.SS` / `dd.dEC`):
 *
 *   - `dd-mn`  degrees-minutes        : 12.5° -> "12.30"     (12°30')
 *   - `dd-mn-ss` degrees-minutes-secs : 12.5° -> "12.30.00"  (12°30'00")
 *   - `dd-dec` degrees-decimal        : 12.5° -> "12.500"
 *
 * The panel has no °/'/" glyphs, so DMS groups are separated by the seven-segment
 * decimal point exactly as the manual's format labels are written. The formatter
 * is pure and operates on an already-wrapped [0, 360) angle.
 *
 * @see project/user-stories/06-configuration/US-040-counting-mode.md (AC 40.3/40.4)
 */
import { describe, it, expect } from 'vitest';
import { formatAngularValue, computeDisplayPosition } from './displayComputation';
import type { DROReducerContext } from '../types';
import type { VolatileMemoryState } from '../../../types/volatileMemory';
import { INITIAL_VOLATILE_MEMORY_STATE } from '../../../types/volatileMemory';
import {
  DEFAULT_NON_VOLATILE_MEMORY,
  type NonVolatileMemory,
  type CountingModeByAxis,
  type AngularResolutionByAxis,
} from '../../../types/nonVolatileMemory';
import { createDefaultMillState } from '../../../types/millState';

function makeNvMem(overrides: {
  countingMode?: Partial<CountingModeByAxis>;
  angularResolution?: Partial<AngularResolutionByAxis>;
  defaultUnit?: 'inch' | 'mm';
} = {}): NonVolatileMemory {
  return {
    ...DEFAULT_NON_VOLATILE_MEMORY,
    defaultUnit: overrides.defaultUnit ?? 'mm',
    countingMode: {
      ...DEFAULT_NON_VOLATILE_MEMORY.countingMode,
      ...overrides.countingMode,
    },
    angularResolution: {
      ...DEFAULT_NON_VOLATILE_MEMORY.angularResolution,
      ...overrides.angularResolution,
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

describe('formatAngularValue — dd.dEC (degrees-decimal)', () => {
  it('renders 12.5° as a 3-decimal degree string', () => {
    expect(formatAngularValue(12.5, 'dd-dec')).toBe('12.500');
  });

  it('renders a whole degree with trailing zeros', () => {
    expect(formatAngularValue(90, 'dd-dec')).toBe('90.000');
  });

  it('renders 0° as 0.000', () => {
    expect(formatAngularValue(0, 'dd-dec')).toBe('0.000');
  });
});

describe('formatAngularValue — dd.mn (degrees-minutes)', () => {
  it('renders 12.5° as 12°30 -> "12.30"', () => {
    expect(formatAngularValue(12.5, 'dd-mn')).toBe('12.30');
  });

  it('zero-pads minutes below ten', () => {
    // 12.1° = 12° + 0.1*60 = 6' -> "12.06"
    expect(formatAngularValue(12.1, 'dd-mn')).toBe('12.06');
  });

  it('renders a whole degree as dd.00', () => {
    expect(formatAngularValue(90, 'dd-mn')).toBe('90.00');
  });

  it('carries 60 minutes up into the next degree', () => {
    // 12.999...° rounds minutes to 60 -> carry -> 13°00'
    expect(formatAngularValue(12.9999, 'dd-mn')).toBe('13.00');
  });
});

describe('formatAngularValue — dd.mn.SS (degrees-minutes-seconds)', () => {
  it('renders 12.5° as 12°30\'00" -> "12.30.00"', () => {
    expect(formatAngularValue(12.5, 'dd-mn-ss')).toBe('12.30.00');
  });

  it('renders seconds, zero-padding both minutes and seconds', () => {
    // 1.01° = 1° + 0.01*3600 = 36" -> 0'36" -> "1.00.36"
    expect(formatAngularValue(1.01, 'dd-mn-ss')).toBe('1.00.36');
  });

  it('renders a whole degree as dd.00.00', () => {
    expect(formatAngularValue(90, 'dd-mn-ss')).toBe('90.00.00');
  });

  it('carries 60 seconds up into minutes', () => {
    // 0.999722...° ~ 0°59'59" but rounds the last second to carry to 1°00'00"
    expect(formatAngularValue(0.99999, 'dd-mn-ss')).toBe('1.00.00');
  });
});

describe('formatAngularValue — wrap and negative safety', () => {
  it('wraps a value at/over 360 before formatting', () => {
    expect(formatAngularValue(370, 'dd-dec')).toBe('10.000');
    expect(formatAngularValue(360, 'dd-mn')).toBe('0.00');
  });

  it('wraps a negative value up into [0, 360)', () => {
    // -10° -> 350°
    expect(formatAngularValue(-10, 'dd-dec')).toBe('350.000');
    expect(formatAngularValue(-0.5, 'dd-mn')).toBe('359.30');
  });
});

describe('computeDisplayPosition — angular axis renders in its dP format (AC 40.3)', () => {
  it('renders the wrapped degrees through the dd-mn format', () => {
    const ctx = manualContext(
      makeNvMem({ countingMode: { X: 'angular' }, angularResolution: { X: 'dd-mn' } })
    );
    const vMem = manualVMem({ X: 12.5 });
    expect(computeDisplayPosition('X', vMem, ctx)).toBe('12.30');
  });

  it('renders the wrapped degrees through the dd-mn-ss format', () => {
    const ctx = manualContext(
      makeNvMem({ countingMode: { X: 'angular' }, angularResolution: { X: 'dd-mn-ss' } })
    );
    const vMem = manualVMem({ X: 12.5 });
    expect(computeDisplayPosition('X', vMem, ctx)).toBe('12.30.00');
  });

  it('renders the wrapped degrees through the dd-dec format', () => {
    const ctx = manualContext(
      makeNvMem({ countingMode: { X: 'angular' }, angularResolution: { X: 'dd-dec' } })
    );
    const vMem = manualVMem({ X: 12.5 });
    expect(computeDisplayPosition('X', vMem, ctx)).toBe('12.500');
  });

  it('still wraps an over-a-revolution angular value before formatting', () => {
    const ctx = manualContext(
      makeNvMem({ countingMode: { X: 'angular' }, angularResolution: { X: 'dd-dec' } })
    );
    const vMem = manualVMem({ X: 450 }); // 450° -> 90°
    expect(computeDisplayPosition('X', vMem, ctx)).toBe('90.000');
  });

  it('leaves a linear axis as a plain unit-converted number (regression)', () => {
    const ctx = manualContext(
      makeNvMem({ countingMode: { X: 'linear' }, defaultUnit: 'mm' })
    );
    const vMem = manualVMem({ X: 12.5 });
    expect(computeDisplayPosition('X', vMem, ctx)).toBe(12.5);
  });
});

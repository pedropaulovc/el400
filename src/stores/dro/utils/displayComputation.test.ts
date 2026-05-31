/**
 * Unit tests for the display-position computation, focused on the US-002
 * counting-direction transform (Task 2).
 *
 * The Direction transform is DISPLAY-ONLY: `computeDisplayPosition` multiplies the
 * post-datum mm value by `directionSign(axis, nvMem)` before unit conversion.
 * `computeAxisPositionMm` stays datum-only and is asserted to be untouched by
 * Direction. Covers AC 2.1 (tool's-eye +X increases under normal), AC 2.2 (sign
 * flips with Direction), AC 2.4 (Z depth-positive), and structurally supports
 * AC 2.3 (datum applied first, then sign).
 */
import { describe, it, expect } from 'vitest';
import {
  computeAxisPositionMm,
  computeDisplayPosition,
  computeNormalDisplay,
} from './displayComputation';
import type { DROReducerContext } from '../types';
import type { VolatileMemoryState } from '../../../types/volatileMemory';
import { INITIAL_VOLATILE_MEMORY_STATE } from '../../../types/volatileMemory';
import {
  DEFAULT_NON_VOLATILE_MEMORY,
  type NonVolatileMemory,
  type AxisDirectionByAxis,
  type ZDepthSense,
} from '../../../types/nonVolatileMemory';
import { createDefaultMillState } from '../../../types/millState';

const MM_PER_INCH = 25.4;

function makeNvMem(
  overrides: {
    axisDirection?: Partial<AxisDirectionByAxis>;
    zDepthSense?: ZDepthSense;
    defaultUnit?: 'inch' | 'mm';
  } = {}
): NonVolatileMemory {
  return {
    ...DEFAULT_NON_VOLATILE_MEMORY,
    defaultUnit: overrides.defaultUnit ?? 'mm',
    zDepthSense: overrides.zDepthSense ?? 'depth-negative',
    axisDirection: {
      ...DEFAULT_NON_VOLATILE_MEMORY.axisDirection,
      ...overrides.axisDirection,
    },
  };
}

/** Manual (non-connected) context with a given preset absolute position in mm. */
function manualContext(
  nvMem: NonVolatileMemory
): DROReducerContext {
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

describe('computeDisplayPosition — Direction transform', () => {
  describe('per-axis Direction sign (mm units)', () => {
    it('normal direction shows the positive value (AC 2.1)', () => {
      const ctx = manualContext(makeNvMem({ axisDirection: { X: 'normal' } }));
      const vMem = manualVMem({ X: 10 });
      expect(computeDisplayPosition('X', vMem, ctx)).toBe(10);
    });

    it('reversed direction flips the sign (AC 2.2)', () => {
      const ctx = manualContext(makeNvMem({ axisDirection: { X: 'reversed' } }));
      const vMem = manualVMem({ X: 10 });
      expect(computeDisplayPosition('X', vMem, ctx)).toBe(-10);
    });
  });

  describe('datum applied first, then Direction (AC 2.3 support)', () => {
    it('connected reversed with zero datum flips full position', () => {
      const ctx: DROReducerContext = {
        millState: { ...createDefaultMillState('cncjs'), connected: true, position: { x: 10, y: 0, z: 0 } },
        nvMem: makeNvMem({ axisDirection: { X: 'reversed' } }),
      };
      const vMem: VolatileMemoryState = {
        ...INITIAL_VOLATILE_MEMORY_STATE,
        mode: 'abs',
        workOffsets: { X: 0, Y: 0, Z: 0 },
      };
      expect(computeDisplayPosition('X', vMem, ctx)).toBe(-10);
    });

    it('reversed sign multiplies the post-datum value, not the raw machine position', () => {
      const ctx: DROReducerContext = {
        millState: { ...createDefaultMillState('cncjs'), connected: true, position: { x: 10, y: 0, z: 0 } },
        nvMem: makeNvMem({ axisDirection: { X: 'reversed' } }),
      };
      const vMem: VolatileMemoryState = {
        ...INITIAL_VOLATILE_MEMORY_STATE,
        mode: 'abs',
        workOffsets: { X: 4, Y: 0, Z: 0 },
      };
      // datum first: 10 - 4 = 6; then sign: -6
      expect(computeDisplayPosition('X', vMem, ctx)).toBe(-6);
    });
  });

  describe('Z depth-sense (AC 2.4)', () => {
    it('depth-positive inverts a positive Z value', () => {
      const ctx = manualContext(makeNvMem({ zDepthSense: 'depth-positive' }));
      const vMem = manualVMem({ Z: 5 });
      expect(computeDisplayPosition('Z', vMem, ctx)).toBe(-5);
    });

    it('Z reversed + depth-positive double-inverts back to positive', () => {
      const ctx = manualContext(
        makeNvMem({ axisDirection: { Z: 'reversed' }, zDepthSense: 'depth-positive' })
      );
      const vMem = manualVMem({ Z: 5 });
      expect(computeDisplayPosition('Z', vMem, ctx)).toBe(5);
    });

    it('depth-positive does not affect X', () => {
      const ctx = manualContext(makeNvMem({ zDepthSense: 'depth-positive' }));
      const vMem = manualVMem({ X: 7 });
      expect(computeDisplayPosition('X', vMem, ctx)).toBe(7);
    });
  });

  describe('inch units flip after conversion', () => {
    it('reversed X in inch mode yields the negative converted value', () => {
      const ctx = manualContext(
        makeNvMem({ axisDirection: { X: 'reversed' }, defaultUnit: 'inch' })
      );
      const vMem = manualVMem({ X: 25.4 });
      // 25.4 mm = 1 inch, reversed → -1
      expect(computeDisplayPosition('X', vMem, ctx)).toBeCloseTo(-1, 10);
    });

    it('normal X in inch mode is positive', () => {
      const ctx = manualContext(makeNvMem({ defaultUnit: 'inch' }));
      const vMem = manualVMem({ X: MM_PER_INCH });
      expect(computeDisplayPosition('X', vMem, ctx)).toBeCloseTo(1, 10);
    });
  });
});

describe('computeAxisPositionMm — datum-only, unaffected by Direction', () => {
  it('returns the raw post-datum mm regardless of axisDirection', () => {
    const reversedCtx = manualContext(
      makeNvMem({ axisDirection: { X: 'reversed', Y: 'reversed', Z: 'reversed' } })
    );
    const vMem = manualVMem({ X: 10, Y: 20, Z: 30 });
    expect(computeAxisPositionMm('X', vMem, reversedCtx)).toBe(10);
    expect(computeAxisPositionMm('Y', vMem, reversedCtx)).toBe(20);
    expect(computeAxisPositionMm('Z', vMem, reversedCtx)).toBe(30);
  });

  it('is unaffected by Z depth-positive', () => {
    const ctx = manualContext(makeNvMem({ zDepthSense: 'depth-positive' }));
    const vMem = manualVMem({ Z: 5 });
    expect(computeAxisPositionMm('Z', vMem, ctx)).toBe(5);
  });
});

describe('computeNormalDisplay — Direction across all three axes', () => {
  it('reflects per-axis Direction and Z depth-sense together', () => {
    const ctx = manualContext(
      makeNvMem({
        axisDirection: { X: 'reversed', Y: 'normal', Z: 'normal' },
        zDepthSense: 'depth-positive',
      })
    );
    const vMem = manualVMem({ X: 10, Y: 20, Z: 30 });
    const display = computeNormalDisplay(vMem, ctx);
    expect(display).toEqual({ X: -10, Y: 20, Z: -30 });
  });

  it('all-normal default leaves every axis positive', () => {
    const ctx = manualContext(makeNvMem());
    const vMem = manualVMem({ X: 1, Y: 2, Z: 3 });
    expect(computeNormalDisplay(vMem, ctx)).toEqual({ X: 1, Y: 2, Z: 3 });
  });
});

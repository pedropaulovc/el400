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
  ENCODER_FAIL_TEXT,
  measurementScale,
} from './displayComputation';
import type { MillState } from '../../../types/millState';
import type { DROReducerContext } from '../types';
import type { VolatileMemoryState } from '../../../types/volatileMemory';
import { INITIAL_VOLATILE_MEMORY_STATE } from '../../../types/volatileMemory';
import {
  DEFAULT_NON_VOLATILE_MEMORY,
  type NonVolatileMemory,
  type AxisDirectionByAxis,
  type ZDepthSense,
  type MeasurementModeByAxis,
} from '../../../types/nonVolatileMemory';
import { createDefaultMillState } from '../../../types/millState';

const MM_PER_INCH = 25.4;

function makeNvMem(
  overrides: {
    axisDirection?: Partial<AxisDirectionByAxis>;
    zDepthSense?: ZDepthSense;
    defaultUnit?: 'inch' | 'mm';
    measurementMode?: Partial<MeasurementModeByAxis>;
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
    measurementMode: {
      ...DEFAULT_NON_VOLATILE_MEMORY.measurementMode,
      ...overrides.measurementMode,
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

describe('datum and Direction are independent, composable transforms (AC 2.3)', () => {
  /** Connected context at a fixed machine point, with a chosen datum (workOffset). */
  function datumCtx(machineX: number, datumX: number, nvMem: NonVolatileMemory) {
    const ctx: DROReducerContext = {
      millState: {
        ...createDefaultMillState('cncjs'),
        connected: true,
        position: { x: machineX, y: 0, z: 0 },
      },
      nvMem,
    };
    const vMem: VolatileMemoryState = {
      ...INITIAL_VOLATILE_MEMORY_STATE,
      mode: 'abs',
      workOffsets: { X: datumX, Y: 0, Z: 0 },
    };
    return { ctx, vMem };
  }

  describe('pure datum effect — sign comes from the datum, Direction stays normal', () => {
    const normal = makeNvMem({ axisDirection: { X: 'normal' } });
    const MACHINE_X = 10;

    it('a datum on the - side of the point reads POSITIVE', () => {
      // Zero at machine 4: the point sits at +6 from that datum.
      const { ctx, vMem } = datumCtx(MACHINE_X, 4, normal);
      expect(computeDisplayPosition('X', vMem, ctx)).toBe(6);
    });

    it('a datum on the + side of the SAME point reads NEGATIVE', () => {
      // Zero at machine 15: the same point now sits at -5 from that datum.
      const { ctx, vMem } = datumCtx(MACHINE_X, 15, normal);
      expect(computeDisplayPosition('X', vMem, ctx)).toBe(-5);
    });

    it('the sign flip came purely from the datum: Direction was normal in both', () => {
      // directionSign('X', normal) === +1, so the negative above is datum-only.
      const { ctx } = datumCtx(MACHINE_X, 15, normal);
      expect(ctx.nvMem.axisDirection.X).toBe('normal');
    });
  });

  describe('Direction multiplies on top of the datum-derived magnitude', () => {
    const reversed = makeNvMem({ axisDirection: { X: 'reversed' } });
    const MACHINE_X = 10;

    it('a +6 (from datum 4) becomes -6 under reversed Direction', () => {
      const { ctx, vMem } = datumCtx(MACHINE_X, 4, reversed);
      expect(computeDisplayPosition('X', vMem, ctx)).toBe(-6);
    });

    it('a -5 (from datum 15) becomes +5 under reversed Direction', () => {
      // Independent of which datum produced the magnitude: reversed just multiplies.
      const { ctx, vMem } = datumCtx(MACHINE_X, 15, reversed);
      expect(computeDisplayPosition('X', vMem, ctx)).toBe(5);
    });

    it('reversed display value is exactly -1x the normal display value, same datum', () => {
      const { ctx: nCtx, vMem: nVMem } = datumCtx(MACHINE_X, 4, makeNvMem({ axisDirection: { X: 'normal' } }));
      const { ctx: rCtx, vMem: rVMem } = datumCtx(MACHINE_X, 4, reversed);
      // No encoder-fail override here, so both are numeric; assert as numbers.
      const normalVal = computeDisplayPosition('X', nVMem, nCtx) as number;
      const reversedVal = computeDisplayPosition('X', rVMem, rCtx) as number;
      expect(reversedVal).toBe(-normalVal);
    });
  });

  describe('orthogonality — Direction does not change WHICH datum you measure from', () => {
    const MACHINE_X = 10;

    it('the datum-relative magnitude (computeAxisPositionMm) is identical under normal and reversed', () => {
      const { ctx: nCtx, vMem } = datumCtx(MACHINE_X, 4, makeNvMem({ axisDirection: { X: 'normal' } }));
      const { ctx: rCtx } = datumCtx(MACHINE_X, 4, makeNvMem({ axisDirection: { X: 'reversed' } }));
      // Same datum (4), same point (10): the measured-from magnitude is 6 for both;
      // only the displayed SIGN differs. This proves the two transforms are orthogonal.
      expect(computeAxisPositionMm('X', vMem, nCtx)).toBe(6);
      expect(computeAxisPositionMm('X', vMem, rCtx)).toBe(6);
    });

    it('changing Direction leaves the chosen datum (workOffset) untouched', () => {
      const { ctx, vMem } = datumCtx(MACHINE_X, 15, makeNvMem({ axisDirection: { X: 'reversed' } }));
      // The datum is still 15 regardless of Direction; the magnitude measured from
      // it is -5, and the displayed value is +5 — datum unchanged, sign multiplied.
      expect(vMem.workOffsets.X).toBe(15);
      expect(computeAxisPositionMm('X', vMem, ctx)).toBe(-5);
      expect(computeDisplayPosition('X', vMem, ctx)).toBe(5);
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

describe('measurementScale — radius/diameter factor (US-041)', () => {
  it('radius is 1x (the mill default, AC 41.3)', () => {
    const nvMem = makeNvMem({ measurementMode: { X: 'radius' } });
    expect(measurementScale('X', nvMem)).toBe(1);
  });

  it('diameter is 2x (AC 41.4)', () => {
    const nvMem = makeNvMem({ measurementMode: { X: 'diameter' } });
    expect(measurementScale('X', nvMem)).toBe(2);
  });

  it('is independent per axis (AC 41.5)', () => {
    const nvMem = makeNvMem({ measurementMode: { X: 'diameter', Y: 'radius', Z: 'diameter' } });
    expect(measurementScale('X', nvMem)).toBe(2);
    expect(measurementScale('Y', nvMem)).toBe(1);
    expect(measurementScale('Z', nvMem)).toBe(2);
  });
});

describe('computeDisplayPosition — radius/diameter transform (US-041)', () => {
  it('radius mode shows the value 1:1 (AC 41.3)', () => {
    const ctx = manualContext(makeNvMem({ measurementMode: { X: 'radius' } }));
    const vMem = manualVMem({ X: 1 });
    expect(computeDisplayPosition('X', vMem, ctx)).toBe(1);
  });

  it('diameter mode doubles the displayed value — 1.000 reads 2.000 (AC 41.4)', () => {
    const ctx = manualContext(makeNvMem({ measurementMode: { X: 'diameter' } }));
    const vMem = manualVMem({ X: 1 });
    expect(computeDisplayPosition('X', vMem, ctx)).toBe(2);
  });

  it('doubling is per-axis: diameter X does not change radius Y (AC 41.5)', () => {
    const ctx = manualContext(makeNvMem({ measurementMode: { X: 'diameter', Y: 'radius' } }));
    const vMem = manualVMem({ X: 3, Y: 3 });
    expect(computeDisplayPosition('X', vMem, ctx)).toBe(6);
    expect(computeDisplayPosition('Y', vMem, ctx)).toBe(3);
  });

  it('diameter doubling composes with a reversed Direction (-x then ×2)', () => {
    const ctx = manualContext(
      makeNvMem({ axisDirection: { X: 'reversed' }, measurementMode: { X: 'diameter' } })
    );
    const vMem = manualVMem({ X: 5 });
    // sign first: -5; diameter scale: -10.
    expect(computeDisplayPosition('X', vMem, ctx)).toBe(-10);
  });

  it('diameter doubling is applied to the converted inch value, not raw mm', () => {
    const ctx = manualContext(
      makeNvMem({ measurementMode: { X: 'diameter' }, defaultUnit: 'inch' })
    );
    const vMem = manualVMem({ X: 25.4 });
    // 25.4 mm = 1 inch; diameter -> 2.0000 inch.
    expect(computeDisplayPosition('X', vMem, ctx)).toBeCloseTo(2, 10);
  });

  it('diameter is applied AFTER the datum subtraction (doubles the post-datum magnitude)', () => {
    const ctx: DROReducerContext = {
      millState: { ...createDefaultMillState('cncjs'), connected: true, position: { x: 10, y: 0, z: 0 } },
      nvMem: makeNvMem({ measurementMode: { X: 'diameter' } }),
    };
    const vMem: VolatileMemoryState = {
      ...INITIAL_VOLATILE_MEMORY_STATE,
      mode: 'abs',
      workOffsets: { X: 4, Y: 0, Z: 0 },
    };
    // datum first: 10 - 4 = 6; diameter: 12.
    expect(computeDisplayPosition('X', vMem, ctx)).toBe(12);
  });
});

describe('computeAxisPositionMm — datum-only, unaffected by measurement mode (US-041)', () => {
  it('returns the raw post-datum mm regardless of measurementMode', () => {
    const ctx = manualContext(
      makeNvMem({ measurementMode: { X: 'diameter', Y: 'diameter', Z: 'diameter' } })
    );
    const vMem = manualVMem({ X: 10, Y: 20, Z: 30 });
    expect(computeAxisPositionMm('X', vMem, ctx)).toBe(10);
    expect(computeAxisPositionMm('Y', vMem, ctx)).toBe(20);
    expect(computeAxisPositionMm('Z', vMem, ctx)).toBe(30);
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

describe('Encoder-fail warning — no SIG override (US-042)', () => {
  /** Connected context with a per-axis encoder signal state and ENF flag. */
  function enfContext(
    encoderSignal: MillState['encoderSignal'],
    encoderFailWarning: boolean
  ): DROReducerContext {
    return {
      millState: {
        ...createDefaultMillState('cncjs'),
        connected: true,
        position: { x: 10, y: 20, z: 30 },
        encoderSignal,
      },
      nvMem: { ...makeNvMem(), encoderFailWarning },
    };
  }

  const connectedVMem: VolatileMemoryState = {
    ...INITIAL_VOLATILE_MEMORY_STATE,
    mode: 'abs',
    workOffsets: { X: 0, Y: 0, Z: 0 },
  };

  it('shows no SIG on an axis that lost signal when ENF is on (AC 42.3)', () => {
    const ctx = enfContext({ X: 'lost', Y: 'ok', Z: 'ok' }, true);
    expect(computeDisplayPosition('X', connectedVMem, ctx)).toBe(ENCODER_FAIL_TEXT);
  });

  it('only the affected axis shows no SIG; others read position (AC 42.3)', () => {
    const ctx = enfContext({ X: 'lost', Y: 'ok', Z: 'ok' }, true);
    const display = computeNormalDisplay(connectedVMem, ctx);
    expect(display.X).toBe(ENCODER_FAIL_TEXT);
    expect(display.Y).toBe(20);
    expect(display.Z).toBe(30);
  });

  it('per-axis: a lost Z shows no SIG while X/Y read position (AC 42.3)', () => {
    const ctx = enfContext({ X: 'ok', Y: 'ok', Z: 'lost' }, true);
    const display = computeNormalDisplay(connectedVMem, ctx);
    expect(display.X).toBe(10);
    expect(display.Y).toBe(20);
    expect(display.Z).toBe(ENCODER_FAIL_TEXT);
  });

  it('with ENF off, a lost signal is silent — axis reads position (AC 42.4)', () => {
    const ctx = enfContext({ X: 'lost', Y: 'ok', Z: 'ok' }, false);
    expect(computeDisplayPosition('X', connectedVMem, ctx)).toBe(10);
    expect(computeNormalDisplay(connectedVMem, ctx)).toEqual({ X: 10, Y: 20, Z: 30 });
  });

  it('warning clears once the signal is restored (AC 42.5)', () => {
    const lost = enfContext({ X: 'lost', Y: 'ok', Z: 'ok' }, true);
    expect(computeDisplayPosition('X', connectedVMem, lost)).toBe(ENCODER_FAIL_TEXT);
    const restored = enfContext({ X: 'ok', Y: 'ok', Z: 'ok' }, true);
    expect(computeDisplayPosition('X', connectedVMem, restored)).toBe(10);
  });
});

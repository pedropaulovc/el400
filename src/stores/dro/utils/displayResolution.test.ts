/**
 * Unit tests for the dP display-resolution → decimal-places derivation (US-022).
 *
 * dP controls how many decimals the readout shows. It is purely a DISPLAY
 * transform (AC22.5): it never changes the stored mm position, only how many
 * fractional digits the seven-segment / screen-reader cells render.
 *
 * The simulator's 8-cell panel renders at most 4 fractional digits, so the
 * default (5 micron) and all finer values clamp to 4 decimals -- preserving the
 * device's and the existing codebase's universal 4-decimal default (AC22.2).
 * Only the coarse 50-micron value drops a decimal (3 places), matching the
 * manual / story anchor (0.002" -> 3 places).
 */

import { describe, it, expect } from 'vitest';
import {
  decimalsForDisplayResolution,
  axisDisplayDecimals,
} from './displayComputation';
import {
  DEFAULT_NON_VOLATILE_MEMORY,
  type DisplayResolutionValue,
} from '../../../types/nonVolatileMemory';

describe('decimalsForDisplayResolution (US-022)', () => {
  it('maps the 5-micron default to 4 decimals (AC22.2)', () => {
    expect(decimalsForDisplayResolution('5')).toBe(4);
  });

  it('clamps every fine value (<=20 micron) to the 4-decimal panel maximum', () => {
    const fine: DisplayResolutionValue[] = ['0.1', '0.2', '0.5', '1', '2', '5', '10', '20'];
    for (const v of fine) {
      expect(decimalsForDisplayResolution(v)).toBe(4);
    }
  });

  it('drops to 3 decimals at the coarse 50-micron value (AC22.4, 0.002")', () => {
    expect(decimalsForDisplayResolution('50')).toBe(3);
  });

  it('is monotonic non-increasing as resolution coarsens', () => {
    const ascending: DisplayResolutionValue[] = ['0.1', '0.2', '0.5', '1', '2', '5', '10', '20', '50'];
    const decimals = ascending.map(decimalsForDisplayResolution);
    for (let i = 1; i < decimals.length; i++) {
      expect(decimals[i]!).toBeLessThanOrEqual(decimals[i - 1]!);
    }
  });
});

describe('axisDisplayDecimals (US-022)', () => {
  it('returns 4 for every axis at the mill default (AC22.2)', () => {
    expect(axisDisplayDecimals('X', DEFAULT_NON_VOLATILE_MEMORY)).toBe(4);
    expect(axisDisplayDecimals('Y', DEFAULT_NON_VOLATILE_MEMORY)).toBe(4);
    expect(axisDisplayDecimals('Z', DEFAULT_NON_VOLATILE_MEMORY)).toBe(4);
  });

  it('reads per-axis dP independently (AC22.3)', () => {
    const nvMem = {
      ...DEFAULT_NON_VOLATILE_MEMORY,
      displayResolution: { X: '50' as const, Y: '5' as const, Z: '5' as const },
    };
    expect(axisDisplayDecimals('X', nvMem)).toBe(3);
    expect(axisDisplayDecimals('Y', nvMem)).toBe(4);
    expect(axisDisplayDecimals('Z', nvMem)).toBe(4);
  });

  it('is independent of scale resolution SC (AC22.3)', () => {
    const nvMem = {
      ...DEFAULT_NON_VOLATILE_MEMORY,
      scaleResolution: { X: '50' as const, Y: '50' as const, Z: '50' as const },
    };
    // SC coarsened, dP still default -> decimals unchanged.
    expect(axisDisplayDecimals('X', nvMem)).toBe(4);
  });
});

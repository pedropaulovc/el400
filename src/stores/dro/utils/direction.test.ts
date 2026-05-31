/**
 * Unit tests for the pure counting-direction sign helper (US-002, Task 1).
 *
 * `directionSign` is the data-layer foundation for AC 2.2 (Direction flips the
 * sign) and AC 2.4 (Z depth-positive preference). It is a pure function of nvMem;
 * its application to the display is covered by Task 2.
 */
import { describe, it, expect } from 'vitest';
import { directionSign } from './displayComputation';
import {
  DEFAULT_NON_VOLATILE_MEMORY,
  type NonVolatileMemory,
  type AxisDirectionByAxis,
  type ZDepthSense,
} from '../../../types/nonVolatileMemory';
import type { Axis } from '../../../types/volatileMemory';

function makeNvMem(
  axisDirection: AxisDirectionByAxis,
  zDepthSense: ZDepthSense = 'depth-negative'
): NonVolatileMemory {
  return { ...DEFAULT_NON_VOLATILE_MEMORY, axisDirection, zDepthSense };
}

describe('directionSign', () => {
  const axes: Axis[] = ['X', 'Y', 'Z'];

  describe('per-axis Direction truth table', () => {
    it.each(axes)('normal → +1 for %s', (axis) => {
      const nvMem = makeNvMem({ X: 'normal', Y: 'normal', Z: 'normal' });
      expect(directionSign(axis, nvMem)).toBe(1);
    });

    it.each(axes)('reversed → -1 for %s', (axis) => {
      const nvMem = makeNvMem({ X: 'reversed', Y: 'reversed', Z: 'reversed' });
      expect(directionSign(axis, nvMem)).toBe(-1);
    });

    it('is independent per axis', () => {
      const nvMem = makeNvMem({ X: 'reversed', Y: 'normal', Z: 'reversed' });
      expect(directionSign('X', nvMem)).toBe(-1);
      expect(directionSign('Y', nvMem)).toBe(1);
      expect(directionSign('Z', nvMem)).toBe(-1);
    });
  });

  describe('Z depth-sense composition', () => {
    it('depth-positive inverts Z (normal Z) → -1', () => {
      const nvMem = makeNvMem(
        { X: 'normal', Y: 'normal', Z: 'normal' },
        'depth-positive'
      );
      expect(directionSign('Z', nvMem)).toBe(-1);
    });

    it('depth-positive does not affect X or Y', () => {
      const nvMem = makeNvMem(
        { X: 'normal', Y: 'normal', Z: 'normal' },
        'depth-positive'
      );
      expect(directionSign('X', nvMem)).toBe(1);
      expect(directionSign('Y', nvMem)).toBe(1);
    });

    it('Z reversed + depth-positive double-inverts back to +1', () => {
      const nvMem = makeNvMem(
        { X: 'normal', Y: 'normal', Z: 'reversed' },
        'depth-positive'
      );
      expect(directionSign('Z', nvMem)).toBe(1);
    });

    it('Z reversed + depth-negative → -1', () => {
      const nvMem = makeNvMem(
        { X: 'normal', Y: 'normal', Z: 'reversed' },
        'depth-negative'
      );
      expect(directionSign('Z', nvMem)).toBe(-1);
    });
  });

  describe('defaults', () => {
    it('default nvMem yields +1 on every axis', () => {
      expect(directionSign('X', DEFAULT_NON_VOLATILE_MEMORY)).toBe(1);
      expect(directionSign('Y', DEFAULT_NON_VOLATILE_MEMORY)).toBe(1);
      expect(directionSign('Z', DEFAULT_NON_VOLATILE_MEMORY)).toBe(1);
    });

    it('default axisDirection is normal on every axis', () => {
      expect(DEFAULT_NON_VOLATILE_MEMORY.axisDirection).toEqual({
        X: 'normal',
        Y: 'normal',
        Z: 'normal',
      });
    });

    it('default zDepthSense is depth-negative', () => {
      expect(DEFAULT_NON_VOLATILE_MEMORY.zDepthSense).toBe('depth-negative');
    });
  });
});

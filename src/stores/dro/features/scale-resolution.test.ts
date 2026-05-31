/**
 * Unit tests for the SC (scale resolution) setup parameter (US-021).
 *
 * SC is the first real per-axis, nvMem-backed setup parameter plugged into the
 * US-039 framework. These tests pin its registry shape (manual section 6.2 /
 * specs table: 0.1/0.2/0.5/1/2/5/10/20/50 micron, default 5) and its axis-aware
 * `readValue` seeding from `nvMem.scaleResolution`.
 */

import { describe, it, expect } from 'vitest';
import {
  SETUP_PARAMETERS,
  SCALE_RESOLUTION_ID,
  SCALE_RESOLUTION_CHOICES,
  type SetupParameter,
  type SetupReadContext,
} from './setup-parameters';
import {
  DEFAULT_NON_VOLATILE_MEMORY,
  type NonVolatileMemory,
} from '../../../types/nonVolatileMemory';

function scParam(): SetupParameter {
  const p = SETUP_PARAMETERS.find((x) => x.id === SCALE_RESOLUTION_ID);
  if (!p) throw new Error('SC parameter not registered');
  return p;
}

function ctx(nvMem: NonVolatileMemory, axis: SetupReadContext['axis']): SetupReadContext {
  return { nvMem, axis };
}

describe('SC parameter registry shape', () => {
  it('is registered with a per-axis scope', () => {
    expect(scParam().scope).toBe('per-axis');
  });

  it('exposes the nine manual micron choices in ascending order', () => {
    const values = scParam().choices.map((c) => c.value);
    expect(values).toEqual(['0.1', '0.2', '0.5', '1', '2', '5', '10', '20', '50']);
  });

  it('labels each choice with an SC prefix and the micron value', () => {
    const five = scParam().choices.find((c) => c.value === '5');
    const tenth = scParam().choices.find((c) => c.value === '0.1');
    expect(five?.label).toBe('SC 5.0');
    expect(tenth?.label).toBe('SC 0.1');
  });

  it('every choice label fits the 8-digit display width', () => {
    for (const choice of scParam().choices) {
      // Decimal point rides on the previous digit, so it does not consume a cell.
      const cells = choice.label.replace('.', '').length;
      expect(cells).toBeLessThanOrEqual(8);
    }
  });

  it('exports its choices for reuse by sibling resolution stories', () => {
    expect(SCALE_RESOLUTION_CHOICES).toBe(scParam().choices);
  });
});

describe('SC readValue seeds from nvMem.scaleResolution per axis', () => {
  it('defaults to 5 micron (mill default) for every axis', () => {
    const p = scParam();
    expect(p.readValue(ctx(DEFAULT_NON_VOLATILE_MEMORY, 'X'))).toBe('5');
    expect(p.readValue(ctx(DEFAULT_NON_VOLATILE_MEMORY, 'Y'))).toBe('5');
    expect(p.readValue(ctx(DEFAULT_NON_VOLATILE_MEMORY, 'Z'))).toBe('5');
  });

  it('reads the committed value for the selected axis independently', () => {
    const nvMem: NonVolatileMemory = {
      ...DEFAULT_NON_VOLATILE_MEMORY,
      scaleResolution: { X: '1', Y: '5', Z: '10' },
    };
    const p = scParam();
    expect(p.readValue(ctx(nvMem, 'X'))).toBe('1');
    expect(p.readValue(ctx(nvMem, 'Y'))).toBe('5');
    expect(p.readValue(ctx(nvMem, 'Z'))).toBe('10');
  });

  it('falls back to the X-axis value when axis is null (SELECT prompt)', () => {
    const nvMem: NonVolatileMemory = {
      ...DEFAULT_NON_VOLATILE_MEMORY,
      scaleResolution: { X: '2', Y: '5', Z: '50' },
    };
    expect(scParam().readValue(ctx(nvMem, null))).toBe('2');
  });

  it('seeds a valid choice value (defends against a stale persisted value)', () => {
    const nvMem = {
      ...DEFAULT_NON_VOLATILE_MEMORY,
      scaleResolution: { X: 'bogus', Y: '5', Z: '5' },
    } as unknown as NonVolatileMemory;
    const seeded = scParam().readValue(ctx(nvMem, 'X'));
    expect(scParam().choices.map((c) => c.value)).toContain(seeded);
  });
});

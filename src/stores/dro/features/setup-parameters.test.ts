/**
 * Unit tests for the setup parameter registry helpers (US-039).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SETUP_PARAMETERS,
  SETUP_PARAMETER_COUNT,
  SETUP_END_ID,
  DIRECTION_ID,
  Z_DEPTH_ID,
  getParameterAt,
  wrapItemIndex,
  choiceIndexOf,
  wrapChoiceIndex,
  labelForValue,
} from './setup-parameters';
import { DEFAULT_NON_VOLATILE_MEMORY } from '../../../types/nonVolatileMemory';
import { useSettingsStore } from '../../settingsStore';

describe('SETUP_PARAMETERS registry', () => {
  it('has unique parameter ids', () => {
    const ids = SETUP_PARAMETERS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ends with the terminal End item', () => {
    expect(SETUP_PARAMETERS[SETUP_PARAMETER_COUNT - 1]!.id).toBe(SETUP_END_ID);
  });

  it('the End item has no choices', () => {
    const end = SETUP_PARAMETERS.find((p) => p.id === SETUP_END_ID)!;
    expect(end.choices).toHaveLength(0);
  });

  it('non-terminal parameters have at least two choices', () => {
    for (const p of SETUP_PARAMETERS) {
      if (p.id === SETUP_END_ID) continue;
      expect(p.choices.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('readValue returns a valid choice value for choice-bearing params', () => {
    const ctx = { nvMem: DEFAULT_NON_VOLATILE_MEMORY, axis: 'X' as const };
    for (const p of SETUP_PARAMETERS) {
      if (p.choices.length === 0) continue;
      const seeded = p.readValue(ctx);
      expect(p.choices.map((c) => c.value)).toContain(seeded);
    }
  });

  it('exposes a tAPEr on parameter with X / Z / Z\' choices (AC 45.1)', () => {
    const taper = SETUP_PARAMETERS.find((p) => p.id === 'taper-on')!;
    expect(taper).toBeDefined();
    expect(taper.label).toBe('tAPEr on');
    expect(taper.choices.map((c) => c.value)).toEqual(['X', 'Z', 'Zprime']);
  });

  it('taper-on seeds its current value from nvMem.taperOnAxis (AC 45.1)', () => {
    const taper = SETUP_PARAMETERS.find((p) => p.id === 'taper-on')!;
    expect(taper.readValue({ nvMem: { ...DEFAULT_NON_VOLATILE_MEMORY, taperOnAxis: 'Z' }, axis: 'X' as const })).toBe('Z');
  });

  it('exposes a per-axis direction parameter with normal / reversed choices (US-002)', () => {
    const direction = SETUP_PARAMETERS.find((p) => p.id === DIRECTION_ID)!;
    expect(direction).toBeDefined();
    expect(direction.scope).toBe('per-axis');
    expect(direction.choices.map((c) => c.value)).toEqual(['normal', 'reversed']);
    expect(direction.choices.map((c) => c.label)).toEqual(['dir LEF', 'dir rGt']);
    expect(typeof direction.commit).toBe('function');
  });

  it('direction seeds its current value from nvMem.axisDirection per axis (US-002)', () => {
    const direction = SETUP_PARAMETERS.find((p) => p.id === DIRECTION_ID)!;
    const nvMem = {
      ...DEFAULT_NON_VOLATILE_MEMORY,
      axisDirection: { X: 'normal' as const, Y: 'reversed' as const, Z: 'normal' as const },
    };
    expect(direction.readValue({ nvMem, axis: 'X' })).toBe('normal');
    expect(direction.readValue({ nvMem, axis: 'Y' })).toBe('reversed');
    // SELECT prompt (axis null) falls back to X.
    expect(direction.readValue({ nvMem, axis: null })).toBe('normal');
  });

  it('exposes a global z-depth parameter with depth-negative / depth-positive choices (AC 2.4)', () => {
    const zDepth = SETUP_PARAMETERS.find((p) => p.id === Z_DEPTH_ID)!;
    expect(zDepth).toBeDefined();
    expect(zDepth.scope).toBe('global');
    expect(zDepth.choices.map((c) => c.value)).toEqual(['depth-negative', 'depth-positive']);
    expect(zDepth.choices.map((c) => c.label)).toEqual(['dEP nEG', 'dEP PoS']);
    expect(typeof zDepth.commit).toBe('function');
  });

  it('z-depth seeds its current value from nvMem.zDepthSense (AC 2.4)', () => {
    const zDepth = SETUP_PARAMETERS.find((p) => p.id === Z_DEPTH_ID)!;
    expect(zDepth.readValue({ nvMem: DEFAULT_NON_VOLATILE_MEMORY, axis: null })).toBe('depth-negative');
    expect(
      zDepth.readValue({
        nvMem: { ...DEFAULT_NON_VOLATILE_MEMORY, zDepthSense: 'depth-positive' },
        axis: null,
      })
    ).toBe('depth-positive');
  });

  it('non-commit parameters expose no commit hook (surgical commit path)', () => {
    const counting = SETUP_PARAMETERS.find((p) => p.id === 'counting-mode')!;
    const taper = SETUP_PARAMETERS.find((p) => p.id === 'taper-on')!;
    expect(counting.commit).toBeUndefined();
    expect(taper.commit).toBeUndefined();
  });
});

describe('commit-on-change hooks (US-002)', () => {
  beforeEach(() => {
    useSettingsStore.setState({ nvMem: DEFAULT_NON_VOLATILE_MEMORY });
  });

  it('direction.commit persists the chosen value to the selected axis only', () => {
    const direction = SETUP_PARAMETERS.find((p) => p.id === DIRECTION_ID)!;
    const nvMem = useSettingsStore.getState().nvMem;
    direction.commit!({ nvMem, axis: 'Y' }, 'reversed');
    const after = useSettingsStore.getState().nvMem.axisDirection;
    expect(after).toEqual({ X: 'normal', Y: 'reversed', Z: 'normal' });
  });

  it('direction.commit falls back to X on the SELECT prompt (axis null)', () => {
    const direction = SETUP_PARAMETERS.find((p) => p.id === DIRECTION_ID)!;
    const nvMem = useSettingsStore.getState().nvMem;
    direction.commit!({ nvMem, axis: null }, 'reversed');
    expect(useSettingsStore.getState().nvMem.axisDirection.X).toBe('reversed');
  });

  it('z-depth.commit persists the chosen zDepthSense', () => {
    const zDepth = SETUP_PARAMETERS.find((p) => p.id === Z_DEPTH_ID)!;
    const nvMem = useSettingsStore.getState().nvMem;
    zDepth.commit!({ nvMem, axis: null }, 'depth-positive');
    expect(useSettingsStore.getState().nvMem.zDepthSense).toBe('depth-positive');
  });
});

describe('wrapItemIndex', () => {
  it('advances within bounds', () => {
    expect(wrapItemIndex(0, 1)).toBe(1);
  });
  it('wraps forward past the end', () => {
    expect(wrapItemIndex(SETUP_PARAMETER_COUNT - 1, 1)).toBe(0);
  });
  it('wraps backward before the start', () => {
    expect(wrapItemIndex(0, -1)).toBe(SETUP_PARAMETER_COUNT - 1);
  });
});

describe('choiceIndexOf / wrapChoiceIndex', () => {
  const counting = SETUP_PARAMETERS.find((p) => p.id === 'counting-mode')!;

  it('finds the index of a known choice value', () => {
    expect(choiceIndexOf(counting, 'angular')).toBe(1);
  });

  it('defaults to 0 for an unknown value', () => {
    expect(choiceIndexOf(counting, 'nope')).toBe(0);
  });

  it('wraps choice index forward and backward', () => {
    expect(wrapChoiceIndex(counting, 1, 1)).toBe(0);
    expect(wrapChoiceIndex(counting, 0, -1)).toBe(1);
  });

  it('returns 0 for a parameter with no choices', () => {
    const end = SETUP_PARAMETERS.find((p) => p.id === SETUP_END_ID)!;
    expect(wrapChoiceIndex(end, 0, 1)).toBe(0);
  });
});

describe('labelForValue', () => {
  it('returns the matching choice label', () => {
    expect(labelForValue(getParameterAt(0), 'angular')).toBe('AnGULAr');
  });
  it('falls back to the parameter label for unknown values', () => {
    const end = SETUP_PARAMETERS.find((p) => p.id === SETUP_END_ID)!;
    expect(labelForValue(end, '')).toBe('End');
  });
});

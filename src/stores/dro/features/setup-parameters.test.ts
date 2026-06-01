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
  DISPLAY_RESOLUTION_ID,
  ZERO_APPROACH_ID,
  ZERO_APPROACH_DIST_ID,
  ZERO_APPROACH_TOLR_ID,
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
    expect(direction.choices.map((c) => c.label)).toEqual(['LEFt', 'riGht']);
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

  it('exposes a per-axis dP display-resolution parameter with the 9 micron choices (US-022)', () => {
    const dp = SETUP_PARAMETERS.find((p) => p.id === DISPLAY_RESOLUTION_ID)!;
    expect(dp).toBeDefined();
    expect(dp.scope).toBe('per-axis');
    expect(dp.choices.map((c) => c.value)).toEqual([
      '0.1', '0.2', '0.5', '1', '2', '5', '10', '20', '50',
    ]);
    expect(dp.choices.map((c) => c.label)).toEqual([
      'dP 0.1', 'dP 0.2', 'dP 0.5', 'dP 1.0', 'dP 2.0', 'dP 5.0', 'dP 10.0', 'dP 20.0', 'dP 50.0',
    ]);
    expect(typeof dp.commit).toBe('function');
  });

  it('dP seeds its current value from nvMem.displayResolution per axis (US-022)', () => {
    const dp = SETUP_PARAMETERS.find((p) => p.id === DISPLAY_RESOLUTION_ID)!;
    const nvMem = {
      ...DEFAULT_NON_VOLATILE_MEMORY,
      displayResolution: { X: '5' as const, Y: '50' as const, Z: '5' as const },
    };
    expect(dp.readValue({ nvMem, axis: 'X' })).toBe('5');
    expect(dp.readValue({ nvMem, axis: 'Y' })).toBe('50');
    // SELECT prompt (axis null) falls back to X.
    expect(dp.readValue({ nvMem, axis: null })).toBe('5');
  });

  it('dP defends against a stale persisted value not in the choice set', () => {
    const dp = SETUP_PARAMETERS.find((p) => p.id === DISPLAY_RESOLUTION_ID)!;
    const nvMem = {
      ...DEFAULT_NON_VOLATILE_MEMORY,
      displayResolution: { X: '999' as unknown as '5', Y: '5' as const, Z: '5' as const },
    };
    expect(dp.choices.map((c) => c.value)).toContain(dp.readValue({ nvMem, axis: 'X' }));
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

  it('dP.commit persists the chosen value to the selected axis only (US-022)', () => {
    const dp = SETUP_PARAMETERS.find((p) => p.id === DISPLAY_RESOLUTION_ID)!;
    const nvMem = useSettingsStore.getState().nvMem;
    dp.commit!({ nvMem, axis: 'Y' }, '50');
    const after = useSettingsStore.getState().nvMem.displayResolution;
    expect(after).toEqual({ X: '5', Y: '50', Z: '5' });
  });

  it('dP.commit falls back to X on the SELECT prompt (axis null)', () => {
    const dp = SETUP_PARAMETERS.find((p) => p.id === DISPLAY_RESOLUTION_ID)!;
    const nvMem = useSettingsStore.getState().nvMem;
    dp.commit!({ nvMem, axis: null }, '50');
    expect(useSettingsStore.getState().nvMem.displayResolution.X).toBe('50');
  });
});

describe('Zero-Approach Warning parameters (US-024)', () => {
  beforeEach(() => {
    useSettingsStore.setState({ nvMem: DEFAULT_NON_VOLATILE_MEMORY });
  });

  it('exposes ZERO AP / BP DIST / BP TOLR as global parameters (AC24.1)', () => {
    const ap = SETUP_PARAMETERS.find((p) => p.id === ZERO_APPROACH_ID)!;
    const dist = SETUP_PARAMETERS.find((p) => p.id === ZERO_APPROACH_DIST_ID)!;
    const tolr = SETUP_PARAMETERS.find((p) => p.id === ZERO_APPROACH_TOLR_ID)!;
    expect(ap).toBeDefined();
    expect(dist).toBeDefined();
    expect(tolr).toBeDefined();
    expect(ap.scope).toBe('global');
    expect(dist.scope).toBe('global');
    expect(tolr.scope).toBe('global');
  });

  it('ZERO AP toggles BU22 ON/OFF (AC24.2)', () => {
    const ap = SETUP_PARAMETERS.find((p) => p.id === ZERO_APPROACH_ID)!;
    expect(ap.choices.map((c) => c.value)).toEqual(['on', 'off']);
    // BU22 wording surfaces in the labels.
    expect(ap.choices.map((c) => c.label).join(' ')).toContain('bU22');
  });

  it('ZERO AP seeds from nvMem.zeroApproachEnabled', () => {
    const ap = SETUP_PARAMETERS.find((p) => p.id === ZERO_APPROACH_ID)!;
    expect(ap.readValue({ nvMem: DEFAULT_NON_VOLATILE_MEMORY, axis: null })).toBe('off');
    const on = { ...DEFAULT_NON_VOLATILE_MEMORY, zeroApproachEnabled: true };
    expect(ap.readValue({ nvMem: on, axis: null })).toBe('on');
  });

  it('ZERO AP.commit persists the toggle immediately (commit-on-change)', () => {
    const ap = SETUP_PARAMETERS.find((p) => p.id === ZERO_APPROACH_ID)!;
    const nvMem = useSettingsStore.getState().nvMem;
    ap.commit!({ nvMem, axis: null }, 'on');
    expect(useSettingsStore.getState().nvMem.zeroApproachEnabled).toBe(true);
    ap.commit!({ nvMem: useSettingsStore.getState().nvMem, axis: null }, 'off');
    expect(useSettingsStore.getState().nvMem.zeroApproachEnabled).toBe(false);
  });

  it('BP DIST default is 0.002" and commits (AC24.4)', () => {
    const dist = SETUP_PARAMETERS.find((p) => p.id === ZERO_APPROACH_DIST_ID)!;
    expect(dist.readValue({ nvMem: DEFAULT_NON_VOLATILE_MEMORY, axis: null })).toBe('0.002');
    expect(dist.choices.map((c) => c.value)).toContain('0.010');
    const nvMem = useSettingsStore.getState().nvMem;
    dist.commit!({ nvMem, axis: null }, '0.010');
    expect(useSettingsStore.getState().nvMem.zeroApproachDistance).toBe('0.010');
  });

  it('BP TOLR default is 0 and commits (AC24.5)', () => {
    const tolr = SETUP_PARAMETERS.find((p) => p.id === ZERO_APPROACH_TOLR_ID)!;
    expect(tolr.readValue({ nvMem: DEFAULT_NON_VOLATILE_MEMORY, axis: null })).toBe('0');
    const nvMem = useSettingsStore.getState().nvMem;
    tolr.commit!({ nvMem, axis: null }, '0.005');
    expect(useSettingsStore.getState().nvMem.zeroApproachTolerance).toBe('0.005');
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

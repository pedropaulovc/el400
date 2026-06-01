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
  MEASUREMENT_MODE_ID,
  PROBE_DRO_TYPE_ID,
  DISPLAY_RESOLUTION_ID,
  ANGULAR_RESOLUTION_CHOICES,
  getParameterAt,
  resolveChoices,
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
    const taper = SETUP_PARAMETERS.find((p) => p.id === 'taper-on')!;
    expect(taper.commit).toBeUndefined();
  });

  it('exposes a per-axis measurement-mode parameter with rAd / diA choices (AC 41.1, 41.2)', () => {
    const mode = SETUP_PARAMETERS.find((p) => p.id === MEASUREMENT_MODE_ID)!;
    expect(mode).toBeDefined();
    expect(mode.scope).toBe('per-axis');
    expect(mode.choices.map((c) => c.value)).toEqual(['radius', 'diameter']);
    expect(mode.choices.map((c) => c.label)).toEqual(['rAd', 'diA']);
    // radius is listed first so it is the default landing choice (AC 41.3).
    expect(mode.choices[0]!.value).toBe('radius');
    expect(typeof mode.commit).toBe('function');
  });

  it('measurement-mode seeds its current value from nvMem.measurementMode per axis (AC 41.5)', () => {
    const mode = SETUP_PARAMETERS.find((p) => p.id === MEASUREMENT_MODE_ID)!;
    const nvMem = {
      ...DEFAULT_NON_VOLATILE_MEMORY,
      measurementMode: { X: 'radius' as const, Y: 'diameter' as const, Z: 'radius' as const },
    };
    expect(mode.readValue({ nvMem, axis: 'X' })).toBe('radius');
    expect(mode.readValue({ nvMem, axis: 'Y' })).toBe('diameter');
    // SELECT prompt (axis null) falls back to X.
    expect(mode.readValue({ nvMem, axis: null })).toBe('radius');
  });

  it('exposes a per-axis counting-mode parameter with linear / angular choices (US-040)', () => {
    const counting = SETUP_PARAMETERS.find((p) => p.id === 'counting-mode')!;
    expect(counting).toBeDefined();
    expect(counting.scope).toBe('per-axis');
    expect(counting.choices.map((c) => c.value)).toEqual(['linear', 'angular']);
    expect(counting.choices.map((c) => c.label)).toEqual(['LinEAr', 'AnGULAr']);
    // First choice (default) is LinEAr (AC 40.1).
    expect(counting.choices[0]!.value).toBe('linear');
    // Real committed parameter now (US-040) — exposes a commit hook.
    expect(typeof counting.commit).toBe('function');
  });

  it('counting-mode seeds its current value from nvMem.countingMode per axis (AC 40.1, 40.5)', () => {
    const counting = SETUP_PARAMETERS.find((p) => p.id === 'counting-mode')!;
    // Default is linear on every axis (AC 40.6).
    expect(counting.readValue({ nvMem: DEFAULT_NON_VOLATILE_MEMORY, axis: 'X' })).toBe('linear');
    const nvMem = {
      ...DEFAULT_NON_VOLATILE_MEMORY,
      countingMode: { X: 'angular' as const, Y: 'linear' as const, Z: 'linear' as const },
    };
    expect(counting.readValue({ nvMem, axis: 'X' })).toBe('angular');
    expect(counting.readValue({ nvMem, axis: 'Y' })).toBe('linear');
    // SELECT prompt (axis null) falls back to X.
    expect(counting.readValue({ nvMem, axis: null })).toBe('angular');
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

  it('measurement-mode.commit persists the chosen value to the selected axis only (AC 41.5)', () => {
    const mode = SETUP_PARAMETERS.find((p) => p.id === MEASUREMENT_MODE_ID)!;
    const nvMem = useSettingsStore.getState().nvMem;
    mode.commit!({ nvMem, axis: 'Y' }, 'diameter');
    const after = useSettingsStore.getState().nvMem.measurementMode;
    expect(after).toEqual({ X: 'radius', Y: 'diameter', Z: 'radius' });
  });

  it('measurement-mode.commit falls back to X on the SELECT prompt (axis null)', () => {
    const mode = SETUP_PARAMETERS.find((p) => p.id === MEASUREMENT_MODE_ID)!;
    const nvMem = useSettingsStore.getState().nvMem;
    mode.commit!({ nvMem, axis: null }, 'diameter');
    expect(useSettingsStore.getState().nvMem.measurementMode.X).toBe('diameter');
  });

  it('counting-mode.commit persists the chosen mode to the selected axis only (US-040)', () => {
    const counting = SETUP_PARAMETERS.find((p) => p.id === 'counting-mode')!;
    const nvMem = useSettingsStore.getState().nvMem;
    counting.commit!({ nvMem, axis: 'Y' }, 'angular');
    expect(useSettingsStore.getState().nvMem.countingMode).toEqual({
      X: 'linear',
      Y: 'angular',
      Z: 'linear',
    });
  });

  it('counting-mode.commit falls back to X on the SELECT prompt (axis null)', () => {
    const counting = SETUP_PARAMETERS.find((p) => p.id === 'counting-mode')!;
    const nvMem = useSettingsStore.getState().nvMem;
    counting.commit!({ nvMem, axis: null }, 'angular');
    expect(useSettingsStore.getState().nvMem.countingMode.X).toBe('angular');
  });

  it('probe-dro-type seeds from nvMem and commits the chosen DRO type (US-032, AC 32.1)', () => {
    const probe = SETUP_PARAMETERS.find((p) => p.id === PROBE_DRO_TYPE_ID)!;
    // Seeds the committed value (default transmit).
    expect(probe.readValue({ nvMem: DEFAULT_NON_VOLATILE_MEMORY, axis: null })).toBe('transmit');
    expect(probe.choices.map((c) => c.label)).toEqual(['dro t', 'dro F']);
    // Commit persists Freeze immediately.
    const nvMem = useSettingsStore.getState().nvMem;
    probe.commit!({ nvMem, axis: null }, 'freeze');
    expect(useSettingsStore.getState().nvMem.probeDroType).toBe('freeze');
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

describe('dP angular display-resolution formats (US-040 AC 40.4)', () => {
  beforeEach(() => {
    useSettingsStore.setState({ nvMem: DEFAULT_NON_VOLATILE_MEMORY });
  });

  const dp = () => SETUP_PARAMETERS.find((p) => p.id === DISPLAY_RESOLUTION_ID)!;

  const angularNvMem = (axis: 'X' | 'Y' | 'Z' = 'X') => ({
    ...DEFAULT_NON_VOLATILE_MEMORY,
    countingMode: { ...DEFAULT_NON_VOLATILE_MEMORY.countingMode, [axis]: 'angular' as const },
  });

  it('exposes the three angular format choices with the manual labels', () => {
    expect(ANGULAR_RESOLUTION_CHOICES.map((c) => c.value)).toEqual([
      'dd-mn', 'dd-mn-ss', 'dd-dec',
    ]);
    expect(ANGULAR_RESOLUTION_CHOICES.map((c) => c.label)).toEqual([
      'dd.mn', 'dd.mn.SS', 'dd.dEC',
    ]);
  });

  it('resolveChoices returns the linear micron set for a linear axis', () => {
    const ctx = { nvMem: DEFAULT_NON_VOLATILE_MEMORY, axis: 'X' as const };
    expect(resolveChoices(dp(), ctx).map((c) => c.value)).toEqual([
      '0.1', '0.2', '0.5', '1', '2', '5', '10', '20', '50',
    ]);
  });

  it('resolveChoices returns the angular DMS set when the axis is angular', () => {
    const ctx = { nvMem: angularNvMem('X'), axis: 'X' as const };
    expect(resolveChoices(dp(), ctx)).toEqual(ANGULAR_RESOLUTION_CHOICES);
  });

  it('resolveChoices is per-axis: angular X but linear Y keep their own sets', () => {
    const nvMem = angularNvMem('X');
    expect(resolveChoices(dp(), { nvMem, axis: 'X' })).toEqual(ANGULAR_RESOLUTION_CHOICES);
    expect(resolveChoices(dp(), { nvMem, axis: 'Y' }).map((c) => c.value)).toContain('5');
  });

  it('resolveChoices falls back to a parameters static choices when no choicesFor', () => {
    const dir = SETUP_PARAMETERS.find((p) => p.id === DIRECTION_ID)!;
    const ctx = { nvMem: DEFAULT_NON_VOLATILE_MEMORY, axis: 'X' as const };
    expect(resolveChoices(dir, ctx)).toBe(dir.choices);
  });

  it('dP seeds from nvMem.angularResolution for an angular axis', () => {
    const nvMem = {
      ...angularNvMem('X'),
      angularResolution: {
        ...DEFAULT_NON_VOLATILE_MEMORY.angularResolution,
        X: 'dd-dec' as const,
      },
    };
    expect(dp().readValue({ nvMem, axis: 'X' })).toBe('dd-dec');
  });

  it('dP.commit persists an angular format to nvMem.angularResolution for the axis only', () => {
    const nvMem = angularNvMem('Y');
    dp().commit!({ nvMem, axis: 'Y' }, 'dd-mn-ss');
    const after = useSettingsStore.getState().nvMem.angularResolution;
    expect(after).toEqual({ X: 'dd-mn', Y: 'dd-mn-ss', Z: 'dd-mn' });
    // The linear micron resolution for Y is left untouched.
    expect(useSettingsStore.getState().nvMem.displayResolution.Y).toBe('5');
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

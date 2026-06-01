/**
 * Unit tests for the setup parameter registry helpers (US-039).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SETUP_PARAMETERS,
  SETUP_PARAMETER_COUNT,
  SETUP_END_ID,
  SAVE_CHANGES_ID,
  OEM_MODE_ID,
  DIRECTION_ID,
  Z_DEPTH_ID,
  MEASUREMENT_MODE_ID,
  PROBE_DRO_TYPE_ID,
  DISPLAY_RESOLUTION_ID,
  ZERO_APPROACH_ID,
  ZERO_APPROACH_DIST_ID,
  ZERO_APPROACH_TOLR_ID,
  ENF_ID,
  SLEEP_TIMEOUT_ID,
  SLEEP_TIMEOUT_MINUTES,
  sleepTimeoutLabel,
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

  it('exposes the oEm mod (OEM Mode) terminal item with no choices (US-044 AC 44.1)', () => {
    const oem = SETUP_PARAMETERS.find((p) => p.id === OEM_MODE_ID)!;
    expect(oem).toBeDefined();
    expect(oem.label).toBe('oEm mod');
    expect(oem.choices).toHaveLength(0);
    // The End sentinel stays LAST even after appending the OEM row.
    expect(SETUP_PARAMETERS[SETUP_PARAMETER_COUNT - 1]!.id).toBe(SETUP_END_ID);
  });

  it('non-terminal parameters have at least two choices', () => {
    // Terminal action items (End, SAV CHG, OEM Mode) carry no choices — they are
    // acted on with ENT rather than cycled. Every other (choice-bearing)
    // parameter offers at least two options to cycle between.
    const terminalIds = new Set<string>([SETUP_END_ID, SAVE_CHANGES_ID, OEM_MODE_ID]);
    for (const p of SETUP_PARAMETERS) {
      if (terminalIds.has(p.id)) continue;
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

  it('exposes a global EnF parameter with on / off choices (AC 42.1, AC 42.2)', () => {
    const enf = SETUP_PARAMETERS.find((p) => p.id === ENF_ID)!;
    expect(enf).toBeDefined();
    expect(enf.scope).toBe('global');
    // Default-first ordering: 'off' is the default (AC 42.1), so it seeds first.
    expect(enf.choices.map((c) => c.value)).toEqual(['off', 'on']);
    expect(enf.choices.map((c) => c.label)).toEqual(['EnF oFF', 'EnF on']);
    expect(typeof enf.commit).toBe('function');
  });

  it('EnF seeds its current value from nvMem.encoderFailWarning, NOT beepEnabled (AC 42.1)', () => {
    const enf = SETUP_PARAMETERS.find((p) => p.id === ENF_ID)!;
    // Default nvMem: encoderFailWarning off -> seeds 'off'.
    expect(enf.readValue({ nvMem: DEFAULT_NON_VOLATILE_MEMORY, axis: null })).toBe('off');
    // On when the dedicated flag is set.
    expect(
      enf.readValue({
        nvMem: { ...DEFAULT_NON_VOLATILE_MEMORY, encoderFailWarning: true },
        axis: null,
      })
    ).toBe('on');
    // Decoupled from beepEnabled (US-025): flipping beep must not change EnF.
    expect(
      enf.readValue({
        nvMem: { ...DEFAULT_NON_VOLATILE_MEMORY, beepEnabled: false, encoderFailWarning: true },
        axis: null,
      })
    ).toBe('on');
  });

  it('exposes a global SLEEP T parameter with a 0..120 minute ladder (US-026, AC26.1)', () => {
    const sleep = SETUP_PARAMETERS.find((p) => p.id === SLEEP_TIMEOUT_ID)!;
    expect(sleep).toBeDefined();
    expect(sleep.scope).toBe('global');
    // First choice is the disabled sentinel (000 = off, AC26.2/26.8); ladder is
    // strictly ascending and capped at the 120-minute maximum (AC26.3).
    expect(sleep.choices[0]!.value).toBe('0');
    expect(sleep.choices[0]!.label).toBe('SLP oFF');
    const minutes = sleep.choices.map((c) => Number(c.value));
    expect(minutes).toEqual([...SLEEP_TIMEOUT_MINUTES]);
    expect(Math.max(...minutes)).toBe(120);
    for (let i = 1; i < minutes.length; i++) {
      expect(minutes[i]!).toBeGreaterThan(minutes[i - 1]!);
    }
    expect(typeof sleep.commit).toBe('function');
  });

  it('SLEEP T seeds its current value from nvMem.sleepTimeout (US-026, AC26.2)', () => {
    const sleep = SETUP_PARAMETERS.find((p) => p.id === SLEEP_TIMEOUT_ID)!;
    // Default 0 => disabled.
    expect(sleep.readValue({ nvMem: DEFAULT_NON_VOLATILE_MEMORY, axis: null })).toBe('0');
    expect(
      sleep.readValue({ nvMem: { ...DEFAULT_NON_VOLATILE_MEMORY, sleepTimeout: 10 }, axis: null })
    ).toBe('10');
  });

  it('SLEEP T defends against a stale persisted value not in the ladder', () => {
    const sleep = SETUP_PARAMETERS.find((p) => p.id === SLEEP_TIMEOUT_ID)!;
    const seeded = sleep.readValue({
      nvMem: { ...DEFAULT_NON_VOLATILE_MEMORY, sleepTimeout: 999 },
      axis: null,
    });
    expect(sleep.choices.map((c) => c.value)).toContain(seeded);
  });

  it('sleepTimeoutLabel renders oFF for 0 and SLP <n> otherwise', () => {
    expect(sleepTimeoutLabel(0)).toBe('SLP oFF');
    expect(sleepTimeoutLabel(5)).toBe('SLP 5');
    expect(sleepTimeoutLabel(120)).toBe('SLP 120');
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

  it('SLEEP T.commit persists the chosen minutes to nvMem.sleepTimeout (US-026, AC26.4)', () => {
    const sleep = SETUP_PARAMETERS.find((p) => p.id === SLEEP_TIMEOUT_ID)!;
    const nvMem = useSettingsStore.getState().nvMem;
    sleep.commit!({ nvMem, axis: null }, '10');
    expect(useSettingsStore.getState().nvMem.sleepTimeout).toBe(10);
    // Selecting the disabled sentinel persists 0 (AC26.8).
    const after = useSettingsStore.getState().nvMem;
    sleep.commit!({ nvMem: after, axis: null }, '0');
    expect(useSettingsStore.getState().nvMem.sleepTimeout).toBe(0);
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

  it('enf.commit persists encoderFailWarning and leaves beepEnabled untouched (AC 42.2)', () => {
    const enf = SETUP_PARAMETERS.find((p) => p.id === ENF_ID)!;
    const beepBefore = useSettingsStore.getState().nvMem.beepEnabled;

    enf.commit!({ nvMem: useSettingsStore.getState().nvMem, axis: null }, 'on');
    expect(useSettingsStore.getState().nvMem.encoderFailWarning).toBe(true);
    // US-025's beep flag must remain independent.
    expect(useSettingsStore.getState().nvMem.beepEnabled).toBe(beepBefore);

    enf.commit!({ nvMem: useSettingsStore.getState().nvMem, axis: null }, 'off');
    expect(useSettingsStore.getState().nvMem.encoderFailWarning).toBe(false);
    expect(useSettingsStore.getState().nvMem.beepEnabled).toBe(beepBefore);
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

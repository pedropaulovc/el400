import { beforeEach, describe, expect, it } from 'vitest';
import { applySetupDrafts, commitDrafts } from './setup-parameters';
import { DEFAULT_NON_VOLATILE_MEMORY } from '../../../types/nonVolatileMemory';
import { useSettingsStore } from '../../settingsStore';

beforeEach(() => useSettingsStore.setState({ nvMem: DEFAULT_NON_VOLATILE_MEMORY }));

describe('setup transaction', () => {
  it('composes axis edits without clobbering siblings and commits all parameter families atomically', () => {
    const drafts = {
      'X:scale-resolution': '1', 'Y:scale-resolution': '10',
      'X:counting-mode': 'angular', 'X:display-resolution': 'dd-dec',
      'Z:display-resolution': '50', 'Y:measurement-mode': 'diameter',
      'Z:direction': 'reversed', 'GLOBAL:z-depth': 'depth-positive',
      'GLOBAL:enf': 'on', 'GLOBAL:beep': 'off', 'GLOBAL:keypad-lock': 'on',
      'GLOBAL:sleep-timeout': '37', 'Y:zero-approach': 'on',
      'Y:zero-approach-dist': '0.0037', 'Y:zero-approach-tolr': '0.0013',
      'GLOBAL:probe-dro-type': 'freeze', 'GLOBAL:probe-delay': '17',
      'GLOBAL:serial-mode': 'continuous', 'GLOBAL:output-mode': 'continuous',
      'GLOBAL:taper-on': 'Y',
    };
    const preview = applySetupDrafts(DEFAULT_NON_VOLATILE_MEMORY, drafts);
    expect(useSettingsStore.getState().nvMem).toEqual(DEFAULT_NON_VOLATILE_MEMORY);
    const writes: unknown[] = [];
    const unsubscribe = useSettingsStore.subscribe(state => writes.push(state.nvMem));
    commitDrafts(drafts);
    unsubscribe();
    const saved = useSettingsStore.getState().nvMem;
    expect(writes).toHaveLength(1);
    expect(saved).toEqual(preview);
    expect(saved).toMatchObject({
      scaleResolution: { X: '1', Y: '10', Z: '5' }, countingMode: { X: 'angular', Y: 'linear' },
      angularResolution: { X: 'dd-dec' }, displayResolution: { X: '5', Z: '50' },
      measurementMode: { Y: 'diameter' }, axisDirection: { Z: 'reversed' },
      zDepthSense: 'depth-positive', encoderFailWarning: true, beepEnabled: false, keypadLock: 'on', sleepTimeout: 37,
      zeroApproachEnabled: { X: false, Y: true, Z: false },
      zeroApproachDistance: { X: '0.002', Y: '0.0037' }, zeroApproachTolerance: { Y: '0.0013' },
      probeDroType: 'freeze', probeDelaySeconds: 17, serialMode: 'continuous', outputMode: 'continuous', taperOnAxis: 'Y',
    });
  });

  it('preserves linear and angular resolution when mode is edited after dP', () => {
    const next = applySetupDrafts(DEFAULT_NON_VOLATILE_MEMORY, {
      'X:display-resolution': 'dd-mn-ss', 'X:counting-mode': 'angular',
    });
    expect(next.angularResolution.X).toBe('dd-mn-ss');
    expect(next.displayResolution.X).toBe('5');
  });
});

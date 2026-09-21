import { beforeEach, describe, expect, it } from 'vitest';
import { restoreDefaults, enterRestoreInProgress, restoreDefaultsReducer } from './restore-defaults';
import { useSettingsStore } from '../../settingsStore';
import { DEFAULT_NON_VOLATILE_MEMORY, NON_VOLATILE_MEMORY_STORAGE_KEY } from '../../../types/nonVolatileMemory';
import { INITIAL_VOLATILE_MEMORY_STATE, type VolatileMemoryState } from '../../../types/volatileMemory';
import { DEFAULT_TEST_CONTEXT } from '../test-utils';

beforeEach(() => {
  localStorage.clear();
  useSettingsStore.getState().resetMemory();
});

function operatorMemory(): VolatileMemoryState {
  return { ...INITIAL_VOLATILE_MEMORY_STATE,
    sdmPoints: { 1: { X: 10, Y: 20, Z: 30 } },
    workOffsets: { X: 12.5, Y: -3, Z: 8 },
    incrementalOffsets: { X: 5, Y: 6, Z: 7 },
    incrementalValues: { X: 1, Y: 2, Z: 3 },
    manualAbsoluteValues: { X: 4, Y: 5, Z: 6 },
    machineReferenceOffsets: { X: 3, Y: 4 },
    referenceMarks: { X: 10, Y: 10 },
    outputProgram: [{ axis: 'X', positionMm: 40 }], outputCount: 7,
  };
}

describe('primary manual selected-axis Reset*6', () => {
  it('restores factory settings only on the selected axis and never clears jobs or global preferences', () => {
    useSettingsStore.getState().updateNvMem({
      scaleResolution: { X: '1', Y: '20', Z: '50' },
      displayResolution: { X: '10', Y: '20', Z: '50' },
      angularResolution: { X: 'dd-dec', Y: 'dd-mn-ss', Z: 'dd-mn' },
      axisDirection: { X: 'reversed', Y: 'reversed', Z: 'normal' },
      countingMode: { X: 'angular', Y: 'linear', Z: 'linear' },
      measurementMode: { X: 'diameter', Y: 'diameter', Z: 'radius' },
      zeroApproachEnabled: { X: true, Y: true, Z: false },
      zeroApproachDistance: { X: '0.01', Y: '0.03', Z: '0.002' },
      zeroApproachTolerance: { X: '0.001', Y: '0.002', Z: '0' },
      beepEnabled: false, encoderFailWarning: true, sleepTimeout: 37, keypadLock: 'on',
    });
    const before = useSettingsStore.getState().nvMem;
    const memory = operatorMemory();
    const restored = restoreDefaults(memory, 'X', DEFAULT_TEST_CONTEXT);
    const saved = useSettingsStore.getState().nvMem;
    expect(saved.scaleResolution).toEqual({ X: '5', Y: '20', Z: '50' });
    expect(saved.displayResolution).toEqual({ X: '5', Y: '20', Z: '50' });
    expect(saved.angularResolution).toEqual({ X: 'dd-mn', Y: 'dd-mn-ss', Z: 'dd-mn' });
    expect(saved.axisDirection).toEqual({ X: 'normal', Y: 'reversed', Z: 'normal' });
    expect(saved.countingMode.X).toBe('linear');
    expect(saved.measurementMode).toEqual({ X: 'radius', Y: 'diameter', Z: 'radius' });
    expect(saved.zeroApproachEnabled).toEqual({ X: false, Y: true, Z: false });
    expect(saved.zeroApproachDistance).toEqual({ X: '0.002', Y: '0.03', Z: '0.002' });
    expect(saved.zeroApproachTolerance).toEqual({ X: '0', Y: '0.002', Z: '0' });
    expect(saved).toMatchObject({ beepEnabled: before.beepEnabled, encoderFailWarning: true, sleepTimeout: 37, keypadLock: 'on' });
    expect(restored).toEqual(memory); // Engineering-unit adapter needs no raw-reference invalidation.
  });

  it('uses the selected-axis saved OEM baseline repeatedly without restoring other axes or globals', () => {
    const { oemDefaults: _baseline, ...factory } = DEFAULT_NON_VOLATILE_MEMORY;
    const oemDefaults = { ...factory, displayResolution: { ...factory.displayResolution, Y: '10' as const } };
    useSettingsStore.getState().updateNvMem({ oemDefaults, displayResolution: { X: '20', Y: '50', Z: '50' }, beepEnabled: false });
    restoreDefaults(operatorMemory(), 'Y', DEFAULT_TEST_CONTEXT);
    expect(useSettingsStore.getState().nvMem.displayResolution).toEqual({ X: '20', Y: '10', Z: '50' });
    expect(useSettingsStore.getState().nvMem.beepEnabled).toBe(false);
    expect(useSettingsStore.getState().nvMem.oemDefaults).toEqual(oemDefaults);
    useSettingsStore.getState().updateNvMem({ displayResolution: { X: '20', Y: '1', Z: '50' } });
    restoreDefaults(operatorMemory(), 'Y', DEFAULT_TEST_CONTEXT);
    expect(useSettingsStore.getState().nvMem.displayResolution.Y).toBe('10');
  });

  it('invalidates only changed raw-axis reference frames while retaining physical saved-reference displacement', () => {
    useSettingsStore.getState().updateNvMem({ scaleResolution: { X: '10', Y: '5', Z: '5' } });
    const memory = operatorMemory();
    const context = { ...DEFAULT_TEST_CONTEXT, millState: { ...DEFAULT_TEST_CONTEXT.millState, encoderResolutionMicrons: { X: 5, Y: 5, Z: 5 } } };
    const restored = restoreDefaults(memory, 'X', context);
    expect(restored.referenceMarks).toEqual({ Y: 10 });
    expect(restored.machineReferenceOffsets).toEqual({ X: 1.5, Y: 4 });
    expect(restored.workOffsets).toEqual(memory.workOffsets);
    expect(restored.sdmPoints).toEqual(memory.sdmPoints);
    expect(restored.outputProgram).toEqual(memory.outputProgram);
    expect(restored.outputCount).toBe(7);
    expect(memory.referenceMarks).toEqual({ X: 10, Y: 10 });
  });

  it('restores calibration only on its axis and requires re-referencing a changed compensation frame', () => {
    useSettingsStore.getState().updateNvMem({ calibration: { X: { kind: 'lec', factor: 1.01 }, Y: { kind: 'lec', factor: 1.02 }, Z: { kind: 'none' } } });
    const restored = restoreDefaults(operatorMemory(), 'X', DEFAULT_TEST_CONTEXT);
    expect(useSettingsStore.getState().nvMem.calibration).toEqual({ X: { kind: 'none' }, Y: { kind: 'lec', factor: 1.02 }, Z: { kind: 'none' } });
    expect(restored.referenceMarks).toEqual({ Y: 10 });
  });

  it('is durable before the progress screen completes and returns to the existing datum', () => {
    useSettingsStore.getState().updateNvMem({ displayResolution: { X: '50', Y: '20', Z: '5' } });
    const memory = operatorMemory();
    const inProgress = enterRestoreInProgress(memory, 'X', DEFAULT_TEST_CONTEXT);
    const persisted = JSON.parse(localStorage.getItem(NON_VOLATILE_MEMORY_STORAGE_KEY)!) as { state: { nvMem: { displayResolution: { X: string; Y: string } } } };
    expect(persisted.state.nvMem.displayResolution).toMatchObject({ X: '5', Y: '20' });
    expect(inProgress.stateName).toBe('restore-in-progress');
    const completed = restoreDefaultsReducer(inProgress, { eventName: 'RESTORE_COMPLETE' }, DEFAULT_TEST_CONTEXT)!;
    expect(completed.stateName).toBe('idle');
    expect(completed.vMem.workOffsets).toEqual(memory.workOffsets);
    expect(completed.vMem.manualAbsoluteValues).toEqual(memory.manualAbsoluteValues);
  });
});

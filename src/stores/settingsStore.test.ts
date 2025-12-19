/**
 * Unit tests for settingsStore
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useSettingsStore,
  useNvMem,
  useDefaultUnit,
  usePrecision,
  useBeepEnabled,
  useBootMessageMode,
  useUpdateNvMem,
  useResetMemory,
} from './settingsStore';
import { DEFAULT_NON_VOLATILE_MEMORY } from '../types/nonVolatileMemory';

describe('settingsStore', () => {
  beforeEach(() => {
    // Reset store to defaults before each test
    useSettingsStore.setState({
      nvMem: DEFAULT_NON_VOLATILE_MEMORY,
    });
  });

  describe('initial state', () => {
    it('has default non-volatile memory', () => {
      const state = useSettingsStore.getState();
      expect(state.nvMem).toEqual(DEFAULT_NON_VOLATILE_MEMORY);
    });

    it('has default unit as inch', () => {
      const state = useSettingsStore.getState();
      expect(state.nvMem.defaultUnit).toBe('inch');
    });

    it('has default precision of 4', () => {
      const state = useSettingsStore.getState();
      expect(state.nvMem.precision).toBe(4);
    });

    it('has beep enabled by default', () => {
      const state = useSettingsStore.getState();
      expect(state.nvMem.beepEnabled).toBe(true);
    });

    it('has boot message mode as show by default', () => {
      const state = useSettingsStore.getState();
      expect(state.nvMem.bootMessageMode).toBe('show');
    });
  });

  describe('updateNvMem', () => {
    it('updates a single field', () => {
      useSettingsStore.getState().updateNvMem({ defaultUnit: 'mm' });

      expect(useSettingsStore.getState().nvMem.defaultUnit).toBe('mm');
    });

    it('updates multiple fields', () => {
      useSettingsStore.getState().updateNvMem({
        defaultUnit: 'mm',
        precision: 3,
      });

      const nvMem = useSettingsStore.getState().nvMem;
      expect(nvMem.defaultUnit).toBe('mm');
      expect(nvMem.precision).toBe(3);
    });

    it('preserves other fields when updating', () => {
      useSettingsStore.getState().updateNvMem({ beepEnabled: false });

      const nvMem = useSettingsStore.getState().nvMem;
      expect(nvMem.beepEnabled).toBe(false);
      // Other fields should be preserved
      expect(nvMem.defaultUnit).toBe('inch');
      expect(nvMem.precision).toBe(4);
    });

    it('updates bootMessageMode', () => {
      useSettingsStore.getState().updateNvMem({ bootMessageMode: 'skip' });

      expect(useSettingsStore.getState().nvMem.bootMessageMode).toBe('skip');
    });
  });

  describe('resetMemory', () => {
    it('resets all settings to defaults', () => {
      // Modify settings first
      useSettingsStore.getState().updateNvMem({
        defaultUnit: 'mm',
        precision: 2,
        beepEnabled: false,
        bootMessageMode: 'skip',
      });

      // Verify they changed
      expect(useSettingsStore.getState().nvMem.defaultUnit).toBe('mm');

      // Reset
      useSettingsStore.getState().resetMemory();

      // Should be back to defaults
      expect(useSettingsStore.getState().nvMem).toEqual(DEFAULT_NON_VOLATILE_MEMORY);
    });
  });

  describe('selectors', () => {
    it('useNvMem returns full nvMem object', () => {
      const { result } = renderHook(() => useNvMem());
      expect(result.current).toEqual(DEFAULT_NON_VOLATILE_MEMORY);
    });

    it('useDefaultUnit returns default unit', () => {
      const { result } = renderHook(() => useDefaultUnit());
      expect(result.current).toBe('inch');
    });

    it('usePrecision returns precision', () => {
      const { result } = renderHook(() => usePrecision());
      expect(result.current).toBe(4);
    });

    it('useBeepEnabled returns beep enabled status', () => {
      const { result } = renderHook(() => useBeepEnabled());
      expect(result.current).toBe(true);
    });

    it('useBootMessageMode returns boot message mode', () => {
      const { result } = renderHook(() => useBootMessageMode());
      expect(result.current).toBe('show');
    });

    it('useUpdateNvMem returns update function', () => {
      const { result } = renderHook(() => useUpdateNvMem());
      expect(typeof result.current).toBe('function');

      act(() => {
        result.current({ defaultUnit: 'mm' });
      });

      expect(useSettingsStore.getState().nvMem.defaultUnit).toBe('mm');
    });

    it('useResetMemory returns reset function', () => {
      // Modify settings first
      useSettingsStore.getState().updateNvMem({ defaultUnit: 'mm' });

      const { result } = renderHook(() => useResetMemory());
      expect(typeof result.current).toBe('function');

      act(() => {
        result.current();
      });

      expect(useSettingsStore.getState().nvMem).toEqual(DEFAULT_NON_VOLATILE_MEMORY);
    });

    it('selectors update when store changes', () => {
      const { result: unitResult } = renderHook(() => useDefaultUnit());
      expect(unitResult.current).toBe('inch');

      act(() => {
        useSettingsStore.getState().updateNvMem({ defaultUnit: 'mm' });
      });

      expect(unitResult.current).toBe('mm');
    });
  });
});

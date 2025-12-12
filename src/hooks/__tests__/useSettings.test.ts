import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSettings } from '../useSettings';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from '../../types/settings';

describe('useSettings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('initialization', () => {
    it('should return defaults when no stored settings', () => {
      const { result } = renderHook(() => useSettings());

      expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
    });

    it('should load settings from localStorage', () => {
      const storedSettings = {
        beepEnabled: false,
        defaultUnit: 'mm' as const,
        precision: 3,
      };
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(storedSettings));

      const { result } = renderHook(() => useSettings());

      expect(result.current.settings).toEqual(storedSettings);
    });

    it('should merge stored settings with defaults for new properties', () => {
      // Simulate an old stored setting that doesn't have all properties
      const partialSettings = { beepEnabled: false };
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(partialSettings));

      const { result } = renderHook(() => useSettings());

      expect(result.current.settings.beepEnabled).toBe(false);
      expect(result.current.settings.defaultUnit).toBe(DEFAULT_SETTINGS.defaultUnit);
      expect(result.current.settings.precision).toBe(DEFAULT_SETTINGS.precision);
    });

    it('should handle corrupted localStorage data', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      localStorage.setItem(SETTINGS_STORAGE_KEY, 'invalid json');

      const { result } = renderHook(() => useSettings());

      // Should fall back to defaults
      expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
      consoleSpy.mockRestore();
    });
  });

  describe('updateSettings', () => {
    it('should update single setting', () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.updateSettings({ beepEnabled: false });
      });

      expect(result.current.settings.beepEnabled).toBe(false);
      expect(result.current.settings.defaultUnit).toBe(DEFAULT_SETTINGS.defaultUnit);
    });

    it('should update multiple settings at once', () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.updateSettings({
          beepEnabled: false,
          precision: 2,
        });
      });

      expect(result.current.settings.beepEnabled).toBe(false);
      expect(result.current.settings.precision).toBe(2);
    });

    it('should save settings to localStorage on change', () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.updateSettings({ beepEnabled: false });
      });

      const stored = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || '{}');
      expect(stored.beepEnabled).toBe(false);
    });
  });

  describe('resetSettings', () => {
    it('should reset all settings to defaults', () => {
      const { result } = renderHook(() => useSettings());

      // Change settings first
      act(() => {
        result.current.updateSettings({
          beepEnabled: false,
          defaultUnit: 'mm',
          precision: 2,
        });
      });

      expect(result.current.settings.beepEnabled).toBe(false);

      // Reset
      act(() => {
        result.current.resetSettings();
      });

      expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
    });

    it('should save defaults to localStorage on reset', () => {
      const { result } = renderHook(() => useSettings());

      // Change settings
      act(() => {
        result.current.updateSettings({ beepEnabled: false });
      });

      // Reset
      act(() => {
        result.current.resetSettings();
      });

      const stored = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || '{}');
      expect(stored).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe('localStorage error handling', () => {
    it('should handle localStorage.setItem errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const setItemSpy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.updateSettings({ beepEnabled: false });
      });

      // Should not throw, just warn
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save settings to localStorage:',
        expect.any(Error)
      );

      // State should still be updated
      expect(result.current.settings.beepEnabled).toBe(false);

      consoleSpy.mockRestore();
      setItemSpy.mockRestore();
    });
  });
});

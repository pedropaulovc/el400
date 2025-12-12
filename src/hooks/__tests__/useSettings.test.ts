import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSettings } from '../useSettings';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from '../../types/settings';

describe('useSettings', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
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

    it('should save settings to localStorage on change', async () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.updateSettings({ beepEnabled: false });
      });

      // Advance past debounce delay
      act(() => {
        vi.advanceTimersByTime(400);
      });

      const stored = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || '{}');
      expect(stored.beepEnabled).toBe(false);
    });

    it('should debounce writes to localStorage', () => {
      const setItemSpy = vi.spyOn(localStorage, 'setItem');
      const { result } = renderHook(() => useSettings());

      // Make multiple rapid updates
      act(() => {
        result.current.updateSettings({ beepEnabled: false });
      });
      act(() => {
        result.current.updateSettings({ precision: 2 });
      });
      act(() => {
        result.current.updateSettings({ defaultUnit: 'mm' });
      });

      // Advance past debounce
      act(() => {
        vi.advanceTimersByTime(400);
      });

      // Should have saved with final values
      const lastCall = setItemSpy.mock.calls[setItemSpy.mock.calls.length - 1];
      const savedData = JSON.parse(lastCall[1]);
      expect(savedData.beepEnabled).toBe(false);
      expect(savedData.precision).toBe(2);
      expect(savedData.defaultUnit).toBe('mm');

      setItemSpy.mockRestore();
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

    it('should immediately save defaults to localStorage on reset', () => {
      const { result } = renderHook(() => useSettings());

      // Change settings and wait for save
      act(() => {
        result.current.updateSettings({ beepEnabled: false });
        vi.advanceTimersByTime(400);
      });

      // Reset
      act(() => {
        result.current.resetSettings();
      });

      // Should be saved immediately (not debounced)
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
        vi.advanceTimersByTime(400);
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

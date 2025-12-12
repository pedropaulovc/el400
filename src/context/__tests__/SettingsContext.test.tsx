import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ReactNode } from 'react';
import { SettingsProvider, useSettingsContext } from '../SettingsContext';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from '../../types/settings';

describe('SettingsContext', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <SettingsProvider>{children}</SettingsProvider>
  );

  describe('SettingsProvider', () => {
    it('should provide default settings to children', () => {
      const { result } = renderHook(() => useSettingsContext(), { wrapper });

      expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
    });

    it('should allow updating settings through context', () => {
      const { result } = renderHook(() => useSettingsContext(), { wrapper });

      act(() => {
        result.current.updateSettings({ beepEnabled: false });
      });

      expect(result.current.settings.beepEnabled).toBe(false);
      expect(result.current.settings.defaultUnit).toBe(DEFAULT_SETTINGS.defaultUnit);
    });

    it('should allow resetting settings through context', () => {
      const { result } = renderHook(() => useSettingsContext(), { wrapper });

      // First change some settings
      act(() => {
        result.current.updateSettings({
          beepEnabled: false,
          precision: 2,
          defaultUnit: 'mm',
        });
      });

      expect(result.current.settings.beepEnabled).toBe(false);

      // Then reset
      act(() => {
        result.current.resetSettings();
      });

      expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
    });

    it('should persist settings to localStorage', () => {
      const { result } = renderHook(() => useSettingsContext(), { wrapper });

      act(() => {
        result.current.updateSettings({ precision: 3 });
      });

      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed.precision).toBe(3);
    });
  });

  describe('useSettingsContext without provider', () => {
    it('should return default settings without provider', () => {
      const { result } = renderHook(() => useSettingsContext());

      expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
    });

    it('should log warning when updateSettings called without provider', () => {
      const { result } = renderHook(() => useSettingsContext());

      result.current.updateSettings({ beepEnabled: false });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'useSettingsContext: No SettingsProvider found, changes will not persist'
      );
    });

    it('should log warning when resetSettings called without provider', () => {
      const { result } = renderHook(() => useSettingsContext());

      result.current.resetSettings();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'useSettingsContext: No SettingsProvider found, reset has no effect'
      );
    });

    it('should not modify settings when updateSettings called without provider', () => {
      const { result } = renderHook(() => useSettingsContext());

      const settingsBefore = result.current.settings;

      result.current.updateSettings({ beepEnabled: false });

      // Settings should still be defaults (no actual change)
      expect(result.current.settings).toEqual(settingsBefore);
    });
  });
});

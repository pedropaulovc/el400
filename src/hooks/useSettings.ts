/**
 * Hook for managing DRO settings with localStorage persistence.
 * Works in both CNCjs iframe and LinuxCNC QtWebEngine contexts.
 */

import { useState, useEffect, useCallback } from 'react';
import type { DROSettings } from '../types/settings';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from '../types/settings';

/**
 * Load settings from localStorage
 */
function loadSettings(): DROSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to handle new settings added in updates
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.warn('Failed to load settings from localStorage:', error);
  }
  return DEFAULT_SETTINGS;
}

/**
 * Save settings to localStorage
 */
function saveSettings(settings: DROSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('Failed to save settings to localStorage:', error);
  }
}

export interface UseSettingsReturn {
  /** Current settings */
  settings: DROSettings;
  /** Update one or more settings */
  updateSettings: (partial: Partial<DROSettings>) => void;
  /** Reset all settings to defaults */
  resetSettings: () => void;
}

/**
 * Hook for managing DRO settings with localStorage persistence.
 */
export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<DROSettings>(loadSettings);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const updateSettings = useCallback((partial: Partial<DROSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return {
    settings,
    updateSettings,
    resetSettings,
  };
}

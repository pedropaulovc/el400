/**
 * Hook for managing DRO settings with localStorage persistence.
 * Works in both CNCjs iframe and LinuxCNC QtWebEngine contexts.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { DROSettings } from '../types/settings';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from '../types/settings';

const DEBOUNCE_DELAY = 300; // ms

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
 * Settings are debounced before being written to localStorage.
 */
export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<DROSettings>(loadSettings);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSettingsRef = useRef<DROSettings | null>(null);

  // Save settings to localStorage with debouncing
  useEffect(() => {
    // Clear any pending save
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Track pending settings for beforeunload
    pendingSettingsRef.current = settings;

    // Schedule a new save
    debounceTimeoutRef.current = setTimeout(() => {
      saveSettings(settings);
      pendingSettingsRef.current = null;
    }, DEBOUNCE_DELAY);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [settings]);

  // Flush pending settings on page unload to prevent data loss
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (pendingSettingsRef.current !== null) {
        saveSettings(pendingSettingsRef.current);
        pendingSettingsRef.current = null;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const updateSettings = useCallback((partial: Partial<DROSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    // Save immediately on reset
    saveSettings(DEFAULT_SETTINGS);
  }, []);

  return {
    settings,
    updateSettings,
    resetSettings,
  };
}

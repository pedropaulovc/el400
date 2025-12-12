/**
 * Settings context for providing DRO settings throughout the app.
 */

import { createContext, useContext, type ReactNode } from 'react';
import { useSettings, type UseSettingsReturn } from '../hooks/useSettings';
import { DEFAULT_SETTINGS } from '../types/settings';

const SettingsContext = createContext<UseSettingsReturn | null>(null);

export interface SettingsProviderProps {
  children: ReactNode;
}

/**
 * Provider component for DRO settings.
 * Wrap your app with this to enable useSettingsContext().
 */
export function SettingsProvider({ children }: SettingsProviderProps) {
  const settingsValue = useSettings();

  return (
    <SettingsContext.Provider value={settingsValue}>
      {children}
    </SettingsContext.Provider>
  );
}

/**
 * Hook to access settings from context.
 * Must be used within a SettingsProvider.
 */
export function useSettingsContext(): UseSettingsReturn {
  const context = useContext(SettingsContext);

  if (context === null) {
    // Return a fallback with defaults if not in provider (for standalone use)
    return {
      settings: DEFAULT_SETTINGS,
      updateSettings: () => {
        console.warn('useSettingsContext: No SettingsProvider found, changes will not persist');
      },
      resetSettings: () => {
        console.warn('useSettingsContext: No SettingsProvider found, reset has no effect');
      },
    };
  }

  return context;
}

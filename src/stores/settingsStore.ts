/**
 * Settings Store - Non-volatile memory with localStorage persistence
 *
 * Manages user preferences that persist across sessions.
 * Uses Zustand's persist middleware for automatic localStorage sync.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { NonVolatileMemory } from '../types/nonVolatileMemory';
import {
  DEFAULT_NON_VOLATILE_MEMORY,
  NON_VOLATILE_MEMORY_STORAGE_KEY,
} from '../types/nonVolatileMemory';
import { decimalsForDisplayResolution } from './dro/utils/displayComputation';

// ─────────────────────────────────────────────────────────────────
// STORE INTERFACE
// ─────────────────────────────────────────────────────────────────

interface SettingsStore {
  // State
  nvMem: NonVolatileMemory;

  // Actions
  updateNvMem: (partial: Partial<NonVolatileMemory>) => void;
  resetMemory: () => void;
}

// ─────────────────────────────────────────────────────────────────
// STORE IMPLEMENTATION
// ─────────────────────────────────────────────────────────────────

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      // Initial state
      nvMem: DEFAULT_NON_VOLATILE_MEMORY,

      // Actions
      updateNvMem: (partial) =>
        set((state) => ({
          nvMem: { ...state.nvMem, ...partial },
        })),

      resetMemory: () =>
        set({
          nvMem: DEFAULT_NON_VOLATILE_MEMORY,
        }),
    }),
    {
      name: NON_VOLATILE_MEMORY_STORAGE_KEY,
      // Merge stored state with defaults to handle new fields in updates
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<SettingsStore> | undefined;
        return {
          ...currentState,
          nvMem: {
            ...DEFAULT_NON_VOLATILE_MEMORY,
            ...persisted?.nvMem,
          },
        };
      },
    }
  )
);

// ─────────────────────────────────────────────────────────────────
// SELECTORS - Granular subscriptions for performance
// ─────────────────────────────────────────────────────────────────

/** Get the full nvMem object */
export const useNvMem = () => useSettingsStore((s) => s.nvMem);

/** Get default unit setting */
export const useDefaultUnit = () => useSettingsStore((s) => s.nvMem.defaultUnit);

/** Get display precision setting */
export const usePrecision = () => useSettingsStore((s) => s.nvMem.precision);

/**
 * Get the fractional-digit count for a single axis from its dP display
 * resolution (US-022). Subscribes only to that axis's value so a change to one
 * axis does not re-render the others.
 */
export const useAxisDisplayDecimals = (axis: 'X' | 'Y' | 'Z') =>
  useSettingsStore((s) => decimalsForDisplayResolution(s.nvMem.displayResolution[axis]));

/** Get beep enabled setting */
export const useBeepEnabled = () => useSettingsStore((s) => s.nvMem.beepEnabled);

/** Get boot message mode setting */
export const useBootMessageMode = () => useSettingsStore((s) => s.nvMem.bootMessageMode);

/** Get updateNvMem action */
export const useUpdateNvMem = () => useSettingsStore((s) => s.updateNvMem);

/** Get resetMemory action */
export const useResetMemory = () => useSettingsStore((s) => s.resetMemory);

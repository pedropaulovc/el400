/**
 * Hook for managing non-volatile memory with localStorage persistence.
 * Works in both CNCjs iframe and LinuxCNC QtWebEngine contexts.
 */

import { useState, useEffect, useCallback } from 'react';
import type { NonVolatileMemory } from '../types/nonVolatileMemory';
import { DEFAULT_NON_VOLATILE_MEMORY, NON_VOLATILE_MEMORY_STORAGE_KEY } from '../types/nonVolatileMemory';

/**
 * Load memory from localStorage
 */
function loadMemory(): NonVolatileMemory {
  try {
    const stored = localStorage.getItem(NON_VOLATILE_MEMORY_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to handle new fields added in updates
      return { ...DEFAULT_NON_VOLATILE_MEMORY, ...parsed };
    }
  } catch (error) {
    console.warn('Failed to load non-volatile memory from localStorage:', error);
  }
  return DEFAULT_NON_VOLATILE_MEMORY;
}

/**
 * Save memory to localStorage
 */
function saveMemory(memory: NonVolatileMemory): void {
  try {
    localStorage.setItem(NON_VOLATILE_MEMORY_STORAGE_KEY, JSON.stringify(memory));
  } catch (error) {
    console.warn('Failed to save non-volatile memory to localStorage:', error);
  }
}

export interface UseNonVolatileMemoryReturn {
  /** Current non-volatile memory state */
  nvMem: NonVolatileMemory;
  /** Update one or more memory fields */
  updateNvMem: (partial: Partial<NonVolatileMemory>) => void;
  /** Reset all memory to defaults */
  resetMemory: () => void;
}

/**
 * Hook for managing non-volatile memory with localStorage persistence.
 */
export function useNonVolatileMemory(): UseNonVolatileMemoryReturn {
  const [nvMem, setNvMem] = useState<NonVolatileMemory>(loadMemory);

  // Save memory to localStorage whenever it changes
  useEffect(() => {
    saveMemory(nvMem);
  }, [nvMem]);

  const updateNvMem = useCallback((partial: Partial<NonVolatileMemory>) => {
    setNvMem((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetMemory = useCallback(() => {
    setNvMem(DEFAULT_NON_VOLATILE_MEMORY);
  }, []);

  return {
    nvMem,
    updateNvMem,
    resetMemory,
  };
}

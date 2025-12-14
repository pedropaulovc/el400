/**
 * Non-volatile memory context for providing persisted settings throughout the app.
 */

import { createContext, useContext, type ReactNode } from 'react';
import { useNonVolatileMemory, type UseNonVolatileMemoryReturn } from '../hooks/useNonVolatileMemory';
import { DEFAULT_NON_VOLATILE_MEMORY } from '../types/nonVolatileMemory';

const NonVolatileMemoryContext = createContext<UseNonVolatileMemoryReturn | null>(null);

export interface NonVolatileMemoryProviderProps {
  children: ReactNode;
}

/**
 * Provider component for non-volatile memory.
 * Wrap your app with this to enable useNonVolatileMemoryContext().
 */
export function NonVolatileMemoryProvider({ children }: NonVolatileMemoryProviderProps) {
  const memoryValue = useNonVolatileMemory();

  return (
    <NonVolatileMemoryContext.Provider value={memoryValue}>
      {children}
    </NonVolatileMemoryContext.Provider>
  );
}

/**
 * Hook to access non-volatile memory from context.
 * Must be used within a NonVolatileMemoryProvider.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useNonVolatileMemoryContext(): UseNonVolatileMemoryReturn {
  const context = useContext(NonVolatileMemoryContext);

  if (context === null) {
    // Return a fallback with defaults if not in provider (for standalone use)
    return {
      nvMem: DEFAULT_NON_VOLATILE_MEMORY,
      updateNvMem: () => {
        console.warn('useNonVolatileMemoryContext: No NonVolatileMemoryProvider found, changes will not persist');
      },
      resetMemory: () => {
        console.warn('useNonVolatileMemoryContext: No NonVolatileMemoryProvider found, reset has no effect');
      },
    };
  }

  return context;
}

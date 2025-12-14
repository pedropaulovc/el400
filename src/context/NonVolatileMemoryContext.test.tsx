import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ReactNode } from 'react';
import {
  NonVolatileMemoryProvider,
  useNonVolatileMemoryContext,
} from './NonVolatileMemoryContext';
import { DEFAULT_NON_VOLATILE_MEMORY } from '../types/nonVolatileMemory';

function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <NonVolatileMemoryProvider>{children}</NonVolatileMemoryProvider>;
  };
}

describe('NonVolatileMemoryContext', () => {
  describe('with provider', () => {
    it('provides default memory values', () => {
      const { result } = renderHook(() => useNonVolatileMemoryContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current.nvMem.defaultUnit).toBe('inch');
      expect(result.current.nvMem.precision).toBe(4);
    });

    it('allows updating memory', () => {
      const { result } = renderHook(() => useNonVolatileMemoryContext(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.updateNvMem({ defaultUnit: 'mm' });
      });

      expect(result.current.nvMem.defaultUnit).toBe('mm');
    });

    it('allows resetting memory', () => {
      const { result } = renderHook(() => useNonVolatileMemoryContext(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.updateNvMem({ defaultUnit: 'mm', precision: 2 });
      });
      expect(result.current.nvMem.defaultUnit).toBe('mm');

      act(() => {
        result.current.resetMemory();
      });

      expect(result.current.nvMem.defaultUnit).toBe('inch');
      expect(result.current.nvMem.precision).toBe(4);
    });
  });

  describe('without provider (fallback)', () => {
    it('returns default memory values', () => {
      const { result } = renderHook(() => useNonVolatileMemoryContext());

      expect(result.current.nvMem).toEqual(DEFAULT_NON_VOLATILE_MEMORY);
    });

    it('warns when updateNvMem is called', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { result } = renderHook(() => useNonVolatileMemoryContext());

      act(() => {
        result.current.updateNvMem({ defaultUnit: 'mm' });
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'useNonVolatileMemoryContext: No NonVolatileMemoryProvider found, changes will not persist'
      );
      consoleSpy.mockRestore();
    });

    it('warns when resetMemory is called', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { result } = renderHook(() => useNonVolatileMemoryContext());

      act(() => {
        result.current.resetMemory();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'useNonVolatileMemoryContext: No NonVolatileMemoryProvider found, reset has no effect'
      );
      consoleSpy.mockRestore();
    });
  });
});

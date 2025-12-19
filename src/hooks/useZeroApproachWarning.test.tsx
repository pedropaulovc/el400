/**
 * Integration tests for useZeroApproachWarning hook
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useZeroApproachWarning } from './useZeroApproachWarning';
import { DROProvider } from '../dro-state-machine';
import { NonVolatileMemoryProvider } from '../context/NonVolatileMemoryContext';
import { MillStateProvider } from '../context/MillStateContext';
import { ReactNode } from 'react';
import * as audioManager from '../utils/audioManager';

// Mock audio manager
vi.mock('../utils/audioManager', () => ({
  playButtonClick: vi.fn(),
  startZeroApproachBeep: vi.fn(),
  stopZeroApproachBeep: vi.fn(),
  isZeroApproachBeepActive: vi.fn(() => false),
}));

const AllProviders = ({ children }: { children: ReactNode }) => (
  <MillStateProvider>
    <NonVolatileMemoryProvider>
      <DROProvider>
        {children}
      </DROProvider>
    </NonVolatileMemoryProvider>
  </MillStateProvider>
);

describe('useZeroApproachWarning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should not beep when zero approach is disabled', () => {
    const { result } = renderHook(() => useZeroApproachWarning(), {
      wrapper: AllProviders,
    });

    expect(result.current).toBeUndefined();
    expect(audioManager.startZeroApproachBeep).not.toHaveBeenCalled();
  });

  it('should render without errors', () => {
    const { result } = renderHook(() => useZeroApproachWarning(), {
      wrapper: AllProviders,
    });

    expect(result.current).toBeUndefined();
  });

  it('should clean up on unmount', () => {
    const { unmount } = renderHook(() => useZeroApproachWarning(), {
      wrapper: AllProviders,
    });

    unmount();
    // Should not throw
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { useMachineState, useMachineConnected, useMachineConnectionStatus } from '../useMachineState';
import { MachineStateProvider } from '../../context/MachineStateContext';
import { MockAdapter } from '../../adapters/MockAdapter';

describe('useMachineState hooks', () => {
  let adapter: MockAdapter;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Use a high update interval to prevent interval from firing during tests
    adapter = new MockAdapter({ updateInterval: 60000 });

    // Suppress React act() warnings for subscription-based state updates
    // These warnings occur because MockAdapter's subscription callback triggers
    // setState synchronously during connect(), which is expected behavior
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation((msg) => {
      if (typeof msg === 'string' && msg.includes('not wrapped in act')) {
        return;
      }
      console.warn(msg);
    });
  });

  afterEach(() => {
    adapter.disconnect();
    consoleErrorSpy.mockRestore();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <MachineStateProvider initialAdapter={adapter}>
      {children}
    </MachineStateProvider>
  );

  describe('useMachineState', () => {
    it('should return initial position as zeros', async () => {
      const { result } = renderHook(() => useMachineState(), { wrapper });

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      expect(result.current.position).toEqual({ x: 0, y: 0, z: 0 });
    });

    it('should connect automatically when adapter is provided', async () => {
      const { result } = renderHook(() => useMachineState(), { wrapper });

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });
    });

    it('should update when adapter emits new state', async () => {
      const { result } = renderHook(() => useMachineState(), { wrapper });

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      // Update position
      act(() => {
        adapter.setPosition(10, 20, 30);
      });

      expect(result.current.position).toEqual({ x: 10, y: 20, z: 30 });
    });

    it('should cleanup subscription on unmount', async () => {
      const { result, unmount } = renderHook(() => useMachineState(), { wrapper });

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      unmount();

      // Adapter should be disconnected
      expect(adapter.getState().connected).toBe(false);
    });
  });

  describe('useMachineConnected', () => {
    it('should return true when connected via adapter', async () => {
      const { result } = renderHook(() => useMachineConnected(), { wrapper });

      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });
  });

  describe('useMachineConnectionStatus', () => {
    it('should return connected status after connection', async () => {
      const { result } = renderHook(() => useMachineConnectionStatus(), { wrapper });

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
        expect(result.current.isConnecting).toBe(false);
      });

      expect(result.current.error).toBe(null);
    });
  });

  describe('without provider', () => {
    it('should return default state without provider', () => {
      const { result } = renderHook(() => useMachineState());

      expect(result.current.position).toEqual({ x: 0, y: 0, z: 0 });
      expect(result.current.connected).toBe(false);
      expect(result.current.controllerType).toBe('manual');
    });
  });
});

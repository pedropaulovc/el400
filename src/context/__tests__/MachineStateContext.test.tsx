import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import {
  MachineStateProvider,
  useMachineStateContext,
} from '../MachineStateContext';
import { MockAdapter } from '../../adapters/MockAdapter';
import type { MachineAdapter } from '../../adapters/MachineAdapter';
import type { DataSourceConfig } from '../../types/machine';

describe('MachineStateContext', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation((msg) => {
      // Suppress React act() warnings
      if (typeof msg === 'string' && msg.includes('not wrapped in act')) {
        return;
      }
    });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('createAdapterFromConfig (via MachineStateProvider)', () => {
    it('should create MockAdapter for mock config', async () => {
      const config: DataSourceConfig = { type: 'mock', host: '', port: 0 };
      const wrapper = ({ children }: { children: ReactNode }) => (
        <MachineStateProvider config={config}>{children}</MachineStateProvider>
      );

      const { result } = renderHook(() => useMachineStateContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.adapter).not.toBeNull();
      });

      expect(result.current.adapter?.controllerType).toBe('mock');
    });

    it('should return null adapter for cncjs config and log message', () => {
      const config: DataSourceConfig = {
        type: 'cncjs',
        host: 'localhost',
        port: 8000,
      };
      const wrapper = ({ children }: { children: ReactNode }) => (
        <MachineStateProvider config={config}>{children}</MachineStateProvider>
      );

      const { result } = renderHook(() => useMachineStateContext(), { wrapper });

      expect(result.current.adapter).toBeNull();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'CNCjs adapter requested, host:',
        'localhost',
        'port:',
        8000
      );
    });

    it('should return null adapter for linuxcnc config and log message', () => {
      const config: DataSourceConfig = {
        type: 'linuxcnc',
        host: 'localhost',
        port: 5007,
      };
      const wrapper = ({ children }: { children: ReactNode }) => (
        <MachineStateProvider config={config}>{children}</MachineStateProvider>
      );

      const { result } = renderHook(() => useMachineStateContext(), { wrapper });

      expect(result.current.adapter).toBeNull();
      expect(consoleLogSpy).toHaveBeenCalledWith('LinuxCNC adapter requested');
    });

    it('should return null adapter for manual config', () => {
      const config: DataSourceConfig = { type: 'manual', host: '', port: 0 };
      const wrapper = ({ children }: { children: ReactNode }) => (
        <MachineStateProvider config={config}>{children}</MachineStateProvider>
      );

      const { result } = renderHook(() => useMachineStateContext(), { wrapper });

      expect(result.current.adapter).toBeNull();
    });
  });

  describe('connection error handling', () => {
    it('should set error when adapter connection fails with Error', async () => {
      const failingAdapter: MachineAdapter = {
        controllerType: 'mock',
        connect: vi.fn().mockRejectedValue(new Error('Connection failed')),
        disconnect: vi.fn(),
        subscribe: vi.fn(() => () => {}),
        getState: vi.fn(() => ({
          position: { x: 0, y: 0, z: 0 },
          probe: { pinState: '', triggered: false },
          connected: false,
          controllerType: 'mock' as const,
        })),
      };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <MachineStateProvider initialAdapter={failingAdapter}>
          {children}
        </MachineStateProvider>
      );

      const { result } = renderHook(() => useMachineStateContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toBe('Connection failed');
      expect(result.current.isConnecting).toBe(false);
    });

    it('should convert non-Error to Error when connection fails', async () => {
      const failingAdapter: MachineAdapter = {
        controllerType: 'mock',
        connect: vi.fn().mockRejectedValue('string error'),
        disconnect: vi.fn(),
        subscribe: vi.fn(() => () => {}),
        getState: vi.fn(() => ({
          position: { x: 0, y: 0, z: 0 },
          probe: { pinState: '', triggered: false },
          connected: false,
          controllerType: 'mock' as const,
        })),
      };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <MachineStateProvider initialAdapter={failingAdapter}>
          {children}
        </MachineStateProvider>
      );

      const { result } = renderHook(() => useMachineStateContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('string error');
    });
  });

  describe('setAdapter', () => {
    it('should allow changing adapter', async () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <MachineStateProvider>{children}</MachineStateProvider>
      );

      const { result } = renderHook(() => useMachineStateContext(), { wrapper });

      expect(result.current.adapter).toBeNull();

      const newAdapter = new MockAdapter({ updateInterval: 60000 });

      act(() => {
        result.current.setAdapter(newAdapter);
      });

      await waitFor(() => {
        expect(result.current.adapter).toBe(newAdapter);
      });

      // Cleanup
      newAdapter.disconnect();
    });

    it('should clear error when setting new adapter', async () => {
      const failingAdapter: MachineAdapter = {
        controllerType: 'mock',
        connect: vi.fn().mockRejectedValue(new Error('Connection failed')),
        disconnect: vi.fn(),
        subscribe: vi.fn(() => () => {}),
        getState: vi.fn(() => ({
          position: { x: 0, y: 0, z: 0 },
          probe: { pinState: '', triggered: false },
          connected: false,
          controllerType: 'mock' as const,
        })),
      };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <MachineStateProvider initialAdapter={failingAdapter}>
          {children}
        </MachineStateProvider>
      );

      const { result } = renderHook(() => useMachineStateContext(), { wrapper });

      // Wait for error to be set
      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // Set a new adapter
      act(() => {
        result.current.setAdapter(null);
      });

      // Error should be cleared
      expect(result.current.error).toBeNull();
    });
  });

  describe('useMachineStateContext without provider', () => {
    it('should return fallback values without provider', () => {
      const { result } = renderHook(() => useMachineStateContext());

      expect(result.current.state.controllerType).toBe('manual');
      expect(result.current.adapter).toBeNull();
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should log warning when setAdapter called without provider', () => {
      const { result } = renderHook(() => useMachineStateContext());

      result.current.setAdapter(null);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'useMachineStateContext: No MachineStateProvider found'
      );
    });
  });

  describe('adapter lifecycle', () => {
    it('should reset state to manual when adapter is set to null', async () => {
      const adapter = new MockAdapter({ updateInterval: 60000 });

      const wrapper = ({ children }: { children: ReactNode }) => (
        <MachineStateProvider initialAdapter={adapter}>
          {children}
        </MachineStateProvider>
      );

      const { result } = renderHook(() => useMachineStateContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.connected).toBe(true);
      });

      act(() => {
        result.current.setAdapter(null);
      });

      expect(result.current.state.controllerType).toBe('manual');
      expect(result.current.state.connected).toBe(false);
    });

    it('should disconnect previous adapter when setting new one', async () => {
      const adapter1 = new MockAdapter({ updateInterval: 60000 });
      const disconnectSpy = vi.spyOn(adapter1, 'disconnect');

      const wrapper = ({ children }: { children: ReactNode }) => (
        <MachineStateProvider initialAdapter={adapter1}>
          {children}
        </MachineStateProvider>
      );

      const { result } = renderHook(() => useMachineStateContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.connected).toBe(true);
      });

      const adapter2 = new MockAdapter({ updateInterval: 60000 });

      act(() => {
        result.current.setAdapter(adapter2);
      });

      // Previous adapter should be disconnected
      expect(disconnectSpy).toHaveBeenCalled();

      // Cleanup
      adapter2.disconnect();
    });
  });
});

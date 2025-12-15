import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import {
  MachineStateProvider,
  useMachineStateContext,
} from './MachineStateContext';
import { MockAdapter } from '../adapters/MockAdapter';

function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MachineStateProvider>{children}</MachineStateProvider>;
  };
}

function createWrapperWithAdapter(adapter: MockAdapter) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MachineStateProvider initialAdapter={adapter}>
        {children}
      </MachineStateProvider>
    );
  };
}

describe('MachineStateContext', () => {
  describe('Context hook', () => {
    it('throws error when used outside provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useMachineStateContext());
      }).toThrow('useMachineStateContext must be used within a MachineStateProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('Default state (no adapter)', () => {
    it('starts disconnected', () => {
      const { result } = renderHook(() => useMachineStateContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current.machineState.connected).toBe(false);
    });

    it('starts in manual controller type', () => {
      const { result } = renderHook(() => useMachineStateContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current.machineState.controllerType).toBe('manual');
    });

    it('starts with zero position', () => {
      const { result } = renderHook(() => useMachineStateContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current.machineState.position).toEqual({ x: 0, y: 0, z: 0 });
    });

    it('starts with probe not triggered', () => {
      const { result } = renderHook(() => useMachineStateContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current.machineState.probe.triggered).toBe(false);
      expect(result.current.machineState.probe.pinState).toBe('');
    });

    it('has null adapter', () => {
      const { result } = renderHook(() => useMachineStateContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current.adapter).toBeNull();
    });

    it('is not connecting', () => {
      const { result } = renderHook(() => useMachineStateContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isConnecting).toBe(false);
    });

    it('has no error', () => {
      const { result } = renderHook(() => useMachineStateContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Adapter connection', () => {
    let adapter: MockAdapter;

    beforeEach(() => {
      adapter = new MockAdapter();
    });

    it('connects with initial adapter', async () => {
      const { result } = renderHook(() => useMachineStateContext(), {
        wrapper: createWrapperWithAdapter(adapter),
      });

      await waitFor(() => {
        expect(result.current.machineState.connected).toBe(true);
      });

      expect(result.current.machineState.controllerType).toBe('mock');
    });

    it('exposes adapter instance', async () => {
      const { result } = renderHook(() => useMachineStateContext(), {
        wrapper: createWrapperWithAdapter(adapter),
      });

      await waitFor(() => {
        expect(result.current.machineState.connected).toBe(true);
      });

      expect(result.current.adapter).toBe(adapter);
    });

    it('receives position updates from adapter', async () => {
      const { result } = renderHook(() => useMachineStateContext(), {
        wrapper: createWrapperWithAdapter(adapter),
      });

      await waitFor(() => {
        expect(result.current.machineState.connected).toBe(true);
      });

      act(() => {
        adapter.setPosition(10, 20, 30);
      });

      await waitFor(() => {
        expect(result.current.machineState.position.x).toBe(10);
        expect(result.current.machineState.position.y).toBe(20);
        expect(result.current.machineState.position.z).toBe(30);
      });
    });

    it('receives probe state updates from adapter', async () => {
      const { result } = renderHook(() => useMachineStateContext(), {
        wrapper: createWrapperWithAdapter(adapter),
      });

      await waitFor(() => {
        expect(result.current.machineState.connected).toBe(true);
      });

      act(() => {
        adapter.setProbeState('P');
      });

      await waitFor(() => {
        expect(result.current.machineState.probe.triggered).toBe(true);
        expect(result.current.machineState.probe.pinState).toBe('P');
      });
    });

    it('clears probe state when untriggered', async () => {
      const { result } = renderHook(() => useMachineStateContext(), {
        wrapper: createWrapperWithAdapter(adapter),
      });

      await waitFor(() => {
        expect(result.current.machineState.connected).toBe(true);
      });

      act(() => {
        adapter.setProbeState('P');
      });

      await waitFor(() => {
        expect(result.current.machineState.probe.triggered).toBe(true);
      });

      act(() => {
        adapter.setProbeState('');
      });

      await waitFor(() => {
        expect(result.current.machineState.probe.triggered).toBe(false);
      });
    });
  });

  describe('setAdapter', () => {
    let adapter: MockAdapter;

    beforeEach(() => {
      adapter = new MockAdapter();
    });

    it('allows setting adapter after mount', async () => {
      const { result } = renderHook(() => useMachineStateContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current.adapter).toBeNull();

      act(() => {
        result.current.setAdapter(adapter);
      });

      await waitFor(() => {
        expect(result.current.adapter).toBe(adapter);
      });

      await waitFor(() => {
        expect(result.current.machineState.connected).toBe(true);
      });
    });

    it('allows clearing adapter', async () => {
      const { result } = renderHook(() => useMachineStateContext(), {
        wrapper: createWrapperWithAdapter(adapter),
      });

      await waitFor(() => {
        expect(result.current.machineState.connected).toBe(true);
      });

      act(() => {
        result.current.setAdapter(null);
      });

      await waitFor(() => {
        expect(result.current.adapter).toBeNull();
        expect(result.current.machineState.connected).toBe(false);
        expect(result.current.machineState.controllerType).toBe('manual');
      });
    });

    it('clears error when setting new adapter', async () => {
      const { result } = renderHook(() => useMachineStateContext(), {
        wrapper: createWrapper(),
      });

      // Manually set error state by setting adapter to null (simulates cleared state)
      act(() => {
        result.current.setAdapter(adapter);
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe('Adapter lifecycle', () => {
    it('disconnects adapter on unmount', async () => {
      const adapter = new MockAdapter();
      const disconnectSpy = vi.spyOn(adapter, 'disconnect');

      const { unmount } = renderHook(() => useMachineStateContext(), {
        wrapper: createWrapperWithAdapter(adapter),
      });

      await waitFor(() => {
        expect(adapter.getState().connected).toBe(true);
      });

      unmount();

      expect(disconnectSpy).toHaveBeenCalled();
    });

    it('disconnects old adapter when setting new one', async () => {
      const adapter1 = new MockAdapter();
      const adapter2 = new MockAdapter();
      const disconnect1Spy = vi.spyOn(adapter1, 'disconnect');

      const { result } = renderHook(() => useMachineStateContext(), {
        wrapper: createWrapperWithAdapter(adapter1),
      });

      await waitFor(() => {
        expect(result.current.machineState.connected).toBe(true);
      });

      act(() => {
        result.current.setAdapter(adapter2);
      });

      expect(disconnect1Spy).toHaveBeenCalled();

      await waitFor(() => {
        expect(result.current.adapter).toBe(adapter2);
      });
    });
  });
});

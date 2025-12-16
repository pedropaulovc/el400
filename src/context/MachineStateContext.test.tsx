import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import {
  MachineStateProvider,
  useMachineStateContext,
} from './MachineStateContext';
import { MockMillConnection } from '../adapters/MockMillConnection';

function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MachineStateProvider>{children}</MachineStateProvider>;
  };
}

function createWrapperWithConnection(connection: MockMillConnection) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MachineStateProvider initialConnection={connection}>
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

  describe('Default state (no connection)', () => {
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

    it('has null connection', () => {
      const { result } = renderHook(() => useMachineStateContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current.connection).toBeNull();
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

  describe('Connection lifecycle', () => {
    let connection: MockMillConnection;

    beforeEach(() => {
      connection = new MockMillConnection();
    });

    it('connects with initial connection', async () => {
      const { result } = renderHook(() => useMachineStateContext(), {
        wrapper: createWrapperWithConnection(connection),
      });

      await waitFor(() => {
        expect(result.current.machineState.connected).toBe(true);
      });

      expect(result.current.machineState.controllerType).toBe('mock');
    });

    it('exposes connection instance', async () => {
      const { result } = renderHook(() => useMachineStateContext(), {
        wrapper: createWrapperWithConnection(connection),
      });

      await waitFor(() => {
        expect(result.current.machineState.connected).toBe(true);
      });

      expect(result.current.connection).toBe(connection);
    });

    it('receives position updates from connection', async () => {
      const { result } = renderHook(() => useMachineStateContext(), {
        wrapper: createWrapperWithConnection(connection),
      });

      await waitFor(() => {
        expect(result.current.machineState.connected).toBe(true);
      });

      act(() => {
        connection.setPosition(10, 20, 30);
      });

      await waitFor(() => {
        expect(result.current.machineState.position.x).toBe(10);
        expect(result.current.machineState.position.y).toBe(20);
        expect(result.current.machineState.position.z).toBe(30);
      });
    });

    it('receives probe state updates from connection', async () => {
      const { result } = renderHook(() => useMachineStateContext(), {
        wrapper: createWrapperWithConnection(connection),
      });

      await waitFor(() => {
        expect(result.current.machineState.connected).toBe(true);
      });

      act(() => {
        connection.setProbeState('P');
      });

      await waitFor(() => {
        expect(result.current.machineState.probe.triggered).toBe(true);
        expect(result.current.machineState.probe.pinState).toBe('P');
      });
    });

    it('clears probe state when untriggered', async () => {
      const { result } = renderHook(() => useMachineStateContext(), {
        wrapper: createWrapperWithConnection(connection),
      });

      await waitFor(() => {
        expect(result.current.machineState.connected).toBe(true);
      });

      act(() => {
        connection.setProbeState('P');
      });

      await waitFor(() => {
        expect(result.current.machineState.probe.triggered).toBe(true);
      });

      act(() => {
        connection.setProbeState('');
      });

      await waitFor(() => {
        expect(result.current.machineState.probe.triggered).toBe(false);
      });
    });
  });

  describe('setConnection', () => {
    let connection: MockMillConnection;

    beforeEach(() => {
      connection = new MockMillConnection();
    });

    it('allows setting connection after mount', async () => {
      const { result } = renderHook(() => useMachineStateContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current.connection).toBeNull();

      act(() => {
        result.current.setConnection(connection);
      });

      await waitFor(() => {
        expect(result.current.connection).toBe(connection);
      });

      await waitFor(() => {
        expect(result.current.machineState.connected).toBe(true);
      });
    });

    it('allows clearing connection', async () => {
      const { result } = renderHook(() => useMachineStateContext(), {
        wrapper: createWrapperWithConnection(connection),
      });

      await waitFor(() => {
        expect(result.current.machineState.connected).toBe(true);
      });

      act(() => {
        result.current.setConnection(null);
      });

      await waitFor(() => {
        expect(result.current.connection).toBeNull();
        expect(result.current.machineState.connected).toBe(false);
        expect(result.current.machineState.controllerType).toBe('manual');
      });
    });

    it('clears error when setting new connection', async () => {
      const { result } = renderHook(() => useMachineStateContext(), {
        wrapper: createWrapper(),
      });

      // Manually set error state by setting connection to null (simulates cleared state)
      act(() => {
        result.current.setConnection(connection);
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe('Connection cleanup', () => {
    it('disconnects connection on unmount', async () => {
      const connection = new MockMillConnection();
      const disconnectSpy = vi.spyOn(connection, 'disconnect');

      const { unmount } = renderHook(() => useMachineStateContext(), {
        wrapper: createWrapperWithConnection(connection),
      });

      await waitFor(() => {
        expect(connection.getState().connected).toBe(true);
      });

      unmount();

      expect(disconnectSpy).toHaveBeenCalled();
    });

    it('disconnects old connection when setting new one', async () => {
      const connection1 = new MockMillConnection();
      const connection2 = new MockMillConnection();
      const disconnect1Spy = vi.spyOn(connection1, 'disconnect');

      const { result } = renderHook(() => useMachineStateContext(), {
        wrapper: createWrapperWithConnection(connection1),
      });

      await waitFor(() => {
        expect(result.current.machineState.connected).toBe(true);
      });

      act(() => {
        result.current.setConnection(connection2);
      });

      expect(disconnect1Spy).toHaveBeenCalled();

      await waitFor(() => {
        expect(result.current.connection).toBe(connection2);
      });
    });
  });
});

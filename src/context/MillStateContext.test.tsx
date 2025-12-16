import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import {
  MillStateProvider,
  useMillStateContext,
} from './MillStateContext';
import { MockMillConnection } from '../adapters/MockMillConnection';
import { NoOpMillConnection } from '../adapters/NoOpMillConnection';

function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MillStateProvider>{children}</MillStateProvider>;
  };
}

function createWrapperWithConnection(connection: MockMillConnection) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MillStateProvider initialConnection={connection}>
        {children}
      </MillStateProvider>
    );
  };
}

describe('MillStateContext', () => {
  describe('Context hook', () => {
    it('throws error when used outside provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useMillStateContext());
      }).toThrow('useMillStateContext must be used within a MillStateProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('Default state (no initialConnection)', () => {
    it('uses NoOpMillConnection by default', () => {
      const { result } = renderHook(() => useMillStateContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current.connection).toBeInstanceOf(NoOpMillConnection);
    });

    it('starts connected with noop controller', () => {
      const { result } = renderHook(() => useMillStateContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current.millState.connected).toBe(true);
      expect(result.current.millState.controllerType).toBe('noop');
    });

    it('starts with zero position', () => {
      const { result } = renderHook(() => useMillStateContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current.millState.position).toEqual({ x: 0, y: 0, z: 0 });
    });

    it('starts with probe not triggered', () => {
      const { result } = renderHook(() => useMillStateContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current.millState.probe.triggered).toBe(false);
      expect(result.current.millState.probe.pinState).toBe('');
    });

    it('is not connecting', () => {
      const { result } = renderHook(() => useMillStateContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isConnecting).toBe(false);
    });

    it('has no error', () => {
      const { result } = renderHook(() => useMillStateContext(), {
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
      const { result } = renderHook(() => useMillStateContext(), {
        wrapper: createWrapperWithConnection(connection),
      });

      await waitFor(() => {
        expect(result.current.millState.connected).toBe(true);
      });

      expect(result.current.millState.controllerType).toBe('mock');
    });

    it('exposes connection instance', async () => {
      const { result } = renderHook(() => useMillStateContext(), {
        wrapper: createWrapperWithConnection(connection),
      });

      await waitFor(() => {
        expect(result.current.millState.connected).toBe(true);
      });

      expect(result.current.connection).toBe(connection);
    });

    it('receives position updates from connection', async () => {
      const { result } = renderHook(() => useMillStateContext(), {
        wrapper: createWrapperWithConnection(connection),
      });

      await waitFor(() => {
        expect(result.current.millState.connected).toBe(true);
      });

      act(() => {
        connection.setPosition(10, 20, 30);
      });

      await waitFor(() => {
        expect(result.current.millState.position.x).toBe(10);
        expect(result.current.millState.position.y).toBe(20);
        expect(result.current.millState.position.z).toBe(30);
      });
    });

    it('receives probe state updates from connection', async () => {
      const { result } = renderHook(() => useMillStateContext(), {
        wrapper: createWrapperWithConnection(connection),
      });

      await waitFor(() => {
        expect(result.current.millState.connected).toBe(true);
      });

      act(() => {
        connection.setProbeState('P');
      });

      await waitFor(() => {
        expect(result.current.millState.probe.triggered).toBe(true);
        expect(result.current.millState.probe.pinState).toBe('P');
      });
    });

    it('clears probe state when untriggered', async () => {
      const { result } = renderHook(() => useMillStateContext(), {
        wrapper: createWrapperWithConnection(connection),
      });

      await waitFor(() => {
        expect(result.current.millState.connected).toBe(true);
      });

      act(() => {
        connection.setProbeState('P');
      });

      await waitFor(() => {
        expect(result.current.millState.probe.triggered).toBe(true);
      });

      act(() => {
        connection.setProbeState('');
      });

      await waitFor(() => {
        expect(result.current.millState.probe.triggered).toBe(false);
      });
    });
  });

  describe('setConnection', () => {
    let connection: MockMillConnection;

    beforeEach(() => {
      connection = new MockMillConnection();
    });

    it('allows replacing connection after mount', async () => {
      const { result } = renderHook(() => useMillStateContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current.connection).toBeInstanceOf(NoOpMillConnection);

      act(() => {
        result.current.setConnection(connection);
      });

      await waitFor(() => {
        expect(result.current.connection).toBe(connection);
      });

      await waitFor(() => {
        expect(result.current.millState.connected).toBe(true);
      });
    });

    it('clears error when setting new connection', async () => {
      const { result } = renderHook(() => useMillStateContext(), {
        wrapper: createWrapper(),
      });

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

      const { unmount } = renderHook(() => useMillStateContext(), {
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

      const { result } = renderHook(() => useMillStateContext(), {
        wrapper: createWrapperWithConnection(connection1),
      });

      await waitFor(() => {
        expect(result.current.millState.connected).toBe(true);
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

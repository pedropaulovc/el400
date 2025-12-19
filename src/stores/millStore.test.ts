/**
 * Unit tests for millStore
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useMillStore,
  initializeMillStore,
  setDRODispatch,
  useMillState,
  useMillPosition,
  useMillConnected,
  useMillProbe,
  useConnection,
  useIsConnecting,
  useConnectionError,
  useSetConnection,
} from './millStore';
import { MockMillConnection } from '../adapters/MockMillConnection';
import { NoOpMillConnection } from '../adapters/NoOpMillConnection';
import { createDefaultMillState } from '../types/millState';

describe('millStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useMillStore.setState({
      millState: createDefaultMillState('noop'),
      connection: new NoOpMillConnection(),
      isConnecting: false,
      error: null,
    });
    // Clear DRO dispatch
    setDRODispatch(null);
  });

  describe('initial state', () => {
    it('has default mill state', () => {
      const state = useMillStore.getState();
      // Default state is disconnected until connect() is called
      expect(state.millState.connected).toBe(false);
      expect(state.millState.controllerType).toBe('noop');
    });

    it('has no error initially', () => {
      const state = useMillStore.getState();
      expect(state.error).toBeNull();
    });

    it('is not connecting initially', () => {
      const state = useMillStore.getState();
      expect(state.isConnecting).toBe(false);
    });
  });

  describe('setConnection', () => {
    it('updates the connection', () => {
      const mockConnection = new MockMillConnection();
      useMillStore.getState().setConnection(mockConnection);

      expect(useMillStore.getState().connection).toBe(mockConnection);
    });

    it('clears any existing error', () => {
      // Set an error first
      useMillStore.getState()._setError(new Error('test error'));
      expect(useMillStore.getState().error).not.toBeNull();

      // Set connection should clear it
      const mockConnection = new MockMillConnection();
      useMillStore.getState().setConnection(mockConnection);

      expect(useMillStore.getState().error).toBeNull();
    });
  });

  describe('internal actions', () => {
    it('_setMillState updates mill state', () => {
      const newState = createDefaultMillState('mock');
      newState.position = { x: 10, y: 20, z: 30 };

      useMillStore.getState()._setMillState(newState);

      expect(useMillStore.getState().millState.position).toEqual({ x: 10, y: 20, z: 30 });
    });

    it('_setConnecting updates connecting status', () => {
      useMillStore.getState()._setConnecting(true);
      expect(useMillStore.getState().isConnecting).toBe(true);

      useMillStore.getState()._setConnecting(false);
      expect(useMillStore.getState().isConnecting).toBe(false);
    });

    it('_setError updates error state', () => {
      const error = new Error('Connection failed');
      useMillStore.getState()._setError(error);

      expect(useMillStore.getState().error).toBe(error);
    });
  });

  describe('setDRODispatch', () => {
    it('sets the DRO dispatch function', () => {
      const mockDispatch = vi.fn();
      setDRODispatch(mockDispatch);

      // We can't directly test droStoreDispatch since it's private,
      // but we can test it through initializeMillStore
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('can be set to null', () => {
      const mockDispatch = vi.fn();
      setDRODispatch(mockDispatch);
      setDRODispatch(null);

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('initializeMillStore', () => {
    it('sets the connection and initial state', async () => {
      const mockConnection = new MockMillConnection();
      mockConnection.setPosition(100, 200, 300);

      await initializeMillStore(mockConnection);

      const state = useMillStore.getState();
      expect(state.connection).toBe(mockConnection);
      expect(state.millState.position).toEqual({ x: 100, y: 200, z: 300 });
    });

    it('subscribes to connection state updates', async () => {
      const mockConnection = new MockMillConnection();
      await initializeMillStore(mockConnection);

      // Update position through connection
      mockConnection.setPosition(50, 60, 70);

      // Store should reflect the update
      expect(useMillStore.getState().millState.position).toEqual({ x: 50, y: 60, z: 70 });
    });

    it('injects DRO dispatch into connection', async () => {
      const mockDispatch = vi.fn();
      setDRODispatch(mockDispatch);

      const mockConnection = new MockMillConnection();
      await initializeMillStore(mockConnection);

      // Trigger a position change which should dispatch MILL_STATE_CHANGED
      mockConnection.setPosition(1, 2, 3);

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: 'MILL_STATE_CHANGED' })
      );
    });

    it('does not call droDispatch if not set', async () => {
      // Ensure dispatch is null
      setDRODispatch(null);

      const mockConnection = new MockMillConnection();
      await initializeMillStore(mockConnection);

      // Should not throw when position changes
      expect(() => { mockConnection.setPosition(1, 2, 3); }).not.toThrow();
    });

    it('connects if not already connected', async () => {
      const mockConnection = new MockMillConnection();
      // MockMillConnection starts connected, so disconnect first
      mockConnection.disconnect();
      expect(mockConnection.getState().connected).toBe(false);

      await initializeMillStore(mockConnection);

      expect(mockConnection.getState().connected).toBe(true);
    });

    it('sets isConnecting during connection', async () => {
      const mockConnection = new MockMillConnection();
      mockConnection.disconnect();

      // Track isConnecting changes
      const connectingStates: boolean[] = [];
      const unsubscribe = useMillStore.subscribe((state) => {
        connectingStates.push(state.isConnecting);
      });

      await initializeMillStore(mockConnection);
      unsubscribe();

      // Should have been true at some point, then false
      expect(connectingStates).toContain(true);
      expect(connectingStates[connectingStates.length - 1]).toBe(false);
    });

    it('handles connection errors', async () => {
      const mockConnection = new MockMillConnection();
      mockConnection.disconnect();

      // Make connect throw an error
      const connectError = new Error('Connection refused');
      vi.spyOn(mockConnection, 'connect').mockRejectedValueOnce(connectError);

      await initializeMillStore(mockConnection);

      expect(useMillStore.getState().error).toBe(connectError);
      expect(useMillStore.getState().isConnecting).toBe(false);
    });

    it('handles non-Error connection failures', async () => {
      const mockConnection = new MockMillConnection();
      mockConnection.disconnect();

      // Make connect throw a string
      vi.spyOn(mockConnection, 'connect').mockRejectedValueOnce('string error');

      await initializeMillStore(mockConnection);

      expect(useMillStore.getState().error).toBeInstanceOf(Error);
      expect(useMillStore.getState().error?.message).toBe('string error');
    });

    it('returns cleanup function that unsubscribes and disconnects', async () => {
      const mockConnection = new MockMillConnection();
      const cleanup = await initializeMillStore(mockConnection);

      expect(mockConnection.getState().connected).toBe(true);

      // Call cleanup
      cleanup();

      expect(mockConnection.getState().connected).toBe(false);
    });

    it('cleanup clears the dispatch', async () => {
      const mockDispatch = vi.fn();
      setDRODispatch(mockDispatch);

      const mockConnection = new MockMillConnection();
      const cleanup = await initializeMillStore(mockConnection);

      // Clear any previous calls
      mockDispatch.mockClear();

      // Cleanup
      cleanup();

      // Position change should not trigger dispatch after cleanup
      // (connection is disconnected, but even if it weren't, dispatch should be null)
      mockConnection.setPosition(999, 999, 999);

      // Note: MockMillConnection still notifies subscribers even when disconnected,
      // but the dispatch should have been set to null
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('does not try to connect if already connected', async () => {
      const mockConnection = new MockMillConnection();
      // Connect first so it's already connected
      await mockConnection.connect();
      expect(mockConnection.getState().connected).toBe(true);

      const connectSpy = vi.spyOn(mockConnection, 'connect');

      await initializeMillStore(mockConnection);

      expect(connectSpy).not.toHaveBeenCalled();
    });
  });

  describe('selectors', () => {
    beforeEach(async () => {
      // Set up a connected mock connection for selector tests
      const mockConnection = new MockMillConnection();
      await mockConnection.connect();
      mockConnection.setPosition(10, 20, 30);
      mockConnection.setProbeState('P');

      useMillStore.setState({
        millState: mockConnection.getState(),
        connection: mockConnection,
        isConnecting: false,
        error: null,
      });
    });

    it('useMillState returns full mill state', () => {
      const { result } = renderHook(() => useMillState());
      expect(result.current.connected).toBe(true);
      expect(result.current.position).toEqual({ x: 10, y: 20, z: 30 });
    });

    it('useMillPosition returns position', () => {
      const { result } = renderHook(() => useMillPosition());
      expect(result.current).toEqual({ x: 10, y: 20, z: 30 });
    });

    it('useMillConnected returns connection status', () => {
      const { result } = renderHook(() => useMillConnected());
      expect(result.current).toBe(true);
    });

    it('useMillProbe returns probe state', () => {
      const { result } = renderHook(() => useMillProbe());
      expect(result.current.triggered).toBe(true);
      expect(result.current.pinState).toBe('P');
    });

    it('useConnection returns connection adapter', () => {
      const { result } = renderHook(() => useConnection());
      expect(result.current).toBeInstanceOf(MockMillConnection);
    });

    it('useIsConnecting returns connecting status', () => {
      const { result } = renderHook(() => useIsConnecting());
      expect(result.current).toBe(false);

      act(() => {
        useMillStore.getState()._setConnecting(true);
      });
      expect(result.current).toBe(true);
    });

    it('useConnectionError returns error state', () => {
      const { result } = renderHook(() => useConnectionError());
      expect(result.current).toBeNull();

      const error = new Error('Test error');
      act(() => {
        useMillStore.getState()._setError(error);
      });
      expect(result.current).toBe(error);
    });

    it('useSetConnection returns setConnection action', () => {
      const { result } = renderHook(() => useSetConnection());
      expect(typeof result.current).toBe('function');

      const newConnection = new NoOpMillConnection();
      act(() => {
        result.current(newConnection);
      });
      expect(useMillStore.getState().connection).toBe(newConnection);
    });

    it('selectors update when store changes', () => {
      const { result } = renderHook(() => useMillPosition());
      expect(result.current).toEqual({ x: 10, y: 20, z: 30 });

      act(() => {
        const state = useMillStore.getState().millState;
        useMillStore.getState()._setMillState({
          ...state,
          position: { x: 100, y: 200, z: 300 },
        });
      });

      expect(result.current).toEqual({ x: 100, y: 200, z: 300 });
    });
  });
});

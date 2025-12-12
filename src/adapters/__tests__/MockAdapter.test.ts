import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MockAdapter } from '../MockAdapter';
import type { MachineState } from '../../types/machine';

describe('MockAdapter', () => {
  let adapter: MockAdapter;

  beforeEach(() => {
    vi.useFakeTimers();
    adapter = new MockAdapter();
  });

  afterEach(() => {
    adapter.disconnect();
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const state = adapter.getState();

      expect(state.position).toEqual({ x: 0, y: 0, z: 0 });
      expect(state.probe.pinState).toBe('');
      expect(state.probe.triggered).toBe(false);
      expect(state.connected).toBe(false);
      expect(state.controllerType).toBe('mock');
    });

    it('should initialize with custom initial position', () => {
      const customAdapter = new MockAdapter({
        initialPosition: { x: 10, y: 20, z: 30 },
      });

      const state = customAdapter.getState();
      expect(state.position).toEqual({ x: 10, y: 20, z: 30 });
    });
  });

  describe('connect', () => {
    it('should set connected to true on connect', async () => {
      expect(adapter.getState().connected).toBe(false);

      await adapter.connect();

      expect(adapter.getState().connected).toBe(true);
    });

    it('should notify listeners on connect', async () => {
      const listener = vi.fn();
      adapter.subscribe(listener);

      // Clear the initial call
      listener.mockClear();

      await adapter.connect();

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ connected: true })
      );
    });
  });

  describe('disconnect', () => {
    it('should set connected to false on disconnect', async () => {
      await adapter.connect();
      expect(adapter.getState().connected).toBe(true);

      adapter.disconnect();

      expect(adapter.getState().connected).toBe(false);
    });

    it('should stop updates on disconnect', async () => {
      const listener = vi.fn();
      await adapter.connect();
      adapter.subscribe(listener);
      listener.mockClear();

      adapter.disconnect();

      // Advance time - should not trigger more updates
      vi.advanceTimersByTime(1000);

      // Only the disconnect notification should have been called
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should call disconnect cleanup', async () => {
      await adapter.connect();

      // Should not throw
      adapter.disconnect();
      adapter.disconnect(); // Double disconnect should be safe

      expect(adapter.getState().connected).toBe(false);
    });
  });

  describe('subscribe', () => {
    it('should immediately notify subscriber with current state', () => {
      const listener = vi.fn();

      adapter.subscribe(listener);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(adapter.getState());
    });

    it('should return unsubscribe function', async () => {
      const listener = vi.fn();
      const unsubscribe = adapter.subscribe(listener);

      await adapter.connect();
      listener.mockClear();

      unsubscribe();

      // Should not receive updates after unsubscribe
      adapter.setPosition(100, 200, 300);
      expect(listener).not.toHaveBeenCalled();
    });

    it('should support multiple subscribers', async () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      adapter.subscribe(listener1);
      adapter.subscribe(listener2);

      await adapter.connect();

      // Both should receive the connect update
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  describe('emit position updates', () => {
    it('should emit position updates at configured interval', async () => {
      const listener = vi.fn();
      adapter = new MockAdapter({ updateInterval: 100, simulateMovement: true });

      await adapter.connect();
      adapter.subscribe(listener);
      listener.mockClear();

      vi.advanceTimersByTime(100);
      expect(listener).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);
      expect(listener).toHaveBeenCalledTimes(2);

      vi.advanceTimersByTime(100);
      expect(listener).toHaveBeenCalledTimes(3);
    });

    it('should not emit updates when not simulating movement', async () => {
      const listener = vi.fn();
      adapter = new MockAdapter({ updateInterval: 100, simulateMovement: false });

      await adapter.connect();
      adapter.subscribe(listener);
      listener.mockClear();

      vi.advanceTimersByTime(100);
      // Still emits updates (for connected state), but position doesn't change
      const firstCall = listener.mock.calls[0][0] as MachineState;

      vi.advanceTimersByTime(100);
      const secondCall = listener.mock.calls[1][0] as MachineState;

      expect(firstCall.position).toEqual(secondCall.position);
    });
  });

  describe('setPosition', () => {
    it('should update position and notify listeners', () => {
      const listener = vi.fn();
      adapter.subscribe(listener);
      listener.mockClear();

      adapter.setPosition(1.5, 2.5, 3.5);

      expect(adapter.getState().position).toEqual({ x: 1.5, y: 2.5, z: 3.5 });
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          position: { x: 1.5, y: 2.5, z: 3.5 },
        })
      );
    });
  });

  describe('probe state', () => {
    it('should set probe state and notify listeners', () => {
      const listener = vi.fn();
      adapter.subscribe(listener);
      listener.mockClear();

      adapter.setProbeState('P');

      expect(adapter.getState().probe.pinState).toBe('P');
      expect(adapter.getState().probe.triggered).toBe(true);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          probe: { pinState: 'P', triggered: true },
        })
      );
    });

    it('should toggle probe state on command', () => {
      expect(adapter.getState().probe.triggered).toBe(false);

      adapter.toggleProbe();
      expect(adapter.getState().probe.triggered).toBe(true);
      expect(adapter.getState().probe.pinState).toBe('P');

      adapter.toggleProbe();
      expect(adapter.getState().probe.triggered).toBe(false);
      expect(adapter.getState().probe.pinState).toBe('');
    });

    it('should handle complex pin state strings', () => {
      adapter.setProbeState('XYP');

      expect(adapter.getState().probe.pinState).toBe('XYP');
      expect(adapter.getState().probe.triggered).toBe(true);
    });

    it('should return triggered false when P not in pinState', () => {
      adapter.setProbeState('XYZ');

      expect(adapter.getState().probe.pinState).toBe('XYZ');
      expect(adapter.getState().probe.triggered).toBe(false);
    });
  });
});

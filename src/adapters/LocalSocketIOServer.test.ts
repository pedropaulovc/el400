import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LocalSocketIOServer } from './LocalSocketIOServer';

describe('LocalSocketIOServer', () => {
  let server: LocalSocketIOServer;

  beforeEach(() => {
    vi.useFakeTimers();
    server = new LocalSocketIOServer();
  });

  afterEach(() => {
    server.destroy();
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should start with default state', () => {
      const state = server.getState();
      expect(state.position).toEqual({ x: 0, y: 0, z: 0 });
      expect(state.probeState).toBe('');
    });

    it('should broadcast initial state on creation', () => {
      const handler = vi.fn();
      const newServer = new LocalSocketIOServer();
      newServer.on('controller:state', handler);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          status: expect.objectContaining({
            mpos: [0, 0, 0],
            wpos: [0, 0, 0],
            pn: '',
          }),
          probe: {
            pinState: '',
            triggered: false,
          },
        })
      );

      newServer.destroy();
    });
  });

  describe('moveAbsolute', () => {
    it('should update position to absolute coordinates', () => {
      server.moveAbsolute(10, 20, 30);

      const state = server.getState();
      expect(state.position).toEqual({ x: 10, y: 20, z: 30 });
    });

    it('should broadcast state after moving', () => {
      const handler = vi.fn();
      server.on('controller:state', handler);
      handler.mockClear(); // Clear initial broadcast

      server.moveAbsolute(5, 10, 15);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          status: expect.objectContaining({
            mpos: [5, 10, 15],
            wpos: [5, 10, 15],
          }),
        })
      );
    });
  });

  describe('moveRelative', () => {
    it('should move X axis relative to current position', () => {
      server.moveAbsolute(10, 20, 30);
      server.moveRelative('x', 5);

      const state = server.getState();
      expect(state.position.x).toBe(15);
      expect(state.position.y).toBe(20);
      expect(state.position.z).toBe(30);
    });

    it('should move Y axis relative to current position', () => {
      server.moveAbsolute(10, 20, 30);
      server.moveRelative('y', -10);

      const state = server.getState();
      expect(state.position.x).toBe(10);
      expect(state.position.y).toBe(10);
      expect(state.position.z).toBe(30);
    });

    it('should move Z axis relative to current position', () => {
      server.moveAbsolute(10, 20, 30);
      server.moveRelative('z', 2.5);

      const state = server.getState();
      expect(state.position.x).toBe(10);
      expect(state.position.y).toBe(20);
      expect(state.position.z).toBe(32.5);
    });

    it('should broadcast state after relative move', () => {
      const handler = vi.fn();
      server.on('controller:state', handler);
      handler.mockClear();

      server.moveRelative('x', 3);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          status: expect.objectContaining({
            mpos: [3, 0, 0],
          }),
        })
      );
    });
  });

  describe('setProbe', () => {
    it('should set probe state to triggered', () => {
      server.setProbe(true);

      const state = server.getState();
      expect(state.probeState).toBe('P');
    });

    it('should clear probe state', () => {
      server.setProbe(true);
      server.setProbe(false);

      const state = server.getState();
      expect(state.probeState).toBe('');
    });

    it('should broadcast correct probe state when triggered', () => {
      const handler = vi.fn();
      server.on('controller:state', handler);
      handler.mockClear();

      server.setProbe(true);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          status: expect.objectContaining({
            pn: 'P',
          }),
          probe: {
            pinState: 'P',
            triggered: true,
          },
        })
      );
    });

    it('should broadcast correct probe state when cleared', () => {
      const handler = vi.fn();
      server.setProbe(true);
      server.on('controller:state', handler);
      handler.mockClear();

      server.setProbe(false);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          status: expect.objectContaining({
            pn: '',
          }),
          probe: {
            pinState: '',
            triggered: false,
          },
        })
      );
    });
  });

  describe('reset', () => {
    it('should reset position to origin', () => {
      server.moveAbsolute(10, 20, 30);
      server.reset();

      const state = server.getState();
      expect(state.position).toEqual({ x: 0, y: 0, z: 0 });
    });

    it('should clear probe state on reset', () => {
      server.setProbe(true);
      server.reset();

      const state = server.getState();
      expect(state.probeState).toBe('');
    });

    it('should broadcast state after reset', () => {
      const handler = vi.fn();
      server.moveAbsolute(10, 20, 30);
      server.on('controller:state', handler);
      handler.mockClear();

      server.reset();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          status: expect.objectContaining({
            mpos: [0, 0, 0],
            wpos: [0, 0, 0],
            pn: '',
          }),
          probe: {
            pinState: '',
            triggered: false,
          },
        })
      );
    });
  });

  describe('periodic broadcasting', () => {
    it('should broadcast state every 100ms', () => {
      const handler = vi.fn();
      server.on('controller:state', handler);
      handler.mockClear(); // Clear initial broadcast

      vi.advanceTimersByTime(100);
      expect(handler).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);
      expect(handler).toHaveBeenCalledTimes(2);

      vi.advanceTimersByTime(100);
      expect(handler).toHaveBeenCalledTimes(3);
    });
  });

  describe('event handling', () => {
    it('should support multiple listeners', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      server.on('controller:state', handler1);
      server.on('controller:state', handler2);
      handler1.mockClear();
      handler2.mockClear();

      server.moveAbsolute(1, 2, 3);

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should remove listeners with off', () => {
      const handler = vi.fn();
      server.on('controller:state', handler);
      handler.mockClear();

      server.off('controller:state', handler);
      server.moveAbsolute(1, 2, 3);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('should stop broadcasting after destroy', () => {
      const handler = vi.fn();
      server.on('controller:state', handler);
      handler.mockClear();

      server.destroy();
      vi.advanceTimersByTime(100);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should remove all listeners on destroy', () => {
      const handler = vi.fn();
      server.on('controller:state', handler);
      handler.mockClear();

      server.destroy();
      server.moveAbsolute(1, 2, 3);

      expect(handler).not.toHaveBeenCalled();
    });
  });
});

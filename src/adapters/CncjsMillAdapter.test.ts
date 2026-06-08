import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CncjsMillAdapter, normalizeControllerState } from './CncjsMillAdapter';

// Mock socket.io-client
const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
  connected: false,
};

vi.mock('./cncjsSocket', () => ({
  io: vi.fn(() => mockSocket),
}));

describe('normalizeControllerState with CNCjs 1.x object positions', () => {
  it('parses mpos/wpos objects with string values and pinState pin field', () => {
    const result = normalizeControllerState('Grbl', {
      status: {
        mpos: { x: '3.000', y: '2.000', z: '-0.280' },
        wpos: { x: '3.000', y: '2.000', z: '-0.280' },
        pinState: 'P',
      },
    });

    expect(result.position).toEqual({ x: 3, y: 2, z: -0.28 });
    expect(result.workPosition).toEqual({ x: 3, y: 2, z: -0.28 });
    expect(result.probe?.triggered).toBe(true);
  });
});

describe('CncjsMillAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock socket handlers
    mockSocket.on.mockReset();
    mockSocket.off.mockReset();
    mockSocket.emit.mockReset();
    mockSocket.disconnect.mockReset();
  });

  describe('connection', () => {
    const fireConnect = () => {
      const h = mockSocket.on.mock.calls.find(([e]) => e === 'connect')?.[1];
      h?.();
    };
    const fireSerialportList = (ports: { port: string; inuse?: boolean }[]) => {
      const h = mockSocket.on.mock.calls.find(([e]) => e === 'serialport:list')?.[1];
      h?.(ports);
    };

    it('uses a scheme-qualified host verbatim when it already has a port', async () => {
      const { io } = await import('./cncjsSocket');
      const adapter = new CncjsMillAdapter({ host: 'https://cncjs.example.com:443', port: 443 });
      const connectPromise = adapter.connect();
      expect(io).toHaveBeenCalledWith('https://cncjs.example.com:443', expect.anything());
      fireConnect();
      await connectPromise;
    });

    it('appends the port to a scheme-qualified host that has none', async () => {
      const { io } = await import('./cncjsSocket');
      const adapter = new CncjsMillAdapter({ host: 'https://cncjs.example.com', port: 8000 });
      const connectPromise = adapter.connect();
      expect(io).toHaveBeenCalledWith('https://cncjs.example.com:8000', expect.anything());
      fireConnect();
      await connectPromise;
    });

    it('joins a port that is already in use', async () => {
      const adapter = new CncjsMillAdapter({ host: 'localhost', port: 8000 });
      const connectPromise = adapter.connect();
      fireConnect();
      await connectPromise;
      mockSocket.emit.mockClear();
      fireSerialportList([{ port: '/dev/ttyA', inuse: false }, { port: '/dev/ttyB', inuse: true }]);
      expect(mockSocket.emit).toHaveBeenCalledWith('open', '/dev/ttyB', expect.anything(), expect.any(Function));
    });

    it('does not auto-open a lone idle port', async () => {
      const adapter = new CncjsMillAdapter({ host: 'localhost', port: 8000 });
      const connectPromise = adapter.connect();
      fireConnect();
      await connectPromise;
      mockSocket.emit.mockClear();
      fireSerialportList([{ port: '/dev/ttyOnly', inuse: false }]);
      expect(mockSocket.emit).not.toHaveBeenCalledWith('open', expect.anything(), expect.anything(), expect.anything());
    });

    it('connects to the page origin when no host is given (same-origin widget)', async () => {
      const { io } = await import('./cncjsSocket');
      const adapter = new CncjsMillAdapter({ host: '', port: 8000 });
      const connectPromise = adapter.connect();
      expect(io).toHaveBeenCalledWith(window.location.origin, expect.anything());
      fireConnect();
      await connectPromise;
    });

    it('opens the explicit serialport when one is provided', async () => {
      const adapter = new CncjsMillAdapter({ host: 'localhost', port: 8000, serialport: '/dev/ttyEXPLICIT' });
      const connectPromise = adapter.connect();
      fireConnect();
      await connectPromise;
      // Discovery skips `list` and opens the explicit port directly.
      expect(mockSocket.emit).toHaveBeenCalledWith('open', '/dev/ttyEXPLICIT', expect.anything(), expect.any(Function));
      expect(mockSocket.emit).not.toHaveBeenCalledWith('list');
    });

    it('marks the adapter connected once the port open succeeds', async () => {
      const adapter = new CncjsMillAdapter({ host: 'localhost', port: 8000 });
      const states: boolean[] = [];
      adapter.subscribe((s) => states.push(s.connected));
      const connectPromise = adapter.connect();
      fireConnect();
      await connectPromise;
      fireSerialportList([{ port: '/dev/ttyB', inuse: true }]);
      const openCall = mockSocket.emit.mock.calls.find(([e]) => e === 'open');
      const cb = openCall?.[3] as ((err: unknown) => void) | undefined;
      cb?.(null);
      expect(states[states.length - 1]).toBe(true);
    });

    it('re-joins the active port after the serial port closes and reopens', async () => {
      const adapter = new CncjsMillAdapter({ host: 'localhost', port: 8000 });
      const connectPromise = adapter.connect();
      fireConnect();
      await connectPromise;
      fireSerialportList([{ port: '/dev/ttyB', inuse: true }]);
      const cb = mockSocket.emit.mock.calls.find(([e]) => e === 'open')?.[3] as ((err: unknown) => void) | undefined;
      cb?.(null);
      // Port closes (e.g. from the CNCjs UI), then a fresh list arrives.
      const closeHandler = mockSocket.on.mock.calls.find(([e]) => e === 'serialport:close')?.[1];
      closeHandler?.();
      mockSocket.emit.mockClear();
      fireSerialportList([{ port: '/dev/ttyB', inuse: true }]);
      expect(mockSocket.emit).toHaveBeenCalledWith('open', '/dev/ttyB', expect.anything(), expect.any(Function));
    });

    it('tracks the current controller type from controller:state', async () => {
      const adapter = new CncjsMillAdapter({ host: 'localhost', port: 8000 });
      const connectPromise = adapter.connect();
      fireConnect();
      await connectPromise;
      const handler = mockSocket.on.mock.calls.find(([e]) => e === 'controller:state')?.[1];
      handler?.('grbl', { status: { mpos: [1, 2, 3] } });
      expect(adapter.getCurrentControllerType()).toBe('grbl');
    });

    it('cleans up the socket and discovery on disconnect', async () => {
      const adapter = new CncjsMillAdapter({ host: 'localhost', port: 8000 });
      const connectPromise = adapter.connect();
      fireConnect();
      await connectPromise;
      adapter.disconnect();
      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(adapter.getState().connected).toBe(false);
    });

    it('rejects with a timeout error if the socket never connects', async () => {
      vi.useFakeTimers();
      try {
        const adapter = new CncjsMillAdapter({ host: 'localhost', port: 8000 });
        const connectPromise = adapter.connect();
        const assertion = expect(connectPromise).rejects.toThrow('Connection timeout');
        await vi.advanceTimersByTimeAsync(10000);
        await assertion;
        expect(mockSocket.disconnect).toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it('should create socket with correct URL and options', async () => {
      const { io } = await import('./cncjsSocket');
      const adapter = new CncjsMillAdapter({ host: 'localhost', port: 8000 });

      // Start connection but don't await (it won't resolve without manual trigger)
      const connectPromise = adapter.connect();

      expect(io).toHaveBeenCalledWith('http://localhost:8000', expect.objectContaining({
        query: {},
        reconnection: true,
      }));

      // Simulate connection
      const connectHandler = mockSocket.on.mock.calls.find(([event]) => event === 'connect')?.[1];
      connectHandler?.();

      await connectPromise;
    });

    it('should include token in query when provided', async () => {
      const { io } = await import('./cncjsSocket');
      const adapter = new CncjsMillAdapter({ host: 'localhost', port: 8000, token: 'my-token' });

      const connectPromise = adapter.connect();

      expect(io).toHaveBeenCalledWith('http://localhost:8000', expect.objectContaining({
        query: { token: 'my-token' },
      }));

      const connectHandler = mockSocket.on.mock.calls.find(([event]) => event === 'connect')?.[1];
      connectHandler?.();

      await connectPromise;
    });

    it('should update state to connected on connect event', async () => {
      const adapter = new CncjsMillAdapter({ host: 'localhost', port: 8000 });
      const connectPromise = adapter.connect();

      const connectHandler = mockSocket.on.mock.calls.find(([event]) => event === 'connect')?.[1];
      connectHandler?.();

      await connectPromise;

      expect(adapter.getState().connected).toBe(true);
    });

    it('should update state to disconnected on disconnect event', async () => {
      const adapter = new CncjsMillAdapter({ host: 'localhost', port: 8000 });
      const connectPromise = adapter.connect();

      const connectHandler = mockSocket.on.mock.calls.find(([event]) => event === 'connect')?.[1];
      connectHandler?.();
      await connectPromise;

      const disconnectHandler = mockSocket.on.mock.calls.find(([event]) => event === 'disconnect')?.[1];
      disconnectHandler?.();

      expect(adapter.getState().connected).toBe(false);
    });

    it('should reject on connect_error', async () => {
      const adapter = new CncjsMillAdapter({ host: 'localhost', port: 8000 });
      const connectPromise = adapter.connect();

      const errorHandler = mockSocket.on.mock.calls.find(([event]) => event === 'connect_error')?.[1];
      errorHandler?.(new Error('Connection refused'));

      await expect(connectPromise).rejects.toThrow('Connection refused');
    });
  });

  describe('disconnect', () => {
    it('should call socket disconnect', async () => {
      const adapter = new CncjsMillAdapter({ host: 'localhost', port: 8000 });
      const connectPromise = adapter.connect();

      const connectHandler = mockSocket.on.mock.calls.find(([event]) => event === 'connect')?.[1];
      connectHandler?.();
      await connectPromise;

      adapter.disconnect();

      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(adapter.getState().connected).toBe(false);
    });
  });

  describe('subscribe', () => {
    it('should notify listener immediately with current state', async () => {
      const adapter = new CncjsMillAdapter({ host: 'localhost', port: 8000 });
      const listener = vi.fn();

      adapter.subscribe(listener);

      expect(listener).toHaveBeenCalledWith(adapter.getState());
    });

    it('should notify listeners on state change', async () => {
      const adapter = new CncjsMillAdapter({ host: 'localhost', port: 8000 });
      const connectPromise = adapter.connect();

      const connectHandler = mockSocket.on.mock.calls.find(([event]) => event === 'connect')?.[1];
      connectHandler?.();
      await connectPromise;

      const listener = vi.fn();
      adapter.subscribe(listener);
      listener.mockClear();

      // Simulate controller:state event
      const stateHandler = mockSocket.on.mock.calls.find(([event]) => event === 'controller:state')?.[1];
      stateHandler?.('Grbl', {
        status: {
          mpos: [10, 20, 30],
        },
      });

      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        position: { x: 10, y: 20, z: 30 },
        connected: true,
      }));
    });

    it('should return unsubscribe function', async () => {
      const adapter = new CncjsMillAdapter({ host: 'localhost', port: 8000 });
      const listener = vi.fn();

      const unsubscribe = adapter.subscribe(listener);
      listener.mockClear();

      unsubscribe();

      // Trigger a state change
      const connectPromise = adapter.connect();
      const connectHandler = mockSocket.on.mock.calls.find(([event]) => event === 'connect')?.[1];
      connectHandler?.();
      await connectPromise;

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('controllerType', () => {
    it('should return cncjs as controller type', () => {
      const adapter = new CncjsMillAdapter({ host: 'localhost', port: 8000 });
      expect(adapter.controllerType).toBe('cncjs');
    });
  });

  describe('dispatch integration', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const createDispatch = (fn: ReturnType<typeof vi.fn>): any => fn;

    it('should set and clear dispatch', () => {
      const adapter = new CncjsMillAdapter({ host: 'localhost', port: 8000 });
      const dispatch = vi.fn();

      adapter.setDispatch(createDispatch(dispatch));
      // No error should be thrown

      adapter.setDispatch(null);
      // No error should be thrown
    });

    it('should dispatch MILL_STATE_CHANGED on connect', async () => {
      const adapter = new CncjsMillAdapter({ host: 'localhost', port: 8000 });
      const dispatch = vi.fn();
      adapter.setDispatch(createDispatch(dispatch));

      const connectPromise = adapter.connect();

      const connectHandler = mockSocket.on.mock.calls.find(([event]) => event === 'connect')?.[1];
      connectHandler?.();

      await connectPromise;

      expect(dispatch).toHaveBeenCalledWith({ eventName: 'MILL_STATE_CHANGED' });
    });

    it('should dispatch MILL_STATE_CHANGED on controller state update', async () => {
      const adapter = new CncjsMillAdapter({ host: 'localhost', port: 8000 });
      const dispatch = vi.fn();
      adapter.setDispatch(createDispatch(dispatch));

      const connectPromise = adapter.connect();

      const connectHandler = mockSocket.on.mock.calls.find(([event]) => event === 'connect')?.[1];
      connectHandler?.();

      await connectPromise;
      dispatch.mockClear();

      // Simulate controller state event
      const stateHandler = mockSocket.on.mock.calls.find(([event]) => event === 'controller:state')?.[1];
      stateHandler?.('Grbl', {
        status: {
          mpos: [10, 20, 30],
        },
      });

      expect(dispatch).toHaveBeenCalledWith({ eventName: 'MILL_STATE_CHANGED' });
    });

    it('should dispatch MILL_STATE_CHANGED on serialport:open', async () => {
      const adapter = new CncjsMillAdapter({ host: 'localhost', port: 8000 });
      const dispatch = vi.fn();
      adapter.setDispatch(createDispatch(dispatch));

      const connectPromise = adapter.connect();

      const connectHandler = mockSocket.on.mock.calls.find(([event]) => event === 'connect')?.[1];
      connectHandler?.();

      await connectPromise;
      dispatch.mockClear();

      // Simulate serialport:open event
      const openHandler = mockSocket.on.mock.calls.find(([event]) => event === 'serialport:open')?.[1];
      openHandler?.();

      expect(dispatch).toHaveBeenCalledWith({ eventName: 'MILL_STATE_CHANGED' });
    });

    it('should dispatch MILL_STATE_CHANGED on disconnect', async () => {
      const adapter = new CncjsMillAdapter({ host: 'localhost', port: 8000 });
      const dispatch = vi.fn();
      adapter.setDispatch(createDispatch(dispatch));

      const connectPromise = adapter.connect();

      const connectHandler = mockSocket.on.mock.calls.find(([event]) => event === 'connect')?.[1];
      connectHandler?.();

      await connectPromise;
      dispatch.mockClear();

      const disconnectHandler = mockSocket.on.mock.calls.find(([event]) => event === 'disconnect')?.[1];
      disconnectHandler?.();

      expect(dispatch).toHaveBeenCalledWith({ eventName: 'MILL_STATE_CHANGED' });
    });

    it('should not throw when dispatch is not set', async () => {
      const adapter = new CncjsMillAdapter({ host: 'localhost', port: 8000 });

      const connectPromise = adapter.connect();

      const connectHandler = mockSocket.on.mock.calls.find(([event]) => event === 'connect')?.[1];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      expect(() => connectHandler?.()).not.toThrow();

      await connectPromise;
    });

    it('should stop dispatching after clearing dispatch', async () => {
      const adapter = new CncjsMillAdapter({ host: 'localhost', port: 8000 });
      const dispatch = vi.fn();
      adapter.setDispatch(createDispatch(dispatch));

      const connectPromise = adapter.connect();

      const connectHandler = mockSocket.on.mock.calls.find(([event]) => event === 'connect')?.[1];
      connectHandler?.();

      await connectPromise;
      dispatch.mockClear();

      // Clear dispatch
      adapter.setDispatch(null);

      // Trigger another state change
      const stateHandler = mockSocket.on.mock.calls.find(([event]) => event === 'controller:state')?.[1];
      stateHandler?.('Grbl', {
        status: {
          mpos: [5, 10, 15],
        },
      });

      expect(dispatch).not.toHaveBeenCalled();
    });
  });
});

describe('normalizeControllerState', () => {
  describe('GRBL', () => {
    it('should parse mpos array correctly', () => {
      const state = {
        status: {
          mpos: [1.234, 5.678, 9.012],
        },
      };

      const result = normalizeControllerState('Grbl', state);

      expect(result.position).toEqual({ x: 1.234, y: 5.678, z: 9.012 });
    });

    it('should parse wpos array when present', () => {
      const state = {
        status: {
          mpos: [10, 20, 30],
          wpos: [5, 10, 15],
        },
      };

      const result = normalizeControllerState('Grbl', state);

      expect(result.workPosition).toEqual({ x: 5, y: 10, z: 15 });
    });

    it('should parse pn field for probe state - P means triggered', () => {
      const state = {
        status: {
          mpos: [0, 0, 0],
          pn: 'P',
        },
      };

      const result = normalizeControllerState('Grbl', state);

      expect(result.probe?.triggered).toBe(true);
      expect(result.probe?.pinState).toBe('P');
    });

    it('should parse pn field with multiple pins - XP means X limit and probe', () => {
      const state = {
        status: {
          mpos: [0, 0, 0],
          pn: 'XP',
        },
      };

      const result = normalizeControllerState('Grbl', state);

      expect(result.probe?.triggered).toBe(true);
      expect(result.probe?.pinState).toBe('XP');
    });

    it('should return probe not triggered when pn is empty', () => {
      const state = {
        status: {
          mpos: [0, 0, 0],
          pn: '',
        },
      };

      const result = normalizeControllerState('Grbl', state);

      expect(result.probe?.triggered).toBe(false);
      expect(result.probe?.pinState).toBe('');
    });

    it('should handle missing pn field', () => {
      const state = {
        status: {
          mpos: [0, 0, 0],
        },
      };

      const result = normalizeControllerState('Grbl', state);

      expect(result.probe?.triggered).toBe(false);
    });

    it('should handle case-insensitive controller type', () => {
      const state = {
        status: {
          mpos: [1, 2, 3],
        },
      };

      const result = normalizeControllerState('grbl', state);

      expect(result.position).toEqual({ x: 1, y: 2, z: 3 });
    });

    it('defaults encoderSignal to all-ok when absent (US-042)', () => {
      const state = { status: { mpos: [0, 0, 0] } };
      const result = normalizeControllerState('Grbl', state);
      expect(result.encoderSignal).toEqual({ X: 'ok', Y: 'ok', Z: 'ok' });
    });

    it('carries a per-axis encoder signal-loss report (US-042)', () => {
      const state = {
        status: { mpos: [0, 0, 0] },
        encoderSignal: { X: 'lost' as const },
      };
      const result = normalizeControllerState('Grbl', state);
      // Reported axis is lost; unreported axes default to ok.
      expect(result.encoderSignal).toEqual({ X: 'lost', Y: 'ok', Z: 'ok' });
    });
  });

  describe('GrblHAL', () => {
    it('should parse mpos array like GRBL', () => {
      const state = {
        status: {
          mpos: [1.5, 2.5, 3.5],
        },
      };

      const result = normalizeControllerState('GrblHAL', state);

      expect(result.position).toEqual({ x: 1.5, y: 2.5, z: 3.5 });
    });

    it('should parse substate.probe value - 0 means open', () => {
      const state = {
        status: {
          mpos: [0, 0, 0],
          substate: {
            probe: 0,
          },
        },
      };

      const result = normalizeControllerState('GrblHAL', state);

      expect(result.probe?.triggered).toBe(false);
    });

    it('should parse substate.probe value - 1 means triggered', () => {
      const state = {
        status: {
          mpos: [0, 0, 0],
          substate: {
            probe: 1,
          },
        },
      };

      const result = normalizeControllerState('GrblHAL', state);

      expect(result.probe?.triggered).toBe(true);
    });

    it('should parse substate.probe value - 2 means latched (also triggered)', () => {
      const state = {
        status: {
          mpos: [0, 0, 0],
          substate: {
            probe: 2,
          },
        },
      };

      const result = normalizeControllerState('GrblHAL', state);

      expect(result.probe?.triggered).toBe(true);
    });

    it('should parse substate.probe value - 3 means alarm (also triggered)', () => {
      const state = {
        status: {
          mpos: [0, 0, 0],
          substate: {
            probe: 3,
          },
        },
      };

      const result = normalizeControllerState('GrblHAL', state);

      expect(result.probe?.triggered).toBe(true);
    });

    it('should fall back to pn field if substate not present', () => {
      const state = {
        status: {
          mpos: [0, 0, 0],
          pn: 'P',
        },
      };

      const result = normalizeControllerState('GrblHAL', state);

      expect(result.probe?.triggered).toBe(true);
    });
  });

  describe('TinyG', () => {
    it('should parse sr.posx/posy/posz positions', () => {
      const state = {
        sr: {
          posx: 12.345,
          posy: 1.234,
          posz: -5.678,
        },
      };

      const result = normalizeControllerState('TinyG', state);

      expect(result.position).toEqual({ x: 12.345, y: 1.234, z: -5.678 });
    });

    it('should parse sr.prb for probe state - 0 means open', () => {
      const state = {
        sr: {
          posx: 0,
          posy: 0,
          posz: 0,
          prb: 0,
        },
      };

      const result = normalizeControllerState('TinyG', state);

      expect(result.probe?.triggered).toBe(false);
    });

    it('should parse sr.prb for probe state - 1 means triggered', () => {
      const state = {
        sr: {
          posx: 0,
          posy: 0,
          posz: 0,
          prb: 1,
        },
      };

      const result = normalizeControllerState('TinyG', state);

      expect(result.probe?.triggered).toBe(true);
    });

    it('should handle g2core as TinyG variant', () => {
      const state = {
        sr: {
          posx: 1,
          posy: 2,
          posz: 3,
        },
      };

      const result = normalizeControllerState('g2core', state);

      expect(result.position).toEqual({ x: 1, y: 2, z: 3 });
    });

    it('should handle missing sr object', () => {
      const state = {};

      const result = normalizeControllerState('TinyG', state);

      expect(result.position).toEqual({ x: 0, y: 0, z: 0 });
    });
  });

  describe('Smoothie', () => {
    it('should parse status.pos object', () => {
      const state = {
        status: {
          pos: { x: 100, y: 200, z: 50 },
        },
      };

      const result = normalizeControllerState('Smoothie', state);

      expect(result.position).toEqual({ x: 100, y: 200, z: 50 });
    });

    it('should return probe.triggered=false (Smoothie does not expose realtime probe)', () => {
      const state = {
        status: {
          pos: { x: 0, y: 0, z: 0 },
        },
      };

      const result = normalizeControllerState('Smoothie', state);

      expect(result.probe?.triggered).toBe(false);
      expect(result.probe?.pinState).toBe('');
    });

    it('should handle missing pos object', () => {
      const state = {
        status: {},
      };

      const result = normalizeControllerState('Smoothie', state);

      expect(result.position).toEqual({ x: 0, y: 0, z: 0 });
    });
  });

  describe('Marlin', () => {
    it('should parse status.pos object', () => {
      const state = {
        status: {
          pos: { x: 50.5, y: 75.25, z: 10 },
        },
      };

      const result = normalizeControllerState('Marlin', state);

      expect(result.position).toEqual({ x: 50.5, y: 75.25, z: 10 });
    });

    it('should return probe.triggered=false (Marlin does not stream probe state)', () => {
      const state = {
        status: {
          pos: { x: 0, y: 0, z: 0 },
        },
      };

      const result = normalizeControllerState('Marlin', state);

      expect(result.probe?.triggered).toBe(false);
      expect(result.probe?.pinState).toBe('');
    });
  });

  describe('Unknown controller', () => {
    it('should handle unknown controller type gracefully using GRBL parsing', () => {
      const state = {
        status: {
          mpos: [1, 2, 3],
        },
      };

      const result = normalizeControllerState('UnknownController', state);

      expect(result.position).toEqual({ x: 1, y: 2, z: 3 });
    });

    it('should handle empty state gracefully', () => {
      const result = normalizeControllerState('Unknown', {});

      expect(result.position).toEqual({ x: 0, y: 0, z: 0 });
      expect(result.probe?.triggered).toBe(false);
    });
  });
});

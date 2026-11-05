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

function fireSocket(event: string, ...args: unknown[]): void {
  const handler = mockSocket.on.mock.calls.find(([name]) => name === event)?.[1] as
    ((...values: unknown[]) => void) | undefined;
  expect(handler, `registered ${event} handler`).toBeTypeOf('function');
  handler?.(...args);
}

function finishJoin(port = '/dev/ttyB'): void {
  fireSocket('serialport:list', [{ port, inuse: true }]);
  const openCall = mockSocket.emit.mock.calls.find(([event, name]) => event === 'open' && name === port);
  expect(openCall).toBeDefined();
  const callback = openCall?.[3] as (error: unknown) => void;
  callback(null);
}

function nativeState(units: 'G20' | 'G21', activeState = 'Idle', x = 25.4) {
  return {
    parserstate: { modal: { units, wcs: 'G54' } },
    status: { activeState, mpos: [x, 0, 0], wpos: [x, 0, 0] },
  };
}

function freshReport(reportUnit: '0' | '1', x: number, units: 'G20' | 'G21' = 'G21'): void {
  fireSocket('controller:settings', 'Grbl', { settings: { '$13': reportUnit } });
  fireSocket('serialport:read', `$13=${reportUnit}`);
  fireSocket('serialport:read', `<Idle|MPos:${String(x)},0,0|WCO:0,0,0>`);
  fireSocket('controller:state', 'Grbl', nativeState(units, 'Idle', x));
}

function advanceWorkRequestMarker(): void {
  const marker = mockSocket.emit.mock.calls.find((call) => call[0] === 'command' && call[3] === '$G');
  expect(marker?.slice(0, 4)).toEqual(['command', '/dev/ttyB', 'gcode', '$G']);
  expect(marker?.[4]).toEqual({ el400WorkRequest: expect.any(String) });
  fireSocket('serialport:write', '$G\n', marker?.[4]);
  expect(mockSocket.emit).toHaveBeenCalledWith('write', '/dev/ttyB', '?');
}

describe('GRBL 0.9 paired native position reports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.on.mockReset();
    mockSocket.emit.mockReset();
  });

  it('establishes fresh machine and work coordinates from comma-delimited MPos/WPos without WCO', async () => {
    const adapter = new CncjsMillAdapter({ host: 'localhost', port: 8000 });
    const connected = adapter.connect();
    fireSocket('connect');
    await connected;
    finishJoin();
    fireSocket('workflow:state', 'idle');
    fireSocket('controller:state', 'Grbl', nativeState('G21'));
    fireSocket('controller:settings', 'Grbl', { settings: { '$13': '0' } });
    fireSocket('serialport:read', '$13=0');
    fireSocket('serialport:read', '<Idle,MPos:5.529,0.560,7.000,WPos:1.529,-5.440,0.000>');
    expect(adapter.getState().position).toEqual({ x: 5.529, y: 0.56, z: 7 });
    expect(adapter.getState().workPosition).toEqual({ x: 1.529, y: -5.44, z: 0 });
    expect(adapter.getState().workPositionControl?.availability).toBe('ready');
    mockSocket.emit.mockClear();
    const request = adapter.requestWorkPosition({ x: 0 });
    advanceWorkRequestMarker();
    fireSocket('serialport:read', '<Idle,MPos:5.529,0.560,7.000,WPos:0.000,-5.440,0.000>');
    await expect(request).resolves.toBeUndefined();
    expect(adapter.getState().position).toEqual({ x: 5.529, y: 0.56, z: 7 });
    expect(adapter.getState().workPosition).toEqual({ x: 0, y: -5.44, z: 0 });
    adapter.disconnect();
  });
});

describe('CncjsMillAdapter native unit synchronization', () => {
  let adapter: CncjsMillAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.on.mockReset();
    mockSocket.emit.mockReset();
    adapter = new CncjsMillAdapter({ host: 'localhost', port: 8000 });
  });

  async function connectSocket(): Promise<void> {
    const connected = adapter.connect();
    fireSocket('connect');
    await connected;
  }

  async function ready(units: 'G20' | 'G21' = 'G21', reportUnit: '0' | '1' = '0'): Promise<void> {
    await connectSocket();
    finishJoin();
    fireSocket('workflow:state', 'idle');
    fireSocket('controller:state', 'Grbl', nativeState(units));
    freshReport(reportUnit, reportUnit === '1' ? 1 : 25.4, units);
    mockSocket.emit.mockClear();
  }

  it('keeps an undetected or disconnected CNCjs controller controller-owned and unavailable', async () => {
    await connectSocket();
    finishJoin();
    expect(adapter.getState().unitControl).toEqual({
      control: 'controller', confirmed: null, pending: null, availability: 'unavailable',
    });
    await expect(adapter.requestUnits('inch')).rejects.toThrow();
    adapter.disconnect();
    expect(adapter.getState().unitControl).toEqual({
      control: 'controller', confirmed: null, pending: null, availability: 'unavailable',
    });
  });

  it('does not treat native replay before the join callback as connected or writable', async () => {
    await connectSocket();
    fireSocket('serialport:list', [{ port: '/dev/ttyB', inuse: true }]);
    fireSocket('workflow:state', 'idle');
    fireSocket('controller:state', 'Grbl', nativeState('G21'));
    expect(adapter.getState().connected).toBe(false);
    expect(adapter.getState().unitControl?.availability).toBe('unavailable');
    await expect(adapter.requestUnits('inch')).rejects.toThrow();
    const callback = mockSocket.emit.mock.calls.find(([event]) => event === 'open')?.[3] as
      (error: unknown) => void;
    callback(null);
    expect(adapter.getState().connected).toBe(true);
    expect(mockSocket.emit).not.toHaveBeenCalledWith('command', '/dev/ttyB', 'gcode', 'G20');
    adapter.disconnect();
  });

  it.each([
    ['G21', 'inch', 'G20'],
    ['G20', 'mm', 'G21'],
  ] as const)('requests %s to %s once and waits for native %s confirmation', async (initial, target, command) => {
    await ready(initial);
    const listener = vi.fn();
    adapter.subscribe(listener);
    const request = adapter.requestUnits(target);
    expect(mockSocket.emit.mock.calls.filter(([event]) => event === 'command')).toEqual([
      ['command', '/dev/ttyB', 'gcode', command],
    ]);
    expect(adapter.getState().unitControl).toEqual({
      control: 'controller',
      confirmed: initial === 'G21' ? 'mm' : 'inch',
      pending: target,
      availability: 'busy',
    });
    await expect(adapter.requestUnits(target)).rejects.toThrow();
    fireSocket('controller:state', 'Grbl', nativeState(initial));
    expect(adapter.getState().unitControl?.pending).toBe(target);
    fireSocket('controller:state', 'Grbl', nativeState(command));
    await expect(request).resolves.toBeUndefined();
    expect(adapter.getState().unitControl).toEqual({
      control: 'controller', confirmed: target, pending: null, availability: 'ready',
    });
    expect(mockSocket.emit.mock.calls.filter(([event]) => event === 'command')).toHaveLength(1);
    expect(listener).toHaveBeenCalled();
    adapter.disconnect();
  });

  it('does not send a command for already confirmed units', async () => {
    await ready();
    await expect(adapter.requestUnits('mm')).resolves.toBeUndefined();
    expect(mockSocket.emit).not.toHaveBeenCalledWith('command', expect.anything(), 'gcode', 'G21');
    adapter.disconnect();
  });

  it.each([
    ['unknown workflow', undefined, 'Idle', 'G21'],
    ['running workflow', 'running', 'Idle', 'G21'],
    ['unknown machine state', 'idle', undefined, 'G21'],
    ['running machine', 'idle', 'Run', 'G21'],
    ['unknown modal units', 'idle', 'Idle', undefined],
  ])('rejects unit requests with %s', async (_label, workflow, activeState, units) => {
    await connectSocket();
    finishJoin();
    if (workflow) fireSocket('workflow:state', workflow);
    fireSocket('controller:state', 'Grbl', {
      status: { activeState },
      parserstate: { modal: { units } },
    });
    expect(adapter.getState().unitControl?.availability).not.toBe('ready');
    mockSocket.emit.mockClear();
    await expect(adapter.requestUnits('inch')).rejects.toThrow();
    expect(mockSocket.emit).not.toHaveBeenCalled();
    adapter.disconnect();
  });

  it.each(['GrblHAL', 'TinyG', 'Smoothie', 'Marlin'])(
    'keeps %s unit ownership display-only without changing legacy coordinate normalization',
    async (controller) => {
      await connectSocket();
      finishJoin();
      fireSocket('workflow:state', 'idle');
      const state = {
        ...nativeState('G20', 'Idle', 12),
        status: { activeState: 'Idle', mpos: [12, 0, 0], pos: { x: 12, y: 0, z: 0 } },
        sr: { posx: 12, posy: 0, posz: 0 },
      };
      fireSocket('controller:state', controller, state);
      expect(adapter.getState().position).toEqual(normalizeControllerState(controller, state).position);
      expect(adapter.getState().unitControl).toEqual({
        control: 'display', confirmed: null, pending: null, availability: 'unavailable',
      });
      await expect(adapter.requestUnits('mm')).rejects.toThrow();
      adapter.disconnect();
    },
  );

  it('rejects a request after 5000ms without inventing modal confirmation', async () => {
    vi.useFakeTimers();
    try {
      await ready();
      const rejected = expect(adapter.requestUnits('inch')).rejects.toThrow();
      await vi.advanceTimersByTimeAsync(4999);
      expect(adapter.getState().unitControl?.pending).toBe('inch');
      await vi.advanceTimersByTimeAsync(1);
      await rejected;
      expect(adapter.getState().unitControl?.confirmed).toBe('mm');
      expect(adapter.getState().unitControl?.pending).toBeNull();
    } finally {
      adapter.disconnect();
      vi.useRealTimers();
    }
  });

  it.each(['error:20', 'ALARM:1'])('fails the pending wait on shared native %s without claiming command ownership', async (line) => {
    await ready();
    const rejected = expect(adapter.requestUnits('inch')).rejects.toThrow(/Controller reported .* while awaiting unit confirmation/);
    fireSocket('serialport:read', line);
    await rejected;
    expect(adapter.getState().unitControl?.confirmed).toBe('mm');
    expect(adapter.getState().unitControl?.pending).toBeNull();
    fireSocket('controller:state', 'Grbl', nativeState('G20'));
    expect(adapter.getState().unitControl?.confirmed).toBe('inch');
    adapter.disconnect();
  });

  it('clears pending intent on socket disconnect and never replays it after reconnect', async () => {
    await ready();
    const rejected = expect(adapter.requestUnits('inch')).rejects.toThrow();
    fireSocket('disconnect');
    await rejected;
    expect(adapter.getState().connected).toBe(false);
    expect(adapter.getState().unitControl?.pending).toBeNull();
    await expect(adapter.requestUnits('inch')).rejects.toThrow();
    mockSocket.emit.mockClear();
    fireSocket('connect');
    finishJoin('/dev/ttyNEW');
    fireSocket('workflow:state', 'idle');
    fireSocket('controller:state', 'Grbl', nativeState('G21'));
    expect(mockSocket.emit).not.toHaveBeenCalledWith('command', expect.anything(), 'gcode', 'G20');
    const request = adapter.requestUnits('inch');
    expect(mockSocket.emit).toHaveBeenCalledWith('command', '/dev/ttyNEW', 'gcode', 'G20');
    fireSocket('controller:state', 'Grbl', nativeState('G20'));
    await request;
    adapter.disconnect();
  });

  it('ignores a stale open callback after disconnect', async () => {
    await connectSocket();
    fireSocket('serialport:list', [{ port: '/dev/ttyB', inuse: true }]);
    const callback = mockSocket.emit.mock.calls.find(([event]) => event === 'open')?.[3] as
      (error: unknown) => void;
    adapter.disconnect();
    callback(null);
    expect(adapter.getState().connected).toBe(false);
    expect(adapter.getState().unitControl?.availability).toBe('unavailable');
  });

  it('uses object-shaped serialport lifecycle events and rejects pending work on close', async () => {
    await connectSocket();
    fireSocket('serialport:open', { port: '/dev/ttyACTUAL', controllerType: 'Grbl' });
    finishJoin('/dev/ttyACTUAL');
    fireSocket('workflow:state', 'idle');
    fireSocket('controller:state', 'Grbl', nativeState('G21'));
    const rejected = expect(adapter.requestUnits('inch')).rejects.toThrow();
    expect(mockSocket.emit).toHaveBeenCalledWith('command', '/dev/ttyACTUAL', 'gcode', 'G20');
    fireSocket('serialport:close', { port: '/dev/ttyACTUAL' });
    await rejected;
    expect(adapter.getState().connected).toBe(false);
    expect(adapter.getState().unitControl?.pending).toBeNull();
    adapter.disconnect();
  });

  it.each([
    ['0', 'G20', 25.4],
    ['0', 'G21', 25.4],
    ['1', 'G20', 1],
    ['1', 'G21', 1],
  ] as const)('normalizes $13=%s physical reports independently of %s program units', async (reportUnit, modal, rawX) => {
    await ready(modal, reportUnit);
    expect(adapter.getState().position).toEqual({ x: 25.4, y: 0, z: 0 });
    expect(adapter.getState().workPosition).toEqual({ x: 25.4, y: 0, z: 0 });
    fireSocket('controller:state', 'Grbl', nativeState(modal === 'G20' ? 'G21' : 'G20', 'Idle', rawX));
    expect(adapter.getState().position.x).toBeCloseTo(25.4);
    adapter.disconnect();
  });

  it('holds physical coordinates without $13 rather than guessing from modal units', async () => {
    await connectSocket();
    finishJoin();
    fireSocket('workflow:state', 'idle');
    const before = adapter.getState().position;
    fireSocket('controller:state', 'Grbl', nativeState('G20', 'Idle', 1));
    expect(adapter.getState().position).toEqual(before);
    fireSocket('controller:state', 'Grbl', nativeState('G21', 'Idle', 25.4));
    expect(adapter.getState().position).toEqual(before);
    freshReport('1', 1);
    expect(adapter.getState().position.x).toBeCloseTo(25.4);
    adapter.disconnect();
  });

  it.each([['0', '1', 1], ['1', '0', 25.4]] as const)(
    'preserves cached coordinates across $13=%s to %s until readback and a fresh raw anchor',
    async (initial, changed, freshX) => {
      await ready('G21', initial);
      fireSocket('controller:settings', 'Grbl', { settings: { '$13': changed } });
      expect(mockSocket.emit).toHaveBeenCalledWith('command', '/dev/ttyB', 'gcode', '$$');
      fireSocket('controller:state', 'Grbl', nativeState('G21', 'Idle', initial === '1' ? 1 : 25.4));
      expect(adapter.getState().position.x).toBeCloseTo(25.4);
      fireSocket('serialport:read', `$13=${changed}`);
      expect(mockSocket.emit).toHaveBeenCalledWith('write', '/dev/ttyB', '?');
      fireSocket('serialport:read', `<Idle|MPos:${String(freshX * 2)},0,0|WCO:0,0,0>`);
      expect(adapter.getState().position.x).toBeCloseTo(50.8);
      expect(adapter.getState().workPosition?.x).toBeCloseTo(50.8);
      // Native raw reports precede their controller snapshots. A later jog need
      // not revisit the anchor coordinate before its snapshot is accepted.
      fireSocket('controller:state', 'Grbl', nativeState('G21', 'Idle', freshX * 3));
      expect(adapter.getState().position.x).toBeCloseTo(76.2);
      adapter.disconnect();
    },
  );

  it('bounds repeated settings resync and waits for idle workflow and machine gates', async () => {
    await connectSocket();
    finishJoin();
    fireSocket('workflow:state', 'running');
    fireSocket('controller:state', 'Grbl', nativeState('G21', 'Run'));
    mockSocket.emit.mockClear();
    fireSocket('controller:settings', 'Grbl', { settings: { '$13': '0' } });
    expect(mockSocket.emit).not.toHaveBeenCalledWith('command', '/dev/ttyB', 'gcode', '$$');
    fireSocket('workflow:state', 'idle');
    expect(mockSocket.emit).not.toHaveBeenCalledWith('command', '/dev/ttyB', 'gcode', '$$');
    fireSocket('controller:state', 'Grbl', nativeState('G21'));
    fireSocket('controller:settings', 'Grbl', { settings: { '$13': '0' } });
    expect(mockSocket.emit.mock.calls.filter((call) => call[0] === 'command' && call[3] === '$$')).toHaveLength(1);
    fireSocket('serialport:read', '$13=0');
    fireSocket('serialport:read', '$13=0');
    expect(mockSocket.emit.mock.calls.filter((call) => call[0] === 'write' && call[2] === '?')).toHaveLength(1);
    adapter.disconnect();
  });

  it('defers report-unit resync discovered in replay until the port has actually joined', async () => {
    await connectSocket();
    fireSocket('serialport:list', [{ port: '/dev/ttyB', inuse: true }]);
    const callback = mockSocket.emit.mock.calls.find(([event]) => event === 'open')?.[3] as
      (error: unknown) => void;
    fireSocket('workflow:state', 'idle');
    fireSocket('controller:state', 'Grbl', nativeState('G21'));
    fireSocket('controller:settings', 'Grbl', { settings: { '$13': '0' } });
    expect(mockSocket.emit).not.toHaveBeenCalledWith('command', expect.anything(), 'gcode', '$$');
    callback(null);
    expect(mockSocket.emit).toHaveBeenCalledWith('command', '/dev/ttyB', 'gcode', '$$');
    adapter.disconnect();
  });

  it('accepts external modal changes without echoing unit commands', async () => {
    await ready();
    fireSocket('controller:state', 'Grbl', nativeState('G20'));
    expect(adapter.getState().unitControl?.confirmed).toBe('inch');
    fireSocket('controller:state', 'Grbl', nativeState('G21'));
    expect(adapter.getState().unitControl?.confirmed).toBe('mm');
    expect(mockSocket.emit.mock.calls.filter((call) =>
      call[0] === 'command' && (call[3] === 'G20' || call[3] === 'G21'))).toHaveLength(0);
    adapter.disconnect();
  });

  it.each(['0', '1'] as const)('normalizes raw WPos and WCO with $13=%s before any snapshot', async (reportUnit) => {
    await ready('G21', reportUnit === '0' ? '1' : '0');
    fireSocket('controller:settings', 'Grbl', { settings: { '$13': reportUnit } });
    expect(mockSocket.emit).toHaveBeenCalledWith('command', '/dev/ttyB', 'gcode', '$$');
    fireSocket('serialport:read', `$13=${reportUnit}`);
    const scale = reportUnit === '1' ? 1 : 25.4;
    fireSocket('serialport:read', `<Idle|WPos:${String(scale)},0,0|WCO:${String(scale)},0,0>`);
    expect(adapter.getState().position.x).toBeCloseTo(50.8);
    expect(adapter.getState().workPosition?.x).toBeCloseTo(25.4);
    adapter.disconnect();
  });

  it.each([['false', 'G21', 1], ['true', 'G20', 25.4]] as const)(
    'reads FluidNC report_inches=%s when the settings dump omits report units and establishes ABS from WCO',
    async (reportInches, units, scale) => {
      await connectSocket();
      finishJoin();
      fireSocket('workflow:state', 'idle');
      fireSocket('controller:state', 'Grbl', nativeState(units));
      fireSocket('controller:settings', 'Grbl', { settings: { '$10': '1' } });
      const commands = (): unknown[] => mockSocket.emit.mock.calls
        .filter((call) => call[0] === 'command' && call[2] === 'gcode').map((call): unknown => call[3]);
      expect(commands()).toEqual(['$$']);
      // FluidNC 3.7.8 transcript captured through CNCjs.
      fireSocket('serialport:read', '$10=1 (Status report options, mask)');
      fireSocket('serialport:read', 'ok');
      expect(commands()).toEqual(['$$', '$I']);
      fireSocket('serialport:read', '[VER:3.7 FluidNC v3.7.8:]');
      expect(commands()).toEqual(['$$', '$I', '$/report_inches']);
      fireSocket('serialport:read', '[OPT:PHS]');
      fireSocket('serialport:read', 'ok');
      // CNCjs records the `$path=value` reply as a setting and rebroadcasts.
      fireSocket('controller:settings', 'Grbl', { settings: { '$10': '1', '$/report_inches': reportInches } });
      fireSocket('serialport:read', `$/report_inches=${reportInches}`);
      expect(mockSocket.emit).toHaveBeenCalledWith('write', '/dev/ttyB', '?');
      // WCO rides ~1 in 10 FluidNC reports, so the WCO-less reply reads `$#`.
      fireSocket('serialport:read', '<Idle|MPos:-206.850,-78.900,-148.000|FS:0,0>');
      expect(commands()).toEqual(['$$', '$I', '$/report_inches', '$#']);
      for (const line of ['[G54:-265.500,-82.500,-305.000]', '[G55:-472.460,-116.179,-263.040]',
        '[G56:0.000,0.000,0.000]', '[G28:0.000,0.000,0.000]', '[G92:0.000,0.000,0.000]', '[TLO:0.000]', 'ok']) {
        fireSocket('serialport:read', line);
      }
      expect(adapter.getState().workPositionControl).toEqual({ availability: 'ready', pending: null, error: null });
      expect(adapter.getState().workPosition?.x).toBeCloseTo(58.65 * scale);
      expect(adapter.getState().workPosition?.z).toBeCloseTo(157 * scale);
      expect(adapter.getState().position.z).toBeCloseTo(-148 * scale);
      adapter.disconnect();
    },
  );

  it('does not query FluidNC config from other firmware that omits $13', async () => {
    await connectSocket();
    finishJoin();
    fireSocket('workflow:state', 'idle');
    fireSocket('controller:state', 'Grbl', nativeState('G21'));
    fireSocket('serialport:read', 'ok');
    fireSocket('serialport:read', '[VER:1.1h.20190825:]');
    fireSocket('serialport:read', 'ok');
    expect(mockSocket.emit.mock.calls.filter((call) => call[0] === 'command').map((call): unknown => call[3]))
      .toEqual(['$$', '$I']);
    expect(adapter.getState().workPositionControl?.availability).toBe('unavailable');
    adapter.disconnect();
  });

  it('fails the fresh-report boundary after five seconds when no status reply arrives', async () => {
    vi.useFakeTimers();
    try {
      await connectSocket();
      finishJoin();
      fireSocket('workflow:state', 'idle');
      fireSocket('controller:state', 'Grbl', nativeState('G21'));
      fireSocket('controller:settings', 'Grbl', { settings: { '$13': '0' } });
      mockSocket.emit.mockClear();
      fireSocket('serialport:read', '$13=0');
      await vi.advanceTimersByTimeAsync(4999);
      expect(adapter.getState().workPositionControl?.error).toBeNull();
      expect(mockSocket.emit.mock.calls.filter((call) => call[0] === 'write' && call[2] === '?')).toHaveLength(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(adapter.getState().workPositionControl?.availability).toBe('unavailable');
      expect(adapter.getState().workPositionControl?.error).toBe('Fresh GRBL report units and work offset were not received within 5 seconds');
      await expect(adapter.requestWorkPosition({ x: 0 })).rejects.toThrow();
      await vi.advanceTimersByTimeAsync(5000);
      expect(mockSocket.emit.mock.calls.filter((call) => call[0] === 'write' && call[2] === '?')).toHaveLength(1);
    } finally {
      adapter.disconnect();
      vi.useRealTimers();
    }
  });

  it.each(['0', '1'] as const)('confirms work targets only within $13=%s report precision', async (reportUnit) => {
    await ready('G21', reportUnit);
    const scale = reportUnit === '1' ? 1 / 25.4 : 1;
    const precision = reportUnit === '1' ? 0.0001 : 0.001;
    const request = adapter.requestWorkPosition({ x: 50.8 });
    advanceWorkRequestMarker();
    for (const offset of [precision * 2, precision / 2]) {
      fireSocket('serialport:read', `<Idle|MPos:${String(25.4 * scale)},0,0|WCO:${String(-25.4 * scale - offset)},0,0>`);
      if (offset > precision) {
        expect(adapter.getState().workPositionControl?.pending).toEqual({ x: 50.8 });
      }
    }
    await request;
    expect(adapter.getState().workPositionControl?.pending).toBeNull();
    adapter.disconnect();
  });

  it('blocks work-position writes when modal program units are unknown', async () => {
    await ready();
    fireSocket('controller:state', 'Grbl', {
      ...nativeState('G21'), parserstate: { modal: { wcs: 'G54' } },
    });
    await expect(adapter.requestWorkPosition({ x: 0 })).rejects.toThrow();
    adapter.disconnect();
  });

  describe('native work-position writes', () => {
    it.each([
      ['G21', '0'], ['G21', '1'], ['G20', '0'], ['G20', '1'],
    ] as const)('converts canonical mm using %s independently of $13=%s without optimistic coordinates', async (modal, reportUnit) => {
      await ready(modal, reportUnit);
      const before = adapter.getState();
      const request = adapter.requestWorkPosition({ x: 50.8 });
      const commands = mockSocket.emit.mock.calls.filter(([event]) => event === 'command');
      expect(commands).toHaveLength(2);
      expect(commands[1]?.slice(0, 4)).toEqual(['command', '/dev/ttyB', 'gcode', '$G']);
      expect(commands[0]?.slice(0, 3)).toEqual(['command', '/dev/ttyB', 'gcode']);
      const words = String(commands[0]?.[3]).split(/\s+/);
      expect(words.slice(0, 4)).toEqual([modal, 'G10', 'L20', 'P1']);
      expect(words).toHaveLength(5);
      expect(Number(words[4]?.slice(1))).toBeCloseTo(modal === 'G20' ? 2 : 50.8);
      expect(words[4]?.startsWith('X')).toBe(true);
      expect(adapter.getState().position).toEqual(before.position);
      expect(adapter.getState().workPosition).toEqual(before.workPosition);
      expect(adapter.getState().workPositionControl).toEqual({
        availability: 'busy', pending: { x: 50.8 }, error: null,
      });
      await expect(adapter.requestUnits(modal === 'G20' ? 'mm' : 'inch')).rejects.toThrow();
      await expect(adapter.requestWorkPosition({ y: 0 })).rejects.toThrow();
      const reportScale = reportUnit === '1' ? 1 / 25.4 : 1;
      fireSocket('controller:state', 'Grbl', {
        ...nativeState(modal, 'Idle', 25.4 * reportScale),
        status: {
          activeState: 'Idle',
          mpos: [25.4 * reportScale, 0, 0],
          wpos: [50.8 * reportScale, 0, 0],
        },
      });
      expect(adapter.getState().workPositionControl?.pending).toEqual({ x: 50.8 });
      advanceWorkRequestMarker();
      fireSocket('serialport:read', `<Idle|MPos:${String(25.4 * reportScale)},0,0|WCO:${String(-25.4 * reportScale)},0,0>`);
      await expect(request).resolves.toBeUndefined();
      expect(adapter.getState().position.x).toBeCloseTo(before.position.x, 6);
      expect(adapter.getState().position.y).toBeCloseTo(before.position.y, 6);
      expect(adapter.getState().position.z).toBeCloseTo(before.position.z, 6);
      expect(adapter.getState().workPosition?.x).toBeCloseTo(50.8);
      expect(adapter.getState().workPosition?.y).toBe(0);
      expect(adapter.getState().workPosition?.z).toBe(0);
      expect(adapter.getState().workPositionControl?.pending).toBeNull();
      adapter.disconnect();
    });

    it.each(['G54', 'G55', 'G56', 'G57', 'G58', 'G59'])('addresses exactly the active %s work coordinate system', async (wcs) => {
      await ready();
      fireSocket('controller:state', 'Grbl', {
        ...nativeState('G21'), parserstate: { modal: { units: 'G21', wcs } },
      });
      const request = adapter.requestWorkPosition({ z: -2 });
      const command = mockSocket.emit.mock.calls.find(([event]) => event === 'command')?.[3];
      expect(String(command).split(/\s+/).slice(0, 4)).toEqual(['G21', 'G10', 'L20', `P${String(Number(wcs.slice(1)) - 53)}`]);
      expect(String(command).split(/\s+/)).toHaveLength(5);
      expect(String(command)).toMatch(/ Z-2(?:\.0+)?$/);
      fireSocket('controller:state', 'Grbl', {
        parserstate: { modal: { units: 'G21', wcs } },
        status: { activeState: 'Idle', mpos: [25.4, 0, 0], wpos: [25.4, 0, -2] },
      });
      expect(adapter.getState().workPositionControl?.pending).toEqual({ z: -2 });
      advanceWorkRequestMarker();
      fireSocket('serialport:read', '<Idle|MPos:25.4,0,0|WCO:0,0,2>');
      await request;
      adapter.disconnect();
    });

    it('emits G10 even for a cached matching target and waits for a post-marker raw report', async () => {
      await ready();
      const request = adapter.requestWorkPosition({ x: 25.4 });
      expect(mockSocket.emit).toHaveBeenCalledWith('command', '/dev/ttyB', 'gcode', 'G21 G10 L20 P1 X25.4');
      fireSocket('serialport:write', '$G\n', { el400WorkRequest: 'unrelated-request' });
      fireSocket('serialport:read', '<Idle|MPos:25.4,0,0|WCO:0,0,0>');
      expect(adapter.getState().workPositionControl?.pending).toEqual({ x: 25.4 });
      expect(mockSocket.emit).not.toHaveBeenCalledWith('write', '/dev/ttyB', '?');
      fireSocket('controller:state', 'Grbl', nativeState('G21'));
      fireSocket('serialport:read', '<Idle|MPos:25.4,0,0|WCO:0,0,0>');
      expect(adapter.getState().workPositionControl?.pending).toEqual({ x: 25.4 });
      advanceWorkRequestMarker();
      fireSocket('controller:state', 'Grbl', nativeState('G21'));
      expect(adapter.getState().workPositionControl?.pending).toEqual({ x: 25.4 });
      fireSocket('serialport:read', '<Idle|MPos:25.4,0,0|WCO:0,0,0>');
      await expect(request).resolves.toBeUndefined();
      expect(adapter.getState().workPositionControl?.pending).toBeNull();
      adapter.disconnect();
    });

    it('keeps unit and work-position requests mutually exclusive in both directions', async () => {
      await ready();
      const request = adapter.requestUnits('inch');
      await expect(adapter.requestWorkPosition({ x: 0 })).rejects.toThrow();
      fireSocket('controller:state', 'Grbl', nativeState('G20'));
      await request;
      adapter.disconnect();
    });

    it.each(['Run', undefined])('blocks work-position writes with machine state %s', async (activeState) => {
      await ready();
      fireSocket('controller:state', 'Grbl', {
        ...nativeState('G21'), status: { activeState, mpos: [25.4, 0, 0], wpos: [25.4, 0, 0] },
      });
      await expect(adapter.requestWorkPosition({ x: 0 })).rejects.toThrow();
      expect(mockSocket.emit).not.toHaveBeenCalledWith('command', expect.anything(), 'gcode', expect.stringContaining('G10'));
      adapter.disconnect();
    });

    it.each([undefined, 'G53', 'G59.1'])('blocks unknown or unsupported active WCS %s', async (wcs) => {
      await ready();
      fireSocket('controller:state', 'Grbl', {
        ...nativeState('G21'), parserstate: { modal: { units: 'G21', wcs } },
      });
      await expect(adapter.requestWorkPosition({ x: 0 })).rejects.toThrow();
      adapter.disconnect();
    });

    it('requires fresh physical coordinates even when modal and idle gates are known', async () => {
      await connectSocket();
      finishJoin();
      fireSocket('workflow:state', 'idle');
      fireSocket('controller:state', 'Grbl', nativeState('G21'));
      await expect(adapter.requestWorkPosition({ x: 0 })).rejects.toThrow();
      adapter.disconnect();
    });

    it('blocks workflow-busy, display-only, and disconnected work-position requests', async () => {
      await ready();
      fireSocket('workflow:state', 'running');
      await expect(adapter.requestWorkPosition({ x: 0 })).rejects.toThrow();
      fireSocket('workflow:state', 'idle');
      fireSocket('controller:state', 'GrblHAL', nativeState('G21'));
      await expect(adapter.requestWorkPosition({ x: 0 })).rejects.toThrow();
      adapter.disconnect();
      await expect(adapter.requestWorkPosition({ x: 0 })).rejects.toThrow();
    });

    it.each(['error:20', 'ALARM:1', 'wcs-change', 'disconnect'])('clears pending work-position intent on %s without replay', async (reason) => {
      await ready();
      const message = reason === 'wcs-change'
        ? 'Active work coordinate system changed while awaiting confirmation'
        : reason === 'disconnect'
          ? 'CNCjs disconnected before unit confirmation'
          : `Controller reported ${reason} while awaiting work-coordinate confirmation`;
      const rejected = expect(adapter.requestWorkPosition({ x: 0 })).rejects.toThrow(message);
      if (reason === 'wcs-change') {
        fireSocket('controller:state', 'Grbl', {
          ...nativeState('G21'), parserstate: { modal: { units: 'G21', wcs: 'G55' } },
        });
      } else if (reason === 'disconnect') {
        fireSocket('disconnect');
      } else {
        fireSocket('serialport:read', reason);
      }
      await rejected;
      expect(adapter.getState().workPositionControl?.pending).toBeNull();
      if (reason !== 'disconnect') {
        expect(adapter.getState().workPositionControl?.availability).toBe('ready');
        expect(adapter.getState().workPositionControl?.error).toBe(message);
      }
      expect(adapter.getState().workPosition?.x).toBeCloseTo(25.4);
      mockSocket.emit.mockClear();
      if (reason === 'disconnect') {
        fireSocket('connect');
        finishJoin();
      }
      fireSocket('controller:state', 'Grbl', nativeState('G21'));
      if (reason !== 'disconnect') {
        expect(adapter.getState().workPositionControl?.error).toBe(message);
      }
      expect(mockSocket.emit).not.toHaveBeenCalledWith('command', expect.anything(), 'gcode', expect.stringContaining('G10'));
      adapter.disconnect();
    });

    it('times out work-position confirmation after 5000ms without changing coordinates', async () => {
      vi.useFakeTimers();
      try {
        await ready();
        const rejected = expect(adapter.requestWorkPosition({ x: 0 })).rejects.toThrow();
        await vi.advanceTimersByTimeAsync(4999);
        expect(adapter.getState().workPositionControl?.pending).toEqual({ x: 0 });
        await vi.advanceTimersByTimeAsync(1);
        await rejected;
        expect(adapter.getState().workPosition?.x).toBeCloseTo(25.4);
        expect(adapter.getState().workPositionControl?.pending).toBeNull();
        expect(adapter.getState().workPositionControl?.availability).toBe('ready');
        expect(adapter.getState().workPositionControl?.error).toBe('Controller did not confirm work coordinates within 5 seconds');
        fireSocket('controller:state', 'Grbl', nativeState('G21'));
        expect(adapter.getState().workPositionControl?.error).toBe('Controller did not confirm work coordinates within 5 seconds');
        fireSocket('controller:settings', 'Grbl', { settings: { '$13': '1' } });
        expect(adapter.getState().workPositionControl?.error).toBe('Controller did not confirm work coordinates within 5 seconds');
        fireSocket('serialport:read', '$13=1');
        fireSocket('serialport:read', '<Idle|MPos:1,0,0|WCO:0,0,0>');
        expect(adapter.getState().workPositionControl?.availability).toBe('ready');
        expect(adapter.getState().workPositionControl?.error).toBe('Controller did not confirm work coordinates within 5 seconds');
        await expect(adapter.requestWorkPosition({})).rejects.toThrow();
        expect(adapter.getState().workPositionControl?.error).toBe('Controller did not confirm work coordinates within 5 seconds');
        mockSocket.emit.mockClear();
        const retry = adapter.requestWorkPosition({ x: 0 });
        expect(adapter.getState().workPositionControl?.pending).toEqual({ x: 0 });
        expect(adapter.getState().workPositionControl?.error).toBeNull();
        advanceWorkRequestMarker();
        fireSocket('serialport:read', '<Idle|MPos:1,0,0|WCO:1,0,0>');
        await expect(retry).resolves.toBeUndefined();
        expect(adapter.getState().workPositionControl?.error).toBeNull();
      } finally {
        adapter.disconnect();
        vi.useRealTimers();
      }
    });

    it('accepts external work-position updates without emitting an offset command', async () => {
      await ready();
      fireSocket('controller:state', 'Grbl', {
        ...nativeState('G21'),
        status: { activeState: 'Idle', mpos: [25.4, 0, 0], wpos: [10, 20, 30] },
      });
      expect(adapter.getState().position.x).toBeCloseTo(25.4);
      expect(adapter.getState().workPosition).toEqual({ x: 10, y: 20, z: 30 });
      expect(mockSocket.emit).not.toHaveBeenCalledWith('command', expect.anything(), 'gcode', expect.stringContaining('G10'));
      adapter.disconnect();
    });

    it.each([
      ['G20', 'G21'], ['G21', 'G20'],
    ] as const)('executes queued %s work targets as physical mm despite another client switching to %s', async (capturedMode, externalMode) => {
      await ready(capturedMode);
      const request = adapter.requestWorkPosition({ x: 2.54 });
      const command = mockSocket.emit.mock.calls.find((call) =>
        call[0] === 'command' && typeof call[3] === 'string' && call[3].includes('G10'));
      expect(command).toBeDefined();
      // Model firmware consuming the queued line only after another client's
      // modal command. No assertion below assumes the emitted line has a prefix.
      fireSocket('controller:state', 'Grbl', nativeState(externalMode));
      let executionMode: 'G20' | 'G21' = externalMode;
      let executedX: number | undefined;
      for (const word of String(command?.[3]).split(/\s+/)) {
        if (word === 'G20' || word === 'G21') executionMode = word;
        if (word.startsWith('X')) executedX = Number(word.slice(1));
      }
      expect(executedX).toBeDefined();
      const physicalWorkX = Number(executedX) * (executionMode === 'G20' ? 25.4 : 1);
      expect(physicalWorkX).toBeCloseTo(2.54, 6);
      expect(adapter.getState().workPositionControl?.pending).toEqual({ x: 2.54 });
      advanceWorkRequestMarker();
      fireSocket('serialport:read', `<Idle|MPos:25.4,0,0|WCO:${String(25.4 - physicalWorkX)},0,0>`);
      await expect(request).resolves.toBeUndefined();
      expect(adapter.getState().workPosition?.x).toBeCloseTo(2.54, 6);
      expect(adapter.getState().position.x).toBeCloseTo(25.4, 6);
      adapter.disconnect();
    });
  });

  it.each([['0', 1], ['1', 25.4]] as const)(
    'completes a missing-WCO boundary from explicit offsets reported with setting %s',
    async (reportUnit, scale) => {
      await connectSocket();
      finishJoin();
      fireSocket('workflow:state', 'idle');
      fireSocket('controller:state', 'Grbl', { ...nativeState('G21'), parserstate: { modal: { units: 'G21', wcs: 'G55' } } });
      fireSocket('controller:settings', 'Grbl', { settings: { '$13': reportUnit } });
      mockSocket.emit.mockClear();
      fireSocket('serialport:read', `$13=${reportUnit}`);
      fireSocket('serialport:read', '<Idle|MPos:10,20,30|FS:0,0>');
      fireSocket('serialport:read', '<Idle|MPos:11,20,30|FS:0,0>');
      expect(mockSocket.emit.mock.calls.filter((call) => call[0] === 'command').map((call): unknown => call[3])).toEqual(['$#']);
      expect(adapter.getState().workPositionControl?.availability).toBe('unavailable');
      // Four-axis controllers append A; only XYZ feed the readout.
      fireSocket('serialport:read', '[G54:100,100,100,100]');
      fireSocket('serialport:read', '[G55:1,2,3,9]');
      fireSocket('serialport:read', '[G92:0.5,0,0,0]');
      fireSocket('serialport:read', '[TLO:4]');
      fireSocket('serialport:read', 'ok');
      // Active G55 + G92 + TLO on Z, subtracted from the latest fresh MPos.
      expect(adapter.getState().workPositionControl).toEqual({ availability: 'ready', pending: null, error: null });
      expect(adapter.getState().workPosition?.x).toBeCloseTo((11 - 1.5) * scale);
      expect(adapter.getState().workPosition?.y).toBeCloseTo((20 - 2) * scale);
      expect(adapter.getState().workPosition?.z).toBeCloseTo((30 - 7) * scale);
      expect(mockSocket.emit.mock.calls.filter((call) => call[0] === 'write' && call[2] === '?')).toHaveLength(1);
      adapter.disconnect();
    },
  );

  it('ignores a preceding command ok that arrives after the WCO-less report triggered $#', async () => {
    await connectSocket();
    finishJoin();
    fireSocket('workflow:state', 'idle');
    fireSocket('controller:state', 'Grbl', nativeState('G21'));
    fireSocket('controller:settings', 'Grbl', { settings: { '$13': '0' } });
    fireSocket('serialport:read', '$13=0');
    // Realtime `?` overtakes the setting command's trailing ok (seen live on FluidNC).
    fireSocket('serialport:read', '<Idle|MPos:10,0,0|FS:0,0>');
    fireSocket('serialport:read', 'ok');
    expect(adapter.getState().workPositionControl?.error).toBeNull();
    for (const line of ['[G54:4,0,0]', '[G92:0,0,0]', '[TLO:0]', 'ok']) fireSocket('serialport:read', line);
    expect(adapter.getState().workPositionControl).toEqual({ availability: 'ready', pending: null, error: null });
    expect(adapter.getState().workPosition?.x).toBeCloseTo(6);
    adapter.disconnect();
  });

  it('applies the $# offset to snapshots until CNCjs refreshes its cached WCO', async () => {
    const snapshot = (mpos: number, wpos: number, wco: number) => ({
      parserstate: { modal: { units: 'G21', wcs: 'G54' } },
      status: { activeState: 'Idle', mpos: [mpos, 0, 0], wpos: [wpos, 0, 0], wco: [wco, 0, 0] },
    });
    await connectSocket();
    finishJoin();
    fireSocket('workflow:state', 'idle');
    // CNCjs cached WCO 25.4 while $13=0 (mm); firmware now reports inches.
    fireSocket('controller:state', 'Grbl', snapshot(2, -23.4, 25.4));
    fireSocket('controller:settings', 'Grbl', { settings: { '$13': '1' } });
    fireSocket('serialport:read', '$13=1');
    fireSocket('serialport:read', '<Idle|MPos:2,0,0|FS:0,0>');
    for (const line of ['[G54:1,0,0]', '[G92:0,0,0]', '[TLO:0]', 'ok']) fireSocket('serialport:read', line);
    expect(adapter.getState().workPosition?.x).toBeCloseTo(25.4);
    // Same stale cache: CNCjs's WPos would read -594.36 mm.
    fireSocket('controller:state', 'Grbl', snapshot(2, -23.4, 25.4));
    expect(adapter.getState().workPosition?.x).toBeCloseTo(25.4);
    // A refreshed cache (here: another client's offset change) is trusted again.
    fireSocket('controller:state', 'Grbl', snapshot(2, 1.5, 0.5));
    expect(adapter.getState().workPosition?.x).toBeCloseTo(38.1);
    fireSocket('controller:state', 'Grbl', snapshot(3, 2.5, 0.5));
    expect(adapter.getState().workPosition?.x).toBeCloseTo(63.5);
    adapter.disconnect();
  });

  it('leaves position writes unavailable when $# omits the active offsets', async () => {
    vi.useFakeTimers();
    try {
      await connectSocket();
      finishJoin();
      fireSocket('workflow:state', 'idle');
      fireSocket('controller:state', 'Grbl', nativeState('G21'));
      fireSocket('controller:settings', 'Grbl', { settings: { '$13': '0' } });
      mockSocket.emit.mockClear();
      fireSocket('serialport:read', '$13=0');
      fireSocket('serialport:read', '<Idle|MPos:25.400,0,0>');
      fireSocket('serialport:read', '[G92:0,0,0]');
      fireSocket('serialport:read', 'ok');
      expect(adapter.getState().workPositionControl?.availability).toBe('unavailable');
      expect(adapter.getState().workPositionControl?.error).toBe('Controller work offsets ($#) were incomplete');
      await expect(adapter.requestWorkPosition({ x: 0 })).rejects.toThrow();
      await vi.advanceTimersByTimeAsync(6000);
      expect(mockSocket.emit.mock.calls.filter((call) => call[0] === 'write' && call[2] === '?')).toHaveLength(1);
    } finally {
      adapter.disconnect();
      vi.useRealTimers();
    }
  });
});

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
      closeHandler?.({ port: '/dev/ttyB' });
      mockSocket.emit.mockClear();
      fireSerialportList([{ port: '/dev/ttyB', inuse: true }]);
      expect(mockSocket.emit).toHaveBeenCalledWith('open', '/dev/ttyB', expect.anything(), expect.any(Function));
    });

    it('tracks the current controller type from controller:state', async () => {
      const adapter = new CncjsMillAdapter({ host: 'localhost', port: 8000 });
      const connectPromise = adapter.connect();
      fireConnect();
      await connectPromise;
      finishJoin();
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

    it('keeps the adapter disconnected until a serial port is joined', async () => {
      const adapter = new CncjsMillAdapter({ host: 'localhost', port: 8000 });
      const connectPromise = adapter.connect();

      const connectHandler = mockSocket.on.mock.calls.find(([event]) => event === 'connect')?.[1];
      connectHandler?.();

      await connectPromise;

      expect(adapter.getState().connected).toBe(false);
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
      finishJoin();
      fireSocket('workflow:state', 'idle');
      fireSocket('controller:state', 'Grbl', nativeState('G21'));
      freshReport('0', 10);

      const listener = vi.fn();
      adapter.subscribe(listener);
      listener.mockClear();

      fireSocket('controller:state', 'Grbl', nativeState('G21', 'Idle', 20));

      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        position: { x: 20, y: 0, z: 0 },
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

    it('should dispatch MILL_STATE_CHANGED when the serial port joins', async () => {
      const adapter = new CncjsMillAdapter({ host: 'localhost', port: 8000 });
      const dispatch = vi.fn();
      adapter.setDispatch(createDispatch(dispatch));

      const connectPromise = adapter.connect();

      const connectHandler = mockSocket.on.mock.calls.find(([event]) => event === 'connect')?.[1];
      connectHandler?.();

      await connectPromise;
      finishJoin();

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
      finishJoin();
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
      openHandler?.({ port: '/dev/ttyB', controllerType: 'Grbl' });
      finishJoin();

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

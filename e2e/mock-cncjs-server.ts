import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { parse } from 'url';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

const PORT = process.env['E2E_MOCK_CNCJS_PORT'] ? parseInt(process.env['E2E_MOCK_CNCJS_PORT'], 10) : 8765;

type EncoderSignalState = 'ok' | 'lost';
type EncoderSignalByAxis = { X: EncoderSignalState; Y: EncoderSignalState; Z: EncoderSignalState };

type Position = { x: number; y: number; z: number };
type WorkingUnit = 'G20' | 'G21';
type WorkCoordinateSystem = 'G54' | 'G55' | 'G56' | 'G57' | 'G58' | 'G59';
// FluidNC runs under CNCjs's Grbl controller but keeps report units in
// config.yaml: `$$` omits `$13`, `$/report_inches` reads it, and status reports
// carry MPos with WCO only every few reports.
type Firmware = 'grbl' | 'fluidnc';
const FLUIDNC_WCO_EVERY = 3;
type Session = {
  // Physical position and offsets stay in mm, independent of G20/G21 and $13.
  position: Position;
  workingUnit: WorkingUnit;
  reportInches: boolean;
  firmware: Firmware;
  statusReports: number;
  wcs: WorkCoordinateSystem;
  offsets: Record<WorkCoordinateSystem, Position>;
  probeState?: { pinState: string };
  encoderSignal?: EncoderSignalByAxis;
};

const SERIAL_PORT = '/dev/ttyMOCK';
const sessions = new Map<string, Session>();

function getSession(sessionId: string): Session {
  let session = sessions.get(sessionId);
  if (!session) {
    session = {
      position: { x: 0, y: 0, z: 0 },
      workingUnit: 'G21',
      reportInches: false,
      firmware: 'grbl',
      statusReports: 0,
      wcs: 'G54',
      offsets: {
        G54: { x: 0, y: 0, z: 0 },
        G55: { x: 0, y: 0, z: 0 },
        G56: { x: 0, y: 0, z: 0 },
        G57: { x: 0, y: 0, z: 0 },
        G58: { x: 0, y: 0, z: 0 },
        G59: { x: 0, y: 0, z: 0 },
      },
    };
    sessions.set(sessionId, session);
  }
  return session;
}

const httpServer = createServer((req, res) => {
  const { pathname, query } = parse(req.url || '', true);
  const sessionId = query['sessionId'] as string | undefined;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Serve frontend HTML
  if ((pathname === '/' || pathname === '/index.html') && req.method === 'GET') {
    try {
      const htmlPath = resolve(__dirname, 'mock-cncjs-frontend.html');
      const html = readFileSync(htmlPath, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    } catch (error) {
      console.error('[MockCncjs] Failed to read frontend HTML:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Frontend not available' }));
      return;
    }
  }

  // Health check
  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', port: PORT, sessions: sessions.size }));
    return;
  }

  // Explicit fixture setup, called once before navigation, never on reload.
  // The unseeded/manual frontend controller retains its native G21 default.
  if (pathname === '/api/session' && req.method === 'POST') {
    if (!sessionId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'sessionId required' }));
      return;
    }
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const { workingUnit, firmware = 'grbl' } = JSON.parse(body);
        if (workingUnit !== 'G20' && workingUnit !== 'G21') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'workingUnit must be G20 or G21' }));
          return;
        }
        if (firmware !== 'grbl' && firmware !== 'fluidnc') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'firmware must be grbl or fluidnc' }));
          return;
        }
        const session = getSession(sessionId);
        session.workingUnit = workingUnit;
        session.firmware = firmware;
        emitStateToSession(sessionId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, workingUnit }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // Reset position for a session
  if (pathname === '/api/reset' && req.method === 'POST') {
    if (!sessionId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'sessionId required' }));
      return;
    }

    const session = sessions.get(sessionId);
    if (session) {
      session.position = { x: 0, y: 0, z: 0 };
      emitStateToSession(sessionId);
    }
    // If no session yet, that's fine - it will start at 0,0,0

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, sessionId }));
    return;
  }

  // Simulate another CNCjs client changing the active work offset without motion.
  if (pathname === '/api/work-position' && req.method === 'POST') {
    if (!sessionId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'sessionId required' }));
      return;
    }
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const { axis, value } = JSON.parse(body);
        if (!['X', 'Y', 'Z'].includes(axis) || typeof value !== 'number' || !Number.isFinite(value)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid axis or value' }));
          return;
        }
        const session = getSession(sessionId);
        const key = axis.toLowerCase() as keyof Position;
        session.offsets[session.wcs][key] = session.position[key] - value;
        emitStateToSession(sessionId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // Simulate encoder move
  if (pathname === '/api/encoder-move' && req.method === 'POST') {
    if (!sessionId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'sessionId required' }));
      return;
    }

    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const { axis, value } = JSON.parse(body);
        if (!['X', 'Y', 'Z'].includes(axis) || typeof value !== 'number') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid axis or value' }));
          return;
        }

        // Get or create session
        const session = getSession(sessionId);

        session.position[axis.toLowerCase() as 'x' | 'y' | 'z'] = value;
        console.log(`[MockCncjs] encoder-move ${sessionId}: ${axis}=${value}, new position=[${session.position.x}, ${session.position.y}, ${session.position.z}]`);
        emitStateToSession(sessionId);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, position: session.position }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // Simulate relative encoder move (adds delta to current position)
  if (pathname === '/api/encoder-move-relative' && req.method === 'POST') {
    if (!sessionId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'sessionId required' }));
      return;
    }

    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const { axis, delta } = JSON.parse(body);
        if (!['X', 'Y', 'Z'].includes(axis) || typeof delta !== 'number') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid axis or delta' }));
          return;
        }

        // Get or create session
        const session = getSession(sessionId);

        const axisKey = axis.toLowerCase() as 'x' | 'y' | 'z';
        session.position[axisKey] += delta;
        console.log(`[MockCncjs] encoder-move-relative ${sessionId}: ${axis}+=${delta}, new position=[${session.position.x}, ${session.position.y}, ${session.position.z}]`);
        emitStateToSession(sessionId);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, position: session.position }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // Probe trigger
  if (pathname === '/api/probe-trigger' && req.method === 'POST') {
    if (!sessionId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'sessionId required' }));
      return;
    }

    const session = getSession(sessionId);

    // Simulate probe trigger (set pinState to 'P')
    session.probeState = {
      pinState: 'P',
    };

    emitStateToSession(sessionId);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, probe: session.probeState }));
    return;
  }

  // Probe clear
  if (pathname === '/api/probe-clear' && req.method === 'POST') {
    if (!sessionId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'sessionId required' }));
      return;
    }

    const session = getSession(sessionId);

    // Clear probe state (set pinState to empty)
    session.probeState = {
      pinState: '',
    };

    emitStateToSession(sessionId);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, probe: session.probeState }));
    return;
  }

  // Simulate per-axis encoder signal loss / restore (US-042)
  if (pathname === '/api/encoder-signal' && req.method === 'POST') {
    if (!sessionId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'sessionId required' }));
      return;
    }

    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const { axis, signal } = JSON.parse(body);
        if (!['X', 'Y', 'Z'].includes(axis) || !['ok', 'lost'].includes(signal)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid axis or signal' }));
          return;
        }

        const session = getSession(sessionId);

        session.encoderSignal = {
          X: 'ok',
          Y: 'ok',
          Z: 'ok',
          ...session.encoderSignal,
          [axis]: signal,
        };
        console.log(`[MockCncjs] encoder-signal ${sessionId}: ${axis}=${signal}`);
        emitStateToSession(sessionId);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, encoderSignal: session.encoderSignal }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // 404 for unknown routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingInterval: 25000,
  pingTimeout: 60000,
  path: '/socket.io/',
  transports: ['websocket', 'polling'],
  // The CNCjs adapter uses a socket.io v2 client (Engine.IO 3) to match
  // CNCjs 1.x servers. Accept EIO3 here so the v2 client can handshake
  // with this v4 mock during E2E runs.
  allowEIO3: true,
});

function controllerState(session: Session) {
  const scale = session.reportInches ? 25.4 : 1;
  const offset = session.offsets[session.wcs];
  return {
    parserstate: { modal: { units: session.workingUnit, wcs: session.wcs } },
    status: {
      activeState: 'Idle',
      mpos: [session.position.x / scale, session.position.y / scale, session.position.z / scale],
      wpos: [
        (session.position.x - offset.x) / scale,
        (session.position.y - offset.y) / scale,
        (session.position.z - offset.z) / scale,
      ],
      pn: session.probeState?.pinState ?? '',
    },
    probe: session.probeState || '',
    encoderSignal: session.encoderSignal,
  };
}

function emitStateToSession(sessionId: string) {
  const session = sessions.get(sessionId);
  if (session) io.to(sessionId).emit('controller:state', 'Grbl', controllerState(session));
}

function rawStatus(session: Session): string {
  const scale = session.reportInches ? 25.4 : 1;
  const vector = (position: Position) =>
    [position.x / scale, position.y / scale, position.z / scale].join(',');
  session.statusReports++;
  const wco = session.firmware === 'grbl' || session.statusReports % FLUIDNC_WCO_EVERY === 0
    ? `|WCO:${vector(session.offsets[session.wcs])}` : '';
  return `<Idle|MPos:${vector(session.position)}${wco}|Pn:${session.probeState?.pinState ?? ''}>`;
}

function reportUnitSettings(session: Session): Record<string, string> {
  if (session.firmware === 'fluidnc') return { '$10': '1' };
  return { '$13': session.reportInches ? '1' : '0' };
}

io.on('connection', (socket) => {
  // Extract sessionId from query
  const sessionId = socket.handshake.query['sessionId'] as string | undefined;

  if (!sessionId) {
    console.log(`[MockCncjs] client connected without sessionId, disconnecting`);
    socket.disconnect();
    return;
  }

  console.log(`[MockCncjs] client connected: ${socket.id}, session: ${sessionId}`);

  const session = getSession(sessionId);
  let opened = false;

  // Join socket to a room named after the sessionId
  socket.join(sessionId);
  console.log(`[MockCncjs] socket ${socket.id} joined room ${sessionId}`);

  // The manual frontend listens directly, without list/open. Keep its initial
  // state, then replay the native settings/state/workflow when a DRO joins.
  socket.emit('controller:state', 'Grbl', controllerState(session));

  socket.on('list', () => {
    socket.emit('serialport:list', [{ port: SERIAL_PORT, inuse: true }]);
  });

  socket.on('open', (
    port: string,
    _options: { controllerType?: string; baudrate?: number },
    callback?: (error: string | null) => void,
  ) => {
    if (port !== SERIAL_PORT) {
      callback?.(`Mock serial port not found: ${port}`);
      return;
    }
    opened = true;
    socket.emit('controller:settings', 'Grbl', { settings: reportUnitSettings(session) });
    socket.emit('controller:state', 'Grbl', controllerState(session));
    socket.emit('workflow:state', 'idle');
    callback?.(null);
  });

  socket.on('disconnect', (reason) => {
    console.log(`[MockCncjs] client disconnected: ${socket.id}, session: ${sessionId}, reason: ${reason}`);
    // Session state is preserved, socket will automatically leave the room
  });

  const rejectCommand = (message: string) => {
    socket.emit('serialport:read', `error:20 (${message})`);
  };

  socket.on('write', (port: string, data: string) => {
    if (!opened || port !== SERIAL_PORT) {
      rejectCommand('Open the mock controller before writing');
      return;
    }
    if (data !== '?') {
      rejectCommand(`Unsupported mock realtime write: ${String(data)}`);
      return;
    }
    // Match the runner ordering: its cached state is current before the raw
    // report establishes the adapter's fresh $13/work-coordinate boundary.
    emitStateToSession(sessionId);
    io.to(sessionId).emit('serialport:read', rawStatus(session));
  });

  socket.on('command', (
    port: string,
    command: string,
    data: string,
    context?: { el400WorkRequest?: string },
  ) => {
    if (!opened || port !== SERIAL_PORT) {
      rejectCommand('Open the mock controller before sending G-code');
      return;
    }
    if (command !== 'gcode' || typeof data !== 'string') {
      rejectCommand('Expected command(port, gcode, line, context?)');
      return;
    }
    const line = data.trim();
    if (line === '$$') {
      const setting = session.firmware === 'fluidnc'
        ? '$10=1 (Status report options, mask)'
        : `$13=${session.reportInches ? '1' : '0'}`;
      io.to(sessionId).emit('serialport:read', setting);
      io.to(sessionId).emit('serialport:read', 'ok');
      return;
    }
    if (line === '$I') {
      const version = session.firmware === 'fluidnc' ? '[VER:3.7 FluidNC v3.7.8:]' : '[VER:1.1h.20190825:]';
      io.to(sessionId).emit('serialport:read', version);
      io.to(sessionId).emit('serialport:read', '[OPT:PHS]');
      io.to(sessionId).emit('serialport:read', 'ok');
      return;
    }
    if (line === '$/report_inches' && session.firmware === 'fluidnc') {
      // CNCjs records `$path=value` replies as settings and rebroadcasts them.
      const value = session.reportInches ? 'true' : 'false';
      io.to(sessionId).emit('controller:settings', 'Grbl', {
        settings: { ...reportUnitSettings(session), '$/report_inches': value },
      });
      io.to(sessionId).emit('serialport:read', `$/report_inches=${value}`);
      io.to(sessionId).emit('serialport:read', 'ok');
      return;
    }
    if (line === '$G') {
      // Handlers execute synchronously in Socket.IO FIFO order: any preceding
      // G10 has changed the offset before the feeder marker is emitted.
      io.to(sessionId).emit('serialport:write', '$G\n', { ...context, source: 'feeder' });
      emitStateToSession(sessionId);
      io.to(sessionId).emit('serialport:read', 'ok');
      return;
    }
    if (line === 'G20' || line === 'G21') {
      session.workingUnit = line;
      emitStateToSession(sessionId);
      io.to(sessionId).emit('serialport:read', 'ok');
      return;
    }

    const work = /^(G20|G21) G10 L20 P([1-6])((?: [XYZ][-+]?(?:\d+(?:\.\d*)?|\.\d+))+)$/.exec(line);
    if (!work) {
      rejectCommand(`Unsupported mock G-code: ${line}`);
      return;
    }
    const unit = work[1] as WorkingUnit;
    const wcs = `G${53 + Number(work[2])}` as WorkCoordinateSystem;
    const words = Array.from((work[3] ?? '').matchAll(/([XYZ])([-+]?(?:\d+(?:\.\d*)?|\.\d+))/g));
    const scale = unit === 'G20' ? 25.4 : 1;
    if (words.some((word) => !Number.isFinite(Number(word[2]) * scale))) {
      rejectCommand('Work coordinates must be finite');
      return;
    }
    session.workingUnit = unit;
    for (const word of words) {
      const axis = word[1]?.toLowerCase() as keyof Position;
      // G10 L20 sets WPos; it never moves MPos or touches unspecified axes.
      session.offsets[wcs][axis] = session.position[axis] - Number(word[2]) * scale;
    }
    emitStateToSession(sessionId);
    io.to(sessionId).emit('serialport:read', 'ok');
  });
});

// Note: Sessions are now automatically managed by Socket.io rooms.
// Sessions persist to preserve position state across reconnections.
// For a production server, you could add memory limits or TTL-based cleanup.

httpServer.listen(PORT, () => {
  console.log(`[MockCncjs] Mock CNCjs server listening on port ${PORT}`);
  console.log(`[MockCncjs] Each browser connection uses a unique sessionId for isolation`);
});

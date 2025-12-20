import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { parse } from 'url';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

const PORT = 8765;

// State per session (sessionId -> { position, probeState })
const sessions = new Map<string, { position: { x: number; y: number; z: number }; probeState?: { pinState: string } }>();

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
        let session = sessions.get(sessionId);
        if (!session) {
          session = { position: { x: 0, y: 0, z: 0 } };
          sessions.set(sessionId, session);
        }

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

  // Probe trigger
  if (pathname === '/api/probe-trigger' && req.method === 'POST') {
    if (!sessionId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'sessionId required' }));
      return;
    }

    let session = sessions.get(sessionId);
    if (!session) {
      session = { position: { x: 0, y: 0, z: 0 } };
      sessions.set(sessionId, session);
    }

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

    let session = sessions.get(sessionId);
    if (!session) {
      session = { position: { x: 0, y: 0, z: 0 } };
      sessions.set(sessionId, session);
    }

    // Clear probe state (set pinState to empty)
    session.probeState = {
      pinState: '',
    };

    emitStateToSession(sessionId);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, probe: session.probeState }));
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
});

function emitStateToSession(sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session) {
    console.log(`[MockCncjs] emitStateToSession: session not found for ${sessionId}`);
    return;
  }

  const { x, y, z } = session.position;
  console.log(`[MockCncjs] emitting state for ${sessionId}: pos=[${x}, ${y}, ${z}]`);

  try {
    // Use Socket.io rooms to broadcast to all sockets in this session
    io.to(sessionId).emit('controller:state', 'grbl', {
      status: {
        activeState: 'Idle',
        mpos: [x, y, z],
        wpos: [x, y, z],
      },
      probe: session.probeState || '',
    });
    console.log(`[MockCncjs] emit successful for ${sessionId}`);
  } catch (error) {
    console.log(`[MockCncjs] emit error for ${sessionId}: ${error}`);
  }
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

  // Get or create session
  let session = sessions.get(sessionId);
  if (!session) {
    console.log(`[MockCncjs] creating new session for ${sessionId}`);
    session = { position: { x: 0, y: 0, z: 0 } };
    sessions.set(sessionId, session);
  } else {
    console.log(`[MockCncjs] reusing existing session for ${sessionId}, position=[${session.position.x}, ${session.position.y}, ${session.position.z}]`);
  }

  // Join socket to a room named after the sessionId
  socket.join(sessionId);
  console.log(`[MockCncjs] socket ${socket.id} joined room ${sessionId}`);

  // Send initial controller state
  const { x, y, z } = session.position;
  socket.emit('controller:state', 'grbl', {
    status: {
      activeState: 'Idle',
      mpos: [x, y, z],
      wpos: [x, y, z],
    },
    probe: session.probeState || '',
  });

  socket.on('disconnect', (reason) => {
    console.log(`[MockCncjs] client disconnected: ${socket.id}, session: ${sessionId}, reason: ${reason}`);
    // Session state is preserved, socket will automatically leave the room
  });

  socket.on('command', (_port: string, cmd: string) => {
    if (cmd === '?') {
      const s = sessions.get(sessionId);
      if (s) {
        const { x, y, z } = s.position;
        // Broadcast to the room instead of just this socket
        io.to(sessionId).emit('controller:state', 'grbl', {
          status: {
            activeState: 'Idle',
            mpos: [x, y, z],
            wpos: [x, y, z],
          },
          probe: s.probeState || '',
        });
      }
    }
  });
});

// Note: Sessions are now automatically managed by Socket.io rooms.
// Sessions persist to preserve position state across reconnections.
// For a production server, you could add memory limits or TTL-based cleanup.

httpServer.listen(PORT, () => {
  console.log(`[MockCncjs] Mock CNCjs server listening on port ${PORT}`);
  console.log(`[MockCncjs] Each browser connection uses a unique sessionId for isolation`);
});

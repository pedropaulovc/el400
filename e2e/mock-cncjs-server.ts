import { createServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { parse } from 'url';

const PORT = 8765;

// State per session (sessionId -> { socket, position })
const sessions = new Map<string, { socket: Socket | null; position: { x: number; y: number; z: number } }>();

const httpServer = createServer((req, res) => {
  const { pathname, query } = parse(req.url || '', true);
  const sessionId = query.sessionId as string | undefined;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
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
          session = { socket: null, position: { x: 0, y: 0, z: 0 } };
          sessions.set(sessionId, session);
        }

        session.position[axis.toLowerCase() as 'x' | 'y' | 'z'] = value;
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

  // 404 for unknown routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

function emitStateToSession(sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session?.socket) return;

  const { x, y, z } = session.position;
  session.socket.emit('controller:state', 'grbl', {
    status: {
      activeState: 'Idle',
      mpos: [x, y, z],
      wpos: [x, y, z],
    },
  });
}

io.on('connection', (socket) => {
  // Extract sessionId from query
  const sessionId = socket.handshake.query.sessionId as string | undefined;

  if (!sessionId) {
    console.log(`[MockCncjs] client connected without sessionId, disconnecting`);
    socket.disconnect();
    return;
  }

  console.log(`[MockCncjs] client connected: ${socket.id}, session: ${sessionId}`);

  // Get or create session
  let session = sessions.get(sessionId);
  if (!session) {
    session = { socket: null, position: { x: 0, y: 0, z: 0 } };
    sessions.set(sessionId, session);
  }
  session.socket = socket;

  // Send initial controller state
  const { x, y, z } = session.position;
  socket.emit('controller:state', 'grbl', {
    status: {
      activeState: 'Idle',
      mpos: [x, y, z],
      wpos: [x, y, z],
    },
    parserstate: {
      modal: {
        units: 'G21',
      },
    },
  });

  socket.on('disconnect', (reason) => {
    console.log(`[MockCncjs] client disconnected: ${socket.id}, session: ${sessionId}, reason: ${reason}`);
    // Clear socket reference but keep position state (for reconnects)
    const s = sessions.get(sessionId);
    if (s && s.socket === socket) {
      s.socket = null;
    }
  });

  socket.on('command', (_port: string, cmd: string) => {
    if (cmd === '?') {
      const s = sessions.get(sessionId);
      if (s) {
        const { x, y, z } = s.position;
        socket.emit('controller:state', 'grbl', {
          status: {
            activeState: 'Idle',
            mpos: [x, y, z],
            wpos: [x, y, z],
          },
        });
      }
    }
  });
});

// Clean up stale sessions periodically (sessions without sockets for > 1 min)
setInterval(() => {
  const staleThreshold = 60000;
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    if (!session.socket) {
      // Mark for deletion on next check if still no socket
      if (!(session as { staleAt?: number }).staleAt) {
        (session as { staleAt?: number }).staleAt = now;
      } else if (now - (session as { staleAt?: number }).staleAt! > staleThreshold) {
        sessions.delete(sessionId);
        console.log(`[MockCncjs] cleaned up stale session: ${sessionId}`);
      }
    } else {
      delete (session as { staleAt?: number }).staleAt;
    }
  }
}, 30000);

httpServer.listen(PORT, () => {
  console.log(`[MockCncjs] Mock CNCjs server listening on port ${PORT}`);
  console.log(`[MockCncjs] Each browser connection uses a unique sessionId for isolation`);
});

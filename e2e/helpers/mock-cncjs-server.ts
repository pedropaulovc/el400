import { createServer, Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

/**
 * Mock CNCjs server for E2E testing.
 * Simulates the socket.io interface that CNCjs provides.
 */
export class MockCncjsServer {
  private httpServer: HttpServer;
  private io: SocketIOServer;
  private port: number;

  constructor(port: number = 8000) {
    this.port = port;
    this.httpServer = createServer();
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.io.on('connection', (socket) => {
      // Send initial controller state (simulating Grbl)
      socket.emit('controller:state', 'grbl', {
        status: {
          activeState: 'Idle',
          mpos: { x: 0, y: 0, z: 0 },
          wpos: { x: 0, y: 0, z: 0 },
        },
        parserstate: {
          modal: {
            units: 'G21', // mm
          },
        },
      });

      // Handle controller commands
      socket.on('command', (_port: string, cmd: string) => {
        // Acknowledge commands silently
        if (cmd === '?') {
          // Status query - send current state
          socket.emit('controller:state', 'grbl', {
            status: {
              activeState: 'Idle',
              mpos: { x: 0, y: 0, z: 0 },
              wpos: { x: 0, y: 0, z: 0 },
            },
          });
        }
      });
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.httpServer.listen(this.port, () => {
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.io.close(() => {
        this.httpServer.close(() => {
          resolve();
        });
      });
    });
  }

  getPort(): number {
    return this.port;
  }

  /**
   * Emit a controller state update to all connected clients.
   */
  emitState(x: number, y: number, z: number): void {
    this.io.emit('controller:state', 'grbl', {
      status: {
        activeState: 'Idle',
        mpos: { x, y, z },
        wpos: { x, y, z },
      },
    });
  }
}

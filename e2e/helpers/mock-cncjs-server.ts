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
  private currentPosition = { x: 0, y: 0, z: 0 };

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
      // GRBL format uses arrays for mpos/wpos: [x, y, z]
      const { x, y, z } = this.currentPosition;
      socket.emit('controller:state', 'grbl', {
        status: {
          activeState: 'Idle',
          mpos: [x, y, z],
          wpos: [x, y, z],
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
          const { x, y, z } = this.currentPosition;
          socket.emit('controller:state', 'grbl', {
            status: {
              activeState: 'Idle',
              mpos: [x, y, z],
              wpos: [x, y, z],
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
   * Uses GRBL format with arrays for mpos/wpos.
   */
  emitState(x: number, y: number, z: number): void {
    this.currentPosition = { x, y, z };
    this.io.emit('controller:state', 'grbl', {
      status: {
        activeState: 'Idle',
        mpos: [x, y, z],
        wpos: [x, y, z],
      },
    });
  }

  /**
   * Simulate encoder movement for a specific axis.
   * Updates the internal position and emits the new state to all clients.
   */
  simulateEncoderMove(axis: 'X' | 'Y' | 'Z', value: number): void {
    const newPosition = { ...this.currentPosition };
    newPosition[axis.toLowerCase() as 'x' | 'y' | 'z'] = value;
    this.emitState(newPosition.x, newPosition.y, newPosition.z);
  }

  /**
   * Get the current position.
   */
  getPosition(): { x: number; y: number; z: number } {
    return { ...this.currentPosition };
  }
}

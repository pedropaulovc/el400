/**
 * Minimal type declarations for the `socket.io-client-v2` npm alias
 * (socket.io-client@2.x), used only by the CNCjs adapter. CNCjs 1.x servers
 * speak Engine.IO protocol 3, which requires a v2 client.
 */
declare module 'socket.io-client-v2' {
  interface SocketV2 {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on(event: string, cb: (...args: any[]) => void): SocketV2;
    emit(event: string, ...args: unknown[]): SocketV2;
    disconnect(): SocketV2;
    connected: boolean;
  }

  interface ConnectOpts {
    query?: Record<string, string>;
    reconnection?: boolean;
    reconnectionAttempts?: number;
    reconnectionDelay?: number;
    transports?: string[];
  }

  function io(url: string, opts?: ConnectOpts): SocketV2;
  export default io;
}

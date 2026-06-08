/**
 * Socket factory for CNCjs connections.
 *
 * CNCjs 1.x servers run socket.io v2 (Engine.IO protocol 3). The modern
 * socket.io-client v4 speaks Engine.IO protocol 4 and cannot complete the
 * handshake against a v2 server - it silently falls into a reconnect loop.
 * This module wraps a v2 client (installed under the `socket.io-client-v2`
 * npm alias) behind a small interface so the adapter stays testable and the
 * rest of the codebase keeps using modern packages.
 */

import ioV2 from 'socket.io-client-v2';

/** Minimal surface of a socket.io v2 client socket used by CncjsMillAdapter. */
export interface CncjsSocket {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, cb: (...args: any[]) => void): CncjsSocket;
  emit(event: string, ...args: unknown[]): CncjsSocket;
  disconnect(): CncjsSocket;
}

export interface CncjsSocketOptions {
  query?: Record<string, string>;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  transports?: string[];
}

/** Creates a socket.io v2 connection to a CNCjs 1.x server. */
export function io(url: string, opts?: CncjsSocketOptions): CncjsSocket {
  return ioV2(url, opts);
}

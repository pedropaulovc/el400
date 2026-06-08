import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the underlying socket.io v2 client (the npm alias) so we can assert
// that the wrapper delegates to it. Note: this file intentionally does NOT
// mock './cncjsSocket' (unlike CncjsMillAdapter.test.ts), so the real wrapper
// executes and is covered.
const mockSocket = { on: vi.fn(), emit: vi.fn(), disconnect: vi.fn(), connected: false };
const mockIoV2 = vi.fn(() => mockSocket);
vi.mock('socket.io-client-v2', () => ({ default: mockIoV2 }));

describe('cncjsSocket', () => {
  beforeEach(() => {
    mockIoV2.mockClear();
  });

  it('delegates to the socket.io v2 client with the given url and options', async () => {
    const { io } = await import('./cncjsSocket');
    const opts = {
      query: { token: 'jwt' },
      reconnection: true,
      transports: ['websocket', 'polling'],
    };

    const socket = io('http://localhost:8000', opts);

    expect(mockIoV2).toHaveBeenCalledTimes(1);
    expect(mockIoV2).toHaveBeenCalledWith('http://localhost:8000', opts);
    expect(socket).toBe(mockSocket);
  });

  it('forwards calls with no options', async () => {
    const { io } = await import('./cncjsSocket');
    io('https://example.com:8000');
    expect(mockIoV2).toHaveBeenCalledWith('https://example.com:8000', undefined);
  });
});

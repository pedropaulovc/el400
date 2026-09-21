import { create } from 'zustand';

/** Web Serial is optional and requires a secure context and a user gesture. */
interface SerialPortLike {
  open(options: { baudRate: number; dataBits: 8; stopBits: 1; parity: 'none'; flowControl: 'none' }): Promise<void>;
  close(): Promise<void>;
  writable: WritableStream<Uint8Array> | null;
  addEventListener(type: 'disconnect', listener: () => void): void;
}
interface SerialNavigator { serial?: { requestPort(): Promise<SerialPortLike> } }
type Connection = 'disconnected' | 'virtual' | 'physical';
interface AuxiliaryTransportState {
  connection: Connection;
  failure: 'off' | 'on';
  terminal: string[];
  error: string | null;
  connectVirtual: () => Promise<void>;
  connectPhysical: () => Promise<void>;
  disconnect: () => Promise<void>;
  setFailure: (failure: 'off' | 'on') => void;
  clearTerminal: () => void;
}
let port: SerialPortLike | null = null;
let writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
let pending = Promise.resolve();
let generation = 0;
const encoder = new TextEncoder();

export const useAuxiliaryTransport = create<AuxiliaryTransportState>((set, get) => ({
  connection: 'disconnected', failure: 'off', terminal: [], error: null,
  disconnect: async () => {
    generation++;
    set({ connection: 'disconnected' });
    await writer?.abort(new Error('Serial connection closed.')).catch(() => undefined);
    await pending.catch(() => undefined);
    writer?.releaseLock();
    writer = null;
    const oldPort = port;
    port = null;
    if (oldPort) await oldPort.close().catch(() => undefined);
  },
  connectVirtual: async () => {
    await get().disconnect();
    set({ connection: 'virtual', error: null });
  },
  connectPhysical: async () => {
    try {
      const serial = (navigator as unknown as SerialNavigator).serial;
      if (!serial) throw new Error('Web Serial is unavailable in this browser. Use the explicitly virtual terminal or a supported secure browser.');
      // Request permission before the first await, while the click gesture is active.
      const selected = await serial.requestPort();
      await get().disconnect();
      await selected.open({ baudRate: 9600, dataBits: 8, stopBits: 1, parity: 'none', flowControl: 'none' });
      if (!selected.writable) {
        await selected.close();
        throw new Error('The selected serial port has no writable stream.');
      }
      port = selected;
      writer = selected.writable.getWriter();
      selected.addEventListener('disconnect', () => {
        if (port === selected) {
          generation++;
          set({ connection: 'disconnected', error: 'Serial device disconnected.' });
          void writer?.abort(new Error('Serial device disconnected.')).catch(() => undefined);
        }
      });
      set({ connection: 'physical', error: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error) });
    }
  },
  setFailure: (failure) => { set({ failure }); },
  clearTerminal: () => { set({ terminal: [] }); },
}));

/** A resolved virtual write means delivery to the visible virtual terminal, never a physical pin. */
export function transmitSerial(payload: string): Promise<void> {
  const requestedGeneration = generation;
  const send = pending.catch(() => undefined).then(async () => {
    const state = useAuxiliaryTransport.getState();
    if (requestedGeneration !== generation || state.connection === 'disconnected') throw new Error('No serial receiver connected.');
    if (state.failure === 'on' && state.connection === 'virtual') throw new Error('Virtual receiver communication failure.');
    if (state.connection === 'physical') {
      if (!writer) throw new Error('Serial device unavailable.');
      // CRLF separates terminal records; the payload itself is the manual §10.3 record.
      await writer.write(encoder.encode(`${payload}\r\n`));
    }
    useAuxiliaryTransport.setState((current) => ({ terminal: [...current.terminal.slice(-99), payload], error: null }));
  });
  pending = send;
  return send.catch((error: unknown) => {
    useAuxiliaryTransport.setState({ error: error instanceof Error ? error.message : String(error) });
    throw error;
  });
}

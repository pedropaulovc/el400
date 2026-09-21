import { create } from 'zustand';

/** Web Serial is optional and requires a secure context and a user gesture. */
interface SerialPortLike {
  open(options: { baudRate: number; dataBits: 8; stopBits: 1; parity: 'none'; flowControl: 'none' }): Promise<void>;
  close(): Promise<void>;
  writable: WritableStream<Uint8Array> | null;
  addEventListener(type: 'disconnect', listener: () => void): void;
  removeEventListener(type: 'disconnect', listener: () => void): void;
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
let disconnectListener: (() => void) | null = null;
let pending = Promise.resolve();
// Browsers reuse one SerialPort object per device. Keep its open/close work in
// order; permission prompts remain outside this tail so disconnect never waits
// for a chooser that the operator has not completed.
let resourceTail = Promise.resolve();
let generation = 0;
const encoder = new TextEncoder();
interface DetachedConnection {
  port: SerialPortLike | null;
  writer: WritableStreamDefaultWriter<Uint8Array> | null;
  disconnectListener: (() => void) | null;
  pending: Promise<void>;
}

function detachConnection(): DetachedConnection {
  const detached = { port, writer, disconnectListener, pending };
  if (port && disconnectListener) port.removeEventListener('disconnect', disconnectListener);
  port = null;
  writer = null;
  disconnectListener = null;
  return detached;
}

async function cleanupConnection(detached: DetachedConnection): Promise<void> {
  await detached.writer?.abort(new Error('Serial connection closed.')).catch(() => undefined);
  await detached.pending.catch(() => undefined);
  try {
    detached.writer?.releaseLock();
  } catch {
    // Cleanup is best-effort; still attempt to close the underlying port.
  }
  if (detached.port) await detached.port.close().catch(() => undefined);
}

function queueResourceOperation<T>(operation: () => Promise<T>): Promise<T> {
  const result = resourceTail.then(operation);
  resourceTail = result.then(() => undefined, () => undefined);
  return result;
}

export const useAuxiliaryTransport = create<AuxiliaryTransportState>((set) => ({
  connection: 'disconnected', failure: 'off', terminal: [], error: null,
  disconnect: async () => {
    generation++;
    const detached = detachConnection();
    set({ connection: 'disconnected' });
    await queueResourceOperation(() => cleanupConnection(detached));
  },
  connectVirtual: async () => {
    const operation = ++generation;
    const detached = detachConnection();
    set({ connection: 'disconnected' });
    await queueResourceOperation(() => cleanupConnection(detached));
    if (operation === generation) set({ connection: 'virtual', error: null });
  },
  connectPhysical: async () => {
    const operation = ++generation;
    const detached = detachConnection();
    set({ connection: 'disconnected' });
    const teardown = queueResourceOperation(() => cleanupConnection(detached));

    try {
      const serial = (navigator as unknown as SerialNavigator).serial;
      if (!serial) throw new Error('Web Serial is unavailable in this browser. Use the explicitly virtual terminal or a supported secure browser.');

      // Invoke the permission prompt before the first await, while the click
      // gesture is active. Permission never occupies the resource queue, so a
      // disconnect can finish while this prompt is still pending.
      const selection = serial.requestPort();
      void selection.catch(() => undefined);
      await teardown;
      if (operation !== generation) return;

      const selected = await selection;
      // A selected but unopened port has no resource for us to close.
      if (operation !== generation) return;

      await queueResourceOperation(async () => {
        if (operation !== generation) return;
        let opened = false;
        let selectedWriter: WritableStreamDefaultWriter<Uint8Array> | null = null;
        try {
          await selected.open({ baudRate: 9600, dataBits: 8, stopBits: 1, parity: 'none', flowControl: 'none' });
          opened = true;
          if (operation !== generation) {
            await cleanupConnection({
              port: selected, writer: null, disconnectListener: null, pending: Promise.resolve(),
            });
            return;
          }
          if (!selected.writable) {
            throw new Error('The selected serial port has no writable stream.');
          }

          // getWriter() is synchronous but can throw when the stream is already
          // locked. The catch path below still closes the successfully opened port.
          selectedWriter = selected.writable.getWriter();
          if (operation !== generation) {
            await cleanupConnection({
              port: selected, writer: selectedWriter, disconnectListener: null, pending: Promise.resolve(),
            });
            return;
          }

          const onDisconnect = () => {
            if (port !== selected) return;
            generation++;
            const disconnected = detachConnection();
            set({ connection: 'disconnected', error: 'Serial device disconnected.' });
            void queueResourceOperation(() => cleanupConnection(disconnected));
          };
          selected.addEventListener('disconnect', onDisconnect);
          if (operation !== generation) {
            selected.removeEventListener('disconnect', onDisconnect);
            await cleanupConnection({
              port: selected, writer: selectedWriter, disconnectListener: null, pending: Promise.resolve(),
            });
            return;
          }

          port = selected;
          writer = selectedWriter;
          disconnectListener = onDisconnect;
          set({ connection: 'physical', error: null });
        } catch (error) {
          if (opened) {
            await cleanupConnection({
              port: selected, writer: selectedWriter, disconnectListener: null, pending: Promise.resolve(),
            });
          }
          throw error;
        }
      });
    } catch (error) {
      await teardown;
      if (operation === generation) {
        set({
          connection: 'disconnected',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  },
  setFailure: (failure) => { set({ failure }); },
  clearTerminal: () => { set({ terminal: [] }); },
}));

/** A resolved virtual write means delivery to the visible virtual terminal, never a physical pin. */
export function transmitSerial(payload: string): Promise<void> {
  const requestedGeneration = generation;
  const send = pending.catch(() => undefined).then(async () => {
    let state = useAuxiliaryTransport.getState();
    if (requestedGeneration !== generation || state.connection === 'disconnected') throw new Error('No serial receiver connected.');
    if (state.failure === 'on' && state.connection === 'virtual') throw new Error('Virtual receiver communication failure.');
    if (state.connection === 'physical') {
      const activeWriter = writer;
      if (!activeWriter) throw new Error('Serial device unavailable.');
      // CRLF separates terminal records; the payload itself is the manual §10.3 record.
      await activeWriter.write(encoder.encode(`${payload}\r\n`));
      state = useAuxiliaryTransport.getState();
      if (requestedGeneration !== generation || state.connection !== 'physical' || writer !== activeWriter) {
        throw new Error('No serial receiver connected.');
      }
    }
    useAuxiliaryTransport.setState((current) => ({ terminal: [...current.terminal.slice(-99), payload], error: null }));
  });
  pending = send;
  return send.catch((error: unknown) => {
    if (requestedGeneration === generation) {
      useAuxiliaryTransport.setState({ error: error instanceof Error ? error.message : String(error) });
    }
    throw error;
  });
}

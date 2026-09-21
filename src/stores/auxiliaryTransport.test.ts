import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { transmitSerial, useAuxiliaryTransport } from './auxiliaryTransport';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: Deferred<T>['resolve'];
  let reject!: Deferred<T>['reject'];
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

interface FakeSerialPort {
  open: (options: unknown) => Promise<void>;
  close: () => Promise<void>;
  writable: WritableStream<Uint8Array> | null;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
}

interface FakePortOptions {
  open?: () => Promise<void>;
  close?: () => Promise<void>;
  writable?: WritableStream<Uint8Array>;
}

function fakePort(options: FakePortOptions = {}) {
  const writes: string[] = [];
  const write = vi.fn((chunk: Uint8Array) => {
    writes.push(new TextDecoder().decode(chunk));
  });
  const listeners = new Set<() => void>();
  let state: 'closed' | 'opening' | 'open' | 'closing' = 'closed';
  let writable: WritableStream<Uint8Array> | null = options.writable ?? null;
  const port: FakeSerialPort = {
    open: vi.fn(async () => {
      if (state !== 'closed') throw new Error(`InvalidStateError: port is ${state}.`);
      state = 'opening';
      try {
        await options.open?.();
        writable = options.writable ?? new WritableStream<Uint8Array>({ write });
        state = 'open';
      } catch (error) {
        state = 'closed';
        throw error;
      }
    }),
    close: vi.fn(async () => {
      if (state !== 'open') throw new Error(`InvalidStateError: port is ${state}.`);
      state = 'closing';
      try {
        await options.close?.();
        state = 'closed';
      } catch (error) {
        state = 'open';
        throw error;
      }
    }),
    get writable() {
      return writable;
    },
    addEventListener: vi.fn((_type: string, listener: () => void) => {
      listeners.add(listener);
    }),
    removeEventListener: vi.fn((_type: string, listener: () => void) => {
      listeners.delete(listener);
    }),
  };
  return { port, write, writes, listeners };
}

const originalSerial = Object.getOwnPropertyDescriptor(navigator, 'serial');

function installSerial(requestPort: () => Promise<FakeSerialPort>) {
  const request = vi.fn(requestPort);
  Object.defineProperty(navigator, 'serial', {
    configurable: true,
    value: { requestPort: request },
  });
  return request;
}

describe('auxiliary serial lifecycle', () => {
  beforeEach(async () => {
    await useAuxiliaryTransport.getState().disconnect();
    useAuxiliaryTransport.setState({
      connection: 'disconnected',
      failure: 'off',
      terminal: [],
      error: null,
    });
    Reflect.deleteProperty(navigator, 'serial');
  });

  afterEach(async () => {
    await useAuxiliaryTransport.getState().disconnect();
    vi.useRealTimers();
  });

  afterAll(() => {
    if (originalSerial) Object.defineProperty(navigator, 'serial', originalSerial);
    else Reflect.deleteProperty(navigator, 'serial');
  });

  it('opens an ordinary physical connection and writes CRLF records through its stream', async () => {
    const device = fakePort();
    installSerial(async () => device.port);

    await useAuxiliaryTransport.getState().connectPhysical();
    expect(device.listeners.size).toBe(1);
    await transmitSerial('X+001.2500');

    expect(useAuxiliaryTransport.getState()).toMatchObject({
      connection: 'physical',
      terminal: ['X+001.2500'],
      error: null,
    });
    expect(device.write).toHaveBeenCalledTimes(1);
    expect(device.writes).toEqual(['X+001.2500\r\n']);

    await useAuxiliaryTransport.getState().disconnect();
    expect(device.port.close).toHaveBeenCalledTimes(1);
    expect(device.listeners.size).toBe(0);
    expect(device.port.removeEventListener).toHaveBeenCalledTimes(1);
  });

  it('does not resurrect or close an unopened port selected after explicit disconnect', async () => {
    const permission = deferred<FakeSerialPort>();
    const device = fakePort();
    installSerial(() => permission.promise);

    const connecting = useAuxiliaryTransport.getState().connectPhysical();
    await useAuxiliaryTransport.getState().disconnect();
    permission.resolve(device.port);
    await connecting;

    expect(useAuxiliaryTransport.getState().connection).toBe('disconnected');
    expect(device.port.open).not.toHaveBeenCalled();
    expect(device.port.close).not.toHaveBeenCalled();
  });

  it('closes a port whose open completes after explicit disconnect', async () => {
    const openStarted = deferred<undefined>();
    const opening = deferred<undefined>();
    const device = fakePort({
      open: () => {
        openStarted.resolve(undefined);
        return opening.promise;
      },
    });
    installSerial(async () => device.port);

    const connecting = useAuxiliaryTransport.getState().connectPhysical();
    await openStarted.promise;
    const disconnecting = useAuxiliaryTransport.getState().disconnect();
    opening.resolve(undefined);
    await Promise.all([connecting, disconnecting]);

    expect(useAuxiliaryTransport.getState().connection).toBe('disconnected');
    expect(device.port.close).toHaveBeenCalledTimes(1);
  });

  it('does not settle a newer same-port connect until that port is usable', async () => {
    vi.useFakeTimers();
    const openStarted = deferred<undefined>();
    const opening = deferred<undefined>();
    const device = fakePort({
      open: () => {
        openStarted.resolve(undefined);
        return opening.promise;
      },
    });
    installSerial(async () => device.port);

    const firstConnection = useAuxiliaryTransport.getState().connectPhysical();
    await openStarted.promise;
    let stateWhenSecondSettled: { connection: string; error: string | null } | null = null;
    const secondConnection = useAuxiliaryTransport.getState().connectPhysical().then(() => {
      const { connection, error } = useAuxiliaryTransport.getState();
      stateWhenSecondSettled = { connection, error };
    });
    // Let the newer operation reach any un-serialized open attempt before the
    // first open is released. A task boundary drains the whole microtask queue.
    const nextTask = new Promise<void>((resolve) => { setTimeout(resolve, 0); });
    await vi.advanceTimersByTimeAsync(0);
    await nextTask;
    opening.resolve(undefined);
    await Promise.all([firstConnection, secondConnection]);

    expect(stateWhenSecondSettled).toEqual({ connection: 'physical', error: null });
    await transmitSerial('same-port-ready');
    expect(device.writes).toEqual(['same-port-ready\r\n']);
  });

  it('waits for an already-detached port teardown before reopening the same port', async () => {
    const closeStarted = deferred<undefined>();
    const closing = deferred<undefined>();
    const device = fakePort({
      close: () => {
        closeStarted.resolve(undefined);
        return closing.promise;
      },
    });
    installSerial(async () => device.port);
    await useAuxiliaryTransport.getState().connectPhysical();

    const disconnecting = useAuxiliaryTransport.getState().disconnect();
    await closeStarted.promise;
    const reconnecting = useAuxiliaryTransport.getState().connectPhysical();
    closing.resolve(undefined);
    await Promise.all([disconnecting, reconnecting]);

    expect(useAuxiliaryTransport.getState()).toMatchObject({ connection: 'physical', error: null });
    expect(device.port.open).toHaveBeenCalledTimes(2);
    expect(device.port.close).toHaveBeenCalledTimes(1);
    expect(device.listeners.size).toBe(1);
    expect(device.port.removeEventListener).toHaveBeenCalledTimes(1);
  });

  it('keeps the newer physical connection when an older permission prompt resolves', async () => {
    const firstPermission = deferred<FakeSerialPort>();
    const firstDevice = fakePort();
    const secondDevice = fakePort();
    const requestPort = installSerial(() => firstPermission.promise);
    requestPort.mockImplementationOnce(() => firstPermission.promise);
    requestPort.mockImplementationOnce(async () => secondDevice.port);

    const firstConnection = useAuxiliaryTransport.getState().connectPhysical();
    const secondConnection = useAuxiliaryTransport.getState().connectPhysical();
    await secondConnection;
    firstPermission.resolve(firstDevice.port);
    await firstConnection;

    expect(useAuxiliaryTransport.getState()).toMatchObject({ connection: 'physical', error: null });
    expect(secondDevice.port.close).not.toHaveBeenCalled();
    expect(firstDevice.port.open).not.toHaveBeenCalled();
    expect(firstDevice.port.close).not.toHaveBeenCalled();
  });

  it('closes a stale opened port before resolving a newer virtual connection', async () => {
    vi.useFakeTimers();
    const openStarted = deferred<undefined>();
    const opening = deferred<undefined>();
    const device = fakePort({
      open: () => {
        openStarted.resolve(undefined);
        return opening.promise;
      },
    });
    installSerial(async () => device.port);

    const physicalConnection = useAuxiliaryTransport.getState().connectPhysical();
    await openStarted.promise;
    const virtualConnection = useAuxiliaryTransport.getState().connectVirtual();
    // Give an implementation that detaches only module globals a full turn to
    // resolve virtual while the selected port still lives in connect locals.
    const nextTask = new Promise<void>((resolve) => { setTimeout(resolve, 0); });
    await vi.advanceTimersByTimeAsync(0);
    await nextTask;
    opening.resolve(undefined);
    await Promise.all([physicalConnection, virtualConnection]);

    expect(useAuxiliaryTransport.getState()).toMatchObject({ connection: 'virtual', error: null });
    expect(device.listeners.size).toBe(0);
    await transmitSerial('virtual-ready');
    expect(device.write).not.toHaveBeenCalled();
    expect(useAuxiliaryTransport.getState().terminal).toEqual(['virtual-ready']);
  });

  it('does not let a stale open failure overwrite a settled virtual connection', async () => {
    vi.useFakeTimers();
    const openStarted = deferred<undefined>();
    const opening = deferred<undefined>();
    const device = fakePort({
      open: () => {
        openStarted.resolve(undefined);
        return opening.promise;
      },
    });
    installSerial(async () => device.port);

    const physicalConnection = useAuxiliaryTransport.getState().connectPhysical();
    await openStarted.promise;
    const virtualConnection = useAuxiliaryTransport.getState().connectVirtual();
    // On the historical implementation virtual settles during this task while
    // the older open remains unowned; its later rejection must not mutate it.
    const nextTask = new Promise<void>((resolve) => { setTimeout(resolve, 0); });
    await vi.advanceTimersByTimeAsync(0);
    await nextTask;
    opening.reject(new Error('Old port failed to open.'));
    await Promise.all([physicalConnection, virtualConnection]);

    expect(useAuxiliaryTransport.getState()).toMatchObject({ connection: 'virtual', error: null });
  });

  it('closes a successfully opened port when writer acquisition fails', async () => {
    const writable = new WritableStream<Uint8Array>();
    const heldWriter = writable.getWriter();
    const device = fakePort({ writable });
    installSerial(async () => device.port);

    await useAuxiliaryTransport.getState().connectPhysical();

    expect(useAuxiliaryTransport.getState().connection).toBe('disconnected');
    expect(useAuxiliaryTransport.getState().error).not.toBeNull();
    expect(device.port.close).toHaveBeenCalledTimes(1);
    heldWriter.releaseLock();
  });
});

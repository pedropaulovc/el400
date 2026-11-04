import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CncjsMillAdapter } from '../adapters/CncjsMillAdapter';
import { NoOpMillAdapter } from '../adapters/NoOpMillAdapter';
import { createDefaultMillState, type MillPosition, type MillUnit } from '../types/millState';
import { DEFAULT_NON_VOLATILE_MEMORY } from '../types/nonVolatileMemory';
import { INITIAL_VOLATILE_MEMORY_STATE } from '../types/volatileMemory';
import { INITIAL_PRESET_DATA, type DROEventPayload, type PresetData } from './dro/droStateMachine';
import { INITIAL_DISPLAY_STATE } from './dro/utils/displayComputation';
import { initializeDROMillConnection, useDROStore } from './droStore';
import { initializeMillStore, setDRODispatch, useMillStore } from './millStore';
import { useSettingsStore } from './settingsStore';

const socket = vi.hoisted(() => ({
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
  connected: true,
}));

vi.mock('../adapters/cncjsSocket', () => ({ io: vi.fn(() => socket) }));

function receive(event: string, ...args: unknown[]): void {
  const handler = socket.on.mock.calls.find(([name]) => name === event)?.[1] as
    ((...values: unknown[]) => void) | undefined;
  expect(handler).toBeDefined();
  handler?.(...args);
}

function report(
  unit: MillUnit,
  x = 25.4,
  y = 50.8,
  z = 76.2,
  work: MillPosition = { x, y, z }
): void {
  // Native reports remain millimetres ($13=0), independently of G20/G21.
  receive('serialport:read', `<Idle|MPos:${String(x)},${String(y)},${String(z)}|WCO:${String(x - work.x)},${String(y - work.y)},${String(z - work.z)}>`);
  receive('controller:state', 'Grbl', {
    parserstate: { modal: { units: unit === 'mm' ? 'G21' : 'G20', wcs: 'G54' } },
    status: { activeState: 'Idle', mpos: { x, y, z }, wpos: work },
  });
}

function unitCommands(): unknown[][] {
  return socket.emit.mock.calls.filter((call) =>
    call[0] === 'command' && call[2] === 'gcode' &&
    typeof call[3] === 'string' && /^G2[01]$/.test(call[3])
  );
}

function workCommands(): unknown[][] {
  return socket.emit.mock.calls.filter((call) =>
    call.some((value) => typeof value === 'string' && /\bG10\s+L20\b/.test(value))
  );
}

function advanceWorkQueue(): void {
  const marker = [...socket.emit.mock.calls].reverse().find((call) =>
    call[0] === 'command' && call[3] === '$G'
  );
  expect(marker?.[4]).toEqual({ el400WorkRequest: expect.any(String) });
  const previousQueries = socket.emit.mock.calls.filter((call) => call[0] === 'write' && call[2] === '?').length;
  receive('serialport:write', '$G\n', marker?.[4]);
  expect(socket.emit.mock.calls.filter((call) => call[0] === 'write' && call[2] === '?')).toHaveLength(previousQueries + 1);
}

function dispatch(event: DROEventPayload): void {
  useDROStore.getState().dispatch(event);
}

function typeNumber(value: string): void {
  const keys: Record<string, DROEventPayload> = {
    '0': { eventName: 'KEY_0' },
    '1': { eventName: 'KEY_1' },
    '2': { eventName: 'KEY_2_DOWN' },
    '3': { eventName: 'KEY_3' },
    '4': { eventName: 'KEY_4_LEFT' },
    '5': { eventName: 'KEY_5' },
    '6': { eventName: 'KEY_6_RIGHT' },
    '7': { eventName: 'KEY_7' },
    '8': { eventName: 'KEY_8_UP' },
    '9': { eventName: 'KEY_9' },
    '.': { eventName: 'KEY_DECIMAL' },
  };
  for (const digit of value) {
    const event = keys[digit];
    if (!event) throw new Error(`Unsupported test keypad character: ${digit}`);
    dispatch(event);
  }
}

function enterLinearPitch(): void {
  dispatch({ eventName: 'BTN_FUNCTION' });
  dispatch({ eventName: 'KEY_6_RIGHT' });
  dispatch({ eventName: 'KEY_6_RIGHT' });
  dispatch({ eventName: 'KEY_6_RIGHT' });
  dispatch({ eventName: 'KEY_ENTER' });
  expect(useDROStore.getState().stateName).toBe('linear-bolt-hole-axis');
  dispatch({ eventName: 'BTN_SELECT_X' });
  if (useMillStore.getState().millState.workPositionControl !== undefined) {
    expect(useDROStore.getState().stateName).toBe('linear-bolt-hole-axis');
    const { position, workPosition, unitControl } = useMillStore.getState().millState;
    advanceWorkQueue();
    report(unitControl?.confirmed ?? 'mm', position.x, position.y, position.z, {
      ...workPosition!, x: 0,
    });
  }
  expect(useDROStore.getState().stateName).toBe('linear-bolt-hole-pitch');
}

describe('CNCjs confirmed units through mill and DRO stores', () => {
  let cleanup: (() => void) | undefined;

  beforeEach(async () => {
    vi.clearAllMocks();
    useSettingsStore.setState({
      nvMem: { ...DEFAULT_NON_VOLATILE_MEMORY, defaultUnit: 'mm' },
    });
    useDROStore.getState()._setState({
      stateName: 'idle',
      stateData: { stateDataType: 'none' },
      vMem: { ...INITIAL_VOLATILE_MEMORY_STATE },
      display: INITIAL_DISPLAY_STATE,
    });
    useMillStore.setState({
      connection: new NoOpMillAdapter(),
      millState: createDefaultMillState('noop'),
      error: null,
      isConnecting: false,
    });
    initializeDROMillConnection();
    const initialized = initializeMillStore(new CncjsMillAdapter({ host: '', port: 8000 }));
    receive('connect');
    receive('serialport:list', [{ port: '/dev/grbl', inuse: true }]);
    const opened = socket.emit.mock.calls.find(([name]) => name === 'open')?.[3] as
      ((error: unknown) => void) | undefined;
    expect(opened).toBeDefined();
    opened?.(null);
    cleanup = await initialized;
    receive('workflow:state', 'idle');
    // The adapter requests a report boundary only after both workflow and GRBL
    // status establish Idle. Firmware replies must follow that request.
    receive('controller:state', 'Grbl', {
      parserstate: { modal: { units: 'G21', wcs: 'G54' } },
      status: { activeState: 'Idle' },
    });
    receive('controller:settings', 'Grbl', { settings: { '$13': '0' } });
    expect(socket.emit).toHaveBeenCalledWith('command', '/dev/grbl', 'gcode', '$$');
    receive('serialport:read', '$13=0');
    expect(socket.emit).toHaveBeenCalledWith('write', '/dev/grbl', '?');
    report('mm');
    socket.emit.mockClear();
  });

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
    setDRODispatch(null);
  });

  it('keeps linear origin selection failed when a WCS cancellation reports the same numeric zero as the target', () => {
    const machine = { x: 25.4, y: 50.8, z: 76.2 };
    const initialWork = { x: 12.7, y: -25.4, z: 38.1 };
    report('mm', machine.x, machine.y, machine.z, initialWork);
    socket.emit.mockClear();
    dispatch({ eventName: 'BTN_FUNCTION' });
    dispatch({ eventName: 'KEY_6_RIGHT' });
    dispatch({ eventName: 'KEY_6_RIGHT' });
    dispatch({ eventName: 'KEY_6_RIGHT' });
    dispatch({ eventName: 'KEY_ENTER' });
    expect(useDROStore.getState().stateName).toBe('linear-bolt-hole-axis');
    const before = useDROStore.getState().vMem;
    dispatch({ eventName: 'BTN_SELECT_X' });
    expect(workCommands()).toHaveLength(1);
    expect(useMillStore.getState().millState.workPositionControl?.pending).toEqual({ x: 0 });
    expect(useDROStore.getState().stateData).toEqual(expect.objectContaining({
      stateDataType: 'linear-bolt-hole', originRequestPhase: 'pending',
    }));

    // Another WCS happens to read exactly zero. It cancels our G54 edit rather
    // than confirming it, even though a numeric-only confirmation would match.
    receive('controller:state', 'Grbl', {
      parserstate: { modal: { units: 'G21', wcs: 'G55' } },
      status: { activeState: 'Idle', mpos: machine, wpos: { ...initialWork, x: 0 } },
    });
    expect(useMillStore.getState().millState.workPosition?.x).toBe(0);
    expect(useMillStore.getState().millState.workPositionControl?.pending).toBeNull();
    expect(useMillStore.getState().millState.workPositionControl?.error).toContain('Active work coordinate system changed');
    expect(useDROStore.getState().stateName).toBe('linear-bolt-hole-axis');
    expect(useDROStore.getState().stateData).toEqual(expect.objectContaining({
      stateDataType: 'linear-bolt-hole', originRequestPhase: 'failed',
    }));
    expect(useDROStore.getState().vMem).toEqual(before);

    report('mm', machine.x, machine.y, machine.z, { ...initialWork, x: 0 });
    dispatch({ eventName: 'KEY_1' });
    dispatch({ eventName: 'KEY_ENTER' });
    expect(useDROStore.getState().stateName).toBe('linear-bolt-hole-axis');
    expect(useDROStore.getState().vMem).toEqual(before);
    expect(workCommands()).toHaveLength(1);
  });

  it('follows external G20 then G21 without echoing a unit command or scaling physical position', () => {
    report('inch');
    expect(useSettingsStore.getState().nvMem.defaultUnit).toBe('inch');
    expect(useDROStore.getState().display.X).toBeCloseTo(1);
    expect(useDROStore.getState().display.Y).toBeCloseTo(2);
    expect(useDROStore.getState().display.Z).toBeCloseTo(3);
    expect(useMillStore.getState().millState.position).toEqual({ x: 25.4, y: 50.8, z: 76.2 });
    report('mm');
    expect(useSettingsStore.getState().nvMem.defaultUnit).toBe('mm');
    expect(useDROStore.getState().display).toEqual({ X: 25.4, Y: 50.8, Z: 76.2 });
    expect(unitCommands()).toEqual([]);
  });

  it.each(['mm', 'inch'] as const)('requests the opposite of confirmed %s without optimistic settings or display changes', (initial) => {
    report(initial);
    socket.emit.mockClear();
    const before = useDROStore.getState().display;
    const requested = initial === 'mm' ? 'inch' : 'mm';
    dispatch({ eventName: 'BTN_INCH_MM' });
    expect(unitCommands()).toHaveLength(1);
    expect(unitCommands()[0]).toContain(requested === 'inch' ? 'G20' : 'G21');
    expect(useMillStore.getState().millState.unitControl?.pending).toBe(requested);
    expect(useSettingsStore.getState().nvMem.defaultUnit).toBe(initial);
    expect(useDROStore.getState().display).toEqual(before);
    dispatch({ eventName: 'BTN_INCH_MM' });
    expect(unitCommands()).toHaveLength(1);
    report(requested);
    expect(useMillStore.getState().millState.unitControl?.pending).toBeNull();
    expect(useSettingsStore.getState().nvMem.defaultUnit).toBe(requested);
    expect(useDROStore.getState().display.X).toBeCloseTo(requested === 'inch' ? 1 : 25.4);
    expect(unitCommands()).toHaveLength(1);
  });

  it.each(['disconnected', 'unknown', 'running'] as const)('does not fall back to a local toggle when %s', (condition) => {
    if (condition === 'disconnected') receive('disconnect');
    if (condition === 'unknown') {
      receive('disconnect');
      receive('connect');
    }
    if (condition === 'running') receive('workflow:state', 'running');
    const before = useDROStore.getState().display;
    socket.emit.mockClear();
    dispatch({ eventName: 'BTN_INCH_MM' });
    expect(unitCommands()).toEqual([]);
    expect(useSettingsStore.getState().nvMem.defaultUnit).toBe('mm');
    expect(useDROStore.getState().display).toEqual(before);
    expect(useMillStore.getState().millState.unitControl?.pending).toBeNull();
  });

  it('keeps detected non-GRBL units display-only without sending native unit commands', () => {
    receive('controller:state', 'TinyG', { sr: { posx: 25.4, posy: 50.8, posz: 76.2 } });
    expect(useMillStore.getState().millState.unitControl).toEqual({
      control: 'display',
      confirmed: null,
      pending: null,
      availability: 'unavailable',
    });
    socket.emit.mockClear();
    dispatch({ eventName: 'BTN_INCH_MM' });
    expect(useSettingsStore.getState().nvMem.defaultUnit).toBe('inch');
    expect(useDROStore.getState().display.X).toBeCloseTo(1);
    expect(useDROStore.getState().display.Y).toBeCloseTo(2);
    expect(useDROStore.getState().display.Z).toBeCloseTo(3);
    dispatch({ eventName: 'BTN_INCH_MM' });
    expect(useSettingsStore.getState().nvMem.defaultUnit).toBe('mm');
    expect(useDROStore.getState().display).toEqual({ X: 25.4, Y: 50.8, Z: 76.2 });
    expect(unitCommands()).toEqual([]);
  });

  it.each(['locked', 'asleep', 'calculator'] as const)('does not request units when the front-panel event is gated by %s', (condition) => {
    if (condition === 'locked') useSettingsStore.getState().updateNvMem({ keypadLock: 'on' });
    if (condition === 'asleep') useDROStore.getState().dispatch({ eventName: 'SLEEP_TIMER_ELAPSED' });
    if (condition === 'calculator') useDROStore.getState().dispatch({ eventName: 'BTN_CALCULATOR' });
    socket.emit.mockClear();
    dispatch({ eventName: 'BTN_INCH_MM' });
    expect(unitCommands()).toEqual([]);
    expect(useSettingsStore.getState().nvMem.defaultUnit).toBe('mm');
    if (condition === 'asleep') expect(useDROStore.getState().vMem.displayPower).toBe('awake');
  });

  it('zeros native ABS only after WPos confirmation and preserves MPos and other axes', () => {
    const initialWork = { x: 12.7, y: -25.4, z: 38.1 };
    report('mm', 25.4, 50.8, 76.2, initialWork);
    expect(useDROStore.getState().display).toEqual({ X: 12.7, Y: -25.4, Z: 38.1 });
    const offsets = useDROStore.getState().vMem.incrementalOffsets;
    dispatch({ eventName: 'BTN_ZERO_X' });
    expect(workCommands()).toHaveLength(1);
    expect(workCommands()[0]?.[3]).toBe('G21 G10 L20 P1 X0');
    expect(unitCommands()).toEqual([]);
    expect(useMillStore.getState().millState.workPositionControl?.pending).toEqual({ x: 0 });
    expect(useDROStore.getState().display.X).toBe(12.7);
    expect(useDROStore.getState().vMem.incrementalOffsets).toEqual(offsets);
    const zeroed = { ...initialWork, x: 0 };
    report('mm', 25.4, 50.8, 76.2, zeroed);
    // A matching cached snapshot (or pre-barrier raw report) cannot acknowledge G10.
    expect(useMillStore.getState().millState.workPositionControl?.pending).toEqual({ x: 0 });
    advanceWorkQueue();
    receive('controller:state', 'Grbl', {
      parserstate: { modal: { units: 'G21', wcs: 'G54' } },
      status: { activeState: 'Idle', mpos: { x: 25.4, y: 50.8, z: 76.2 }, wpos: zeroed },
    });
    expect(useMillStore.getState().millState.workPositionControl?.pending).toEqual({ x: 0 });
    report('mm', 25.4, 50.8, 76.2, zeroed);
    expect(useMillStore.getState().millState.workPositionControl?.pending).toBeNull();
    expect(useDROStore.getState().display).toEqual({ X: 0, Y: -25.4, Z: 38.1 });
    expect(useMillStore.getState().millState.position).toEqual({ x: 25.4, y: 50.8, z: 76.2 });
    dispatch({ eventName: 'BTN_INCH_MM' });
    report('inch', 25.4, 50.8, 76.2, zeroed);
    expect(useDROStore.getState().display.X).toBe(0);
    expect(useDROStore.getState().display.Y).toBeCloseTo(-1);
    report('inch', 50.8, 50.8, 76.2, { ...zeroed, x: 25.4 });
    expect(useDROStore.getState().display.X).toBeCloseTo(1);
    // An external G10/WCS shift changes WPos without any physical movement.
    report('inch', 50.8, 50.8, 76.2, { ...zeroed, x: 12.7 });
    expect(useDROStore.getState().display.X).toBeCloseTo(0.5);
    report('mm', 50.8, 50.8, 76.2, { ...zeroed, x: 12.7 });
    expect(useDROStore.getState().display.X).toBeCloseTo(12.7);
    expect(useMillStore.getState().millState.position).toEqual({ x: 50.8, y: 50.8, z: 76.2 });
    expect(useDROStore.getState().vMem.incrementalOffsets).toEqual(offsets);
    expect(workCommands()).toHaveLength(1);
  });

  it.each(['mm', 'inch'] as const)('presets native ABS in %s without optimistic readout or physical motion', (unit) => {
    report(unit, 25.4, 50.8, 76.2, { x: 12.7, y: -25.4, z: 38.1 });
    dispatch({ eventName: 'BTN_SELECT_X' });
    useDROStore.getState().dispatch({ eventName: 'SET_INPUT_BUFFER', value: unit === 'inch' ? '2' : '50.8' });
    dispatch({ eventName: 'KEY_ENTER' });
    expect(workCommands()).toHaveLength(1);
    expect(workCommands()[0]?.[3]).toBe(unit === 'inch'
      ? 'G20 G10 L20 P1 X2'
      : 'G21 G10 L20 P1 X50.8');
    expect(unitCommands()).toEqual([]);
    expect(useMillStore.getState().millState.workPositionControl?.pending?.x).toBeCloseTo(50.8);
    expect(useDROStore.getState().display.X).toBeCloseTo(unit === 'inch' ? 0.5 : 12.7);
    advanceWorkQueue();
    report(unit, 25.4, 50.8, 76.2, { x: 50.8, y: -25.4, z: 38.1 });
    expect(useMillStore.getState().millState.workPositionControl?.pending).toBeNull();
    expect(useDROStore.getState().display.X).toBeCloseTo(unit === 'inch' ? 2 : 50.8);
    expect(useDROStore.getState().display.Y).toBeCloseTo(unit === 'inch' ? -1 : -25.4);
    expect(useMillStore.getState().millState.position).toEqual({ x: 25.4, y: 50.8, z: 76.2 });
  });

  it('still sends an explicit zero when cached WPos already equals the requested value', () => {
    report('mm', 25.4, 50.8, 76.2, { x: 0, y: 50.8, z: 76.2 });
    dispatch({ eventName: 'BTN_ZERO_X' });
    expect(workCommands()).toHaveLength(1);
    expect(workCommands()[0]?.[3]).toBe('G21 G10 L20 P1 X0');
    expect(useMillStore.getState().millState.workPositionControl?.pending).toEqual({ x: 0 });
    report('mm', 25.4, 50.8, 76.2, { x: 0, y: 50.8, z: 76.2 });
    expect(useMillStore.getState().millState.workPositionControl?.pending).toEqual({ x: 0 });
    advanceWorkQueue();
    expect(useMillStore.getState().millState.workPositionControl?.pending).toEqual({ x: 0 });
    report('mm', 25.4, 50.8, 76.2, { x: 0, y: 50.8, z: 76.2 });
    expect(useMillStore.getState().millState.workPositionControl?.pending).toBeNull();
    expect(workCommands()).toHaveLength(1);
  });

  it.each(['WCO', 'paired-MPos-WPos'] as const)('requests atomic native zero-all confirmed by fresh %s status', (format) => {
    const before = useDROStore.getState().display;
    dispatch({ eventName: 'BTN_ZERO_ALL' });
    expect(workCommands()).toHaveLength(1);
    expect(workCommands()[0]?.[3]).toBe('G21 G10 L20 P1 X0 Y0 Z0');
    expect(unitCommands()).toEqual([]);
    expect(useMillStore.getState().millState.workPositionControl?.pending).toEqual({ x: 0, y: 0, z: 0 });
    expect(useDROStore.getState().display).toEqual(before);
    advanceWorkQueue();
    receive('serialport:read', format === 'WCO'
      ? '<Idle|MPos:25.4,50.8,76.2|WCO:25.4,50.8,76.2>'
      : '<Idle,MPos:25.4,50.8,76.2,WPos:0,0,0>');
    expect(useDROStore.getState().display).toEqual({ X: 0, Y: 0, Z: 0 });
    expect(useMillStore.getState().millState.position).toEqual({ x: 25.4, y: 50.8, z: 76.2 });
    expect(useMillStore.getState().millState.workPositionControl?.pending).toBeNull();
  });

  it('keeps native INC independent of external WCS changes while both modes follow motion', () => {
    report('mm', 25.4, 50.8, 76.2, { x: 12.7, y: -25.4, z: 38.1 });
    expect(useDROStore.getState().display.X).toBeCloseTo(12.7);
    dispatch({ eventName: 'BTN_ABS_INC' });
    dispatch({ eventName: 'BTN_ZERO_X' });
    expect(useDROStore.getState().display.X).toBeCloseTo(0);
    expect(workCommands()).toEqual([]);
    report('mm', 25.4, 50.8, 76.2, { x: 5, y: -25.4, z: 38.1 });
    expect(useDROStore.getState().display.X).toBeCloseTo(0);
    dispatch({ eventName: 'BTN_ABS_INC' });
    expect(useDROStore.getState().display.X).toBeCloseTo(5);
    report('mm', 35.4, 50.8, 76.2, { x: 15, y: -25.4, z: 38.1 });
    expect(useDROStore.getState().display.X).toBeCloseTo(15);
    dispatch({ eventName: 'BTN_ABS_INC' });
    expect(useDROStore.getState().display.X).toBeCloseTo(10);
    dispatch({ eventName: 'BTN_ABS_INC' });
    expect(useDROStore.getState().display.X).toBeCloseTo(15);
    dispatch({ eventName: 'BTN_ABS_INC' });
    expect(useDROStore.getState().display.X).toBeCloseTo(10);
    expect(workCommands()).toEqual([]);
  });

  it.each(['mm', 'inch'] as const)('performs native INC zero, preset, half, and zero-all locally in %s', (unit) => {
    report(unit, 25.4, 50.8, 76.2, { x: 5, y: 10, z: 15 });
    dispatch({ eventName: 'BTN_ABS_INC' });
    dispatch({ eventName: 'BTN_ZERO_X' });
    expect(useDROStore.getState().display.X).toBeCloseTo(0);
    dispatch({ eventName: 'BTN_SELECT_Y' });
    dispatch({ eventName: 'SET_INPUT_BUFFER', value: unit === 'inch' ? '1' : '25.4' });
    dispatch({ eventName: 'KEY_ENTER' });
    expect(useDROStore.getState().display.Y).toBeCloseTo(unit === 'inch' ? 1 : 25.4);
    useDROStore.setState({
      vMem: { ...useDROStore.getState().vMem, activeAxis: 'Y' },
    });
    dispatch({ eventName: 'BTN_HALF' });
    expect(useDROStore.getState().display.Y).toBeCloseTo(unit === 'inch' ? 0.5 : 12.7);
    dispatch({ eventName: 'BTN_ZERO_ALL' });
    expect(useDROStore.getState().display).toEqual({ X: 0, Y: 0, Z: 0 });
    expect(useDROStore.getState().vMem.incrementalOffsets).toEqual({ X: 25.4, Y: 50.8, Z: 76.2 });
    expect(workCommands()).toEqual([]);
    expect(useMillStore.getState().millState.workPositionControl?.pending).toBeNull();
  });

  it('uses retained machine position for INC datum operations after CNCjs disconnect', async () => {
    report('mm', 25.4, 50.8, 76.2, { x: 5, y: 10, z: 15 });
    dispatch({ eventName: 'BTN_ABS_INC' });
    receive('disconnect');
    await Promise.resolve();
    dispatch({ eventName: 'BTN_ZERO_X' });
    expect(useDROStore.getState().display.X).toBeCloseTo(0);
    expect(useDROStore.getState().vMem.incrementalOffsets.X).toBeCloseTo(25.4);
    dispatch({ eventName: 'BTN_SELECT_Y' });
    dispatch({ eventName: 'SET_INPUT_BUFFER', value: '20' });
    dispatch({ eventName: 'KEY_ENTER' });
    expect(useDROStore.getState().display.Y).toBeCloseTo(20);
    expect(useDROStore.getState().vMem.incrementalOffsets.Y).toBeCloseTo(30.8);
    useDROStore.setState({
      vMem: { ...useDROStore.getState().vMem, activeAxis: 'Y' },
    });
    dispatch({ eventName: 'BTN_HALF' });
    expect(useDROStore.getState().display.Y).toBeCloseTo(10);
    dispatch({ eventName: 'BTN_ZERO_ALL' });
    expect(useDROStore.getState().vMem.incrementalOffsets).toEqual({ X: 25.4, Y: 50.8, Z: 76.2 });
    expect(useDROStore.getState().display).toEqual({ X: 0, Y: 0, Z: 0 });
    expect(workCommands()).toEqual([]);
  });

  it('retains a local INC datum for detected non-GRBL controllers', () => {
    receive('controller:state', 'TinyG', { sr: { posx: 25.4, posy: 50.8, posz: 76.2 } });
    dispatch({ eventName: 'BTN_ABS_INC' });
    dispatch({ eventName: 'BTN_ZERO_X' });
    expect(useDROStore.getState().display.X).toBe(0);
    expect(useDROStore.getState().vMem.incrementalOffsets.X).toBe(25.4);
    receive('controller:state', 'TinyG', { sr: { posx: 50.8, posy: 50.8, posz: 76.2 } });
    expect(useDROStore.getState().display.X).toBeCloseTo(25.4);
    expect(workCommands()).toEqual([]);
  });

  it('keeps the confirmed readout when a pending request is rejected by disconnect', async () => {
    const before = useDROStore.getState().display;
    dispatch({ eventName: 'BTN_INCH_MM' });
    expect(useMillStore.getState().millState.unitControl?.pending).toBe('inch');
    receive('disconnect');
    await Promise.resolve();
    await Promise.resolve();
    expect(useMillStore.getState().millState.unitControl?.pending).toBeNull();
    expect(useSettingsStore.getState().nvMem.defaultUnit).toBe('mm');
    expect(useDROStore.getState().display).toEqual(before);
    expect(unitCommands()).toHaveLength(1);
  });

  it.each(['mm', 'inch'] as const)('retains native ABS in %s offline and never falls back to manual datum writes', async (unit) => {
    report(unit, 25.4, 50.8, 76.2, { x: 12.7, y: -25.4, z: 38.1 });
    const before = useDROStore.getState().display;
    const memory = useDROStore.getState().vMem;
    receive('disconnect');
    await Promise.resolve();
    expect(useDROStore.getState().display).toEqual(before);
    expect(useSettingsStore.getState().nvMem.defaultUnit).toBe(unit);
    expect(useMillStore.getState().millState.unitControl?.confirmed).toBeNull();
    expect(useMillStore.getState().millState.workPositionControl?.availability).toBe('unavailable');
    dispatch({ eventName: 'BTN_ZERO_ALL' });
    dispatch({ eventName: 'BTN_SELECT_X' });
    useDROStore.getState().dispatch({ eventName: 'SET_INPUT_BUFFER', value: '5' });
    dispatch({ eventName: 'KEY_ENTER' });
    await Promise.resolve();
    expect(workCommands()).toEqual([]);
    expect(useDROStore.getState().display).toEqual(before);
    expect(useDROStore.getState().vMem.incrementalOffsets).toEqual(memory.incrementalOffsets);
    expect(useDROStore.getState().vMem.incrementalValues).toEqual(memory.incrementalValues);
    expect(useDROStore.getState().vMem.manualAbsoluteValues).toEqual(memory.manualAbsoluteValues);
    expect(useMillStore.getState().error).toBeInstanceOf(Error);
    dispatch({ eventName: 'BTN_ABS_INC' });
    expect(useDROStore.getState().display.X).toBeCloseTo(unit === 'inch' ? 1 : 25.4);
    expect(useDROStore.getState().display.Y).toBeCloseTo(unit === 'inch' ? 2 : 50.8);
    expect(useDROStore.getState().display.Z).toBeCloseTo(unit === 'inch' ? 3 : 76.2);
  });

  it('keeps physical distance-to-go targets and distances through disconnect', () => {
    dispatch({ eventName: 'BTN_DISTANCE_TO_GO' });
    dispatch({ eventName: 'BTN_SELECT_X' });
    dispatch({ eventName: 'KEY_7' });
    dispatch({ eventName: 'KEY_6_RIGHT' });
    dispatch({ eventName: 'KEY_DECIMAL' });
    dispatch({ eventName: 'KEY_2_DOWN' });
    dispatch({ eventName: 'KEY_ENTER' });
    dispatch({ eventName: 'BTN_DISTANCE_TO_GO' });
    const before = useDROStore.getState().display;
    expect(before.X).toBeCloseTo(50.8);
    receive('disconnect');
    expect(useDROStore.getState().stateName).toBe('distance-to-go');
    expect(useDROStore.getState().display).toEqual(before);
    expect((useDROStore.getState().stateData as PresetData).presetTargets.X).toBeCloseTo(76.2);
  });

  it.each(['preset-select', 'preset-input-y', 'distance-to-go'] as const)(
    'waits for native confirmation when requesting units in %s',
    (stateName) => {
      const targets = { X: 76.2, Y: 101.6, Z: null };
      useDROStore.getState()._setState({
        stateName,
        stateData: {
          ...INITIAL_PRESET_DATA,
          presetTargets: targets,
          activeInputAxis: stateName === 'preset-input-y' ? 'Y' : null,
        },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: stateName === 'preset-input-y' ? '50.8' : '' },
        display: INITIAL_DISPLAY_STATE,
      });
      report('mm');
      const before = useDROStore.getState().display;
      dispatch({ eventName: 'BTN_INCH_MM' });
      expect(unitCommands()).toHaveLength(1);
      expect(useSettingsStore.getState().nvMem.defaultUnit).toBe('mm');
      expect(useDROStore.getState().display).toEqual(before);
      expect((useDROStore.getState().stateData as PresetData).presetTargets).toEqual(targets);
      report('inch');
      expect(useSettingsStore.getState().nvMem.defaultUnit).toBe('inch');
      expect(useDROStore.getState().stateName).toBe(stateName);
      expect(useDROStore.getState().display.X).toBeCloseTo(stateName === 'distance-to-go' ? 2 : 3);
      expect((useDROStore.getState().stateData as PresetData).presetTargets).toEqual(targets);
      if (stateName === 'preset-input-y') {
        expect(Number(useDROStore.getState().vMem.inputBuffer)).toBeCloseTo(2);
      }
      expect(unitCommands()).toHaveLength(1);
    }
  );

  it.each(['preset-select', 'preset-input-y', 'distance-to-go'] as const)(
    'preserves physical DTG targets and refreshes %s on external unit changes',
    (stateName) => {
      const targets = { X: 76.2, Y: 101.6, Z: null };
      const data: PresetData = {
        ...INITIAL_PRESET_DATA,
        presetTargets: targets,
        activeInputAxis: stateName === 'preset-input-y' ? 'Y' : null,
      };
      useDROStore.getState()._setState({
        stateName,
        stateData: data,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: stateName === 'preset-input-y' ? '50.8' : '' },
        display: INITIAL_DISPLAY_STATE,
      });
      report('mm');
      report('inch');
      expect((useDROStore.getState().stateData as PresetData).presetTargets).toEqual(targets);
      expect(useDROStore.getState().stateName).toBe(stateName);
      expect(useDROStore.getState().display.X).toBeCloseTo(stateName === 'distance-to-go' ? 2 : 3);
      if (stateName === 'preset-input-y') {
        expect(Number(useDROStore.getState().vMem.inputBuffer)).toBeCloseTo(2);
        expect(Number(useDROStore.getState().display.Y)).toBeCloseTo(2);
      }
      report('mm');
      expect((useDROStore.getState().stateData as PresetData).presetTargets).toEqual(targets);
      expect(useDROStore.getState().display.X).toBeCloseTo(stateName === 'distance-to-go' ? 50.8 : 76.2);
      if (stateName === 'preset-input-y') {
        expect(Number(useDROStore.getState().vMem.inputBuffer)).toBeCloseTo(50.8);
        dispatch({ eventName: 'KEY_ENTER' });
        expect((useDROStore.getState().stateData as PresetData).presetTargets.Y).toBeCloseTo(50.8);
      }
      expect(unitCommands()).toEqual([]);
    }
  );

  it.each(['mm', 'inch'] as const)('refreshes actual linear pitch entry after external units change from %s and preserves physical pitch on commit', (initial) => {
    report(initial);
    enterLinearPitch();
    typeNumber(initial === 'mm' ? '25.4' : '1');
    expect(useDROStore.getState().display.X).toBeCloseTo(initial === 'mm' ? 25.4 : 1);
    const next = initial === 'mm' ? 'inch' : 'mm';
    report(next);
    expect(useDROStore.getState().stateName).toBe('linear-bolt-hole-pitch');
    expect(Number(useDROStore.getState().vMem.inputBuffer)).toBeCloseTo(next === 'inch' ? 1 : 25.4);
    expect(useDROStore.getState().display.X).toBeCloseTo(next === 'inch' ? 1 : 25.4);
    expect(useDROStore.getState().display.Y).toBe('PitCh');
    dispatch({ eventName: 'KEY_ENTER' });
    expect(useDROStore.getState().stateName).toBe('linear-bolt-hole-holes');
    const pitchData = useDROStore.getState().stateData;
    expect(pitchData.stateDataType).toBe('linear-bolt-hole');
    if (pitchData.stateDataType !== 'linear-bolt-hole') throw new Error('Expected linear pattern data');
    expect(pitchData.pitch).toBeCloseTo(25.4);
    typeNumber('5');
    report(initial);
    expect(useDROStore.getState().vMem.inputBuffer).toBe('5');
    expect(useDROStore.getState().display).toEqual({ X: 5, Y: 'hoLES', Z: '' });
    dispatch({ eventName: 'KEY_ENTER' });
    const completed = useDROStore.getState().stateData;
    expect(useDROStore.getState().stateName).toBe('linear-bolt-hole-navigate');
    if (completed.stateDataType !== 'linear-bolt-hole') throw new Error('Expected linear pattern data');
    expect(completed.pitch).toBeCloseTo(25.4);
    expect(completed.holeCount).toBe(5);
    expect(unitCommands()).toEqual([]);
  });

  it.each(['mm', 'inch'] as const)('keeps empty linear pitch prompts stable when external units change from %s', (initial) => {
    report(initial);
    enterLinearPitch();
    const prompt = useDROStore.getState().display;
    expect(prompt).toEqual({ X: 0, Y: 'PitCh', Z: '' });
    report(initial === 'mm' ? 'inch' : 'mm');
    expect(useDROStore.getState().vMem.inputBuffer).toBe('');
    expect(useDROStore.getState().display).toEqual(prompt);
    expect(useDROStore.getState().stateName).toBe('linear-bolt-hole-pitch');
    expect(unitCommands()).toEqual([]);
  });

  it.each(['mm', 'inch'] as const)('does not convert entered angle or hole count when external units change from %s', (initial) => {
    report(initial);
    dispatch({ eventName: 'BTN_ANGLE_HOLE' });
    dispatch({ eventName: 'ANGLE_HOLE_INTRO_TIMEOUT' });
    expect(useDROStore.getState().stateName).toBe('angle-hole-start-x');
    typeNumber('0');
    dispatch({ eventName: 'KEY_ENTER' });
    typeNumber('0');
    dispatch({ eventName: 'KEY_ENTER' });
    typeNumber(initial === 'mm' ? '25.4' : '1');
    dispatch({ eventName: 'KEY_ENTER' });
    expect(useDROStore.getState().stateName).toBe('angle-hole-angle');
    typeNumber('30');
    const angleDisplay = useDROStore.getState().display;
    report(initial === 'mm' ? 'inch' : 'mm');
    expect(useDROStore.getState().vMem.inputBuffer).toBe('30');
    expect(useDROStore.getState().display).toEqual(angleDisplay);
    dispatch({ eventName: 'KEY_ENTER' });
    expect(useDROStore.getState().stateName).toBe('angle-hole-holes');
    typeNumber('6');
    const holesDisplay = useDROStore.getState().display;
    report(initial);
    expect(useDROStore.getState().vMem.inputBuffer).toBe('6');
    expect(useDROStore.getState().display).toEqual(holesDisplay);
    dispatch({ eventName: 'KEY_ENTER' });
    const data = useDROStore.getState().stateData;
    expect(useDROStore.getState().stateName).toBe('angle-hole-navigate');
    if (data.stateDataType !== 'angle-hole') throw new Error('Expected angle pattern data');
    expect(data.pitch).toBeCloseTo(25.4);
    expect(data.lineAngle).toBe(30);
    expect(data.holeCount).toBe(6);
    expect(unitCommands()).toEqual([]);
  });

  it.each(['edge', 'midpoint'] as const)('commits native %s probe capture once before processing reentrant work-position notifications', async (probeFunction) => {
    const probeReport = (x: number, pinState: string, workX = x): void => {
      receive('controller:state', 'Grbl', {
        parserstate: { modal: { units: 'G21', wcs: 'G54' } },
        status: {
          activeState: 'Idle',
          mpos: { x, y: 0, z: 0 },
          wpos: { x: workX, y: 0, z: 0 },
          pinState,
        },
      });
    };
    dispatch({ eventName: 'BTN_FUNCTION' });
    for (let index = 0; index < 6; index++) dispatch({ eventName: 'KEY_6_RIGHT' });
    dispatch({ eventName: 'KEY_ENTER' });
    expect(useDROStore.getState().stateName).toBe('probe-menu-function');
    if (probeFunction === 'midpoint') dispatch({ eventName: 'KEY_6_RIGHT' });
    dispatch({ eventName: 'KEY_ENTER' });
    dispatch({ eventName: 'BTN_SELECT_X' });
    expect(useDROStore.getState().stateName).toBe('probe-waiting');

    if (probeFunction === 'midpoint') {
      probeReport(10, '');
      probeReport(10, 'P');
      const firstContact = useDROStore.getState().stateData;
      if (firstContact.stateDataType !== 'probe') throw new Error('Expected probe capture data');
      expect(firstContact.captures).toEqual([10]);
      expect(useDROStore.getState().stateName).toBe('probe-waiting');
      expect(workCommands()).toEqual([]);
      probeReport(10, '');
    }
    probeReport(50, '');
    const captures = probeFunction === 'edge' ? [50] : [10, 50];
    const targetX = probeFunction === 'edge' ? 0 : 20;
    const transitions: {
      stateName: string;
      captures: number[];
      pending: Partial<MillPosition> | null;
    }[] = [];
    const unsubscribe = useDROStore.subscribe((state) => {
      transitions.push({
        stateName: state.stateName,
        captures: state.stateData.stateDataType === 'probe' ? [...state.stateData.captures] : [],
        pending: useMillStore.getState().millState.workPositionControl?.pending ?? null,
      });
    });
    try {
      probeReport(50, 'P');
      expect(transitions.length).toBeGreaterThanOrEqual(2);
      expect(transitions[0]).toEqual({ stateName: 'probe-result', captures, pending: { x: targetX } });
      // The outer result transition must precede every queued pending tick.
      expect(transitions.every((transition) => transition.stateName === 'probe-result')).toBe(true);
      for (const transition of transitions) expect(transition.captures).toEqual(captures);
      expect(workCommands()).toHaveLength(1);
      expect(workCommands()[0]?.[3]).toBe(`G21 G10 L20 P1 X${String(targetX)}`);
      expect(useMillStore.getState().millState.workPositionControl?.pending).toEqual({ x: targetX });
      expect(useDROStore.getState().display.X).toBeCloseTo(50);
      // Exercise held contact while the request is pending: no second capture.
      probeReport(50, 'P');
      await Promise.resolve();
      await Promise.resolve();
      expect(useMillStore.getState().error).toBeNull();
      expect(workCommands()).toHaveLength(1);
      advanceWorkQueue();
      receive('serialport:read', `<Idle|MPos:50,0,0|WCO:${String(50 - targetX)},0,0|Pn:P>`);
      probeReport(50, 'P', targetX);
      await Promise.resolve();
      await Promise.resolve();
      expect(useDROStore.getState().stateName).toBe('probe-result');
      const result = useDROStore.getState().stateData;
      if (result.stateDataType !== 'probe') throw new Error('Expected probe result data');
      expect(result.captures).toEqual(captures);
      expect(useDROStore.getState().display.X).toBeCloseTo(targetX);
      expect(useMillStore.getState().millState.position).toEqual({ x: 50, y: 0, z: 0 });
      expect(useMillStore.getState().millState.workPositionControl?.pending).toBeNull();
      expect(useMillStore.getState().millState.workPositionControl?.error).toBeNull();
      expect(useMillStore.getState().error).toBeNull();
      expect(workCommands()).toHaveLength(1);
    } finally {
      unsubscribe();
    }
  });
});

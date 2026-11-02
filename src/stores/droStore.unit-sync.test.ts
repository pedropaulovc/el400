import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CncjsMillAdapter } from '../adapters/CncjsMillAdapter';
import { NoOpMillAdapter } from '../adapters/NoOpMillAdapter';
import { createDefaultMillState, type MillPosition, type MillUnit } from '../types/millState';
import { DEFAULT_NON_VOLATILE_MEMORY } from '../types/nonVolatileMemory';
import { INITIAL_VOLATILE_MEMORY_STATE } from '../types/volatileMemory';
import { INITIAL_PRESET_DATA, type PresetData } from './dro/droStateMachine';
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
  receive('serialport:read', `<Idle|MPos:${x},${y},${z}|WCO:${x - work.x},${y - work.y},${z - work.z}>`);
  receive('controller:state', 'Grbl', {
    parserstate: { modal: { units: unit === 'mm' ? 'G21' : 'G20', wcs: 'G54' } },
    status: { activeState: 'Idle', mpos: { x, y, z }, wpos: work },
  });
}

function unitCommands(): unknown[][] {
  return socket.emit.mock.calls.filter((call) =>
    call.some((value) => typeof value === 'string' && /(?:^|\s)G2[01](?:\s|$)/.test(value))
  );
}

function workCommands(): unknown[][] {
  return socket.emit.mock.calls.filter((call) =>
    call.some((value) => typeof value === 'string' && /\bG10\s+L20\b/.test(value))
  );
}

function dispatch(eventName: 'BTN_INCH_MM' | 'BTN_ABS_INC' | 'BTN_ZERO_X' | 'BTN_ZERO_ALL' | 'BTN_SELECT_X' | 'KEY_ENTER'): void {
  useDROStore.getState().dispatch({ eventName });
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
    receive('controller:settings', 'Grbl', { settings: { '$13': '0' } });
    receive('serialport:read', '$13=0');
    report('mm');
    socket.emit.mockClear();
  });

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
    setDRODispatch(null);
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
    dispatch('BTN_INCH_MM');
    expect(unitCommands()).toHaveLength(1);
    expect(unitCommands()[0]).toContain(requested === 'inch' ? 'G20' : 'G21');
    expect(useMillStore.getState().millState.unitControl?.pending).toBe(requested);
    expect(useSettingsStore.getState().nvMem.defaultUnit).toBe(initial);
    expect(useDROStore.getState().display).toEqual(before);
    dispatch('BTN_INCH_MM');
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
    dispatch('BTN_INCH_MM');
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
    dispatch('BTN_INCH_MM');
    expect(useSettingsStore.getState().nvMem.defaultUnit).toBe('inch');
    expect(useDROStore.getState().display.X).toBeCloseTo(1);
    expect(useDROStore.getState().display.Y).toBeCloseTo(2);
    expect(useDROStore.getState().display.Z).toBeCloseTo(3);
    dispatch('BTN_INCH_MM');
    expect(useSettingsStore.getState().nvMem.defaultUnit).toBe('mm');
    expect(useDROStore.getState().display).toEqual({ X: 25.4, Y: 50.8, Z: 76.2 });
    expect(unitCommands()).toEqual([]);
  });

  it.each(['locked', 'asleep', 'calculator'] as const)('does not request units when the front-panel event is gated by %s', (condition) => {
    if (condition === 'locked') useSettingsStore.getState().updateNvMem({ keypadLock: 'on' });
    if (condition === 'asleep') useDROStore.getState().dispatch({ eventName: 'SLEEP_TIMER_ELAPSED' });
    if (condition === 'calculator') useDROStore.getState().dispatch({ eventName: 'BTN_CALCULATOR' });
    socket.emit.mockClear();
    dispatch('BTN_INCH_MM');
    expect(unitCommands()).toEqual([]);
    expect(useSettingsStore.getState().nvMem.defaultUnit).toBe('mm');
    if (condition === 'asleep') expect(useDROStore.getState().vMem.displayPower).toBe('awake');
  });

  it('zeros native INC only after WPos confirmation and preserves MPos and other axes', () => {
    const initialWork = { x: 12.7, y: -25.4, z: 38.1 };
    report('mm', 25.4, 50.8, 76.2, initialWork);
    dispatch('BTN_ABS_INC');
    expect(useDROStore.getState().display).toEqual({ X: 12.7, Y: -25.4, Z: 38.1 });
    const offsets = useDROStore.getState().vMem.incrementalOffsets;
    dispatch('BTN_ZERO_X');
    expect(workCommands()).toHaveLength(1);
    expect(useMillStore.getState().millState.workPositionControl?.pending).toEqual({ x: 0 });
    expect(useDROStore.getState().display.X).toBe(12.7);
    expect(useDROStore.getState().vMem.incrementalOffsets).toEqual(offsets);
    const zeroed = { ...initialWork, x: 0 };
    report('mm', 25.4, 50.8, 76.2, zeroed);
    expect(useMillStore.getState().millState.workPositionControl?.pending).toBeNull();
    expect(useDROStore.getState().display).toEqual({ X: 0, Y: -25.4, Z: 38.1 });
    expect(useMillStore.getState().millState.position).toEqual({ x: 25.4, y: 50.8, z: 76.2 });
    dispatch('BTN_INCH_MM');
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

  it.each(['mm', 'inch'] as const)('presets native INC in %s without optimistic readout or physical motion', (unit) => {
    report(unit, 25.4, 50.8, 76.2, { x: 12.7, y: -25.4, z: 38.1 });
    dispatch('BTN_ABS_INC');
    dispatch('BTN_SELECT_X');
    useDROStore.getState().dispatch({ eventName: 'SET_INPUT_BUFFER', value: unit === 'inch' ? '2' : '50.8' });
    dispatch('KEY_ENTER');
    expect(workCommands()).toHaveLength(1);
    expect(useMillStore.getState().millState.workPositionControl?.pending?.x).toBeCloseTo(50.8);
    expect(useDROStore.getState().display.X).toBeCloseTo(unit === 'inch' ? 0.5 : 12.7);
    report(unit, 25.4, 50.8, 76.2, { x: 50.8, y: -25.4, z: 38.1 });
    expect(useMillStore.getState().millState.workPositionControl?.pending).toBeNull();
    expect(useDROStore.getState().display.X).toBeCloseTo(unit === 'inch' ? 2 : 50.8);
    expect(useDROStore.getState().display.Y).toBeCloseTo(unit === 'inch' ? -1 : -25.4);
    expect(useMillStore.getState().millState.position).toEqual({ x: 25.4, y: 50.8, z: 76.2 });
  });

  it('requests atomic native zero-all without changing the readout before WPos confirmation', () => {
    dispatch('BTN_ABS_INC');
    const before = useDROStore.getState().display;
    dispatch('BTN_ZERO_ALL');
    expect(workCommands()).toHaveLength(1);
    expect(useMillStore.getState().millState.workPositionControl?.pending).toEqual({ x: 0, y: 0, z: 0 });
    expect(useDROStore.getState().display).toEqual(before);
    report('mm', 25.4, 50.8, 76.2, { x: 0, y: 0, z: 0 });
    expect(useDROStore.getState().display).toEqual({ X: 0, Y: 0, Z: 0 });
    expect(useMillStore.getState().millState.position).toEqual({ x: 25.4, y: 50.8, z: 76.2 });
    expect(useMillStore.getState().millState.workPositionControl?.pending).toBeNull();
  });

  it('retains a local INC datum for detected non-GRBL controllers', () => {
    receive('controller:state', 'TinyG', { sr: { posx: 25.4, posy: 50.8, posz: 76.2 } });
    dispatch('BTN_ABS_INC');
    dispatch('BTN_ZERO_X');
    expect(useDROStore.getState().display.X).toBe(0);
    expect(useDROStore.getState().vMem.incrementalOffsets.X).toBe(25.4);
    receive('controller:state', 'TinyG', { sr: { posx: 50.8, posy: 50.8, posz: 76.2 } });
    expect(useDROStore.getState().display.X).toBeCloseTo(25.4);
    expect(workCommands()).toEqual([]);
  });

  it('keeps the confirmed readout when a pending request is rejected by disconnect', async () => {
    const before = useDROStore.getState().display;
    dispatch('BTN_INCH_MM');
    expect(useMillStore.getState().millState.unitControl?.pending).toBe('inch');
    receive('disconnect');
    await Promise.resolve();
    await Promise.resolve();
    expect(useMillStore.getState().millState.unitControl?.pending).toBeNull();
    expect(useSettingsStore.getState().nvMem.defaultUnit).toBe('mm');
    expect(useDROStore.getState().display).toEqual(before);
    expect(unitCommands()).toHaveLength(1);
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
      dispatch('BTN_INCH_MM');
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
        dispatch('KEY_ENTER');
        expect((useDROStore.getState().stateData as PresetData).presetTargets.Y).toBeCloseTo(50.8);
      }
      expect(unitCommands()).toEqual([]);
    }
  );
});

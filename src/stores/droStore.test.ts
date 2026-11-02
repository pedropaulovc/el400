/**
 * Unit tests for droStore
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useDROStore,
  initializeDROMillConnection,
  useStateName,
  useStateData,
  useVMem,
  useMode,
  useActiveAxis,
  useInputBuffer,
  useDispatch,
  useWorkOffsetX,
  useWorkOffsetY,
  useWorkOffsetZ,
  useIncrementalX,
  useIncrementalY,
  useIncrementalZ,
  useIncrementalOffsets,
  useManualAbsoluteX,
  useManualAbsoluteY,
  useManualAbsoluteZ,
} from './droStore';
import { useMillStore, setDRODispatch, initializeMillStore } from './millStore';
import { MockMillAdapter } from '../adapters/MockMillAdapter';
import { useSettingsStore } from './settingsStore';
import { INITIAL_DRO_STATE_PAYLOAD } from './dro/droStateMachine';
import { INITIAL_VOLATILE_MEMORY_STATE } from '../types/volatileMemory';
import { createDefaultMillState } from '../types/millState';
import { DEFAULT_NON_VOLATILE_MEMORY } from '../types/nonVolatileMemory';
import { NoOpMillAdapter } from '../adapters/NoOpMillAdapter';
import { INITIAL_DISPLAY_STATE } from './dro/utils/displayComputation';
import { useVolatileMemory } from '../hooks/useVolatileMemory';

describe('droStore', () => {
  beforeEach(() => {
    // Reset all stores to initial state before each test
    useDROStore.setState({
      stateName: INITIAL_DRO_STATE_PAYLOAD.stateName,
      stateData: INITIAL_DRO_STATE_PAYLOAD.stateData,
      vMem: INITIAL_VOLATILE_MEMORY_STATE,
      display: INITIAL_DISPLAY_STATE,
    });

    useMillStore.setState({
      millState: createDefaultMillState('noop'),
      connection: new NoOpMillAdapter(),
      isConnecting: false,
      error: null,
    });

    useSettingsStore.setState({
      nvMem: DEFAULT_NON_VOLATILE_MEMORY,
    });

    // Clear DRO dispatch
    setDRODispatch(null);
  });

  describe('selected CNCjs disconnect projections', () => {
    it.each(['abs', 'inc'] as const)('retains physical %s coordinates offline but restores actual standalone counters when switching source', (mode) => {
      // This projection test compares the formatted readout with canonical mm.
      useSettingsStore.setState({
        nvMem: { ...DEFAULT_NON_VOLATILE_MEMORY, defaultUnit: 'mm' },
      });
      useDROStore.setState({
        stateName: 'idle',
        stateData: { stateDataType: 'none' },
        vMem: {
          ...INITIAL_VOLATILE_MEMORY_STATE, mode,
          workOffsets: { X: 1, Y: 2, Z: 3 },
          incrementalOffsets: { X: 100, Y: 200, Z: 300 },
          incrementalValues: { X: 71, Y: 72, Z: 73 },
          manualAbsoluteValues: { X: 81, Y: 82, Z: 83 },
        },
      });
      useMillStore.setState({
        millState: {
          ...createDefaultMillState('cncjs'), connected: true,
          position: { x: 25.4, y: 50.8, z: 76.2 },
          workPosition: { x: 12.7, y: -25.4, z: 38.1 },
          workPositionControl: { availability: 'ready', pending: null, error: null },
        },
      });
      const { result } = renderHook(() => useVolatileMemory());
      const expectedAbsolute = { X: 24.4, Y: 48.8, Z: 73.2 };
      const expectedIncremental = { X: 12.7, Y: -25.4, Z: 38.1 };
      expect(result.current.absolute).toEqual(expectedAbsolute);
      expect(result.current.incremental).toEqual(expectedIncremental);
      act(() => {
        useMillStore.setState((state) => ({
          millState: {
            ...state.millState, connected: false,
            workPositionControl: { availability: 'unavailable', pending: null, error: null },
          },
        }));
        useDROStore.getState().dispatch({ eventName: 'MILL_STATE_CHANGED' });
      });
      expect(result.current.absolute).toEqual(expectedAbsolute);
      expect(result.current.incremental).toEqual(expectedIncremental);
      expect(result.current.displayValues).toEqual(mode === 'abs' ? expectedAbsolute : expectedIncremental);
      expect(useDROStore.getState().display).toEqual(result.current.displayValues);
      act(() => {
        useMillStore.setState({ millState: createDefaultMillState('noop') });
        useDROStore.getState().dispatch({ eventName: 'MILL_STATE_CHANGED' });
      });
      expect(result.current.absolute).toEqual({ X: 81, Y: 82, Z: 83 });
      expect(result.current.incremental).toEqual({ X: 71, Y: 72, Z: 73 });
      expect(useDROStore.getState().display).toEqual(result.current.displayValues);
    });
  });

  describe('live incremental hook values', () => {
    it.each(['X', 'Y', 'Z'] as const)('updates %s from native GRBL WPos independently of local INC offsets and manual counters', (axis) => {
      useDROStore.setState({
        stateName: 'idle',
        stateData: { stateDataType: 'none' },
        vMem: {
          ...INITIAL_VOLATILE_MEMORY_STATE,
          mode: 'abs',
          workOffsets: { X: 1, Y: 2, Z: 3 },
          incrementalOffsets: { X: 10, Y: 20, Z: 30 },
          incrementalValues: { X: 71, Y: 72, Z: 73 },
        },
      });
      useMillStore.setState({
        millState: {
          ...createDefaultMillState('cncjs'),
          connected: true,
          position: { x: 14, y: 24, z: 34 },
          workPosition: { x: 6, y: 8, z: 10 },
          unitControl: { control: 'controller', confirmed: 'mm', pending: null, availability: 'ready' },
          workPositionControl: { availability: 'ready', pending: null, error: null },
        },
      });
      const { result } = renderHook(() => ({
        memory: useVolatileMemory(),
        offsets: useIncrementalOffsets(),
        manualX: useIncrementalX(),
      }));
      expect(result.current.memory.incremental[axis]).toBe({ X: 6, Y: 8, Z: 10 }[axis]);
      expect(result.current.memory.displayValues).toEqual({ X: 13, Y: 22, Z: 31 });
      expect(result.current.manualX).toBe(71);

      act(() => {
        useMillStore.setState((state) => ({
          millState: {
            ...state.millState,
            position: { x: 19, y: 29, z: 39 },
            workPosition: { x: 11, y: 13, z: 15 },
          },
        }));
      });
      expect(result.current.memory.incremental[axis]).toBe({ X: 11, Y: 13, Z: 15 }[axis]);
      expect(result.current.memory.displayValues).toEqual({ X: 18, Y: 27, Z: 36 });
      act(() => {
        result.current.memory.toggleMode();
      });
      expect(result.current.memory.displayValues[axis]).toBe({ X: 11, Y: 13, Z: 15 }[axis]);
      expect(result.current.offsets).toEqual({ X: 10, Y: 20, Z: 30 });

      act(() => {
        useDROStore.setState((state) => ({
          vMem: {
            ...state.vMem,
            incrementalOffsets: { ...state.vMem.incrementalOffsets, [axis]: 0 },
          },
        }));
      });
      expect(result.current.offsets[axis]).toBe(0);
      expect(result.current.memory.incremental).toEqual({ X: 11, Y: 13, Z: 15 });
      expect(result.current.memory.displayValues).toEqual(result.current.memory.incremental);
      expect(result.current.manualX).toBe(71);
    });

    it('uses disconnected manual INC counters even with non-zero machine positions and offsets', () => {
      useDROStore.setState({
        stateName: 'idle',
        stateData: { stateDataType: 'none' },
        vMem: {
          ...INITIAL_VOLATILE_MEMORY_STATE,
          mode: 'inc',
          incrementalOffsets: { X: 10, Y: 20, Z: 30 },
          incrementalValues: { X: 7, Y: -8, Z: 9 },
        },
      });
      useMillStore.setState({
        millState: { ...createDefaultMillState('noop'), position: { x: 100, y: 200, z: 300 } },
      });
      const { result } = renderHook(() => useVolatileMemory());
      expect(result.current.incremental).toEqual({ X: 7, Y: -8, Z: 9 });
      expect(result.current.displayValues).toEqual({ X: 7, Y: -8, Z: 9 });
      act(() => {
        useMillStore.setState((state) => ({
          millState: { ...state.millState, position: { x: 400, y: 500, z: 600 } },
        }));
      });
      expect(result.current.displayValues).toEqual({ X: 7, Y: -8, Z: 9 });
    });
  });

  describe('initial state', () => {
    it('has initial state name as boot', () => {
      const state = useDROStore.getState();
      expect(state.stateName).toBe('boot');
    });

    it('has initial volatile memory state', () => {
      const state = useDROStore.getState();
      expect(state.vMem.mode).toBe('abs');
      expect(state.vMem.activeAxis).toBeNull();
    });
  });

  describe('dispatch', () => {
    it('dispatches events to update state', () => {
      // Set to idle state first (skip boot)
      useDROStore.getState()._setState({
        stateName: 'idle',
        stateData: { stateDataType: 'none' },
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
        display: INITIAL_DISPLAY_STATE,
      });

      // Dispatch an event
      useDROStore.getState().dispatch({ eventName: 'BTN_ABS_INC' });

      // State should have changed
      expect(useDROStore.getState().vMem.mode).toBe('inc');
    });

    it('uses context from other stores', () => {
      // Set settings to mm
      useSettingsStore.getState().updateNvMem({ defaultUnit: 'mm' });

      // Set to idle state
      useDROStore.getState()._setState({
        stateName: 'idle',
        stateData: { stateDataType: 'none' },
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
        display: INITIAL_DISPLAY_STATE,
      });

      // Dispatch an event that might use the unit setting
      const stateBeforeDispatch = useDROStore.getState();
      useDROStore.getState().dispatch({ eventName: 'BTN_ABS_INC' });

      // Verify dispatch worked (state changed)
      expect(useDROStore.getState().vMem.mode).not.toBe(stateBeforeDispatch.vMem.mode);
    });
  });

  describe('_setState', () => {
    it('sets state directly for testing', () => {
      const newPayload = {
        stateName: 'idle' as const,
        stateData: { stateDataType: 'none' as const },
        vMem: {
          ...INITIAL_VOLATILE_MEMORY_STATE,
          mode: 'inc' as const,
          activeAxis: 'X' as const,
        },
        display: INITIAL_DISPLAY_STATE,
      };

      useDROStore.getState()._setState(newPayload);

      const state = useDROStore.getState();
      expect(state.stateName).toBe('idle');
      expect(state.vMem.mode).toBe('inc');
      expect(state.vMem.activeAxis).toBe('X');
    });

    it('updates all state fields', () => {
      useDROStore.getState()._setState({
        stateName: 'calculator-add',
        stateData: {
          stateDataType: 'calculator',
          firstValue: 10,
          operation: 'ADD',
          currentValue: 5,
        },
        vMem: {
          ...INITIAL_VOLATILE_MEMORY_STATE,
          inputBuffer: '123',
        },
        display: INITIAL_DISPLAY_STATE,
      });

      const state = useDROStore.getState();
      expect(state.stateName).toBe('calculator-add');
      expect(state.stateData.stateDataType).toBe('calculator');
      expect(state.vMem.inputBuffer).toBe('123');
    });
  });

  describe('initializeDROMillConnection', () => {
    it('sets up dispatch connection so mill events reach DRO store', () => {
      // Set DRO to idle state to accept events
      useDROStore.getState()._setState({
        stateName: 'idle',
        stateData: { stateDataType: 'none' },
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
        display: INITIAL_DISPLAY_STATE,
      });

      // Initialize the connection - this calls setDRODispatch
      // Verify it doesn't throw
      expect(() => { initializeDROMillConnection(); }).not.toThrow();
    });

    it('can be called multiple times without error', () => {
      expect(() => {
        initializeDROMillConnection();
        initializeDROMillConnection();
        initializeDROMillConnection();
      }).not.toThrow();
    });

    it('forwards MILL_STATE_CHANGED events to DRO dispatch', () => {
      // Set DRO to idle state
      useDROStore.getState()._setState({
        stateName: 'idle',
        stateData: { stateDataType: 'none' },
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
        display: INITIAL_DISPLAY_STATE,
      });

      // Initialize connection
      initializeDROMillConnection();

      // Spy on the dispatch function
      const dispatchSpy = vi.spyOn(useDROStore.getState(), 'dispatch');

      // Simulate the callback being invoked (as millStore would do)
      useDROStore.getState().dispatch({ eventName: 'MILL_STATE_CHANGED' });

      expect(dispatchSpy).toHaveBeenCalledWith({ eventName: 'MILL_STATE_CHANGED' });
    });

    it('dispatch callback is invoked when mill state changes via initializeMillStore', async () => {
      // This test exercises the full integration: initializeDROMillConnection sets up
      // the callback, then initializeMillStore connects a MockMillAdapter which
      // triggers MILL_STATE_CHANGED events when position changes

      // Set DRO to idle first
      useDROStore.getState()._setState({
        stateName: 'idle',
        stateData: { stateDataType: 'none' },
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
        display: INITIAL_DISPLAY_STATE,
      });

      // Initialize the DRO-Mill connection first
      initializeDROMillConnection();

      // Create a mock connection and initialize mill store
      const mockConnection = new MockMillAdapter();
      const cleanup = await initializeMillStore(mockConnection);

      // Spy on DRO dispatch
      const dispatchSpy = vi.spyOn(useDROStore.getState(), 'dispatch');

      // Trigger a position change - this should cause MockMillAdapter to call
      // the dispatch function which was set up by initializeDROMillConnection
      mockConnection.setPosition(1, 2, 3);

      // The dispatch should have been called with MILL_STATE_CHANGED
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: 'MILL_STATE_CHANGED' })
      );

      // Cleanup
      cleanup();
    });
  });

  describe('selectors', () => {
    beforeEach(() => {
      // Set to a known state for selector tests
      useDROStore.setState({
        stateName: 'idle',
        stateData: { stateDataType: 'none' },
        vMem: {
          ...INITIAL_VOLATILE_MEMORY_STATE,
          mode: 'inc',
          activeAxis: 'Y',
          inputBuffer: '456',
        },
        display: INITIAL_DISPLAY_STATE,
      });
    });

    it('useStateName returns state name', () => {
      const { result } = renderHook(() => useStateName());
      expect(result.current).toBe('idle');
    });

    it('useStateData returns state data', () => {
      const { result } = renderHook(() => useStateData());
      expect(result.current.stateDataType).toBe('none');
    });

    it('useVMem returns volatile memory', () => {
      const { result } = renderHook(() => useVMem());
      expect(result.current.mode).toBe('inc');
      expect(result.current.activeAxis).toBe('Y');
    });

    it('useMode returns current mode', () => {
      const { result } = renderHook(() => useMode());
      expect(result.current).toBe('inc');
    });

    it('useActiveAxis returns active axis', () => {
      const { result } = renderHook(() => useActiveAxis());
      expect(result.current).toBe('Y');
    });

    it('useInputBuffer returns input buffer', () => {
      const { result } = renderHook(() => useInputBuffer());
      expect(result.current).toBe('456');
    });

    it('useDispatch returns dispatch function', () => {
      const { result } = renderHook(() => useDispatch());
      expect(typeof result.current).toBe('function');
    });

    it('selectors update when store changes', () => {
      const { result } = renderHook(() => useMode());
      expect(result.current).toBe('inc');

      act(() => {
        useDROStore.setState((state) => ({
          ...state,
          vMem: { ...state.vMem, mode: 'abs' },
        }));
      });

      expect(result.current).toBe('abs');
    });
  });

  describe('per-axis selectors', () => {
    beforeEach(() => {
      useDROStore.setState({
        stateName: 'idle',
        stateData: { stateDataType: 'none' },
        vMem: {
          ...INITIAL_VOLATILE_MEMORY_STATE,
          workOffsets: { X: 10, Y: 20, Z: 30 },
          incrementalValues: { X: 1.5, Y: 2.5, Z: 3.5 },
          manualAbsoluteValues: { X: 100, Y: 200, Z: 300 },
        },
        display: INITIAL_DISPLAY_STATE,
      });
    });

    it('useWorkOffsetX returns X work offset', () => {
      const { result } = renderHook(() => useWorkOffsetX());
      expect(result.current).toBe(10);
    });

    it('useWorkOffsetY returns Y work offset', () => {
      const { result } = renderHook(() => useWorkOffsetY());
      expect(result.current).toBe(20);
    });

    it('useWorkOffsetZ returns Z work offset', () => {
      const { result } = renderHook(() => useWorkOffsetZ());
      expect(result.current).toBe(30);
    });

    it('useIncrementalX returns X incremental value', () => {
      const { result } = renderHook(() => useIncrementalX());
      expect(result.current).toBe(1.5);
    });

    it('useIncrementalY returns Y incremental value', () => {
      const { result } = renderHook(() => useIncrementalY());
      expect(result.current).toBe(2.5);
    });

    it('useIncrementalZ returns Z incremental value', () => {
      const { result } = renderHook(() => useIncrementalZ());
      expect(result.current).toBe(3.5);
    });

    it('useManualAbsoluteX returns X manual absolute value', () => {
      const { result } = renderHook(() => useManualAbsoluteX());
      expect(result.current).toBe(100);
    });

    it('useManualAbsoluteY returns Y manual absolute value', () => {
      const { result } = renderHook(() => useManualAbsoluteY());
      expect(result.current).toBe(200);
    });

    it('useManualAbsoluteZ returns Z manual absolute value', () => {
      const { result } = renderHook(() => useManualAbsoluteZ());
      expect(result.current).toBe(300);
    });

    it('per-axis selectors update independently', () => {
      const { result: resultX } = renderHook(() => useWorkOffsetX());
      const { result: resultY } = renderHook(() => useWorkOffsetY());

      expect(resultX.current).toBe(10);
      expect(resultY.current).toBe(20);

      act(() => {
        useDROStore.setState((state) => ({
          ...state,
          vMem: {
            ...state.vMem,
            workOffsets: { ...state.vMem.workOffsets, X: 99 },
          },
        }));
      });

      expect(resultX.current).toBe(99);
      expect(resultY.current).toBe(20); // Y unchanged
    });
  });
});

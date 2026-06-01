/**
 * DRO Store Hook Tests
 *
 * Tests for Zustand store hooks.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useDROState,
  useDRODispatch,
  useDROContext,
  type DROShape,
} from './index';
import { useDROStore } from '../droStore';
import { useMillStore } from '../millStore';
import { useSettingsStore } from '../settingsStore';
import { INITIAL_DRO_STATE_PAYLOAD, INITIAL_DRO_STATE_DATA } from './droStateMachine';
import { INITIAL_VOLATILE_MEMORY_STATE } from '../../types/volatileMemory';
import { INITIAL_DISPLAY_STATE } from './utils/displayComputation';
import { NoOpMillAdapter } from '../../adapters/NoOpMillAdapter';
import { createDefaultMillState } from '../../types/millState';

/**
 * Reset all stores to initial state before each test.
 */
function resetStores(initialState?: DROShape) {
  // Reset settings store
  useSettingsStore.setState({
    nvMem: {
      beepEnabled: true,
      defaultUnit: 'inch',
      precision: 4,
      bootMessageMode: 'skip',
      scaleResolution: { X: '5', Y: '5', Z: '5' },
      displayResolution: { X: '5', Y: '5', Z: '5' },
      taperOnAxis: 'X',
      axisDirection: { X: 'normal', Y: 'normal', Z: 'normal' },
      zDepthSense: 'depth-negative',
      zeroApproachEnabled: false,
      zeroApproachDistance: '0.002',
      zeroApproachTolerance: '0',
      measurementMode: { X: 'radius', Y: 'radius', Z: 'radius' },
      countingMode: { X: 'linear', Y: 'linear', Z: 'linear' },
      probeDroType: 'transmit',
      encoderFailWarning: false,
    },
  });

  // Reset mill store
  useMillStore.setState({
    millState: createDefaultMillState('noop'),
    connection: new NoOpMillAdapter(),
    isConnecting: false,
    error: null,
  });

  // Reset DRO store
  if (initialState) {
    useDROStore.setState({
      stateName: initialState.stateName,
      stateData: initialState.stateData,
      vMem: initialState.vMem,
      display: initialState.display,
    });
  } else {
    useDROStore.setState({
      stateName: INITIAL_DRO_STATE_PAYLOAD.stateName,
      stateData: INITIAL_DRO_STATE_PAYLOAD.stateData,
      vMem: INITIAL_VOLATILE_MEMORY_STATE,
      display: INITIAL_DISPLAY_STATE,
    });
  }
}

describe('DRO Store Hooks', () => {
  beforeEach(() => {
    resetStores();
  });

  describe('initial state', () => {
    it('should start in boot state by default', () => {
      const { result } = renderHook(() => useDROState());
      expect(result.current).toBe('boot');
    });

    it('should start with none data by default', () => {
      const { result } = renderHook(() => useDROContext());
      expect(result.current.stateDataType).toBe('none');
    });

    it('should accept custom initial state', () => {
      const initialState: DROShape = {
        stateName: 'idle',
        stateData: INITIAL_DRO_STATE_DATA,
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
        display: INITIAL_DISPLAY_STATE,
      };
      resetStores(initialState);

      const { result } = renderHook(() => useDROState());
      expect(result.current).toBe('idle');
    });
  });
});

describe('useDROState', () => {
  beforeEach(() => {
    resetStores({
      stateName: 'idle',
      stateData: INITIAL_DRO_STATE_DATA,
      vMem: INITIAL_VOLATILE_MEMORY_STATE,
      display: INITIAL_DISPLAY_STATE,
    });
  });

  it('should return current state', () => {
    const { result } = renderHook(() => useDROState());
    expect(result.current).toBe('idle');
  });

  it('should update when state changes', () => {
    const { result } = renderHook(() => ({
      state: useDROState(),
      dispatch: useDRODispatch(),
    }));

    act(() => {
      result.current.dispatch({ eventName: 'BTN_FUNCTION' });
    });

    expect(result.current.state).toBe('function-menu-center');
  });
});

describe('useDROContext', () => {
  beforeEach(() => {
    resetStores({
      stateName: 'idle',
      stateData: INITIAL_DRO_STATE_DATA,
      vMem: INITIAL_VOLATILE_MEMORY_STATE,
      display: INITIAL_DISPLAY_STATE,
    });
  });

  it('should return current data', () => {
    const { result } = renderHook(() => useDROContext());
    expect(result.current.stateDataType).toBe('none');
  });

  it('should update when data changes', () => {
    resetStores({
      stateName: 'function-menu-center',
      stateData: INITIAL_DRO_STATE_DATA,
      vMem: INITIAL_VOLATILE_MEMORY_STATE,
      display: INITIAL_DISPLAY_STATE,
    });

    const { result } = renderHook(() => ({
      data: useDROContext(),
      dispatch: useDRODispatch(),
    }));

    act(() => {
      result.current.dispatch({ eventName: 'KEY_ENTER' });
    });

    expect(result.current.data.stateDataType).toBe('center-finding');
  });
});

describe('useDRODispatch', () => {
  beforeEach(() => {
    resetStores();
  });

  it('should return dispatch function', () => {
    const { result } = renderHook(() => useDRODispatch());
    expect(typeof result.current).toBe('function');
  });

  it('should dispatch events that trigger state transitions', () => {
    const { result } = renderHook(() => ({
      state: useDROState(),
      dispatch: useDRODispatch(),
    }));

    act(() => {
      result.current.dispatch({ eventName: 'BOOT_STARTED', skipBootMessage: true });
    });

    expect(result.current.state).toBe('idle');
  });
});

describe('Store integration', () => {
  beforeEach(() => {
    resetStores();
  });

  it('should support full center-line workflow through hooks', () => {
    const { result } = renderHook(() => ({
      state: useDROState(),
      data: useDROContext(),
      dispatch: useDRODispatch(),
    }));

    // Boot complete
    act(() => {
      result.current.dispatch({ eventName: 'BOOT_STARTED', skipBootMessage: true });
    });
    expect(result.current.state).toBe('idle');

    // Open function menu
    act(() => {
      result.current.dispatch({ eventName: 'BTN_FUNCTION' });
    });
    expect(result.current.state).toBe('function-menu-center');

    // Enter center finding
    act(() => {
      result.current.dispatch({ eventName: 'KEY_ENTER' });
    });
    expect(result.current.state).toBe('function-menu-center-line-point-1');
    expect(result.current.data.stateDataType).toBe('center-finding');

    // First point - KEY_6_RIGHT captures current position from vMem
    act(() => {
      result.current.dispatch({ eventName: 'KEY_6_RIGHT' });
    });
    expect(result.current.state).toBe('function-menu-center-line-point-2');

    // Second point
    act(() => {
      result.current.dispatch({ eventName: 'KEY_6_RIGHT' });
    });
    expect(result.current.state).toBe('function-menu-center-line-result');

    // Exit to idle
    act(() => {
      result.current.dispatch({ eventName: 'KEY_CLEAR' });
    });
    expect(result.current.state).toBe('idle');
    expect(result.current.data.stateDataType).toBe('none');
  });
});

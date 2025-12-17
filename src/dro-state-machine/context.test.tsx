/**
 * Context and Hooks Tests
 *
 * Tests for React context provider and hooks.
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
  DROProvider,
  useDROState,
  useDRODispatch,
  useDROContext,
  type DROShape,
} from './index';
import { INITIAL_DRO_STATE, INITIAL_DRO_STATE_DATA } from './droStateMachine';

const DEFAULT_INITIAL_SHAPE: DROShape = {
  stateName: INITIAL_DRO_STATE,
  stateData: INITIAL_DRO_STATE_DATA,
};

function createWrapper(initialState?: DROShape) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <DROProvider initialState={initialState ?? DEFAULT_INITIAL_SHAPE}>
        {children}
      </DROProvider>
    );
  };
}

describe('DROProvider', () => {
  describe('context access', () => {
    it('should throw error when hooks are used outside provider', () => {
      expect(() => {
        renderHook(() => useDROState());
      }).toThrow('useDROState must be used within a DROProvider');
    });

    it('should provide context when wrapped in provider', () => {
      const { result } = renderHook(() => useDROState(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBe('boot');
    });
  });

  describe('initial state', () => {
    it('should start in boot state by default', () => {
      const { result } = renderHook(() => useDROState(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBe('boot');
    });

    it('should start with none data by default', () => {
      const { result } = renderHook(() => useDROContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current.stateDataType).toBe('none');
    });

    it('should accept custom initial state', () => {
      const initialState: DROShape = {
        stateName: 'idle',
        stateData: INITIAL_DRO_STATE_DATA,
      };

      const { result } = renderHook(() => useDROState(), {
        wrapper: createWrapper(initialState),
      });

      expect(result.current).toBe('idle');
    });
  });
});

describe('useDROState', () => {
  it('should return current state', () => {
    const { result } = renderHook(() => useDROState(), {
      wrapper: createWrapper({ stateName: 'idle', stateData: INITIAL_DRO_STATE_DATA }),
    });

    expect(result.current).toBe('idle');
  });

  it('should update when state changes', () => {
    const { result } = renderHook(
      () => ({
        state: useDROState(),
        dispatch: useDRODispatch(),
      }),
      { wrapper: createWrapper({ stateName: 'idle', stateData: INITIAL_DRO_STATE_DATA }) }
    );

    act(() => {
      result.current.dispatch({ eventName: 'BTN_FUNCTION' });
    });

    expect(result.current.state).toBe('function-menu-center');
  });
});

describe('useDROContext', () => {
  it('should return current data', () => {
    const { result } = renderHook(() => useDROContext(), {
      wrapper: createWrapper({ stateName: 'idle', stateData: INITIAL_DRO_STATE_DATA }),
    });

    expect(result.current.stateDataType).toBe('none');
  });

  it('should update when data changes', () => {
    const { result } = renderHook(
      () => ({
        data: useDROContext(),
        dispatch: useDRODispatch(),
      }),
      {
        wrapper: createWrapper({
          stateName: 'function-menu-center',
          stateData: INITIAL_DRO_STATE_DATA,
        }),
      }
    );

    act(() => {
      result.current.dispatch({ eventName: 'KEY_ENTER' });
    });

    expect(result.current.data.stateDataType).toBe('center-finding');
  });
});

describe('useDRODispatch', () => {
  it('should return dispatch function', () => {
    const { result } = renderHook(() => useDRODispatch(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current).toBe('function');
  });

  it('should dispatch events that trigger state transitions', () => {
    const { result } = renderHook(
      () => ({
        state: useDROState(),
        dispatch: useDRODispatch(),
      }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.dispatch({ eventName: 'BOOT_STARTED', skipBootMessage: true });
    });

    expect(result.current.state).toBe('idle');
  });
});

describe('Provider integration', () => {
  it('should support full center-line workflow through hooks', () => {
    const { result } = renderHook(
      () => ({
        state: useDROState(),
        data: useDROContext(),
        dispatch: useDRODispatch(),
      }),
      { wrapper: createWrapper() }
    );

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

    // First point
    act(() => {
      result.current.dispatch({
        eventName: 'POINT_DATA',
        point: { X: 0, Y: 0, Z: 0 },
      });
    });
    expect(result.current.state).toBe('function-menu-center-line-point-2');

    // Second point
    act(() => {
      result.current.dispatch({
        eventName: 'POINT_DATA',
        point: { X: 100, Y: 0, Z: 0 },
      });
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

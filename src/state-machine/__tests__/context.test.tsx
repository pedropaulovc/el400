/**
 * Context and Hooks Tests
 *
 * Tests for React context provider and hooks.
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
  OperationStateProvider,
  useOperationState,
  useOperationDispatch,
  useOperationContext,
  useCenterResult,
  useStoredPointsCount,
  type OperationStateShape,
} from '../index';
import { INITIAL_OPERATION_CONTEXT } from '../../types/operationState';

function createWrapper(initialState?: OperationStateShape) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <OperationStateProvider initialState={initialState}>
        {children}
      </OperationStateProvider>
    );
  };
}

describe('OperationStateProvider', () => {
  describe('context access', () => {
    it('should throw error when hooks are used outside provider', () => {
      expect(() => {
        renderHook(() => useOperationState());
      }).toThrow('useOperationState must be used within an OperationStateProvider');
    });

    it('should provide context when wrapped in provider', () => {
      const { result } = renderHook(() => useOperationState(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBe('boot');
    });
  });

  describe('initial state', () => {
    it('should start in boot state by default', () => {
      const { result } = renderHook(() => useOperationState(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBe('boot');
    });

    it('should start with none context by default', () => {
      const { result } = renderHook(() => useOperationContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current.type).toBe('none');
    });

    it('should accept custom initial state', () => {
      const initialState: OperationStateShape = {
        state: 'idle',
        context: INITIAL_OPERATION_CONTEXT,
      };

      const { result } = renderHook(() => useOperationState(), {
        wrapper: createWrapper(initialState),
      });

      expect(result.current).toBe('idle');
    });
  });
});

describe('useOperationState', () => {
  it('should return current state', () => {
    const { result } = renderHook(() => useOperationState(), {
      wrapper: createWrapper({ state: 'idle', context: INITIAL_OPERATION_CONTEXT }),
    });

    expect(result.current).toBe('idle');
  });

  it('should update when state changes', () => {
    const { result } = renderHook(
      () => ({
        state: useOperationState(),
        dispatch: useOperationDispatch(),
      }),
      { wrapper: createWrapper({ state: 'idle', context: INITIAL_OPERATION_CONTEXT }) }
    );

    act(() => {
      result.current.dispatch({ type: 'BTN_FUNCTION' });
    });

    expect(result.current.state).toBe('function-menu-center');
  });
});

describe('useOperationContext', () => {
  it('should return current context', () => {
    const { result } = renderHook(() => useOperationContext(), {
      wrapper: createWrapper({ state: 'idle', context: INITIAL_OPERATION_CONTEXT }),
    });

    expect(result.current.type).toBe('none');
  });

  it('should update when context changes', () => {
    const { result } = renderHook(
      () => ({
        context: useOperationContext(),
        dispatch: useOperationDispatch(),
      }),
      {
        wrapper: createWrapper({
          state: 'function-menu-center',
          context: INITIAL_OPERATION_CONTEXT,
        }),
      }
    );

    act(() => {
      result.current.dispatch({ type: 'KEY_ENTER' });
    });

    expect(result.current.context.type).toBe('center-finding');
  });
});

describe('useOperationDispatch', () => {
  it('should return dispatch function', () => {
    const { result } = renderHook(() => useOperationDispatch(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current).toBe('function');
  });

  it('should dispatch events that trigger state transitions', () => {
    const { result } = renderHook(
      () => ({
        state: useOperationState(),
        dispatch: useOperationDispatch(),
      }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.dispatch({ type: 'BOOT_COMPLETE', skipMessage: true });
    });

    expect(result.current.state).toBe('idle');
  });
});

describe('useCenterResult', () => {
  it('should return null when not in center-finding context', () => {
    const { result } = renderHook(() => useCenterResult(), {
      wrapper: createWrapper({ state: 'idle', context: INITIAL_OPERATION_CONTEXT }),
    });

    expect(result.current).toBeNull();
  });

  it('should return null when in center-finding but no result yet', () => {
    const { result } = renderHook(() => useCenterResult(), {
      wrapper: createWrapper({
        state: 'function-menu-center-line-point-1',
        context: { type: 'center-finding', storedPoints: [], centerResult: null },
      }),
    });

    expect(result.current).toBeNull();
  });

  it('should return center result when available', () => {
    const centerResult = { X: 50, Y: 100, Z: 0 };
    const { result } = renderHook(() => useCenterResult(), {
      wrapper: createWrapper({
        state: 'function-menu-center-line-result',
        context: {
          type: 'center-finding',
          storedPoints: [
            { X: 0, Y: 0, Z: 0 },
            { X: 100, Y: 200, Z: 0 },
          ],
          centerResult,
        },
      }),
    });

    expect(result.current).toEqual(centerResult);
  });
});

describe('useStoredPointsCount', () => {
  it('should return 0 when not in center-finding context', () => {
    const { result } = renderHook(() => useStoredPointsCount(), {
      wrapper: createWrapper({ state: 'idle', context: INITIAL_OPERATION_CONTEXT }),
    });

    expect(result.current).toBe(0);
  });

  it('should return 0 when in center-finding with no points', () => {
    const { result } = renderHook(() => useStoredPointsCount(), {
      wrapper: createWrapper({
        state: 'function-menu-center-line-point-1',
        context: { type: 'center-finding', storedPoints: [], centerResult: null },
      }),
    });

    expect(result.current).toBe(0);
  });

  it('should return correct count of stored points', () => {
    const { result } = renderHook(() => useStoredPointsCount(), {
      wrapper: createWrapper({
        state: 'function-menu-center-line-point-2',
        context: {
          type: 'center-finding',
          storedPoints: [{ X: 10, Y: 20, Z: 30 }],
          centerResult: null,
        },
      }),
    });

    expect(result.current).toBe(1);
  });

  it('should update when points are added', () => {
    const { result } = renderHook(
      () => ({
        count: useStoredPointsCount(),
        dispatch: useOperationDispatch(),
      }),
      {
        wrapper: createWrapper({
          state: 'function-menu-center-line-point-1',
          context: { type: 'center-finding', storedPoints: [], centerResult: null },
        }),
      }
    );

    expect(result.current.count).toBe(0);

    act(() => {
      result.current.dispatch({
        type: 'POINT_DATA',
        point: { X: 10, Y: 20, Z: 30 },
      });
    });

    expect(result.current.count).toBe(1);
  });
});

describe('Provider integration', () => {
  it('should support full center-line workflow through hooks', () => {
    const { result } = renderHook(
      () => ({
        state: useOperationState(),
        context: useOperationContext(),
        centerResult: useCenterResult(),
        pointsCount: useStoredPointsCount(),
        dispatch: useOperationDispatch(),
      }),
      { wrapper: createWrapper() }
    );

    // Boot complete
    act(() => {
      result.current.dispatch({ type: 'BOOT_COMPLETE', skipMessage: true });
    });
    expect(result.current.state).toBe('idle');

    // Open function menu
    act(() => {
      result.current.dispatch({ type: 'BTN_FUNCTION' });
    });
    expect(result.current.state).toBe('function-menu-center');

    // Enter center finding
    act(() => {
      result.current.dispatch({ type: 'KEY_ENTER' });
    });
    expect(result.current.state).toBe('function-menu-center-line-point-1');
    expect(result.current.context.type).toBe('center-finding');
    expect(result.current.pointsCount).toBe(0);

    // First point
    act(() => {
      result.current.dispatch({
        type: 'POINT_DATA',
        point: { X: 0, Y: 0, Z: 0 },
      });
    });
    expect(result.current.state).toBe('function-menu-center-line-point-2');
    expect(result.current.pointsCount).toBe(1);

    // Second point
    act(() => {
      result.current.dispatch({
        type: 'POINT_DATA',
        point: { X: 100, Y: 0, Z: 0 },
      });
    });
    expect(result.current.state).toBe('function-menu-center-line-result');
    expect(result.current.pointsCount).toBe(2);
    expect(result.current.centerResult).toEqual({ X: 50, Y: 0, Z: 0 });

    // Exit to idle
    act(() => {
      result.current.dispatch({ type: 'KEY_CLEAR' });
    });
    expect(result.current.state).toBe('idle');
    expect(result.current.context.type).toBe('none');
    expect(result.current.centerResult).toBeNull();
  });
});

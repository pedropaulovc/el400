/**
 * Context and Hooks Tests
 *
 * Tests for React context provider and hooks.
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
  DROModeProvider,
  useDROModeState,
  useDROModeDispatch,
  useDROModeData,
  useCenterResult,
  useStoredPointsCount,
  type DROModeShape,
} from './index';
import { INITIAL_DRO_MODE_DATA } from '../types/droMode';

function createWrapper(initialState?: DROModeShape) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <DROModeProvider initialState={initialState}>{children}</DROModeProvider>
    );
  };
}

describe('DROModeProvider', () => {
  describe('context access', () => {
    it('should throw error when hooks are used outside provider', () => {
      expect(() => {
        renderHook(() => useDROModeState());
      }).toThrow('useDROModeState must be used within a DROModeProvider');
    });

    it('should provide context when wrapped in provider', () => {
      const { result } = renderHook(() => useDROModeState(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBe('boot');
    });
  });

  describe('initial state', () => {
    it('should start in boot state by default', () => {
      const { result } = renderHook(() => useDROModeState(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBe('boot');
    });

    it('should start with none data by default', () => {
      const { result } = renderHook(() => useDROModeData(), {
        wrapper: createWrapper(),
      });

      expect(result.current.type).toBe('none');
    });

    it('should accept custom initial state', () => {
      const initialState: DROModeShape = {
        state: 'idle',
        data: INITIAL_DRO_MODE_DATA,
      };

      const { result } = renderHook(() => useDROModeState(), {
        wrapper: createWrapper(initialState),
      });

      expect(result.current).toBe('idle');
    });
  });
});

describe('useDROModeState', () => {
  it('should return current state', () => {
    const { result } = renderHook(() => useDROModeState(), {
      wrapper: createWrapper({ state: 'idle', data: INITIAL_DRO_MODE_DATA }),
    });

    expect(result.current).toBe('idle');
  });

  it('should update when state changes', () => {
    const { result } = renderHook(
      () => ({
        state: useDROModeState(),
        dispatch: useDROModeDispatch(),
      }),
      { wrapper: createWrapper({ state: 'idle', data: INITIAL_DRO_MODE_DATA }) }
    );

    act(() => {
      result.current.dispatch({ type: 'BTN_FUNCTION' });
    });

    expect(result.current.state).toBe('function-menu-center');
  });
});

describe('useDROModeData', () => {
  it('should return current data', () => {
    const { result } = renderHook(() => useDROModeData(), {
      wrapper: createWrapper({ state: 'idle', data: INITIAL_DRO_MODE_DATA }),
    });

    expect(result.current.type).toBe('none');
  });

  it('should update when data changes', () => {
    const { result } = renderHook(
      () => ({
        data: useDROModeData(),
        dispatch: useDROModeDispatch(),
      }),
      {
        wrapper: createWrapper({
          state: 'function-menu-center',
          data: INITIAL_DRO_MODE_DATA,
        }),
      }
    );

    act(() => {
      result.current.dispatch({ type: 'KEY_ENTER' });
    });

    expect(result.current.data.type).toBe('center-finding');
  });
});

describe('useDROModeDispatch', () => {
  it('should return dispatch function', () => {
    const { result } = renderHook(() => useDROModeDispatch(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current).toBe('function');
  });

  it('should dispatch events that trigger state transitions', () => {
    const { result } = renderHook(
      () => ({
        state: useDROModeState(),
        dispatch: useDROModeDispatch(),
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
  it('should return null when not in center-finding data', () => {
    const { result } = renderHook(() => useCenterResult(), {
      wrapper: createWrapper({ state: 'idle', data: INITIAL_DRO_MODE_DATA }),
    });

    expect(result.current).toBeNull();
  });

  it('should return null when in center-finding but no result yet', () => {
    const { result } = renderHook(() => useCenterResult(), {
      wrapper: createWrapper({
        state: 'function-menu-center-line-point-1',
        data: { type: 'center-finding', storedPoints: [], centerResult: null },
      }),
    });

    expect(result.current).toBeNull();
  });

  it('should return center result when available', () => {
    const centerResult = { X: 50, Y: 100, Z: 0 };
    const { result } = renderHook(() => useCenterResult(), {
      wrapper: createWrapper({
        state: 'function-menu-center-line-result',
        data: {
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
  it('should return 0 when not in center-finding data', () => {
    const { result } = renderHook(() => useStoredPointsCount(), {
      wrapper: createWrapper({ state: 'idle', data: INITIAL_DRO_MODE_DATA }),
    });

    expect(result.current).toBe(0);
  });

  it('should return 0 when in center-finding with no points', () => {
    const { result } = renderHook(() => useStoredPointsCount(), {
      wrapper: createWrapper({
        state: 'function-menu-center-line-point-1',
        data: { type: 'center-finding', storedPoints: [], centerResult: null },
      }),
    });

    expect(result.current).toBe(0);
  });

  it('should return correct count of stored points', () => {
    const { result } = renderHook(() => useStoredPointsCount(), {
      wrapper: createWrapper({
        state: 'function-menu-center-line-point-2',
        data: {
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
        dispatch: useDROModeDispatch(),
      }),
      {
        wrapper: createWrapper({
          state: 'function-menu-center-line-point-1',
          data: { type: 'center-finding', storedPoints: [], centerResult: null },
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
        state: useDROModeState(),
        data: useDROModeData(),
        centerResult: useCenterResult(),
        pointsCount: useStoredPointsCount(),
        dispatch: useDROModeDispatch(),
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
    expect(result.current.data.type).toBe('center-finding');
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
    expect(result.current.data.type).toBe('none');
    expect(result.current.centerResult).toBeNull();
  });
});

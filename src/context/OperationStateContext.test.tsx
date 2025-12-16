import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ReactNode } from 'react';
import {
  OperationStateProvider,
  useOperationState,
  useOperationDispatch,
  useOperationContext,
  useCenterResult,
  useStoredPointsCount,
  isFunctionMenuSelectionState,
  isCollectingPoints,
  isCenterLineState,
  isCenterCircleState,
  isResultState,
  isFunctionActive,
} from './OperationStateContext';
import type { OperationState, OperationStateShape } from './OperationStateContext';
import { INITIAL_OPERATION_CONTEXT } from '../types/operationState';

function createWrapper(initialState?: OperationStateShape) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <OperationStateProvider initialState={initialState}>
        {children}
      </OperationStateProvider>
    );
  };
}

function useAllOperationHooks() {
  const state = useOperationState();
  const dispatch = useOperationDispatch();
  const context = useOperationContext();
  const centerResult = useCenterResult();
  const storedPointsCount = useStoredPointsCount();
  return { state, dispatch, context, centerResult, storedPointsCount };
}

describe('OperationStateContext', () => {
  describe('Context hook', () => {
    it('throws error when used outside provider', () => {
      expect(() => {
        renderHook(() => useOperationState());
      }).toThrow('useOperationState must be used within an OperationStateProvider');
    });
  });

  describe('Initial state', () => {
    it('starts in boot state', () => {
      const { result } = renderHook(() => useAllOperationHooks(), {
        wrapper: createWrapper(),
      });

      expect(result.current.state).toBe('boot');
    });

    it('starts with none context', () => {
      const { result } = renderHook(() => useAllOperationHooks(), {
        wrapper: createWrapper(),
      });

      expect(result.current.context.type).toBe('none');
    });
  });

  describe('Boot sequence', () => {
    it('transitions to showMessage when BOOT_COMPLETE with skipMessage=false', () => {
      const { result } = renderHook(() => useAllOperationHooks(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.dispatch({ type: 'BOOT_COMPLETE', skipMessage: false });
      });

      expect(result.current.state).toBe('showMessage');
    });

    it('transitions to idle when BOOT_COMPLETE with skipMessage=true', () => {
      const { result } = renderHook(() => useAllOperationHooks(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.dispatch({ type: 'BOOT_COMPLETE', skipMessage: true });
      });

      expect(result.current.state).toBe('idle');
    });

    it('transitions from showMessage to idle on BOOT_MESSAGE_TIMEOUT', () => {
      const { result } = renderHook(() => useAllOperationHooks(), {
        wrapper: createWrapper({ state: 'showMessage', context: INITIAL_OPERATION_CONTEXT }),
      });

      act(() => {
        result.current.dispatch({ type: 'BOOT_MESSAGE_TIMEOUT' });
      });

      expect(result.current.state).toBe('idle');
    });

    it('transitions from showMessage to idle on KEY_CLEAR', () => {
      const { result } = renderHook(() => useAllOperationHooks(), {
        wrapper: createWrapper({ state: 'showMessage', context: INITIAL_OPERATION_CONTEXT }),
      });

      act(() => {
        result.current.dispatch({ type: 'KEY_CLEAR' });
      });

      expect(result.current.state).toBe('idle');
    });
  });

  describe('Mode toggles', () => {
    it('transitions idle to abs-inc-mode on BTN_ABS_INC', () => {
      const { result } = renderHook(() => useAllOperationHooks(), {
        wrapper: createWrapper({ state: 'idle', context: INITIAL_OPERATION_CONTEXT }),
      });

      act(() => {
        result.current.dispatch({ type: 'BTN_ABS_INC' });
      });

      expect(result.current.state).toBe('abs-inc-mode');
    });

    it('transitions abs-inc-mode back to idle on MODE_TOGGLE_COMPLETE', () => {
      const { result } = renderHook(() => useAllOperationHooks(), {
        wrapper: createWrapper({ state: 'abs-inc-mode', context: INITIAL_OPERATION_CONTEXT }),
      });

      act(() => {
        result.current.dispatch({ type: 'MODE_TOGGLE_COMPLETE' });
      });

      expect(result.current.state).toBe('idle');
    });

    it('transitions idle to inch-mm-mode on BTN_INCH_MM', () => {
      const { result } = renderHook(() => useAllOperationHooks(), {
        wrapper: createWrapper({ state: 'idle', context: INITIAL_OPERATION_CONTEXT }),
      });

      act(() => {
        result.current.dispatch({ type: 'BTN_INCH_MM' });
      });

      expect(result.current.state).toBe('inch-mm-mode');
    });

    it('transitions inch-mm-mode back to idle on MODE_TOGGLE_COMPLETE', () => {
      const { result } = renderHook(() => useAllOperationHooks(), {
        wrapper: createWrapper({ state: 'inch-mm-mode', context: INITIAL_OPERATION_CONTEXT }),
      });

      act(() => {
        result.current.dispatch({ type: 'MODE_TOGGLE_COMPLETE' });
      });

      expect(result.current.state).toBe('idle');
    });
  });

  describe('Function menu navigation', () => {
    it('opens function menu on BTN_FUNCTION from idle', () => {
      const { result } = renderHook(() => useAllOperationHooks(), {
        wrapper: createWrapper({ state: 'idle', context: INITIAL_OPERATION_CONTEXT }),
      });

      act(() => {
        result.current.dispatch({ type: 'BTN_FUNCTION' });
      });

      expect(result.current.state).toBe('function-menu-center');
    });

    it('cycles forward through menu with KEY_6', () => {
      const menuStates: OperationState[] = [
        'function-menu-center',
        'function-menu-circle',
        'function-menu-line',
        'function-menu-linear',
        'function-menu-polar',
      ];

      for (let i = 0; i < menuStates.length; i++) {
        const { result } = renderHook(() => useAllOperationHooks(), {
          wrapper: createWrapper({ state: menuStates[i], context: INITIAL_OPERATION_CONTEXT }),
        });

        act(() => {
          result.current.dispatch({ type: 'KEY_6' });
        });

        const expectedNext = menuStates[(i + 1) % menuStates.length];
        expect(result.current.state).toBe(expectedNext);
      }
    });

    it('cycles backward through menu with KEY_4', () => {
      const menuStates: OperationState[] = [
        'function-menu-center',
        'function-menu-circle',
        'function-menu-line',
        'function-menu-linear',
        'function-menu-polar',
      ];

      for (let i = 0; i < menuStates.length; i++) {
        const { result } = renderHook(() => useAllOperationHooks(), {
          wrapper: createWrapper({ state: menuStates[i], context: INITIAL_OPERATION_CONTEXT }),
        });

        act(() => {
          result.current.dispatch({ type: 'KEY_4' });
        });

        const expectedPrev = menuStates[(i - 1 + menuStates.length) % menuStates.length];
        expect(result.current.state).toBe(expectedPrev);
      }
    });

    it('wraps from polar to center with KEY_6', () => {
      const { result } = renderHook(() => useAllOperationHooks(), {
        wrapper: createWrapper({ state: 'function-menu-polar', context: INITIAL_OPERATION_CONTEXT }),
      });

      act(() => {
        result.current.dispatch({ type: 'KEY_6' });
      });

      expect(result.current.state).toBe('function-menu-center');
    });

    it('wraps from center to polar with KEY_4', () => {
      const { result } = renderHook(() => useAllOperationHooks(), {
        wrapper: createWrapper({ state: 'function-menu-center', context: INITIAL_OPERATION_CONTEXT }),
      });

      act(() => {
        result.current.dispatch({ type: 'KEY_4' });
      });

      expect(result.current.state).toBe('function-menu-polar');
    });

    it('exits menu to idle on KEY_CLEAR', () => {
      const menuStates: OperationState[] = [
        'function-menu-center',
        'function-menu-circle',
        'function-menu-line',
        'function-menu-linear',
        'function-menu-polar',
      ];

      for (const menuState of menuStates) {
        const { result } = renderHook(() => useAllOperationHooks(), {
          wrapper: createWrapper({ state: menuState, context: INITIAL_OPERATION_CONTEXT }),
        });

        act(() => {
          result.current.dispatch({ type: 'KEY_CLEAR' });
        });

        expect(result.current.state).toBe('idle');
      }
    });
  });

  describe('Center line point collection', () => {
    it('enters line point-1 from center menu on KEY_ENTER', () => {
      const { result } = renderHook(() => useAllOperationHooks(), {
        wrapper: createWrapper({ state: 'function-menu-center', context: INITIAL_OPERATION_CONTEXT }),
      });

      act(() => {
        result.current.dispatch({ type: 'KEY_ENTER' });
      });

      expect(result.current.state).toBe('function-menu-center-line-point-1');
      expect(result.current.context.type).toBe('center-finding');
      expect(result.current.storedPointsCount).toBe(0);
    });

    it('enters line point-1 from line menu on KEY_ENTER', () => {
      const { result } = renderHook(() => useAllOperationHooks(), {
        wrapper: createWrapper({ state: 'function-menu-line', context: INITIAL_OPERATION_CONTEXT }),
      });

      act(() => {
        result.current.dispatch({ type: 'KEY_ENTER' });
      });

      expect(result.current.state).toBe('function-menu-center-line-point-1');
    });

    it('stores first point and advances to point-2', () => {
      const { result } = renderHook(() => useAllOperationHooks(), {
        wrapper: createWrapper({ state: 'function-menu-center-line-point-1', context: { type: 'center-finding', storedPoints: [], centerResult: null } }),
      });

      act(() => {
        result.current.dispatch({ type: 'POINT_DATA', point: { X: 10, Y: 20, Z: 30 } });
      });

      expect(result.current.state).toBe('function-menu-center-line-point-2');
      expect(result.current.storedPointsCount).toBe(1);
    });

    it('stores second point and calculates result', () => {
      const { result } = renderHook(() => useAllOperationHooks(), {
        wrapper: createWrapper({
          state: 'function-menu-center-line-point-2',
          context: { type: 'center-finding', storedPoints: [{ X: 0, Y: 0, Z: 0 }], centerResult: null },
        }),
      });

      act(() => {
        result.current.dispatch({ type: 'POINT_DATA', point: { X: 100, Y: 200, Z: 100 } });
      });

      expect(result.current.state).toBe('function-menu-center-line-result');
      expect(result.current.storedPointsCount).toBe(2);
      expect(result.current.centerResult).not.toBeNull();
      expect(result.current.centerResult?.X).toBe(50);
      expect(result.current.centerResult?.Y).toBe(100);
      expect(result.current.centerResult?.Z).toBe(50);
    });

    it('exits line result to idle on KEY_CLEAR', () => {
      const { result } = renderHook(() => useAllOperationHooks(), {
        wrapper: createWrapper({
          state: 'function-menu-center-line-result',
          context: { type: 'center-finding', storedPoints: [{ X: 0, Y: 0, Z: 0 }, { X: 100, Y: 100, Z: 100 }], centerResult: { X: 50, Y: 50, Z: 50 } },
        }),
      });

      act(() => {
        result.current.dispatch({ type: 'KEY_CLEAR' });
      });

      expect(result.current.state).toBe('idle');
      expect(result.current.context.type).toBe('none');
    });

    it('can cancel from any line point collection state', () => {
      const lineStates: OperationState[] = [
        'function-menu-center-line-point-1',
        'function-menu-center-line-point-2',
      ];

      for (const lineState of lineStates) {
        const { result } = renderHook(() => useAllOperationHooks(), {
          wrapper: createWrapper({ state: lineState, context: { type: 'center-finding', storedPoints: [], centerResult: null } }),
        });

        act(() => {
          result.current.dispatch({ type: 'KEY_CLEAR' });
        });

        expect(result.current.state).toBe('idle');
      }
    });
  });

  describe('Center circle point collection', () => {
    it('enters circle point-1 from circle menu on KEY_ENTER', () => {
      const { result } = renderHook(() => useAllOperationHooks(), {
        wrapper: createWrapper({ state: 'function-menu-circle', context: INITIAL_OPERATION_CONTEXT }),
      });

      act(() => {
        result.current.dispatch({ type: 'KEY_ENTER' });
      });

      expect(result.current.state).toBe('function-menu-center-circle-point-1');
      expect(result.current.context.type).toBe('center-finding');
    });

    it('collects all 3 points and calculates circle center', () => {
      const { result } = renderHook(() => useAllOperationHooks(), {
        wrapper: createWrapper({ state: 'function-menu-center-circle-point-1', context: { type: 'center-finding', storedPoints: [], centerResult: null } }),
      });

      // Point 1: (0, 10)
      act(() => {
        result.current.dispatch({ type: 'POINT_DATA', point: { X: 0, Y: 10, Z: 0 } });
      });
      expect(result.current.state).toBe('function-menu-center-circle-point-2');

      // Point 2: (10, 0)
      act(() => {
        result.current.dispatch({ type: 'POINT_DATA', point: { X: 10, Y: 0, Z: 0 } });
      });
      expect(result.current.state).toBe('function-menu-center-circle-point-3');

      // Point 3: (-10, 0)
      act(() => {
        result.current.dispatch({ type: 'POINT_DATA', point: { X: -10, Y: 0, Z: 0 } });
      });

      expect(result.current.state).toBe('function-menu-center-circle-result');
      expect(result.current.storedPointsCount).toBe(3);
      expect(result.current.centerResult).not.toBeNull();
      // Circle center should be at (0, 0) for these points
      expect(result.current.centerResult?.X).toBeCloseTo(0, 5);
      expect(result.current.centerResult?.Y).toBeCloseTo(0, 5);
    });

    it('exits circle result to idle on KEY_CLEAR', () => {
      const { result } = renderHook(() => useAllOperationHooks(), {
        wrapper: createWrapper({
          state: 'function-menu-center-circle-result',
          context: { type: 'center-finding', storedPoints: [{ X: 0, Y: 10, Z: 0 }, { X: 10, Y: 0, Z: 0 }, { X: 0, Y: -10, Z: 0 }], centerResult: { X: 0, Y: 0, Z: 0 } },
        }),
      });

      act(() => {
        result.current.dispatch({ type: 'KEY_CLEAR' });
      });

      expect(result.current.state).toBe('idle');
    });

    it('can cancel from any circle point collection state', () => {
      const circleStates: OperationState[] = [
        'function-menu-center-circle-point-1',
        'function-menu-center-circle-point-2',
        'function-menu-center-circle-point-3',
      ];

      for (const circleState of circleStates) {
        const { result } = renderHook(() => useAllOperationHooks(), {
          wrapper: createWrapper({ state: circleState, context: { type: 'center-finding', storedPoints: [], centerResult: null } }),
        });

        act(() => {
          result.current.dispatch({ type: 'KEY_CLEAR' });
        });

        expect(result.current.state).toBe('idle');
      }
    });
  });

  describe('Linear and Polar menu entries', () => {
    it('returns to idle from linear menu on KEY_ENTER (not yet implemented)', () => {
      const { result } = renderHook(() => useAllOperationHooks(), {
        wrapper: createWrapper({ state: 'function-menu-linear', context: INITIAL_OPERATION_CONTEXT }),
      });

      act(() => {
        result.current.dispatch({ type: 'KEY_ENTER' });
      });

      expect(result.current.state).toBe('idle');
    });

    it('returns to idle from polar menu on KEY_ENTER (not yet implemented)', () => {
      const { result } = renderHook(() => useAllOperationHooks(), {
        wrapper: createWrapper({ state: 'function-menu-polar', context: INITIAL_OPERATION_CONTEXT }),
      });

      act(() => {
        result.current.dispatch({ type: 'KEY_ENTER' });
      });

      expect(result.current.state).toBe('idle');
    });
  });

  describe('Type guards', () => {
    it('isFunctionMenuSelectionState correctly identifies menu states', () => {
      expect(isFunctionMenuSelectionState('function-menu-center')).toBe(true);
      expect(isFunctionMenuSelectionState('function-menu-circle')).toBe(true);
      expect(isFunctionMenuSelectionState('function-menu-line')).toBe(true);
      expect(isFunctionMenuSelectionState('function-menu-linear')).toBe(true);
      expect(isFunctionMenuSelectionState('function-menu-polar')).toBe(true);

      expect(isFunctionMenuSelectionState('idle')).toBe(false);
      expect(isFunctionMenuSelectionState('boot')).toBe(false);
      expect(isFunctionMenuSelectionState('function-menu-center-line-point-1')).toBe(false);
      expect(isFunctionMenuSelectionState('function-menu-center-line-result')).toBe(false);
    });

    it('isCollectingPoints correctly identifies point collection states', () => {
      expect(isCollectingPoints('function-menu-center-line-point-1')).toBe(true);
      expect(isCollectingPoints('function-menu-center-line-point-2')).toBe(true);
      expect(isCollectingPoints('function-menu-center-circle-point-1')).toBe(true);
      expect(isCollectingPoints('function-menu-center-circle-point-2')).toBe(true);
      expect(isCollectingPoints('function-menu-center-circle-point-3')).toBe(true);

      expect(isCollectingPoints('idle')).toBe(false);
      expect(isCollectingPoints('function-menu-center')).toBe(false);
      expect(isCollectingPoints('function-menu-center-line-result')).toBe(false);
    });

    it('isCenterLineState correctly identifies center line states', () => {
      expect(isCenterLineState('function-menu-center-line-point-1')).toBe(true);
      expect(isCenterLineState('function-menu-center-line-point-2')).toBe(true);
      expect(isCenterLineState('function-menu-center-line-result')).toBe(true);

      expect(isCenterLineState('function-menu-center-circle-point-1')).toBe(false);
      expect(isCenterLineState('idle')).toBe(false);
    });

    it('isCenterCircleState correctly identifies center circle states', () => {
      expect(isCenterCircleState('function-menu-center-circle-point-1')).toBe(true);
      expect(isCenterCircleState('function-menu-center-circle-point-2')).toBe(true);
      expect(isCenterCircleState('function-menu-center-circle-point-3')).toBe(true);
      expect(isCenterCircleState('function-menu-center-circle-result')).toBe(true);

      expect(isCenterCircleState('function-menu-center-line-point-1')).toBe(false);
      expect(isCenterCircleState('idle')).toBe(false);
    });

    it('isResultState correctly identifies result states', () => {
      expect(isResultState('function-menu-center-line-result')).toBe(true);
      expect(isResultState('function-menu-center-circle-result')).toBe(true);

      expect(isResultState('function-menu-center-line-point-1')).toBe(false);
      expect(isResultState('idle')).toBe(false);
    });

    it('isFunctionActive correctly identifies active function states', () => {
      expect(isFunctionActive('function-menu-center')).toBe(true);
      expect(isFunctionActive('function-menu-center-line-point-1')).toBe(true);
      expect(isFunctionActive('function-menu-center-line-result')).toBe(true);

      expect(isFunctionActive('idle')).toBe(false);
      expect(isFunctionActive('boot')).toBe(false);
      expect(isFunctionActive('showMessage')).toBe(false);
      expect(isFunctionActive('abs-inc-mode')).toBe(false);
      expect(isFunctionActive('inch-mm-mode')).toBe(false);
    });
  });

  describe('Ignored events', () => {
    it('ignores irrelevant events in boot state', () => {
      const { result } = renderHook(() => useAllOperationHooks(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.dispatch({ type: 'BTN_FUNCTION' });
      });
      expect(result.current.state).toBe('boot');

      act(() => {
        result.current.dispatch({ type: 'KEY_ENTER' });
      });
      expect(result.current.state).toBe('boot');
    });

    it('ignores irrelevant events in idle state', () => {
      const { result } = renderHook(() => useAllOperationHooks(), {
        wrapper: createWrapper({ state: 'idle', context: INITIAL_OPERATION_CONTEXT }),
      });

      act(() => {
        result.current.dispatch({ type: 'KEY_6' });
      });
      expect(result.current.state).toBe('idle');

      act(() => {
        result.current.dispatch({ type: 'KEY_ENTER' });
      });
      expect(result.current.state).toBe('idle');
    });
  });
});

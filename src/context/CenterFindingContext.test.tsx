import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { CenterFindingProvider, useCenterFinding } from './CenterFindingContext';

// Wrapper component for testing hooks
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <CenterFindingProvider>{children}</CenterFindingProvider>
);

describe('CenterFindingContext', () => {
  describe('Initial State', () => {
    it('should start in inactive mode', () => {
      const { result } = renderHook(() => useCenterFinding(), { wrapper });

      expect(result.current.mode).toBe('inactive');
      expect(result.current.menuOption).toBe('center');
      expect(result.current.storedPoints).toEqual([]);
      expect(result.current.centerResult).toBeNull();
    });
  });

  describe('Menu Navigation', () => {
    it('should enter menu mode', () => {
      const { result } = renderHook(() => useCenterFinding(), { wrapper });

      act(() => {
        result.current.enterMenu();
      });

      expect(result.current.mode).toBe('menu');
      expect(result.current.menuOption).toBe('center');
    });

    it('should cycle through menu options', () => {
      const { result } = renderHook(() => useCenterFinding(), { wrapper });

      act(() => {
        result.current.enterMenu();
      });

      // Start at 'center'
      expect(result.current.menuOption).toBe('center');

      // Cycle to 'circle'
      act(() => {
        result.current.cycleMenuOption();
      });
      expect(result.current.menuOption).toBe('circle');

      // Cycle to 'line'
      act(() => {
        result.current.cycleMenuOption();
      });
      expect(result.current.menuOption).toBe('line');

      // Cycle back to 'circle'
      act(() => {
        result.current.cycleMenuOption();
      });
      expect(result.current.menuOption).toBe('circle');
    });

    it('should not cycle menu options when not in menu mode', () => {
      const { result } = renderHook(() => useCenterFinding(), { wrapper });

      act(() => {
        result.current.cycleMenuOption();
      });

      // Should remain in inactive mode with center option
      expect(result.current.mode).toBe('inactive');
      expect(result.current.menuOption).toBe('center');
    });
  });

  describe('Line Center Mode', () => {
    it('should select line center mode', () => {
      const { result } = renderHook(() => useCenterFinding(), { wrapper });

      act(() => {
        result.current.enterMenu();
        result.current.selectLine();
      });

      expect(result.current.mode).toBe('line');
      expect(result.current.storedPoints).toEqual([]);
      expect(result.current.centerResult).toBeNull();
    });

    it('should store two points and calculate line center', () => {
      const { result } = renderHook(() => useCenterFinding(), { wrapper });

      act(() => {
        result.current.selectLine();
      });

      // Store first point
      act(() => {
        result.current.storePoint({ X: 0, Y: 0, Z: 0 });
      });

      expect(result.current.storedPoints.length).toBe(1);
      expect(result.current.centerResult).toBeNull();

      // Store second point
      act(() => {
        result.current.storePoint({ X: 100, Y: 0, Z: 0 });
      });

      expect(result.current.storedPoints.length).toBe(2);
      expect(result.current.centerResult).toEqual({
        X: 50,
        Y: 0,
        Z: 0,
      });
    });

    it('should handle line center with different coordinates', () => {
      const { result } = renderHook(() => useCenterFinding(), { wrapper });

      act(() => {
        result.current.selectLine();
        result.current.storePoint({ X: 10, Y: 20, Z: 5 });
        result.current.storePoint({ X: 30, Y: 40, Z: 15 });
      });

      expect(result.current.centerResult).toEqual({
        X: 20,
        Y: 30,
        Z: 10,
      });
    });
  });

  describe('Circle Center Mode', () => {
    it('should select circle center mode', () => {
      const { result } = renderHook(() => useCenterFinding(), { wrapper });

      act(() => {
        result.current.enterMenu();
        result.current.selectCircle();
      });

      expect(result.current.mode).toBe('circle');
      expect(result.current.storedPoints).toEqual([]);
      expect(result.current.centerResult).toBeNull();
    });

    it('should store three points and calculate circle center', () => {
      const { result } = renderHook(() => useCenterFinding(), { wrapper });

      act(() => {
        result.current.selectCircle();
      });

      // Store first point
      act(() => {
        result.current.storePoint({ X: 10, Y: 0, Z: 0 });
      });

      expect(result.current.storedPoints.length).toBe(1);
      expect(result.current.centerResult).toBeNull();

      // Store second point
      act(() => {
        result.current.storePoint({ X: 0, Y: 10, Z: 0 });
      });

      expect(result.current.storedPoints.length).toBe(2);
      expect(result.current.centerResult).toBeNull();

      // Store third point
      act(() => {
        result.current.storePoint({ X: -10, Y: 0, Z: 0 });
      });

      expect(result.current.storedPoints.length).toBe(3);
      expect(result.current.centerResult).toEqual({
        X: 0,
        Y: 0,
        Z: 0,
      });
    });

    it('should handle collinear points gracefully', () => {
      const { result } = renderHook(() => useCenterFinding(), { wrapper });

      act(() => {
        result.current.selectCircle();
        result.current.storePoint({ X: 0, Y: 0, Z: 0 });
        result.current.storePoint({ X: 10, Y: 0, Z: 0 });
        result.current.storePoint({ X: 20, Y: 0, Z: 0 });
      });

      // findCircleCenter returns null for collinear points
      expect(result.current.centerResult).toBeNull();
    });

    it('should average Z coordinate for circle center', () => {
      const { result } = renderHook(() => useCenterFinding(), { wrapper });

      act(() => {
        result.current.selectCircle();
        result.current.storePoint({ X: 10, Y: 0, Z: 3 });
        result.current.storePoint({ X: 0, Y: 10, Z: 6 });
        result.current.storePoint({ X: -10, Y: 0, Z: 9 });
      });

      expect(result.current.centerResult?.Z).toBe(6); // (3+6+9)/3
    });
  });

  describe('Exit Function', () => {
    it('should exit and reset to inactive mode', () => {
      const { result } = renderHook(() => useCenterFinding(), { wrapper });

      act(() => {
        result.current.enterMenu();
        result.current.selectLine();
        result.current.storePoint({ X: 0, Y: 0, Z: 0 });
      });

      expect(result.current.mode).toBe('line');
      expect(result.current.storedPoints.length).toBe(1);

      act(() => {
        result.current.exit();
      });

      expect(result.current.mode).toBe('inactive');
      expect(result.current.menuOption).toBe('center');
      expect(result.current.storedPoints).toEqual([]);
      expect(result.current.centerResult).toBeNull();
    });

    it('should clear center result on exit', () => {
      const { result } = renderHook(() => useCenterFinding(), { wrapper });

      act(() => {
        result.current.selectLine();
        result.current.storePoint({ X: 0, Y: 0, Z: 0 });
        result.current.storePoint({ X: 100, Y: 0, Z: 0 });
      });

      expect(result.current.centerResult).not.toBeNull();

      act(() => {
        result.current.exit();
      });

      expect(result.current.centerResult).toBeNull();
    });
  });

  describe('Mode Transitions', () => {
    it('should reset points when switching from line to circle', () => {
      const { result } = renderHook(() => useCenterFinding(), { wrapper });

      act(() => {
        result.current.selectLine();
        result.current.storePoint({ X: 0, Y: 0, Z: 0 });
      });

      expect(result.current.storedPoints.length).toBe(1);

      act(() => {
        result.current.selectCircle();
      });

      expect(result.current.mode).toBe('circle');
      expect(result.current.storedPoints).toEqual([]);
    });

    it('should reset points when entering menu from active mode', () => {
      const { result } = renderHook(() => useCenterFinding(), { wrapper });

      act(() => {
        result.current.selectLine();
        result.current.storePoint({ X: 0, Y: 0, Z: 0 });
      });

      expect(result.current.storedPoints.length).toBe(1);

      act(() => {
        result.current.enterMenu();
      });

      expect(result.current.mode).toBe('menu');
      expect(result.current.storedPoints).toEqual([]);
    });
  });

  describe('Error Cases', () => {
    it('should throw error when useCenterFinding is called outside provider', () => {
      expect(() => {
        renderHook(() => useCenterFinding());
      }).toThrow('useCenterFinding must be used within a CenterFindingProvider');
    });
  });
});
